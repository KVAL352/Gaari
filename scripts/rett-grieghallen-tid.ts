/**
 * Rett `date_start` på Grieghallen-arrangementer som ligger feil i basen.
 *
 * BAKGRUNN
 *
 * Grieghallen oppgir tidspunktet som naken lokal tid, «2026-09-02 19:30:00».
 * `new Date()` tolket den som kjøretidens lokale tid, og GitHub Actions kjører
 * i UTC. Konserten ble lagret som 19:30 UTC og vist som 21:30 i Bergen.
 * Nettsida viste altså konsertene to timer for sent om sommeren og én time for
 * sent om vinteren.
 *
 * Scraperen er rettet, men bare framover: `eventExists()` hopper over rader som
 * alt ligger inne, så de gamle blir stående til noen rydder dem.
 *
 * SANNHETSKILDEN ER GRIEGHALLEN, IKKE BESKRIVELSEN
 *
 * Skriptet henter listen fra grieghallen.no på nytt og bruker deres oppgitte
 * tid. Beskrivelsen kan ikke brukes som fasit: den er skrevet av en modell som
 * fikk ISO-strengen, og er derfor et vitne til den samme feilen.
 *
 * Bruk:
 *   npx tsx scripts/rett-grieghallen-tid.ts            tørrkjøring
 *   npx tsx scripts/rett-grieghallen-tid.ts --skriv    skriver
 */
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { bergenOffset, fetchHTML } from './lib/utils.js';

const SKRIV = process.argv.includes('--skriv');

function tilBergenTid(naken: string): Date {
	const t = naken.trim().replace(' ', 'T');
	return new Date(`${t}${bergenOffset(t.slice(0, 10))}`);
}

const html = await fetchHTML('https://www.grieghallen.no/arrangementer');
if (!html) {
	console.error('Kunne ikke hente listen fra grieghallen.no. Avbryter uten aa endre noe.');
	process.exit(1);
}

// Samme uttrekk som scraperen selv bruker. Et regex-par over url og tidspunkt
// traff null, fordi objektene har noestede felter og moensteret stoppet for
// tidlig. Aa parse JSON-en ordentlig er baade riktigere og mindre skjoert.
function hentJsonArray(kilde: string, noekkel: string): any[] | null {
	const marker = `${noekkel}: [`;
	const i = kilde.indexOf(marker);
	if (i < 0) return null;
	const start = i + marker.length - 1;
	let dybde = 0;
	let slutt = start;
	for (let j = start; j < kilde.length; j++) {
		if (kilde[j] === '[') dybde++;
		else if (kilde[j] === ']') dybde--;
		if (dybde === 0) { slutt = j + 1; break; }
	}
	try { return JSON.parse(kilde.slice(start, slutt)); } catch { return null; }
}

const fraKilden = new Map<string, string>();
for (const e of hentJsonArray(html, 'events') ?? []) {
	if (e?.url && e?.firstEventDate) fraKilden.set(String(e.url), String(e.firstEventDate));
}
console.log(`Hentet ${fraKilden.size} tidspunkter fra grieghallen.no\n`);

const { data: rader } = await supabase
	.from('events')
	.select('id,slug,title_no,date_start,source_url')
	.eq('source', 'grieghallen')
	.gte('date_start', new Date().toISOString());

const endringer: { id: string; fra: string; til: string; t: string }[] = [];
let uten = 0;

for (const e of rader ?? []) {
	const sti = (e.source_url ?? '').replace('https://www.grieghallen.no', '');
	const naken = fraKilden.get(sti);
	if (!naken) {
		uten++;
		continue;
	}
	const riktig = tilBergenTid(naken).toISOString();
	if (riktig === e.date_start) continue;
	endringer.push({ id: e.id, fra: e.date_start, til: riktig, t: e.title_no ?? '' });
}

const iBergen = (iso: string) =>
	new Date(iso).toLocaleTimeString('nb-NO', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit' });

// Skill de to slagene endring. En tidssoneretting flytter klokkeslettet paa
// samme dag. Endrer datoen seg, har arrangoeren flyttet arrangementet, og det
// er en helt annen sak som skal vaere synlig.
const dag = (iso: string) =>
	new Date(iso).toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo' });
const tidssone = endringer.filter((e) => dag(e.fra) === dag(e.til));
const flyttet = endringer.filter((e) => dag(e.fra) !== dag(e.til));

console.log(`${(rader ?? []).length} kommende grieghallen-rader`);
console.log(`  ${uten} fantes ikke i dagens liste, roeres ikke`);
console.log(`  ${tidssone.length} med feil klokkeslett paa samme dag (tidssonefeilen)`);
console.log(`  ${flyttet.length} der arrangoeren har flyttet selve datoen`);
console.log('');

if (flyttet.length) {
	console.log('  Flyttede arrangementer:');
	for (const e of flyttet.slice(0, 10)) {
		console.log(`    ${dag(e.fra)} ${iBergen(e.fra)} -> ${dag(e.til)} ${iBergen(e.til)}   ${e.t.slice(0, 40)}`);
	}
	console.log('');
}

for (const e of endringer.slice(0, 10)) {
	console.log(`  ${iBergen(e.fra)} -> ${iBergen(e.til)}   ${e.t.slice(0, 52)}`);
}
if (endringer.length > 10) console.log(`  ... og ${endringer.length - 10} til`);

if (!SKRIV) {
	console.log('\nTOERRKJOERING. Kjoer med --skriv for aa rette.');
	process.exit(0);
}

let ok = 0;
for (const e of endringer) {
	const { error } = await supabase.from('events').update({ date_start: e.til }).eq('id', e.id);
	if (error) console.error(`  FEIL ${e.id}: ${error.message}`);
	else ok++;
}
console.log(`\nRettet ${ok} av ${endringer.length}.`);
