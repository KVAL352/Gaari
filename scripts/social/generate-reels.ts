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
import { generateReelsFrames, generateReelsOutro, type CarouselEvent } from './image-gen.js';
import { generateCaption, type CaptionEvent } from './caption-gen.js';
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
	collectionTitle: string;
	collectionUrl: string;
	mp4Url: string;
	caption: string;
	frameCount: number;
	durationSec: number;
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
		<div style="margin-bottom:32px;border:2px solid #e6e3da;border-radius:12px;padding:20px;">
			<h2 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:22px;color:#141414;">
				${d.collectionTitle}
			</h2>
			<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#4D4D4D;">
				${d.frameCount} slides &middot; ${d.durationSec} sek
			</p>

			<table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
				<tr>
					<td style="background:#C82D2D;border-radius:8px;">
						<a href="${d.mp4Url}" download style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#fff;text-decoration:none;">
							Last ned MP4
						</a>
					</td>
				</tr>
			</table>

			<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#595959;">
				<strong>Caption</strong> (langtrykk for \u00e5 kopiere alt):
			</p>
			<pre style="margin:0;padding:14px;background:#f5f3ec;border-radius:8px;font-family:Menlo,Consolas,monospace;font-size:12px;color:#141414;white-space:pre-wrap;word-wrap:break-word;line-height:1.5;">${escapeHtml(d.caption)}</pre>

			<p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#737373;">
				Last opp manuelt: <strong>Instagram</strong> &rarr; Reels &rarr; lim inn caption.
				Cross-post til <strong>Facebook</strong> via "Del p\u00e5 Facebook"-bryteren n\u00e5r du publiserer.
			</p>
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
		<p style="margin:0 0 24px;font-size:15px;color:#4D4D4D;">
			${deliveries.length} video${deliveries.length === 1 ? '' : 'er'} generert. \u00c5pne denne eposten p\u00e5 mobilen,
			trykk "Last ned MP4", lagre i camera roll, og last opp manuelt p\u00e5 Instagram Reels.
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

async function main() {
	const now = getOsloNow();
	const dateStr = toOsloDateStr(now);
	const tmpDir = resolve(import.meta.dirname, '.reels-tmp');
	const deliveries: ReelDelivery[] = [];

	console.log(`Reels generation \u2014 ${dateStr}${DRY_RUN ? ' (DRY RUN)' : ''}${SEND_EMAIL ? ' (+ email)' : ''}\n`);

	if (!DRY_RUN) await ensureBucket();

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

		// Build caption and queue email delivery (only on successful upload)
		if (publicUrl) {
			const collectionUrl = `https://gaari.no/${lang}/${slug}?utm_source=instagram&utm_medium=reels&utm_campaign=${slug}`;
			const captionEvents: CaptionEvent[] = selected.map(e => ({
				title: isEnglish ? (e.title_en || e.title_no) : e.title_no,
				venue: e.venue_name,
				date_start: e.date_start,
				category: e.category
			}));
			const hashtags = HASHTAGS[slug] || ['#bergen', '#bergenby', '#hvaskjeribergen'];
			const caption = generateCaption(title, captionEvents, collectionUrl, hashtags, lang, { categoryIcons: false });
			deliveries.push({
				slug,
				collectionTitle: title,
				collectionUrl,
				mp4Url: publicUrl,
				caption,
				frameCount: frames.length,
				durationSec: frames.length * FRAME_DURATION
			});
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

	if (SEND_EMAIL && !DRY_RUN) {
		await emailReelDelivery(deliveries);
	}

	console.log('Done.');
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
