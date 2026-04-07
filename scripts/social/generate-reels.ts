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
import { generateReelsFrames, type CarouselEvent } from './image-gen.js';
import type { GaariEvent } from '../../src/lib/types.js';

const DRY_RUN = process.argv.includes('--dry-run');
const SLUG_ARG = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1];
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

const ENGLISH_SLUGS = new Set(['today-in-bergen', 'this-weekend']);

/** Seconds each frame is shown */
const FRAME_DURATION = 3;

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

		// Pick events with images, max 1 per venue
		const sorted = [...filtered].sort((a, b) => {
			const aImg = a.image_url ? 0 : 1;
			const bImg = b.image_url ? 0 : 1;
			if (aImg !== bImg) return aImg - bImg;
			return a.date_start.localeCompare(b.date_start);
		});

		const venueSeen = new Set<string>();
		const selected: GaariEvent[] = [];
		for (const e of sorted) {
			if (selected.length >= 8) break;
			if (venueSeen.has(e.venue_name)) continue;
			if (!e.image_url) continue;
			venueSeen.add(e.venue_name);
			selected.push(e);
		}

		if (selected.length < 4) {
			console.log(`  Only ${selected.length} events with images, need 4. Skipping.\n`);
			continue;
		}

		const isEnglish = ENGLISH_SLUGS.has(slug);
		const lang = isEnglish ? 'en' as const : 'no' as const;
		const title = isEnglish ? collection.title.en : collection.title.no;

		const carouselEvents: CarouselEvent[] = selected.map(e => ({
			title: e.title_no,
			venue: e.venue_name,
			time: formatEventTime(e.date_start, lang),
			category: e.category,
			imageUrl: e.image_url || undefined,
			isFree: isFreeEvent(e.price)
		}));

		console.log(`  ${selected.length} events selected for reel`);

		// Generate frames
		const frames = await generateReelsFrames(title, carouselEvents, { lang });
		if (frames.length < 2) {
			console.log(`  Too few frames (${frames.length}), skipping.\n`);
			continue;
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
		} else {
			const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(storagePath);
			console.log(`  Uploaded: ${urlData.publicUrl}`);
		}

		// Cleanup temp files
		for (let i = 0; i < frames.length; i++) {
			try { unlinkSync(resolve(tmpDir, `frame-${String(i).padStart(3, '0')}.png`)); } catch {}
		}
		try { unlinkSync(resolve(tmpDir, 'concat.txt')); } catch {}
		try { unlinkSync(outputPath); } catch {}

		console.log('');
	}

	console.log('Done.');
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
