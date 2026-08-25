/**
 * Engangsjobb — retter konserter som ligger som «culture».
 *
 * Kategoriregelen i ticketco.ts lette etter «konsert», «musikk», «jazz»,
 * «rock» og «dj». En tittel som «Bjørgvin Bluesklubb - Alfonzo Band»
 * inneholder ingen av delene, så hele Madam Felle-programmet — 45
 * arrangementer, alle konserter — havnet på fellesnevneren «culture».
 *
 * Regelen er utvidet, men den gjelder bare framover. Radene som alt ligger
 * i basen blir stående til noen rydder dem. Det er denne jobben.
 *
 * Hvorfor det betyr noe: /no/konserter filtrerer på category === 'music',
 * så konsertsiden vår manglet 45 konserter. Siden ligger på plass 11,3 med
 * 1 542 visninger og 17 klikk.
 *
 * Bruk:
 *   npx tsx fix-ticketco-music-category.ts            # tørrkjøring, skriver ingenting
 *   npx tsx fix-ticketco-music-category.ts --apply    # skriver
 */
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { fetchAllRows } from './lib/utils.js';

const APPLY = process.argv.includes('--apply');

/** Speiler MUSIKKSTEDER i scrapers/ticketco.ts. */
const MUSIKKSTEDER = ['madam felle', 'hulen', 'kirkeautunnale'];

/** Speiler musikk-ordlista i scrapers/ticketco.ts. */
const MUSIKKORD = [
	'konsert', 'musikk', 'jazz', 'rock', 'dj',
	'blues', 'band', 'trio', 'kvartett', 'viser', 'vise', 'tribute', 'akustisk',
];

function erMusikk(tittel: string, sted: string): { treff: boolean; grunn: string } {
	// Hulen står med venue_name «Bergen» og huset i tittelen, så begge prøves.
	const stedTekst = `${sted} ${tittel}`.toLowerCase();
	for (const m of MUSIKKSTEDER) {
		if (new RegExp(`\\b${m}\\b`).test(stedTekst)) return { treff: true, grunn: `sted: ${m}` };
	}
	const t = (tittel || '').toLowerCase();
	for (const ord of MUSIKKORD) {
		if (new RegExp(`\\b${ord}\\b`).test(t)) return { treff: true, grunn: `ord: ${ord}` };
	}
	return { treff: false, grunn: '' };
}

async function main() {
	const nowUtc = new Date().toISOString();
	const rader = await fetchAllRows<{ id: string; title_no: string; venue_name: string | null; category: string }>(
		(fra, til) =>
			supabase
				.from('events')
				.select('id, title_no, venue_name, category')
				.eq('status', 'approved')
				.eq('source', 'ticketco')
				.eq('category', 'culture')
				.or(`date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`)
				.order('id', { ascending: true })
				.range(fra, til),
		'ticketco-culture'
	);

	const treff = rader
		.map(r => ({ ...r, ...erMusikk(r.title_no, r.venue_name ?? '') }))
		.filter(r => r.treff);

	console.log(`${rader.length} kommende ticketco-arrangementer ligger som «culture».`);
	console.log(`${treff.length} av dem er konserter etter den utvidede regelen.\n`);

	if (treff.length === 0) return;

	// Les radene, ikke antallet. En regelendring som flytter kategori skal
	// aldri kjøres på et tall alene — se pattern_torrkjor_for_du_sletter.
	for (const r of treff) {
		console.log(`  ${r.title_no.slice(0, 58).padEnd(60)} ${r.venue_name?.slice(0, 22) ?? ''}   [${r.grunn}]`);
	}

	const urørt = rader.filter(r => !erMusikk(r.title_no, r.venue_name ?? '').treff);
	if (urørt.length > 0) {
		console.log(`\n${urørt.length} blir stående som «culture». Stikkprøve:`);
		urørt.slice(0, 10).forEach(r => console.log(`  ${r.title_no.slice(0, 58)}`));
	}

	if (!APPLY) {
		console.log('\nTørrkjøring — ingenting er skrevet. Kjør med --apply når lista ser riktig ut.');
		return;
	}

	let ok = 0, feil = 0;
	for (const r of treff) {
		const { error } = await supabase.from('events').update({ category: 'music' }).eq('id', r.id);
		if (error) { console.log(`  FEIL ${r.title_no.slice(0, 40)}: ${error.message}`); feil++; }
		else ok++;
	}
	console.log(`\nFerdig. oppdatert=${ok}  feilet=${feil}`);
}

main().catch(e => { console.error(e); process.exit(1); });
