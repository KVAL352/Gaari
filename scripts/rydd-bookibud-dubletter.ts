/**
 * Fjerner bookibud-rader som ligger inne to ganger fordi lenka endret seg.
 *
 * HVORFOR DENNE FINNES
 *
 * `eventExists()` slaar opp paa noeyaktig `source_url`. Da Bookibud la
 * `marketing=gaari` paa partnernoekkelen 25. august 2026, endret lenka seg for
 * arrangementer som alt laa inne. Oppslaget fant ingenting, og scraperen la
 * raden inn paa nytt i stedet for aa oppdatere den.
 *
 * Dedup fanget det ikke, fordi Bookibud samtidig hadde doept om
 * arrangementene: den gamle raden heter «Nattklubb — fredag 9. oktober», den
 * nye «Kveldstid — fredag 9. oktober». `normalizeTitle()` ser to ulike
 * arrangementer.
 *
 * 1. september laa ti slike par ute samtidig. Ett av dem er verre enn de
 * andre: «Konsert: Duvèt» 3. september staar ved siden av «Kansellert: Duvèt»
 * for samme lenke og dato. Leseren ser en konsert som er avlyst.
 *
 * REGELEN: av to rader som peker paa samme lenke naar sporingsparametrene
 * holdes utenfor, er den nyeste fasit. Den har feedens gjeldende tittel og
 * henvisningskoden. Den eldste slettes.
 *
 * Toerrkjoering er standard, jf. [[pattern_torrkjor_for_du_sletter]] — les
 * radene, ikke antallet, foer en regel faar slette noe.
 *
 * Bruk:
 *   cd scripts && npx tsx rydd-bookibud-dubletter.ts          # toerrkjoering
 *   cd scripts && npx tsx rydd-bookibud-dubletter.ts --apply  # sletter
 */
import 'dotenv/config';
import { supabase } from './lib/supabase';
import { fetchAllRows } from './lib/utils';
import { utenSporing } from './lib/sporingsparameter';

const SKRIV = process.argv.includes('--apply');

type Rad = {
	id: string;
	slug: string;
	title_no: string;
	date_start: string;
	source_url: string | null;
	ticket_url: string | null;
	created_at: string;
	status: string;
};

async function main() {
	const iDag = new Date().toISOString().slice(0, 10);
	const rader = await fetchAllRows<Rad>(
		(fra, til) =>
			supabase
				.from('events')
				.select('id, slug, title_no, date_start, source_url, ticket_url, created_at, status')
				.eq('source', 'bookibud')
				.gte('date_start', iDag)
				.order('id', { ascending: true })
				.range(fra, til),
		'bookibud-dubletter'
	);

	const grupper = new Map<string, Rad[]>();
	for (const r of rader) {
		if (!r.source_url) continue;
		const n = utenSporing(r.source_url);
		if (!grupper.has(n)) grupper.set(n, []);
		grupper.get(n)!.push(r);
	}

	const skalSlettes: Array<{ behold: Rad; slett: Rad; lenke: string }> = [];
	for (const [lenke, v] of grupper) {
		if (v.length < 2) continue;
		// Nyeste rad er fasit: den har feedens gjeldende tittel og koden.
		const sortert = [...v].sort((a, b) => b.created_at.localeCompare(a.created_at));
		const behold = sortert[0];
		for (const slett of sortert.slice(1)) skalSlettes.push({ behold, slett, lenke });
	}

	console.log(`${rader.length} kommende bookibud-rader, ${grupper.size} unike lenker.\n`);

	if (skalSlettes.length === 0) {
		console.log('Ingen dubletter.');
		return;
	}

	console.log(`${skalSlettes.length} rader er dubletter og skal fjernes:\n`);
	for (const { behold, slett, lenke } of skalSlettes) {
		console.log(`  ${lenke.replace('https://bookibud.com', '')}`);
		console.log(`     BEHOLD  ${behold.created_at.slice(0, 10)}  ${behold.title_no.slice(0, 42).padEnd(42)}  ${behold.slug}`);
		console.log(`     SLETT   ${slett.created_at.slice(0, 10)}  ${slett.title_no.slice(0, 42).padEnd(42)}  ${slett.slug}`);
	}

	if (!SKRIV) {
		console.log('\nToerrkjoering. Les listen over. Kjoer med --apply for aa slette.');
		return;
	}

	let ok = 0;
	for (const { slett } of skalSlettes) {
		const { error } = await supabase.from('events').delete().eq('id', slett.id);
		if (error) console.warn(`  ! ${slett.slug}: ${error.message}`);
		else ok++;
	}
	console.log(`\nSlettet: ${ok} av ${skalSlettes.length}.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
