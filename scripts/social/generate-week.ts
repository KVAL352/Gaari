/**
 * Generate one full week of reels (Mon–Sat) plus stories so the user can
 * batch-schedule a week of content via Meta Business Suite on Monday morning.
 *
 * Schedule:
 *   Mon: gratis        (free things this week)
 *   Tue: teater        (theatre this week)
 *   Wed: utstillinger  (exhibitions this week)
 *   Thu: denne-helgen  (weekend prep)
 *   Fri: uteliv        (Bergen nightlife this week)
 *   Sat: i-dag         (today's events)
 *
 * Each reel + story batch is uploaded to {date}/{slug}/ in the social-media
 * bucket so the existing /r/[date]/[slug] landing page picks it up. A
 * week-manifest at week/{startMonday}/manifest.json lists all six days so the
 * weekly aggregate page /r/week/[startdate] can render them in one grid.
 *
 * Usage:
 *   cd scripts && npx tsx social/generate-week.ts                    (uses next Monday)
 *   cd scripts && npx tsx social/generate-week.ts --start=2026-04-13 (explicit Monday)
 *   cd scripts && npx tsx social/generate-week.ts --email            (also send Resend email)
 *
 * Env vars: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY (--email only)
 */
import 'dotenv/config';
import { createWriteStream, readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import archiver from 'archiver';
import { supabase } from '../lib/supabase.js';
import { generateOneCollection, fetchActiveEvents } from './generate-reels.js';
import { generateCarousel, type CarouselEvent } from './image-gen.js';
import { generateCaption, type CaptionEvent } from './caption-gen.js';
import { pickDiverseEvents } from './event-picker.js';
import { getCollection } from '../../src/lib/collections.js';
import { formatEventTime, isFreeEvent } from '../../src/lib/utils.js';
import type { GaariEvent } from '../../src/lib/types.js';

interface FbGroup {
	id: string;
	name: string;
	lang: 'no' | 'en';
	/** Only post in this group for these collection slugs. Empty = all days. */
	allowSlugs?: string[];
}

const FB_GROUPS: FbGroup[] = [
	{ id: 'hva-skjer-bergen', name: 'Hva skjer i Bergen', lang: 'no' },
	// Strictly for "today" content per group rules — only i-dag (Saturday) qualifies.
	{ id: 'hva-skjer-bergen-i-dag', name: 'Hva skjer i bergen i dag', lang: 'no', allowSlugs: ['i-dag', 'today-in-bergen'] },
	{ id: 'det-skjer-bergen', name: 'Det Skjer i Bergen', lang: 'no' },
	{ id: 'bergen-expats', name: 'Bergen Expats', lang: 'en' }
];

function isGroupEligible(group: FbGroup, slug: string): boolean {
	return !group.allowSlugs || group.allowSlugs.includes(slug);
}

const HASHTAGS_NO = ['#bergen', '#bergenby', '#hvaskjeribergen', '#bergenliv', '#bergensentrum'];
const HASHTAGS_EN = ['#bergen', '#bergennorway', '#thingstodoinbergen', '#bergenevents', '#visitbergen'];

/** Map NO collection slug to its EN-routable counterpart (when one exists). */
const EN_COUNTERPART: Record<string, string> = {
	'denne-helgen': 'this-weekend',
	'i-dag': 'today-in-bergen',
	'gratis': 'free-things-to-do-bergen'
	// teater / utstillinger / uteliv / mat-og-drikke have no EN route — fall back to /no/ URL
};

const SEND_EMAIL = process.argv.includes('--email');
const START_ARG = process.argv.find(a => a.startsWith('--start='))?.split('=')[1];
const STORAGE_BUCKET = 'social-media';
const REPORT_EMAIL = process.env.REELS_REPORT_EMAIL || 'post@gaari.no';
const FROM_EMAIL = 'Gåri <noreply@gaari.no>';

interface DaySchedule {
	dayOfWeek: number; // 1=Mon, 6=Sat
	dayName: { no: string; en: string };
	slug: string;
	label: string;
}

const SCHEDULE_BY_DOW = new Map<number, DaySchedule>([
	[1, { dayOfWeek: 1, dayName: { no: 'Mandag', en: 'Monday' }, slug: 'gratis', label: 'Gratis denne uka' }],
	[2, { dayOfWeek: 2, dayName: { no: 'Tirsdag', en: 'Tuesday' }, slug: 'teater', label: 'Teater denne uka' }],
	[3, { dayOfWeek: 3, dayName: { no: 'Onsdag', en: 'Wednesday' }, slug: 'utstillinger', label: 'Utstillinger denne uka' }],
	[4, { dayOfWeek: 4, dayName: { no: 'Torsdag', en: 'Thursday' }, slug: 'denne-helgen', label: 'Helgens høydepunkter' }],
	[5, { dayOfWeek: 5, dayName: { no: 'Fredag', en: 'Friday' }, slug: 'uteliv', label: 'Uteliv i helgen' }],
	[6, { dayOfWeek: 6, dayName: { no: 'Lørdag', en: 'Saturday' }, slug: 'i-dag', label: 'Lørdagens program' }]
]);

interface DayManifest {
	dayOfWeek: number;
	dayName: string;
	dateStr: string;
	slug: string;
	label: string;
	landingUrl: string;
	mp4Url: string | null;
	caption: string | null;
	storyCount: number;
	frameCount: number;
	durationSec: number;
	skipped: boolean;
	skipReason?: string;
	dayZipUrl?: string;
	carouselCount?: number;
}

interface WeekManifest {
	startMonday: string;
	endSaturday: string;
	generatedAt: string;
	days: DayManifest[];
	zipUrl?: string;
	storiesZipUrl?: string;
	carouselsZipUrl?: string;
}

/** Strip diacritics + lowercase + replace spaces so filenames stay portable. */
function safeFilename(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[æø]/g, c => (c === 'æ' ? 'ae' : 'o'))
		.replace(/å/g, 'a')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Build a single ZIP containing all six MP4s with date-prefixed filenames
 * and upload it to Supabase. Inside the ZIP each file is named like
 * "2026-04-13-mandag-gratis.mp4" so when extracted into a folder they sort
 * naturally and are immediately distinguishable.
 */
async function buildAndUploadZip(startMonday: string, days: DayManifest[]): Promise<string | null> {
	const eligible = days.filter(d => !d.skipped && d.mp4Url);
	if (eligible.length === 0) return null;

	const tmpDir = resolve(import.meta.dirname, '.reels-tmp');
	if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
	const zipPath = resolve(tmpDir, `week-${startMonday}.zip`);

	console.log(`\nBuilding ZIP with ${eligible.length} reels...`);

	// Pre-fetch all MP4s in parallel from Supabase CDN
	const fetched = await Promise.all(
		eligible.map(async d => {
			const res = await fetch(d.mp4Url!);
			if (!res.ok) {
				console.warn(`  Could not fetch ${d.dateStr} ${d.slug}: HTTP ${res.status}`);
				return null;
			}
			const buffer = Buffer.from(await res.arrayBuffer());
			const dayNameSafe = safeFilename(d.dayName);
			const slugSafe = safeFilename(d.slug);
			const filename = `${d.dateStr}-${dayNameSafe}-${slugSafe}.mp4`;
			return { day: d, buffer, filename };
		})
	);

	const valid = fetched.filter((f): f is NonNullable<typeof f> => f !== null);
	if (valid.length === 0) return null;

	// Stream archive to file
	await new Promise<void>((resolveDone, rejectDone) => {
		const output = createWriteStream(zipPath);
		const archive = archiver('zip', { zlib: { level: 6 } });
		output.on('close', () => resolveDone());
		output.on('error', rejectDone);
		archive.on('error', rejectDone);
		archive.pipe(output);
		for (const f of valid) {
			archive.append(f.buffer, { name: f.filename });
		}
		archive.finalize();
	});

	const zipBuffer = readFileSync(zipPath);
	const zipStoragePath = `week/${startMonday}/reels.zip`;
	const { error } = await supabase.storage
		.from(STORAGE_BUCKET)
		.upload(zipStoragePath, zipBuffer, {
			contentType: 'application/zip',
			upsert: true
		});

	try { unlinkSync(zipPath); } catch { /* ignore */ }

	if (error) {
		console.warn(`  ZIP upload failed: ${error.message}`);
		return null;
	}

	const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(zipStoragePath);
	console.log(`  ZIP uploaded: ${data.publicUrl}`);
	return data.publicUrl;
}

interface StoryEntry {
	url: string;
	venue: string;
	igHandle: string | null;
	title: string;
}

/**
 * Build a single ZIP containing every story PNG generated for the week, plus
 * a handles.txt index. Each PNG is named like
 * "2026-04-08-onsdag-utstillinger-01.png" so they sort by day in the gallery,
 * and handles.txt maps every filename to its venue, @-handle and the
 * collection link the user should drop into the IG link sticker.
 */
async function buildAndUploadStoriesZip(startDate: string, days: DayManifest[]): Promise<string | null> {
	const eligible = days.filter(d => !d.skipped && d.storyCount > 0);
	if (eligible.length === 0) return null;

	const tmpDir = resolve(import.meta.dirname, '.reels-tmp');
	if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
	const zipPath = resolve(tmpDir, `week-${startDate}-stories.zip`);

	console.log(`\nBuilding stories ZIP for ${eligible.length} days...`);

	const handlesLines: string[] = [
		`Stories for uka ${startDate}`,
		'',
		'Slik bruker du:',
		'1. Pakk ut hele ZIP-en på telefonen og lagre PNG-ene i Bilder.',
		'2. Hver dag i uka, plukk 5-10 stories fra dagens bunke.',
		'3. I IG-Stories: legg til @-mention sticker (handle nedenfor) og link sticker (Gåri-lenke nedenfor).',
		'',
		'Format: filnavn — @-handle — collection-lenke',
		''
	];

	const fetchedByDay = new Map<string, { filename: string; buffer: Buffer }[]>();
	let totalAdded = 0;

	// Pre-fetch story manifests + images per day. Buffers are kept in a local
	// Map (NOT mutated onto the DayManifest) so the manifest stays JSON-safe.
	for (const day of eligible) {
		const manifestUrl = `https://rilwtpluofguyjpzdezi.supabase.co/storage/v1/object/public/${STORAGE_BUCKET}/${day.dateStr}/${day.slug}/stories.json`;
		const manRes = await fetch(manifestUrl);
		if (!manRes.ok) {
			console.warn(`  No story manifest for ${day.dateStr} ${day.slug}`);
			continue;
		}
		const stories: StoryEntry[] = await manRes.json();
		if (!Array.isArray(stories) || stories.length === 0) continue;

		const dayNameSafe = safeFilename(day.dayName);
		const slugSafe = safeFilename(day.slug);
		const dayBuffers: { filename: string; buffer: Buffer }[] = [];
		const sharp = (await import('sharp')).default;

		handlesLines.push(`--- ${day.dayName} ${day.dateStr} (${day.label}) ---`);

		for (let i = 0; i < stories.length; i++) {
			const story = stories[i];
			const idx = String(i + 1).padStart(2, '0');
			// Convert PNG -> JPEG to keep the ZIP under Supabase's 50 MB limit.
			// IG re-encodes anyway when you upload a story, so the visual hit is nil.
			const filename = `${day.dateStr}-${dayNameSafe}-${slugSafe}-${idx}.jpg`;

			try {
				const res = await fetch(story.url);
				if (!res.ok) {
					console.warn(`  Skip ${filename}: HTTP ${res.status}`);
					continue;
				}
				const pngBuffer = Buffer.from(await res.arrayBuffer());
				const jpegBuffer = await sharp(pngBuffer).jpeg({ quality: 88 }).toBuffer();
				dayBuffers.push({ filename, buffer: jpegBuffer });

				// Per-story link with utm_content = venue-slug, so Umami can attribute
				// each click to the specific story that drove it. This lets the weekly
				// report show "Hulen-story drove 14 ticket clicks" vs "Bibliotek-story
				// drove 2 newsletter signups".
				const venueSlug = safeFilename(story.venue) || `story-${idx}`;
				const collectionLink = `https://gaari.no/no/${day.slug}?utm_source=instagram&utm_medium=story&utm_campaign=${day.slug}&utm_content=${venueSlug}`;

				const handle = story.igHandle ? `@${story.igHandle}` : '(ingen IG-konto)';
				handlesLines.push(`${filename} — ${story.venue} — ${handle} — ${collectionLink}`);
				totalAdded++;
			} catch (err: any) {
				console.warn(`  Skip ${filename}: ${err.message}`);
			}
		}
		handlesLines.push('');
		fetchedByDay.set(day.dateStr, dayBuffers);
	}

	if (totalAdded === 0) {
		console.warn('  No stories fetched, skipping stories ZIP');
		return null;
	}

	// Stream archive to file
	await new Promise<void>((resolveDone, rejectDone) => {
		const output = createWriteStream(zipPath);
		const archive = archiver('zip', { zlib: { level: 6 } });
		output.on('close', () => resolveDone());
		output.on('error', rejectDone);
		archive.on('error', rejectDone);
		archive.pipe(output);

		archive.append(handlesLines.join('\n'), { name: 'handles.txt' });

		for (const day of eligible) {
			const fetched = fetchedByDay.get(day.dateStr);
			if (!fetched) continue;
			for (const f of fetched) {
				archive.append(f.buffer, { name: f.filename });
			}
		}

		archive.finalize();
	});

	const zipBuffer = readFileSync(zipPath);
	const zipStoragePath = `week/${startDate}/stories.zip`;
	const { error } = await supabase.storage
		.from(STORAGE_BUCKET)
		.upload(zipStoragePath, zipBuffer, {
			contentType: 'application/zip',
			upsert: true
		});

	try { unlinkSync(zipPath); } catch { /* ignore */ }

	if (error) {
		console.warn(`  Stories ZIP upload failed: ${error.message}`);
		return null;
	}

	const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(zipStoragePath);
	console.log(`  Stories ZIP uploaded (${totalAdded} stories): ${data.publicUrl}`);
	return data.publicUrl;
}

/**
 * Build a single ZIP containing the carousel slides (1080×1080) for every day,
 * plus a captions.txt with four caption variants per day — one per Facebook
 * group with a unique utm_campaign so we can attribute clicks back to the
 * source group in Umami. The user opens each FB group, uploads the same image
 * set, and pastes the matching caption.
 */
async function buildAndUploadCarouselsZip(
	startDate: string,
	days: DayManifest[],
	activeEvents: GaariEvent[]
): Promise<string | null> {
	const eligible = days.filter(d => !d.skipped);
	if (eligible.length === 0) return null;

	const tmpDir = resolve(import.meta.dirname, '.reels-tmp');
	if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
	const zipPath = resolve(tmpDir, `week-${startDate}-carousels.zip`);

	console.log(`\nBuilding carousels ZIP for ${eligible.length} days...`);

	const captionsLines: string[] = [
		`GAARI — UKENS CAROUSELS FOR FB-GRUPPER`,
		`Uka ${startDate}`,
		'',
		'Slik bruker du:',
		'1. Pakk ut hele ZIP-en på desktop.',
		'2. For hver dag: åpne riktig FB-gruppe, last opp HELE bilde-sekvensen for den dagen,',
		'   og lim inn captionen som matcher gruppen (forskjellig UTM-tagging).',
		'3. Bilder ligger i carousels/ — captioner er listet under per dag og per gruppe.',
		''
	];

	const fetchedByDay = new Map<string, { filename: string; buffer: Buffer }[]>();
	let totalSlidesAdded = 0;
	const sharp = (await import('sharp')).default;

	for (const day of eligible) {
		const collection = getCollection(day.slug);
		if (!collection) {
			console.warn(`  ${day.slug}: collection not found, skipping`);
			continue;
		}

		// Use the same diverse picker as the reel so the carousel matches the
		// reel's events for that day. now = midnight of that day in Oslo.
		const now = new Date(`${day.dateStr}T08:00:00+02:00`);
		const filtered = collection.filterEvents(activeEvents as any, now);
		const selected = pickDiverseEvents(filtered, 8);

		if (selected.length < 4) {
			console.warn(`  ${day.dateStr} ${day.slug}: only ${selected.length} events with images, skipping carousel`);
			continue;
		}

		const isEnglish = ['today-in-bergen', 'this-weekend', 'free-things-to-do-bergen'].includes(day.slug);
		const lang = isEnglish ? 'en' as const : 'no' as const;
		const title = isEnglish ? collection.title.en : collection.title.no;

		const carouselEvents: CarouselEvent[] = selected.map(e => ({
			title: isEnglish ? (e.title_en || e.title_no) : e.title_no,
			venue: e.venue_name,
			time: formatEventTime(e.date_start, lang),
			category: e.category,
			imageUrl: e.image_url || undefined,
			isFree: isFreeEvent(e.price)
		}));

		console.log(`  Generating carousel for ${day.dayName} ${day.dateStr} (${day.slug})...`);
		const slides = await generateCarousel(title, carouselEvents);
		if (slides.length === 0) {
			console.warn(`  ${day.dateStr} ${day.slug}: no slides rendered, skipping`);
			continue;
		}

		const dayNameSafe = safeFilename(day.dayName);
		const slugSafe = safeFilename(day.slug);
		const dayBuffers: { filename: string; buffer: Buffer }[] = [];

		for (let i = 0; i < slides.length; i++) {
			const idx = String(i + 1).padStart(2, '0');
			const filename = `carousels/${day.dateStr}-${dayNameSafe}-${slugSafe}-${idx}.jpg`;
			const jpegBuffer = await sharp(slides[i]).jpeg({ quality: 88 }).toBuffer();
			dayBuffers.push({ filename, buffer: jpegBuffer });

			// Also upload to {date}/{slug}/carousel-NN.jpg for per-day landing-page reuse later
			const perDayPath = `${day.dateStr}/${day.slug}/carousel-${idx}.jpg`;
			await supabase.storage
				.from(STORAGE_BUCKET)
				.upload(perDayPath, jpegBuffer, { contentType: 'image/jpeg', upsert: true })
				.catch(() => { /* non-critical */ });

			totalSlidesAdded++;
		}
		fetchedByDay.set(day.dateStr, dayBuffers);
		day.carouselCount = slides.length;

		// Build captions per FB group
		const captionEvents: CaptionEvent[] = selected.map(e => ({
			title: isEnglish ? (e.title_en || e.title_no) : e.title_no,
			venue: e.venue_name,
			date_start: e.date_start,
			category: e.category
		}));

		captionsLines.push(`================================================================`);
		captionsLines.push(`${day.dayName.toUpperCase()} ${day.dateStr} — ${day.label}`);
		captionsLines.push(`Bilder: ${slides.length} slides (carousels/${day.dateStr}-${dayNameSafe}-${slugSafe}-NN.jpg)`);
		captionsLines.push('');

		for (const group of FB_GROUPS) {
			if (!isGroupEligible(group, day.slug)) continue;

			const groupLang = group.lang;
			const groupTitle = groupLang === 'en' ? collection.title.en : collection.title.no;

			// For EN groups: use the EN counterpart slug when one exists, else fall
			// back to the NO URL (page still renders, just in Norwegian).
			let urlPath: string;
			if (groupLang === 'en') {
				const enSlug = EN_COUNTERPART[day.slug] || day.slug;
				urlPath = EN_COUNTERPART[day.slug] ? `en/${enSlug}` : `no/${day.slug}`;
			} else {
				urlPath = `no/${day.slug}`;
			}
			const collectionUrl = `https://gaari.no/${urlPath}?utm_source=facebook&utm_medium=group&utm_campaign=${group.id}`;
			const hashtags = groupLang === 'en' ? HASHTAGS_EN : HASHTAGS_NO;
			const caption = generateCaption(groupTitle, captionEvents, collectionUrl, hashtags, groupLang);

			captionsLines.push(`--- ${group.name} (${groupLang.toUpperCase()}) ---`);
			captionsLines.push(caption);
			captionsLines.push('');
		}
		captionsLines.push('');
	}

	if (totalSlidesAdded === 0) {
		console.warn('  No carousel slides generated, skipping carousels ZIP');
		return null;
	}

	// Stream archive to file
	await new Promise<void>((resolveDone, rejectDone) => {
		const output = createWriteStream(zipPath);
		const archive = archiver('zip', { zlib: { level: 6 } });
		output.on('close', () => resolveDone());
		output.on('error', rejectDone);
		archive.on('error', rejectDone);
		archive.pipe(output);

		archive.append(captionsLines.join('\n'), { name: 'captions.txt' });

		for (const day of eligible) {
			const fetched = fetchedByDay.get(day.dateStr);
			if (!fetched) continue;
			for (const f of fetched) {
				archive.append(f.buffer, { name: f.filename });
			}
		}

		archive.finalize();
	});

	const zipBuffer = readFileSync(zipPath);
	const zipStoragePath = `week/${startDate}/carousels.zip`;
	const { error } = await supabase.storage
		.from(STORAGE_BUCKET)
		.upload(zipStoragePath, zipBuffer, {
			contentType: 'application/zip',
			upsert: true
		});

	try { unlinkSync(zipPath); } catch { /* ignore */ }

	if (error) {
		console.warn(`  Carousels ZIP upload failed: ${error.message}`);
		return null;
	}

	const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(zipStoragePath);
	console.log(`  Carousels ZIP uploaded (${totalSlidesAdded} slides): ${data.publicUrl}`);
	return data.publicUrl;
}

/**
 * Build a single ZIP per day containing all assets: reel frames, stories,
 * carousel slides, and captions. Uploaded as {dateStr}/{slug}/dag.zip.
 */
async function buildAndUploadDayZip(day: DayManifest): Promise<string | null> {
	if (day.skipped) return null;

	const tmpDir = resolve(import.meta.dirname, '.reels-tmp');
	if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

	const dayNameSafe = safeFilename(day.dayName);
	const slugSafe = safeFilename(day.slug);
	const zipPath = resolve(tmpDir, `${day.dateStr}-${dayNameSafe}-${slugSafe}.zip`);
	const baseUrl = `https://rilwtpluofguyjpzdezi.supabase.co/storage/v1/object/public/${STORAGE_BUCKET}`;
	const sharp = (await import('sharp')).default;

	let totalFiles = 0;

	const archive = archiver('zip', { zlib: { level: 6 } });
	const output = createWriteStream(zipPath);

	const done = new Promise<void>((res, rej) => {
		output.on('close', () => res());
		output.on('error', rej);
		archive.on('error', rej);
	});
	archive.pipe(output);

	// 1. Reel frames
	for (let i = 1; i <= day.frameCount; i++) {
		const idx = String(i).padStart(2, '0');
		const url = `${baseUrl}/${day.dateStr}/${day.slug}/frame-${idx}.png`;
		try {
			const res = await fetch(url);
			if (!res.ok) continue;
			const buf = Buffer.from(await res.arrayBuffer());
			archive.append(buf, { name: `reel-frames/${day.dateStr}-${dayNameSafe}-${slugSafe}-frame-${idx}.png` });
			totalFiles++;
		} catch { /* skip */ }
	}

	// 2. Reel MP4 (if exists)
	if (day.mp4Url) {
		try {
			const res = await fetch(day.mp4Url);
			if (res.ok) {
				const buf = Buffer.from(await res.arrayBuffer());
				archive.append(buf, { name: `${day.dateStr}-${dayNameSafe}-${slugSafe}-reel.mp4` });
				totalFiles++;
			}
		} catch { /* skip */ }
	}

	// 3. Stories
	const storiesManifestUrl = `${baseUrl}/${day.dateStr}/${day.slug}/stories.json`;
	try {
		const smRes = await fetch(storiesManifestUrl);
		if (smRes.ok) {
			const stories: { url: string; venue: string; igHandle: string | null; title: string }[] = await smRes.json();
			for (let i = 0; i < stories.length; i++) {
				const idx = String(i + 1).padStart(2, '0');
				try {
					const res = await fetch(stories[i].url);
					if (!res.ok) continue;
					const pngBuf = Buffer.from(await res.arrayBuffer());
					const jpgBuf = await sharp(pngBuf).jpeg({ quality: 88 }).toBuffer();
					archive.append(jpgBuf, { name: `stories/${day.dateStr}-${dayNameSafe}-${slugSafe}-story-${idx}.jpg` });
					totalFiles++;
				} catch { /* skip */ }
			}
		}
	} catch { /* skip */ }

	// 4. Carousel slides
	for (let i = 1; i <= (day.carouselCount || 0); i++) {
		const idx = String(i).padStart(2, '0');
		const url = `${baseUrl}/${day.dateStr}/${day.slug}/carousel-${idx}.jpg`;
		try {
			const res = await fetch(url);
			if (!res.ok) continue;
			const buf = Buffer.from(await res.arrayBuffer());
			archive.append(buf, { name: `carousel/${day.dateStr}-${dayNameSafe}-${slugSafe}-carousel-${idx}.jpg` });
			totalFiles++;
		} catch { /* skip */ }
	}

	// 5. Captions — one unified file with collection link + per-FB-group captions
	const captionUrl = `${baseUrl}/${day.dateStr}/${day.slug}/caption.txt`;
	try {
		const res = await fetch(captionUrl);
		if (res.ok) {
			const reelCaption = await res.text();

			const isEnglish = ['today-in-bergen', 'this-weekend', 'free-things-to-do-bergen'].includes(day.slug);
			const noUrl = `https://gaari.no/no/${day.slug}`;
			const enSlug = EN_COUNTERPART[day.slug] || day.slug;
			const enUrl = EN_COUNTERPART[day.slug] ? `https://gaari.no/en/${enSlug}` : noUrl;

			const lines: string[] = [
				`${day.dayName.toUpperCase()} ${day.dateStr} — ${day.label}`,
				'',
				`LENKE (NO): ${noUrl}`,
				`LENKE (EN): ${enUrl}`,
				'',
				'Bruk samme lenke for stories, reels og carousel.',
				'',
				'═══════════════════════════════════════',
				'REEL / STORIES CAPTION',
				'═══════════════════════════════════════',
				'',
				reelCaption.replace(/utm_source=\w+&utm_medium=\w+&utm_campaign=\w+/g,
					`utm_source=social&utm_medium=organic&utm_campaign=${day.slug}`),
				''
			];

			// Per-FB-group captions for carousel posting
			const eligibleGroups = FB_GROUPS.filter(g => isGroupEligible(g, day.slug));
			if (eligibleGroups.length > 0) {
				lines.push('═══════════════════════════════════════');
				lines.push('CAROUSEL — CAPTION PER FB-GRUPPE');
				lines.push('═══════════════════════════════════════');
				lines.push('');

				for (const group of eligibleGroups) {
					const groupUrl = group.lang === 'en' ? enUrl : noUrl;
					const link = `${groupUrl}?utm_source=facebook&utm_medium=group&utm_campaign=${group.id}`;
					lines.push(`--- ${group.name} (${group.lang.toUpperCase()}) ---`);
					// Re-use the reel caption but swap lang/link
					if (group.lang === 'en' && !isEnglish) {
						lines.push(`See what's free in Bergen this week:`);
						lines.push(link);
					} else {
						const firstLine = reelCaption.split('\n')[0] || day.label;
						lines.push(firstLine);
						lines.push(link);
					}
					const hashtags = group.lang === 'en' ? HASHTAGS_EN : HASHTAGS_NO;
					lines.push(hashtags.join(' '));
					lines.push('');
				}
			}

			archive.append(lines.join('\n'), { name: 'captions.txt' });
			totalFiles++;
		}
	} catch { /* skip */ }

	if (totalFiles === 0) {
		archive.abort();
		try { unlinkSync(zipPath); } catch { /* ignore */ }
		return null;
	}

	await archive.finalize();
	await done;

	const zipBuffer = readFileSync(zipPath);
	const storagePath = `${day.dateStr}/${day.slug}/dag.zip`;
	const { error } = await supabase.storage
		.from(STORAGE_BUCKET)
		.upload(storagePath, zipBuffer, { contentType: 'application/zip', upsert: true });

	try { unlinkSync(zipPath); } catch { /* ignore */ }

	if (error) {
		console.warn(`  Day ZIP upload failed for ${day.dateStr}: ${error.message}`);
		return null;
	}

	const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
	console.log(`  Day ZIP: ${day.dayName} ${day.dateStr} (${totalFiles} files): ${data.publicUrl}`);
	return data.publicUrl;
}

/** Compute the date string of the next Monday in Oslo time. */
function nextMondayDateStr(now: Date): string {
	const oslo = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
	const day = oslo.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
	const daysUntilMonday = (8 - day) % 7 || 7; // always strictly in the future
	const monday = new Date(oslo);
	monday.setDate(oslo.getDate() + daysUntilMonday);
	return monday.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
}

/** Today's date string in Oslo. */
function todayDateStr(): string {
	return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
}

/** ISO day of week for a YYYY-MM-DD string in Oslo: 1=Mon, 7=Sun. */
function isoDayOfWeek(dateStr: string): number {
	const d = new Date(`${dateStr}T12:00:00+02:00`);
	const js = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
	return js === 0 ? 7 : js;
}

function addDays(dateStr: string, days: number): string {
	const d = new Date(`${dateStr}T12:00:00`);
	d.setDate(d.getDate() + days);
	return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
}

/** Saturday of the same ISO week as the given date. */
function saturdayOfWeek(dateStr: string): string {
	const dow = isoDayOfWeek(dateStr); // 1=Mon, 7=Sun
	const daysToSat = dow <= 6 ? 6 - dow : -1; // Sunday goes back to previous Sat
	return addDays(dateStr, daysToSat);
}

/** Build a Date that represents Oslo midnight on the given date. */
function osloMidnight(dateStr: string): Date {
	// Create a date that, when filterEvents passes through toLocaleDateString
	// with timeZone Europe/Oslo, resolves to the target Oslo date.
	return new Date(`${dateStr}T08:00:00+02:00`);
}

async function uploadWeekManifest(startMonday: string, manifest: WeekManifest): Promise<string> {
	const path = `week/${startMonday}/manifest.json`;
	const { error } = await supabase.storage
		.from(STORAGE_BUCKET)
		.upload(path, Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'), {
			contentType: 'application/json; charset=utf-8',
			upsert: true
		});
	if (error) throw new Error(`Week manifest upload failed: ${error.message}`);
	const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
	return data.publicUrl;
}

async function emailWeekDelivery(startMonday: string, manifest: WeekManifest, weekUrl: string): Promise<void> {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.warn('  Skipping email: no RESEND_API_KEY set');
		return;
	}

	const successCount = manifest.days.filter(d => !d.skipped).length;
	const subject = `[Ukens reels klar] ${successCount} av ${manifest.days.length} reels for uka ${startMonday}`;

	const dayRows = manifest.days.map(d => {
		if (d.skipped) {
			return `
			<tr>
				<td style="padding:10px;border-bottom:1px solid #e6e3da;">
					<strong>${d.dayName} ${d.dateStr}</strong> &middot; ${d.label}
				</td>
				<td style="padding:10px;border-bottom:1px solid #e6e3da;color:#737373;">
					Skippet: ${d.skipReason || 'ukjent grunn'}
				</td>
			</tr>`;
		}
		return `
		<tr>
			<td style="padding:10px;border-bottom:1px solid #e6e3da;">
				<strong>${d.dayName} ${d.dateStr}</strong> &middot; ${d.label}<br>
				<span style="font-size:12px;color:#737373;">${d.frameCount} frames &middot; ${d.durationSec} sek &middot; ${d.storyCount} stories</span>
			</td>
			<td style="padding:10px;border-bottom:1px solid #e6e3da;text-align:right;">
				<a href="${d.landingUrl}" style="color:#C82D2D;text-decoration:none;font-weight:bold;">Åpne</a>
			</td>
		</tr>`;
	}).join('');

	const html = `<!doctype html>
<html lang="nb">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width,initial-scale=1" />
	<title>Ukens reels klar</title>
</head>
<body style="margin:0;padding:24px;background:#fafaf7;font-family:Arial,Helvetica,sans-serif;color:#141414;">
	<div style="max-width:640px;margin:0 auto;">
		<h1 style="margin:0 0 8px;font-size:28px;color:#141414;">Ukens reels klar</h1>
		<p style="margin:0 0 24px;font-size:15px;color:#4D4D4D;line-height:1.5;">
			${successCount} av ${manifest.days.length} reels generert for uka ${manifest.startMonday} – ${manifest.endSaturday}.
			Last opp i Meta Business Suite og planlegg én per dag.
		</p>

		<table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 24px;border:2px solid #e6e3da;border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;">
			${dayRows}
		</table>

		<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
			<tr>
				<td style="background:#C82D2D;border-radius:8px;">
					<a href="${weekUrl}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#fff;text-decoration:none;">
						Åpne ukesoversikt
					</a>
				</td>
			</tr>
		</table>

		<p style="margin:32px 0 0;font-size:12px;color:#737373;text-align:center;">
			Generert av <a href="https://gaari.no" style="color:#C82D2D;text-decoration:none;">Gåri</a>
		</p>
	</div>
</body>
</html>`;

	const resp = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ from: FROM_EMAIL, to: [REPORT_EMAIL], subject, html })
	});
	if (resp.ok) {
		const data = await resp.json() as { id: string };
		console.log(`\n  Week delivery email sent (Resend ID: ${data.id})`);
	} else {
		console.error(`\n  Email failed: ${resp.status} ${await resp.text()}`);
	}
}

async function main() {
	// --start can be any date. If today, generate Today→Saturday of this week.
	// If next Monday (default), generate Mon→Sat of next week.
	const startDate = START_ARG || nextMondayDateStr(new Date());
	const endSaturday = saturdayOfWeek(startDate);
	const tmpDir = resolve(import.meta.dirname, '.reels-tmp');

	// Build list of dates from startDate through endSaturday (inclusive)
	const dates: string[] = [];
	let cursor = startDate;
	while (cursor <= endSaturday) {
		dates.push(cursor);
		cursor = addDays(cursor, 1);
	}

	console.log(`Weekly reel batch — ${startDate} to ${endSaturday} (${dates.length} day${dates.length === 1 ? '' : 's'})\n`);

	const activeEvents = await fetchActiveEvents();
	console.log(`Fetched ${activeEvents.length} active events\n`);

	const days: DayManifest[] = [];

	for (const dateStr of dates) {
		const dow = isoDayOfWeek(dateStr); // 1=Mon..7=Sun
		const day = SCHEDULE_BY_DOW.get(dow);
		if (!day) {
			console.log(`--- ${dateStr} (Sunday) — no schedule entry, skipping.\n`);
			continue;
		}

		const now = osloMidnight(dateStr);

		const delivery = await generateOneCollection({
			slug: day.slug,
			dateStr,
			now,
			activeEvents,
			tmpDir,
			dryRun: false
		});

		if (delivery) {
			days.push({
				dayOfWeek: day.dayOfWeek,
				dayName: day.dayName.no,
				dateStr,
				slug: day.slug,
				label: day.label,
				landingUrl: delivery.landingUrl,
				mp4Url: delivery.mp4Url,
				caption: delivery.caption,
				storyCount: delivery.storyCount,
				frameCount: delivery.frameCount,
				durationSec: delivery.durationSec,
				skipped: false
			});
		} else {
			days.push({
				dayOfWeek: day.dayOfWeek,
				dayName: day.dayName.no,
				dateStr,
				slug: day.slug,
				label: day.label,
				landingUrl: `https://gaari.no/r/${dateStr}/${day.slug}`,
				mp4Url: null,
				caption: null,
				storyCount: 0,
				frameCount: 0,
				durationSec: 0,
				skipped: true,
				skipReason: 'no events or render failed'
			});
		}
	}

	// Build + upload ZIPs (reels MP4s + stories JPGs + carousel JPGs)
	const zipUrl = await buildAndUploadZip(startDate, days);
	const storiesZipUrl = await buildAndUploadStoriesZip(startDate, days);
	const carouselsZipUrl = await buildAndUploadCarouselsZip(startDate, days, activeEvents);

	// Build per-day ZIPs (all assets for one day in a single download)
	console.log('\nBuilding per-day ZIPs...');
	for (const day of days) {
		const dayZipUrl = await buildAndUploadDayZip(day);
		if (dayZipUrl) day.dayZipUrl = dayZipUrl;
	}

	const manifest: WeekManifest = {
		startMonday: startDate,
		endSaturday,
		generatedAt: new Date().toISOString(),
		days,
		zipUrl: zipUrl || undefined,
		storiesZipUrl: storiesZipUrl || undefined,
		carouselsZipUrl: carouselsZipUrl || undefined
	};

	const weekUrl = `https://gaari.no/r/week/${startDate}`;
	await uploadWeekManifest(startDate, manifest);
	console.log(`\nWeek manifest uploaded. Aggregate page: ${weekUrl}`);

	if (SEND_EMAIL) {
		await emailWeekDelivery(startDate, manifest, weekUrl);
	}

	console.log('Done.');
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
