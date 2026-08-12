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
	'museumvest',
	'kode',
	// Fase 2 hot-link
	'forumscene', 'litthusbergen', 'beyondthegates', 'kulturhusetibergen',
	'colonialen', 'oconnors', 'floyen', 'bergenkjott', 'bymuseet',
	'bergenfilmklubb', 'carteblanche', 'kunsthall', 'usfverftet', 'stenematglede',
	// Disse mangler typisk og:image på detail-sider, men inkluderes for sjekk
	'dnt', 'bodega', 'bergenfest', 'olebull', 'generasjonsfestivalen',
	'studentbergen', 'ostre', 'kvarteret',
	// Fase 3 — aggregatorer
	'billetto', 'ticketco',
];

// Approved per-URL — only specific events under these sources are allowed.
const STUDENTBERGEN_PATTERNS = ['ulriken-opp', '7-fjellsturen', '17-mai-feiring-i-bergen', 'bergen-eco-trail'];

/**
 * Kommandolinja: --kilde <slug> kjører bare én kilde.
 *
 * Uten den kjøres hele SOURCE_BACKFILL, og det er sjelden det du vil når du
 * rydder opp etter én arrangør. En full kjøring tar ett og et halvt sekund per
 * arrangement og rører kilder du ikke har tenkt på.
 */
const kunKilde = (() => {
	const i = process.argv.indexOf('--kilde');
	return i >= 0 ? process.argv[i + 1] : undefined;
})();

async function main() {
	const nowUtc = new Date().toISOString();

	// Både det som pågår og det som kommer. Tidligere sto det bare
	// date_start >= nå, og da var utstillinger og andre langtidsarrangementer
	// usynlige for reparasjonen. Det er en dyr blindsone: nettopp de gamle
	// oppføringene er de som ble lagt inn mens bildene var slått av, og de
	// hentes aldri på nytt fordi eventExists hopper over dem.
	const pågårEllerKommer = `date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`;

	const kilder = kunKilde ? SOURCE_BACKFILL.filter(s => s === kunKilde) : SOURCE_BACKFILL;
	if (kunKilde && !kilder.length) {
		console.error(`Ukjent kilde: ${kunKilde}. Gyldige er:\n  ${SOURCE_BACKFILL.join(', ')}`);
		process.exit(1);
	}

	const sourceResults = await Promise.all(
		kilder.map(async s => {
			const { data } = await supabase
				.from('events')
				.select('source_url, source, title_no')
				.eq('source', s)
				.is('image_url', null)
				.or(pågårEllerKommer);
			return { source: s, rows: (data || []) as Row[] };
		})
	);

	const sbResults = await Promise.all(
		kunKilde && kunKilde !== 'studentbergen'
			? []
			: STUDENTBERGEN_PATTERNS.map(p =>
					supabase
						.from('events')
						.select('source_url, source, title_no')
						.eq('source', 'studentbergen')
						.is('image_url', null)
						.or(pågårEllerKommer)
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
