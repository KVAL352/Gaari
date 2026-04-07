/**
 * Generate Reels video from event data — PNG frames → FFmpeg → MP4.
 * Videos are stored in Supabase storage for manual publishing.
 *
 * Usage: cd scripts && npx tsx social/generate-reels.ts [--dry-run] [--slug=denne-helgen]
 *
 * Env vars: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync, unlinkSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { supabase } from '../lib/supabase.js';
import { getOsloNow, toOsloDateStr } from '../../src/lib/event-filters.js';
import { getCollection } from '../../src/lib/collections.js';
import { formatEventTime, isFreeEvent } from '../../src/lib/utils.js';
import { generateReelsFrames, generateReelsOutro, type CarouselEvent } from './image-gen.js';
import type { GaariEvent } from '../../src/lib/types.js';

const DRY_RUN = process.argv.includes('--dry-run');
const SLUG_ARG = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1];
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

const ENGLISH_SLUGS = new Set(['today-in-bergen', 'this-weekend']);

/** Seconds each frame is shown */
const FRAME_DURATION = 2;

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

async function main() {
	const now = getOsloNow();
	const dateStr = toOsloDateStr(now);
	const tmpDir = resolve(import.meta.dirname, '.reels-tmp');

	console.log(`Reels generation — ${dateStr}${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

	// Fetch events
	const { data: allEvents, error } = await supabase
		.from('events')
		.select('*')
		.eq('status', 'approved')
		.gte('date_start', new Date().toISOString())
		.order('date_start', { ascending: true })
		.limit(500);

	if (error || !allEvents) {
		console.error(`Failed to fetch events: ${error?.message}`);
		process.exit(1);
	}

	const active = allEvents.filter((e: any) => e.status !== 'cancelled');

	for (const slug of REELS_SLUGS) {
		console.log(`--- ${slug} ---`);
		const collection = getCollection(slug);
		if (!collection) {
			console.log(`  Collection not found, skipping.\n`);
			continue;
		}

		const filtered = collection.filterEvents(active as any, now);
		if (filtered.length === 0) {
			console.log(`  0 events, skipping.\n`);
			continue;
		}

		// Bucket events with images by Oslo day, then round-robin pick across days
		// so a multi-day collection (e.g. denne-helgen Fri+Sat+Sun) gets balanced coverage.
		const byDay = new Map<string, GaariEvent[]>();
		for (const e of filtered) {
			if (!e.image_url) continue;
			const day = new Date(e.date_start).toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
			if (!byDay.has(day)) byDay.set(day, []);
			byDay.get(day)!.push(e);
		}
		for (const list of byDay.values()) {
			list.sort((a, b) => a.date_start.localeCompare(b.date_start));
		}

		const dayKeys = [...byDay.keys()].sort();
		const venueSeen = new Set<string>();
		const selected: GaariEvent[] = [];
		const dayIdx = new Map(dayKeys.map(k => [k, 0]));
		let progress = true;
		while (selected.length < 8 && progress) {
			progress = false;
			for (const day of dayKeys) {
				if (selected.length >= 8) break;
				const list = byDay.get(day)!;
				let i = dayIdx.get(day)!;
				while (i < list.length && venueSeen.has(list[i].venue_name)) i++;
				if (i < list.length) {
					selected.push(list[i]);
					venueSeen.add(list[i].venue_name);
					dayIdx.set(day, i + 1);
					progress = true;
				}
			}
		}

		if (selected.length < 4) {
			console.log(`  Only ${selected.length} events with images, need 4. Skipping.\n`);
			continue;
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

		// Generate frames
		const frames = await generateReelsFrames(title, carouselEvents, { lang });
		if (frames.length < 2) {
			console.log(`  Too few frames (${frames.length}), skipping.\n`);
			continue;
		}

		// Append outro slide ("More on gaari.no")
		try {
			const outro = await generateReelsOutro(title, lang);
			if (outro) {
				frames.push(outro);
				console.log(`  Outro slide appended (${frames.length} frames total)`);
			}
		} catch (err: any) {
			console.log(`  [skip] Outro render failed: ${err.message}`);
		}

		if (DRY_RUN) {
			console.log(`  [DRY RUN] Would encode ${frames.length} frames → MP4\n`);
			continue;
		}

		// Write frames to temp dir
		if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
		for (let i = 0; i < frames.length; i++) {
			writeFileSync(resolve(tmpDir, `frame-${String(i).padStart(3, '0')}.png`), frames[i]);
		}

		// Create FFmpeg concat file (each frame shown for FRAME_DURATION seconds)
		// Repeat last frame to avoid FFmpeg trimming
		const concatLines = frames.map((_, i) =>
			`file 'frame-${String(i).padStart(3, '0')}.png'\nduration ${FRAME_DURATION}`
		).join('\n') + `\nfile 'frame-${String(frames.length - 1).padStart(3, '0')}.png'`;
		writeFileSync(resolve(tmpDir, 'concat.txt'), concatLines);

		const outputPath = resolve(tmpDir, `${slug}-${dateStr}.mp4`);

		// Encode with FFmpeg — slideshow with crossfade
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
			continue;
		}

		// Upload to Supabase storage
		const videoBuffer = readFileSync(outputPath);
		const storagePath = `${dateStr}/${slug}/reel.mp4`;
		const { error: uploadError } = await supabase.storage
			.from('social-media')
			.upload(storagePath, videoBuffer, {
				contentType: 'video/mp4',
				upsert: true
			});

		if (uploadError) {
			console.error(`  Upload failed: ${uploadError.message}`);
			console.log(`  Local MP4 kept at: ${outputPath}`);
		} else {
			const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(storagePath);
			console.log(`  Uploaded: ${urlData.publicUrl}`);
		}

		// Cleanup temp frame files (keep MP4 if upload failed)
		for (let i = 0; i < frames.length; i++) {
			try { unlinkSync(resolve(tmpDir, `frame-${String(i).padStart(3, '0')}.png`)); } catch {}
		}
		try { unlinkSync(resolve(tmpDir, 'concat.txt')); } catch {}
		if (!uploadError) {
			try { unlinkSync(outputPath); } catch {}
		}

		console.log('');
	}

	console.log('Done.');
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
