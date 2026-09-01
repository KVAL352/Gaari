/**
 * Rett klokkeslettet i beskrivelser som oppgir UTC-tid i stedet for Oslo-tid.
 *
 * BAKGRUNN
 *
 * Prompten fikk den rå ISO-strengen, `Date: 2026-12-04T18:00:00+00:00`.
 * Modellen leste sifrene og skrev «kl. 18.00», altså UTC. Sida viser Oslo-tid,
 * 19.00, så beskrivelsen sa noe annet enn klokkeslettet rett ved siden av.
 * Feilen er rettet i lib/ai-descriptions.ts, men bare framover.
 *
 * HVEM RETTES, OG HVORFOR AKKURAT DE
 *
 * Bare rader der avviket er nøyaktig +60 eller +120 minutter. De to verdiene
 * er vinter- og sommertid i Norge, og et avvik som treffer nøyaktig én av dem
 * er beskrivelsen som gjengir date_start i UTC. Teksten bærer da ingen egen
 * informasjon, og date_start er eneste sannhetskilde vi har.
 *
 * Rader med andre avvik er ekte uenigheter mellom arrangørens side og
 * scraperen, og de skal ikke røres av et skript. De står som egen sak.
 *
 * Bruk:
 *   npx tsx scripts/rett-klokkeslett.ts            tørrkjøring
 *   npx tsx scripts/rett-klokkeslett.ts --skriv    skriver
 */
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { fetchAllRows } from './lib/utils.js';
import { klokkeslettITekst, klokkeslettIFelt } from './lib/datakonsistens.js';

const SKRIV = process.argv.includes('--skriv');

/**
 * Kilder som holdes utenfor, fordi vi ikke vet at `date_start` er riktig.
 *
 * Grieghallen hadde motsatt feil: scraperen tolket naken lokal tid som UTC, så
 * FELTET lå to timer feil mens beskrivelsen var riktig. Det ble rettet for seg,
 * i scraperen og i basen, med Grieghallens egen liste som fasit.
 *
 * `usfverftet` ble kontrollert 1. september og er IKKE en feil. Kilden sender
 * «2026-11-19T18:00:00.000Z» med eksplisitt Z, og 18:00 UTC er 19:00 i Bergen
 * om vinteren, altså nøyaktig det feltet sier. Sida nevner «Dører», så de åtte
 * avvikene er dørene mot konsertstart. To ulike tidspunkter som begge er
 * riktige, og som et skript ikke skal blande seg i.
 *
 * `brettspill` ble kontrollert samme dag og er trygg: kilden sender også Z, så
 * feltet er riktig, og radene hadde bare UTC-feilen i teksten. Den ble først
 * holdt utenfor fordi den manglet bergenOffset, men det viste seg unødvendig:
 * bergenOffset trengs bare når kilden IKKE oppgir tidssone.
 *
 * De store kildene er kontrollert mot kilden: litthusbergen oppgir 20:15 på
 * sida, som er feltets tid, mens beskrivelsen sa 18:15. Der er feltet fasit.
 */
const HOLDES_UTENFOR = new Set(['usfverftet', 'grieghallen']);

/** Minutter siden midnatt. */
const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/**
 * Bytt klokkeslettet i teksten, uten å røre noe annet.
 *
 * Norsk skriver «kl. 19.00», engelsk «at 19.00» eller «at 19:00». Vi bytter
 * bare selve tallene, og beholder skilletegnet teksten alt bruker. Ellers
 * ville en retting endret stil på halvparten av beskrivelsene.
 */
export function byttKlokkeslett(tekst: string, fra: string, til: string): string {
	const [ft, fm] = [fra.slice(0, 2), fra.slice(3, 5)];
	const [tt, tm] = [til.slice(0, 2), til.slice(3, 5)];
	// Tåler både 09.00 og 9.00, og både punktum og kolon.
	const m = new RegExp(`\\b0?${Number(ft)}[.:]${fm}\\b`, 'g');
	return tekst.replace(m, (treff) => (treff.includes(':') ? `${tt}:${tm}` : `${tt}.${tm}`));
}

const rader = await fetchAllRows<any>(
	(fra, til) =>
		supabase
			.from('events')
			.select('id,slug,source,title_no,description_no,description_en,date_start')
			.eq('status', 'approved')
			.gte('date_start', new Date().toISOString())
			.order('id', { ascending: true })
			.range(fra, til),
	'klokkeslettretting'
);

let kandidater = 0;
let annetAvvik = 0;
let uendret = 0;
const endringer: { id: string; no: string; en: string | null; fra: string; til: string; t: string }[] = [];

for (const e of rader) {
	const sagt = klokkeslettITekst(e.description_no);
	const felt = klokkeslettIFelt(e.date_start);
	if (!sagt || !felt || sagt === felt) continue;

	if (HOLDES_UTENFOR.has(e.source ?? '')) continue;

	const diff = min(felt) - min(sagt);
	if (diff !== 60 && diff !== 120) {
		annetAvvik++;
		continue;
	}
	kandidater++;

	const nyNo = byttKlokkeslett(e.description_no, sagt, felt);
	const nyEn = e.description_en ? byttKlokkeslett(e.description_en, sagt, felt) : null;

	if (nyNo === e.description_no) {
		// Klokkeslettet stod i en form regexen ikke traff. Da lar vi den staa.
		uendret++;
		continue;
	}
	endringer.push({ id: e.id, no: nyNo, en: nyEn, fra: sagt, til: felt, t: e.title_no ?? '' });
}

console.log(`${rader.length} kommende arrangementer`);
console.log(`  ${kandidater} med avvik paa noeyaktig 60 eller 120 minutter`);
console.log(`  ${annetAvvik} med andre avvik, roeres ikke`);
console.log(`  ${uendret} der klokkeslettet ikke lot seg bytte i teksten`);
console.log(`  ${endringer.length} klare til retting\n`);

for (const e of endringer.slice(0, 8)) {
	console.log(`  ${e.fra} -> ${e.til}   ${e.t.slice(0, 54)}`);
}
if (endringer.length > 8) console.log(`  ... og ${endringer.length - 8} til`);

if (!SKRIV) {
	console.log('\nTOERRKJOERING. Kjoer med --skriv for aa rette.');
	process.exit(0);
}

let ok = 0;
for (const e of endringer) {
	const oppd: Record<string, string> = { description_no: e.no };
	if (e.en) oppd.description_en = e.en;
	const { error } = await supabase.from('events').update(oppd).eq('id', e.id);
	if (error) console.error(`  FEIL ${e.id}: ${error.message}`);
	else ok++;
}
console.log(`\nRettet ${ok} av ${endringer.length}.`);
