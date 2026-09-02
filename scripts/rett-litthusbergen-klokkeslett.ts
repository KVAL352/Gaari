/**
 * Retter starttidspunktet paa litthusbergen-rader som fikk SLUTT-tiden.
 *
 * HVORFOR DENNE FINNES
 *
 * Programsiden legger dag, dato, maaned og klokkeslett i hvert sitt
 * h3-element. `.text()` limer dem sammen uten skilletegn:
 *
 *     Tirs.08.0918:30–21:00Petrichor skrivegruppe
 *
 * Uttrykket som hentet ut klokkeslettet krevde et ikke-siffer foran timetallet,
 * for aa unngaa treff som «38:30». Men maanedstallet («09») limer seg rett foran
 * starttiden, saa starten hadde alltid et siffer foran seg og ble hoppet over.
 * Det foerste lovlige treffet ble SLUTT-tiden, som staar rett etter
 * tankestreken.
 *
 * Alle 25 arrangementene paa programsiden ble rammet. Leseren fikk beskjed om
 * aa moete opp naar arrangementet var slutt: «Oster og sidere fra Hordaland»
 * 4. september sto 22:00 mot reelle 19:00, og frukostmoetet 3. september sto
 * 10:45 mot 10:00.
 *
 * Feilen er samme KLASSE som Grieghallen-feilen 1. september — nettsida viste
 * feil tid til leseren, og ingenting lyste roedt. Den slapp unna
 * `klokkeslett-spriker` fordi den sjekken sammenligner det strukturerte feltet
 * med radens egen tekst, og litthusbergen-radene har maltekst uten klokkeslett
 * (Gemini-kvoten). Jf. [[pattern_ingenting_ser_ut_som_suksess]].
 *
 * HVORFOR VI IKKE BARE FLYTTER ALT ET FAST ANTALL TIMER
 *
 * Varigheten varierer — 45 minutter, én time, tre timer. Et fast avvik ville
 * sementert ny feil paa de fleste radene. Derfor leses kilden paa nytt, jf.
 * [[pattern_sjekk_kilden_for_du_retter]].
 *
 * Bruk:
 *   cd scripts && npx tsx rett-litthusbergen-klokkeslett.ts          # toerrkjoering
 *   cd scripts && npx tsx rett-litthusbergen-klokkeslett.ts --apply  # skriver
 */
import 'dotenv/config';
import * as cheerio from 'cheerio';
import { supabase } from './lib/supabase';
import { fetchHTML, fetchAllRows, bergenOffset } from './lib/utils';
import { startTidFraH3 } from './scrapers/litthusbergen';

const SKRIV = process.argv.includes('--apply');
const BASE_URL = 'https://www.litthusbergen.no/program';
const PAGE_PARAM = '90422230_page';
const MAX_SIDER = 5;

type Fasit = { start: string; slutt: string | null; tid: string; tittel: string };
type Rad = { id: string; slug: string; title_no: string; date_start: string; date_end: string | null; source_url: string };

/** Samme datoformat som scraperen leser: «Feb 20, 2026». */
function parseEngelskDato(raw: string): string | null {
	if (!raw) return null;
	const d = new Date(raw);
	if (isNaN(d.getTime())) return null;
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Leser programsidene og bygger fasit: lenke → riktig starttid. */
async function hentFasit(): Promise<Map<string, Fasit>> {
	const fasit = new Map<string, Fasit>();
	for (let side = 1; side <= MAX_SIDER; side++) {
		const url = side === 1 ? BASE_URL : `${BASE_URL}?${PAGE_PARAM}=${side}`;
		const html = await fetchHTML(url);
		if (!html) break;
		const $ = cheerio.load(html);
		const items = $('#program-list .w-dyn-item');
		if (items.length === 0) break;
		let paaSiden = 0;
		items.each((_, el) => {
			const item = $(el);
			const link = item.find('a[href*="/arrangement/"]').attr('href');
			if (!link) return;
			const tittel = item.find('[class*="name"]').first().text().trim();
			if (!tittel) return;
			const start = parseEngelskDato(item.find('input.event-start-date').attr('value') || '');
			if (!start) return;
			const slutt = parseEngelskDato(item.find('input.event-end-date').attr('value') || '');

			// Samme funksjon som scraperen bruker, ikke en kopi av regelen.
			const tid = startTidFraH3(item.find('h3').text());

			fasit.set(`https://www.litthusbergen.no${link}`, { start, slutt, tid, tittel });
			paaSiden++;
		});
		console.log(`  side ${side}: ${paaSiden} arrangementer`);
		if (paaSiden === 0) break;
	}
	return fasit;
}

function lokal(iso: string): string {
	return new Date(iso).toLocaleString('no-NO', {
		timeZone: 'Europe/Oslo',
		dateStyle: 'short',
		timeStyle: 'short',
	});
}

async function main() {
	console.log('Leser programsidene …');
	const fasit = await hentFasit();
	console.log(`Fasit: ${fasit.size} arrangementer fra kilden.\n`);

	if (fasit.size === 0) {
		console.error('Fikk ingenting fra kilden. Stopper — en tom fasit skal aldri faa rette noe.');
		process.exit(1);
	}

	const iDag = new Date().toISOString().slice(0, 10);
	const rader = await fetchAllRows<Rad>(
		(fra, til) =>
			supabase
				.from('events')
				.select('id, slug, title_no, date_start, date_end, source_url')
				.eq('source', 'litthusbergen')
				.eq('status', 'approved')
				.gte('date_start', iDag)
				.order('id', { ascending: true })
				.range(fra, til),
		'litthusbergen'
	);
	console.log(`${rader.length} kommende rader i basen.\n`);

	const endringer: Array<{ rad: Rad; nyStart: string; nyEnd: string | null | undefined }> = [];
	let uten = 0;
	const datosprik: Array<{ rad: Rad; fasitdato: string }> = [];

	for (const rad of rader) {
		const f = fasit.get(rad.source_url);
		if (!f) {
			uten++;
			continue;
		}

		// Datoen skal IKKE flyttes av en klokkeslettretting.
		//
		// Fasiten er noeklet paa lenke, og gjentagende arrangementer deler lenke
		// («Froeken Julie» gaar mange kvelder). Da vinner den siste forekomsten i
		// kartet, og en rad for 12. september ville faatt datoen til 19.
		// september med paa kjoepet. To rader traff nettopp dette i
		// toerrkjoeringen. Retter vi bare klokkeslettet, kan vi ikke goere skade
		// paa datoen.
		const radDato = new Date(rad.date_start).toLocaleDateString('sv-SE', {
			timeZone: 'Europe/Oslo',
		});
		if (radDato !== f.start) {
			datosprik.push({ rad, fasitdato: f.start });
			continue;
		}

		const nyStart = new Date(`${f.start}T${f.tid}:00${bergenOffset(f.start)}`).toISOString();

		// Sluttdato foer startdato er alltid feil — da er tomt riktigere.
		let nyEnd: string | null | undefined = undefined;
		if (rad.date_end && rad.date_end < nyStart) nyEnd = null;

		// Sammenlign tidspunkt, ikke tekst. Supabase leverer
		// «2026-10-29T11:00:00+00:00» mens toISOString() gir
		// «2026-10-29T11:00:00.000Z» — samme oeyeblikk, ulike strenger. Uten
		// dette listet toerrkjoeringen rader med «fra 12:00 → til 12:00», og en
		// toerrkjoering som lyver om hva den skal gjoere er verre enn ingen.
		const uendret = new Date(rad.date_start).getTime() === new Date(nyStart).getTime();
		if (!uendret || nyEnd !== undefined) {
			endringer.push({ rad, nyStart, nyEnd });
		}
	}

	if (uten > 0) {
		console.log(`${uten} rader finnes ikke lenger paa programsidene. De roeres IKKE.\n`);
	}

	if (datosprik.length > 0) {
		console.log(`${datosprik.length} rader har en annen dato enn fasiten og roeres IKKE:`);
		for (const { rad, fasitdato } of datosprik) {
			console.log(`  ${rad.title_no.slice(0, 46)}`);
			console.log(`     basen: ${lokal(rad.date_start)}   fasit paa samme lenke: ${fasitdato}`);
		}
		console.log('  (gjentagende arrangement som deler lenke — vurderes for seg)\n');
	}

	if (endringer.length === 0) {
		console.log('Ingen rader trenger retting.');
		return;
	}

	console.log(`${endringer.length} rader skal rettes:\n`);
	for (const { rad, nyStart, nyEnd } of endringer) {
		console.log(`  ${rad.title_no.slice(0, 46)}`);
		console.log(`     fra ${lokal(rad.date_start)}  →  til ${lokal(nyStart)}`);
		if (nyEnd === null) console.log(`     date_end ${lokal(rad.date_end!)} laa foer starten, settes til null`);
	}

	if (!SKRIV) {
		console.log('\nToerrkjoering. Les listen over. Kjoer med --apply for aa skrive.');
		return;
	}

	let ok = 0;
	for (const { rad, nyStart, nyEnd } of endringer) {
		const felt: Record<string, unknown> = { date_start: nyStart };
		if (nyEnd === null) felt.date_end = null;
		const { error } = await supabase.from('events').update(felt).eq('id', rad.id);
		if (error) console.warn(`  ! ${rad.slug}: ${error.message}`);
		else ok++;
	}
	console.log(`\nRettet: ${ok} av ${endringer.length}.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
