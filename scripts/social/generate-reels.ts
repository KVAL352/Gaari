/**
 * Generate Reels video from event data — PNG frames → FFmpeg → MP4.
 * Videos are stored in Supabase storage for manual publishing.
 *
 * Usage: cd scripts && npx tsx social/generate-reels.ts [--dry-run] [--slug=denne-helgen] [--email]
 *
 * Flags:
 *   --dry-run  Generate frames but skip encoding/upload/email
 *   --slug=X   Only this collection (default: denne-helgen, konserter, gratis)
 *   --email    After successful upload, email a download link + caption to REPORT_EMAIL via Resend
 *
 * Env vars: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY (only if --email)
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync, unlinkSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { supabase } from '../lib/supabase.js';
import { getOsloNow, toOsloDateStr } from '../../src/lib/event-filters.js';
import { getCollection } from '../../src/lib/collections.js';
import { formatEventTime, isFreeEvent } from '../../src/lib/utils.js';
import { generateReelsFrames, generateReelsOutro, generateStories, type CarouselEvent } from './image-gen.js';
import { generateCaption, type CaptionEvent } from './caption-gen.js';
import { pickDiverseEvents } from './event-picker.js';
import { getVenueInstagram } from '../lib/venues.js';
import type { GaariEvent } from '../../src/lib/types.js';

const DRY_RUN = process.argv.includes('--dry-run');
const SEND_EMAIL = process.argv.includes('--email');
const SLUG_ARG = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1];
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const REPORT_EMAIL = process.env.REELS_REPORT_EMAIL || 'post@gaari.no';
const FROM_EMAIL = 'Gåri <noreply@gaari.no>';
const STORAGE_BUCKET = 'social-media';

/** Hashtag bank per collection (mirrors generate-posts.ts schedule). */
const HASHTAGS: Record<string, string[]> = {
	'denne-helgen': ['#bergen', '#bergenby', '#hvaskjeribergen', '#helgibergen', '#bergenliv', '#bergensentrum', '#bergennorway', '#hvaskjer'],
	'i-kveld': ['#bergen', '#bergenby', '#hvaskjeribergen', '#kveldibergen', '#bergenliv', '#utibergen', '#bergennorway'],
	'gratis': ['#bergen', '#bergenby', '#gratisibergen', '#gratisarrangementer', '#hvaskjeribergen', '#bergenliv'],
	'konserter': ['#bergen', '#bergenkonsert', '#livemusikk', '#bergenmusikk', '#hvaskjeribergen', '#konsert'],
	'familiehelg': ['#bergen', '#barnibergen', '#familiehelg', '#bergenfamilie', '#hvaskjeribergen'],
	'today-in-bergen': ['#bergen', '#bergennorway', '#todayinbergen', '#thingstodoinbergen', '#bergenevents'],
	'this-weekend': ['#bergen', '#bergennorway', '#thisweekend', '#weekendinbergen', '#bergenevents']
};

const ENGLISH_SLUGS = new Set(['today-in-bergen', 'this-weekend']);

/** Seconds each frame is shown */
const FRAME_DURATION = 2;

/** Number of stories generated per landing page (i-dag gets the full batch). */
const STORY_BATCH_SIZE = 10;
const STORY_BATCH_SIZE_OTHER = 6;

/** Build a prominent, locale-aware date label for a slide. */
function buildDateLabel(dateStart: string, lang: 'no' | 'en', now: Date): string {
	const eventDate = new Date(dateStart);
	const osloDateStr = (d: Date) =>
		d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
	const today = osloDateStr(now);
	const tomorrow = osloDateStr(new Date(now.getTime() + 24 * 60 * 60 * 1000));
	const eventDay = osloDateStr(eventDate);

	if (eventDay === today) return lang === 'en' ? 'TODAY' : 'I DAG';
	if (eventDay === tomorrow) return lang === 'en' ? 'TOMORROW' : 'I MORGEN';

	const locale = lang === 'en' ? 'en-GB' : 'nb-NO';
	const fmt = eventDate.toLocaleDateString(locale, {
		timeZone: 'Europe/Oslo',
		weekday: 'long',
		day: 'numeric',
		month: 'short'
	});
	// Capitalize first letter (nb-NO uses lowercase weekdays)
	return fmt.charAt(0).toUpperCase() + fmt.slice(1);
}

/** Collections that get Reels (weekly specials) */
const REELS_SLUGS = SLUG_ARG ? [SLUG_ARG] : ['denne-helgen', 'konserter', 'gratis'];

/** Ensure the storage bucket exists (idempotent). */
async function ensureBucket() {
	const { data: buckets, error } = await supabase.storage.listBuckets();
	if (error) {
		console.warn(`  Could not list buckets: ${error.message}`);
		return;
	}
	if (buckets.some(b => b.name === STORAGE_BUCKET)) return;
	const { error: createErr } = await supabase.storage.createBucket(STORAGE_BUCKET, {
		public: true,
		fileSizeLimit: 50 * 1024 * 1024
	});
	if (createErr) {
		console.warn(`  Could not create bucket "${STORAGE_BUCKET}": ${createErr.message}`);
	} else {
		console.log(`  Created storage bucket "${STORAGE_BUCKET}"`);
	}
}

interface ReelDelivery {
	slug: string;
	dateStr: string;
	collectionTitle: string;
	collectionUrl: string;
	mp4Url: string;
	landingUrl: string;
	caption: string;
	frameCount: number;
	durationSec: number;
	storyCount: number;
}

/** Send a mobile-optimized email so the user can download the MP4 and copy the caption. */
async function emailReelDelivery(deliveries: ReelDelivery[]): Promise<void> {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.warn('  Skipping email: no RESEND_API_KEY set');
		return;
	}
	if (deliveries.length === 0) {
		console.log('  No deliveries to email');
		return;
	}

	const today = new Date().toLocaleDateString('nb-NO', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});
	const subject = `[Reels klar] ${deliveries.length} video${deliveries.length === 1 ? '' : 'er'} \u2014 ${today}`;

	const sectionsHtml = deliveries.map(d => `
		<div style="margin-bottom:24px;border:2px solid #e6e3da;border-radius:12px;padding:20px;">
			<h2 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:22px;color:#141414;">
				${escapeHtml(d.collectionTitle)}
			</h2>
			<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#4D4D4D;">
				Reel: ${d.frameCount} slides &middot; ${d.durationSec} sek${d.storyCount > 0 ? ` &middot; ${d.storyCount} stories klar til tagging` : ''}
			</p>

			<table cellpadding="0" cellspacing="0" border="0" style="margin:0;">
				<tr>
					<td style="background:#C82D2D;border-radius:8px;">
						<a href="${d.landingUrl}" style="display:inline-block;padding:16px 32px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#fff;text-decoration:none;">
							\u00c5pne reel-side
						</a>
					</td>
				</tr>
			</table>
		</div>
	`).join('');

	const html = `<!doctype html>
<html lang="nb">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width,initial-scale=1" />
	<title>Reels klar</title>
</head>
<body style="margin:0;padding:24px;background:#fafaf7;font-family:Arial,Helvetica,sans-serif;color:#141414;">
	<div style="max-width:600px;margin:0 auto;">
		<h1 style="margin:0 0 8px;font-size:28px;color:#141414;">Reels klar til publisering</h1>
		<p style="margin:0 0 24px;font-size:15px;color:#4D4D4D;line-height:1.5;">
			${deliveries.length} video${deliveries.length === 1 ? '' : 'er'} generert. \u00c5pne denne eposten p\u00e5 mobilen,
			trykk knappen for hver reel \u2014 du kommer til en side med video, kopier-knapp for caption,
			og enkel anvisning for \u00e5 lagre til Bilder.
		</p>
		${sectionsHtml}
		<p style="margin:32px 0 0;font-size:12px;color:#737373;text-align:center;">
			Generert av <a href="https://gaari.no" style="color:#C82D2D;text-decoration:none;">G\u00e5ri</a>
		</p>
	</div>
</body>
</html>`;

	const resp = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${key}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: FROM_EMAIL,
			to: [REPORT_EMAIL],
			subject,
			html
		})
	});

	if (resp.ok) {
		const data = await resp.json() as { id: string };
		console.log(`\n  Reels delivery email sent (Resend ID: ${data.id})`);
	} else {
		console.error(`\n  Email failed: ${resp.status} ${await resp.text()}`);
	}
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Generate one reel + story batch for a single (slug, date) combination.
 * Extracted from main() so generate-week.ts can call it for each day in
 * the upcoming week without duplicating the encoding/upload pipeline.
 *
 * Returns a ReelDelivery on success, or null when the collection has no
 * events / not enough images / encoding fails.
 */
export async function generateOneCollection(opts: {
	slug: string;
	dateStr: string;
	now: Date;
	activeEvents: GaariEvent[];
	tmpDir: string;
	dryRun?: boolean;
}): Promise<ReelDelivery | null> {
	const { slug, dateStr, now, activeEvents, tmpDir, dryRun = false } = opts;
	console.log(`--- ${slug} (${dateStr}) ---`);
	const collection = getCollection(slug);
	if (!collection) {
		console.log(`  Collection not found, skipping.\n`);
		return null;
	}

	const filtered = collection.filterEvents(activeEvents as any, now);
	if (filtered.length === 0) {
		console.log(`  0 events, skipping.\n`);
		return null;
	}

	const selected = pickDiverseEvents(filtered, 8);
	if (selected.length < 4) {
		console.log(`  Only ${selected.length} events with images, need 4. Skipping.\n`);
		return null;
	}

	const isEnglish = ENGLISH_SLUGS.has(slug);
	const lang = isEnglish ? 'en' as const : 'no' as const;
	const title = isEnglish ? collection.title.en : collection.title.no;

	const carouselEvents: CarouselEvent[] = selected.map(e => ({
		title: isEnglish ? (e.title_en || e.title_no) : e.title_no,
		venue: e.venue_name,
		time: formatEventTime(e.date_start, lang),
		category: e.category,
		imageUrl: e.image_url || undefined,
		isFree: isFreeEvent(e.price),
		dateLabel: buildDateLabel(e.date_start, lang, now)
	}));

	console.log(`  ${selected.length} events selected for reel`);

	const frames = await generateReelsFrames(title, carouselEvents, { lang });
	if (frames.length < 2) {
		console.log(`  Too few frames (${frames.length}), skipping.\n`);
		return null;
	}

	try {
		const outro = await generateReelsOutro(title, lang);
		if (outro) {
			frames.push(outro);
			console.log(`  Outro slide appended (${frames.length} frames total)`);
		}
	} catch (err: any) {
		console.log(`  [skip] Outro render failed: ${err.message}`);
	}

	if (dryRun) {
		console.log(`  [DRY RUN] Would encode ${frames.length} frames → MP4\n`);
		return null;
	}

	if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
	for (let i = 0; i < frames.length; i++) {
		writeFileSync(resolve(tmpDir, `frame-${String(i).padStart(3, '0')}.png`), frames[i]);
	}

	const concatLines = frames.map((_, i) =>
		`file 'frame-${String(i).padStart(3, '0')}.png'\nduration ${FRAME_DURATION}`
	).join('\n') + `\nfile 'frame-${String(frames.length - 1).padStart(3, '0')}.png'`;
	writeFileSync(resolve(tmpDir, 'concat.txt'), concatLines);

	const outputPath = resolve(tmpDir, `${slug}-${dateStr}.mp4`);

	try {
		const cmd = [
			`"${FFMPEG}"`,
			'-y',
			'-f concat',
			'-safe 0',
			`-i "${resolve(tmpDir, 'concat.txt')}"`,
			'-vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p"',
			'-c:v libx264',
			'-preset medium',
			'-crf 23',
			'-r 30',
			'-movflags +faststart',
			`"${outputPath}"`
		].join(' ');
		console.log(`  Encoding ${frames.length} frames → MP4...`);
		execSync(cmd, { stdio: 'pipe', timeout: 60000 });
		console.log(`  Encoded: ${outputPath}`);
	} catch (err: any) {
		console.error(`  FFmpeg failed: ${err.message}`);
		return null;
	}

	const videoBuffer = readFileSync(outputPath);
	const storagePath = `${dateStr}/${slug}/reel.mp4`;
	const { error: uploadError } = await supabase.storage
		.from(STORAGE_BUCKET)
		.upload(storagePath, videoBuffer, {
			contentType: 'video/mp4',
			upsert: true
		});

	let publicUrl: string | null = null;
	if (uploadError) {
		console.error(`  Upload failed: ${uploadError.message}`);
		console.log(`  Local MP4 kept at: ${outputPath}`);
	} else {
		const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
		publicUrl = urlData.publicUrl;
		console.log(`  Uploaded: ${publicUrl}`);
	}

	let delivery: ReelDelivery | null = null;
	if (publicUrl) {
		const collectionUrl = `https://gaari.no/${lang}/${slug}?utm_source=instagram&utm_medium=reels&utm_campaign=${slug}`;
		const captionEvents: CaptionEvent[] = selected.map(e => ({
			title: isEnglish ? (e.title_en || e.title_no) : e.title_no,
			venue: e.venue_name,
			date_start: e.date_start,
			category: e.category
		}));
		const hashtags = HASHTAGS[slug] || ['#bergen', '#bergenby', '#hvaskjeribergen'];
		const caption = generateCaption(title, captionEvents, collectionUrl, hashtags, lang);

		const captionPath = `${dateStr}/${slug}/caption.txt`;
		const { error: capErr } = await supabase.storage
			.from(STORAGE_BUCKET)
			.upload(captionPath, Buffer.from(caption, 'utf-8'), {
				contentType: 'text/plain; charset=utf-8',
				upsert: true
			});
		if (capErr) console.warn(`  Caption upload failed: ${capErr.message}`);

		const storyTarget = slug === 'i-dag' || slug === 'today-in-bergen'
			? STORY_BATCH_SIZE
			: STORY_BATCH_SIZE_OTHER;
		const storyEvents = pickDiverseEvents(filtered, storyTarget);
		const storyCarouselEvents: CarouselEvent[] = storyEvents.map(e => ({
			title: isEnglish ? (e.title_en || e.title_no) : e.title_no,
			venue: e.venue_name,
			time: formatEventTime(e.date_start, lang),
			category: e.category,
			imageUrl: e.image_url || undefined,
			isFree: isFreeEvent(e.price),
			dateLabel: buildDateLabel(e.date_start, lang, now)
		}));
		console.log(`  Generating ${storyEvents.length} story slides...`);
		const storyImages = await generateStories(title, storyCarouselEvents, { lang });
		const storyManifest: { url: string; venue: string; igHandle: string | null; title: string }[] = [];
		for (let i = 0; i < storyImages.length; i++) {
			const storyPath = `${dateStr}/${slug}/story-${i + 1}.png`;
			const { error: storyErr } = await supabase.storage
				.from(STORAGE_BUCKET)
				.upload(storyPath, storyImages[i], {
					contentType: 'image/png',
					upsert: true
				});
			if (storyErr) {
				console.warn(`  Story ${i + 1} upload failed: ${storyErr.message}`);
				continue;
			}
			const { data: storyUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storyPath);
			const ev = storyEvents[i];
			storyManifest.push({
				url: storyUrlData.publicUrl,
				venue: ev.venue_name,
				igHandle: getVenueInstagram(ev.venue_name),
				title: isEnglish ? (ev.title_en || ev.title_no) : ev.title_no
			});
		}

		if (storyManifest.length > 0) {
			const manifestPath = `${dateStr}/${slug}/stories.json`;
			const { error: manErr } = await supabase.storage
				.from(STORAGE_BUCKET)
				.upload(manifestPath, Buffer.from(JSON.stringify(storyManifest), 'utf-8'), {
					contentType: 'application/json; charset=utf-8',
					upsert: true
				});
			if (manErr) console.warn(`  Story manifest upload failed: ${manErr.message}`);
			else console.log(`  ${storyManifest.length} story slides uploaded`);
		}

		delivery = {
			slug,
			dateStr,
			collectionTitle: title,
			collectionUrl,
			mp4Url: publicUrl,
			landingUrl: `https://gaari.no/r/${dateStr}/${slug}`,
			caption,
			frameCount: frames.length,
			durationSec: frames.length * FRAME_DURATION,
			storyCount: storyManifest.length
		};
	}

	for (let i = 0; i < frames.length; i++) {
		try { unlinkSync(resolve(tmpDir, `frame-${String(i).padStart(3, '0')}.png`)); } catch {}
	}
	try { unlinkSync(resolve(tmpDir, 'concat.txt')); } catch {}
	if (!uploadError) {
		try { unlinkSync(outputPath); } catch {}
	}

	console.log('');
	return delivery;
}

/**
 * Fetch active upcoming events once. Shared between main() and generate-week.ts
 * so we don't hit Supabase repeatedly when generating a whole week of reels.
 */
export async function fetchActiveEvents(): Promise<GaariEvent[]> {
	const { data, error } = await supabase
		.from('events')
		.select('*')
		.eq('status', 'approved')
		.gte('date_start', new Date().toISOString())
		.order('date_start', { ascending: true })
		.limit(500);
	if (error || !data) {
		throw new Error(`Failed to fetch events: ${error?.message}`);
	}
	return (data as any).filter((e: any) => e.status !== 'cancelled') as GaariEvent[];
}

async function main() {
	const now = getOsloNow();
	const dateStr = toOsloDateStr(now);
	const tmpDir = resolve(import.meta.dirname, '.reels-tmp');
	const deliveries: ReelDelivery[] = [];

	console.log(`Reels generation \u2014 ${dateStr}${DRY_RUN ? ' (DRY RUN)' : ''}${SEND_EMAIL ? ' (+ email)' : ''}\n`);

	if (!DRY_RUN) await ensureBucket();

	const activeEvents = await fetchActiveEvents();

	for (const slug of REELS_SLUGS) {
		const delivery = await generateOneCollection({
			slug,
			dateStr,
			now,
			activeEvents,
			tmpDir,
			dryRun: DRY_RUN
		});
		if (delivery) deliveries.push(delivery);
	}

	if (SEND_EMAIL && !DRY_RUN) {
		await emailReelDelivery(deliveries);
	}

	console.log('Done.');
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
