/**
 * One-off backfill — fetch og:image from existing events whose images
 * were stripped before the source was added to IMAGE_APPROVED_SOURCES.
 *
 * Safe to re-run: updateEventImage() only writes when image_url IS NULL,
 * and it re-checks isImageAllowed() before writing.
 */
import 'dotenv/config';
import * as cheerio from 'cheerio';
import { supabase } from './lib/supabase.js';
import { fetchHTML, updateEventImage, delay } from './lib/utils.js';

interface Row {
	source_url: string;
	source: string;
	title_no: string;
}

async function fetchOgImage(url: string): Promise<string | null> {
	const html = await fetchHTML(url);
	if (!html) return null;
	const $ = cheerio.load(html);
	const og = $('meta[property="og:image"]').attr('content')
		|| $('meta[name="og:image"]').attr('content')
		|| $('meta[property="twitter:image"]').attr('content');
	return og || null;
}

// Approved at the source level — every event from these sources may have its og:image restored.
// updateEventImage() re-checks isImageAllowed() before writing, so bergenbibliotek's title-keyword
// filter (foredrag/forelesning/etc.) is enforced automatically.
const SOURCE_BACKFILL = [
	'akvariet',
	'biff',
	'bitteater',
	'fyllingsdalenteater',
	'festspillene',
	'cornerteateret',
	'dns',
	'grieghallen',
	'brettspill',
	'bergenbibliotek',
];

// Approved per-URL — only specific events under these sources are allowed.
const STUDENTBERGEN_PATTERNS = ['ulriken-opp', '7-fjellsturen', '17-mai-feiring-i-bergen', 'bergen-eco-trail'];

async function main() {
	const nowUtc = new Date().toISOString();

	const sourceResults = await Promise.all(
		SOURCE_BACKFILL.map(async s => {
			const { data } = await supabase
				.from('events')
				.select('source_url, source, title_no')
				.eq('source', s)
				.is('image_url', null)
				.gte('date_start', nowUtc);
			return { source: s, rows: (data || []) as Row[] };
		})
	);

	const sbResults = await Promise.all(
		STUDENTBERGEN_PATTERNS.map(p =>
			supabase
				.from('events')
				.select('source_url, source, title_no')
				.eq('source', 'studentbergen')
				.is('image_url', null)
				.gte('date_start', nowUtc)
				.ilike('source_url', `%${p}%`)
		)
	);
	const studentbergen: Row[] = sbResults.flatMap(r => r.data || []);

	const all: Row[] = [
		...sourceResults.flatMap(r => r.rows),
		...studentbergen,
	];

	const breakdown = sourceResults
		.map(r => `${r.source}=${r.rows.length}`)
		.concat(`studentbergen=${studentbergen.length}`)
		.filter(s => !s.endsWith('=0'))
		.join(', ');
	console.log(`Backfilling ${all.length} events (${breakdown})\n`);

	let updated = 0;
	let noImage = 0;
	let failed = 0;

	for (const row of all) {
		await delay(1500);
		try {
			const ogImage = await fetchOgImage(row.source_url);
			if (!ogImage) {
				console.log(`  no og:image  ${row.title_no}`);
				noImage++;
				continue;
			}
			const ok = await updateEventImage(row.source_url, ogImage);
			if (ok) {
				console.log(`  updated      ${row.title_no}`);
				updated++;
			} else {
				console.log(`  skipped      ${row.title_no} (already has image or not allowed)`);
				failed++;
			}
		} catch (err) {
			console.error(`  error        ${row.title_no}:`, err instanceof Error ? err.message : err);
			failed++;
		}
	}

	console.log(`\nDone. updated=${updated}  no_image=${noImage}  skipped/failed=${failed}`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
