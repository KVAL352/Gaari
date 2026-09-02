/**
 * Setter henvisningskoden (`marketing=gaari`) paa lenka bookibud-radene
 * faktisk sender folk til.
 *
 * HVORFOR DENNE FINNES
 *
 * Bookibud la koden paa partnernoekkelen 25. august 2026. Scraperen fikk 1.
 * september en blokk som oppdaterer eksisterende rader i stedet for aa hoppe
 * over dem — men den skrev bare `source_url`.
 *
 * Event-siden bruker `ticket_url || source_url` (se
 * `src/routes/[lang]/events/[slug]/+page.svelte`). Naar `ticket_url` finnes,
 * er det den som blir klikket. Og `ticket_url` settes bare paa arrangementer
 * som koster noe. Resultatet 1. september: alle elleve betalte bookibud-rader
 * pekte paa en lenke uten henvisningskode, mens `source_url` ved siden av
 * hadde den. Feilen traff altsaa presis de radene kickbacken gjelder, og bare
 * dem.
 *
 * Samme feilklasse som [[pattern_regler_gjelder_bare_framover]]: opprydningen
 * naadde én kolonne, og ingen sjekket den andre. Sjekken i
 * `lib/datakonsistens.ts` saa ogsaa bare paa `source_url`, saa den sto groenn.
 *
 * Scraperen og sjekken er rettet. Dette skriptet rydder det som alt ligger
 * inne, og kan kjoeres igjen uten skade — det roerer bare rader som mangler
 * koden.
 *
 * Bruk:
 *   cd scripts && npx tsx rett-bookibud-henvisningskode.ts          # toerrkjoering
 *   cd scripts && npx tsx rett-bookibud-henvisningskode.ts --apply  # skriver
 */
import 'dotenv/config';
import { supabase } from './lib/supabase';
import { fetchAllRows } from './lib/utils';
import { sammeUtenSporing } from './lib/sporingsparameter';

const SKRIV = process.argv.includes('--apply');
const KODE = 'marketing=gaari';

function harKode(url: string | null | undefined): boolean {
	return !!url && /[?&]marketing=/i.test(url);
}

/** Lenka med henvisningskoden paa, uten aa roere resten. */
function medKode(url: string): string {
	try {
		const u = new URL(url);
		u.searchParams.set('marketing', 'gaari');
		return u.toString();
	} catch {
		return url.includes('?') ? `${url}&${KODE}` : `${url}?${KODE}`;
	}
}

type Rad = {
	id: string;
	slug: string;
	title_no: string;
	price: string | null;
	ticket_url: string | null;
	source_url: string | null;
};

async function main() {
	const iDag = new Date().toISOString().slice(0, 10);
	const rader = await fetchAllRows<Rad>(
		(fra, til) =>
			supabase
				.from('events')
				.select('id, slug, title_no, price, ticket_url, source_url')
				.eq('source', 'bookibud')
				.eq('status', 'approved')
				.gte('date_start', iDag)
				.order('id', { ascending: true })
				.range(fra, til),
		'bookibud-lenker'
	);

	console.log(`${rader.length} kommende bookibud-rader\n`);

	const planlagt: Array<{ rad: Rad; felt: 'ticket_url' | 'source_url'; fra: string; til: string; grunn: string }> = [];

	for (const r of rader) {
		// Lenka leseren klikker. Samme uttrykk som event-siden.
		const brukt = r.ticket_url || r.source_url;
		if (!brukt || harKode(brukt)) continue;

		if (r.ticket_url && !harKode(r.ticket_url)) {
			// Har source_url allerede koden, og peker de to paa det samme? Da er
			// source_url fasiten og vi kopierer den, i stedet for aa bygge en ny
			// streng som kan skille seg paa parameterrekkefoelge.
			const kanKopiere =
				!!r.source_url && harKode(r.source_url) && sammeUtenSporing(r.ticket_url, r.source_url);
			planlagt.push({
				rad: r,
				felt: 'ticket_url',
				fra: r.ticket_url,
				til: kanKopiere ? r.source_url! : medKode(r.ticket_url),
				grunn: kanKopiere ? 'kopiert fra source_url' : 'koden lagt paa',
			});
		} else if (!r.ticket_url && r.source_url && !harKode(r.source_url)) {
			planlagt.push({
				rad: r,
				felt: 'source_url',
				fra: r.source_url,
				til: medKode(r.source_url),
				grunn: 'koden lagt paa',
			});
		}
	}

	if (planlagt.length === 0) {
		console.log('Ingenting aa rette. Alle brukte lenker har henvisningskoden.');
		return;
	}

	const betalte = planlagt.filter((p) => p.felt === 'ticket_url');
	console.log(`${planlagt.length} rader skal rettes — ${betalte.length} av dem betalte (ticket_url).\n`);

	for (const p of planlagt) {
		console.log(`  ${p.felt.padEnd(10)} | ${(p.rad.price ?? 'Gratis').padEnd(8)} | ${p.rad.title_no.slice(0, 44)}`);
		console.log(`     fra: ${p.fra}`);
		console.log(`     til: ${p.til}   (${p.grunn})`);
	}

	if (!SKRIV) {
		console.log('\nToerrkjoering. Kjoer med --apply for aa skrive.');
		return;
	}

	let ok = 0;
	for (const p of planlagt) {
		const { error } = await supabase
			.from('events')
			.update({ [p.felt]: p.til })
			.eq('id', p.rad.id);
		if (error) console.warn(`  ! ${p.rad.slug}: ${error.message}`);
		else ok++;
	}
	console.log(`\nSkrevet: ${ok} av ${planlagt.length}.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
