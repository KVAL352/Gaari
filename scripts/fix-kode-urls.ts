/**
 * Engangsretting: KODE-kildelenker pekte til feil seksjon.
 *
 * Scraperen bygde alle lenker som /hva-skjer/utstillinger/<slug>. Bare
 * utstillinger ligger der. Omvisninger, konserter, verksteder og foredrag
 * ligger under /hva-skjer/arrangementer/, så hver eneste av dem ga 404 når
 * noen klikket seg videre fra gaari.no til KODE.
 *
 * Selve feilen er rettet i scrapers/kode.ts. Denne fila retter radene som
 * allerede står i basen. Uten den ville neste scrape ikke kjent dem igjen,
 * lagt dem inn på nytt under riktig adresse, og latt dedup avgjøre hvilken av
 * de to som overlevde. Halvparten av tiden ville det blitt 404-en.
 *
 *   npx tsx scripts/fix-kode-urls.ts          viser hva som ville skjedd
 *   npx tsx scripts/fix-kode-urls.ts --skriv  gjør endringen
 *
 * Fasiten hentes fra KODEs eget API. Seksjonen følger av eventType, så regelen
 * er kjent og trenger ikke bekreftes rad for rad. Første utgave slo opp hver
 * enkelt adresse med et sidekall, og etter rundt hundre forespørsel begynte
 * kodebergen.no å svare 404 på alt. Da måler man sin egen strupning og ikke om
 * lenken finnes. Nå tas det en stikkprøve, og resten hviler på regelen.
 *
 * Merk at et 200-svar fra kodebergen.no ikke beviser noe uansett: siden
 * returnerer 200 for ukjente adresser i de fleste seksjoner. Bare
 * /arrangementer/ og /utstillinger/ har ekte ruting.
 */
import { supabase } from './lib/supabase.js';
import { delay } from './lib/utils.js';

const SANITY = 'https://zv9pm4dt.apicdn.sanity.io/v2021-10-21/data/query/production';
const UA = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';
const SKRIV = process.argv.includes('--skriv');

function seksjon(eventType: string | null): string {
	return eventType === 'Utstillinger' ? 'utstillinger' : 'arrangementer';
}

function byggUrl(slug: string, eventType: string | null): string {
	return `https://www.kodebergen.no/hva-skjer/${seksjon(eventType)}/${encodeURIComponent(slug.trim())}`;
}

/** Slugen kan inneholde mellomrom fra KODEs CMS, og ligger rå i basen. */
function slugFra(url: string): string {
	const siste = url.split('/').pop() ?? '';
	try {
		return decodeURIComponent(siste).trim();
	} catch {
		return siste.trim();
	}
}

async function main() {
	const query = encodeURIComponent(
		'*[_type=="event" && __i18n_lang=="no"]{"slug": slug.current, "type": eventType->title}'
	);
	const res = await fetch(`${SANITY}?query=${query}`, { headers: { 'User-Agent': UA } });
	if (!res.ok) {
		console.error(`KODEs API svarte HTTP ${res.status}. Avbryter uten å røre noe.`);
		process.exit(1);
	}
	const fasit = new Map<string, string | null>();
	for (const e of (await res.json()).result as { slug: string; type: string | null }[]) {
		if (e.slug) fasit.set(e.slug.trim(), e.type);
	}
	console.log(`Fasit fra KODE: ${fasit.size} arrangementer.\n`);

	const nå = new Date().toISOString();
	const { data, error } = await supabase
		.from('events')
		.select('id, title_no, source_url')
		.eq('source', 'kode')
		.or(`date_end.gte.${nå},and(date_end.is.null,date_start.gte.${nå})`);
	if (error) {
		console.error(`Kunne ikke hente rader: ${error.message}`);
		process.exit(1);
	}

	let rettet = 0;
	let alleredeRiktig = 0;
	let ukjent = 0;
	let døde = 0;

	// Finn alt som skal endres først, og la stikkprøven se hele utvalget. Tas
	// prøvene underveis, avgjør rekkefølgen i basen hvilke som blir testet.
	const endringer: { id: string; tittel: string; ny: string }[] = [];
	for (const rad of data ?? []) {
		const slug = slugFra(rad.source_url);
		const tittel = rad.title_no.replace(/\s+/g, ' ').slice(0, 45);

		if (!fasit.has(slug)) {
			// Fjernet fra KODEs program siden vi hentet det. Da vet vi ikke hvilken
			// seksjon det hørte til, og å gjette ville bare bytte én 404 mot en annen.
			console.log(`  ukjent hos KODE   ${tittel}`);
			ukjent++;
			continue;
		}

		const ny = byggUrl(slug, fasit.get(slug) ?? null);
		if (ny === rad.source_url) {
			alleredeRiktig++;
			continue;
		}
		endringer.push({ id: rad.id, tittel, ny });
	}

	// Stikkprøven er et flertallsvedtak, ikke et veto.
	//
	// Den var opprinnelig satt til å avbryte alt ved første 404, og det stanset
	// kjøringen 14. og 18. august. Årsaken viste seg å være to arrangementer som
	// ligger i KODEs API, men ikke er publisert på nettsidene deres. De svarer
	// 404 i begge seksjoner, så det er ikke regelen som er gal.
	//
	// Et enkelt 404 sier altså ingenting om regelen. Det gjør et mønster av dem:
	// blir vi strupet, eller er seksjonsregelen feil, faller alle prøvene
	// samtidig. Derfor kreves flertall, og hver enkelt 404 skrives ut slik at et
	// ekte problem fortsatt er synlig.
	const PRØVER = 5;
	const KREVES = 3;
	if (endringer.length > 0) {
		const steg = Math.max(1, Math.floor(endringer.length / PRØVER));
		const utvalg = endringer.filter((_, i) => i % steg === 0).slice(0, PRØVER);
		let ok = 0;
		for (const e of utvalg) {
			await delay(1500);
			let svar = 0;
			try {
				svar = (await fetch(e.ny, { headers: { 'User-Agent': UA } })).status;
			} catch {
				svar = -1;
			}
			if (svar === 200) ok++;
			console.log(`  stikkprøve ${String(svar).padStart(3)}    ${e.ny}`);
		}
		console.log(`  ${ok} av ${utvalg.length} stikkprøver svarte 200.\n`);
		if (ok < Math.min(KREVES, utvalg.length)) {
			console.error(
				'For få stikkprøver gikk gjennom. Enten er seksjonsregelen gal, eller\n' +
					'så strupes vi av kodebergen.no. Vent en time og prøv igjen før du\n' +
					'konkluderer. Ingenting er skrevet.'
			);
			process.exit(1);
		}
	}

	for (const e of endringer) {
		if (SKRIV) {
			const { error: feil } = await supabase
				.from('events')
				.update({ source_url: e.ny })
				.eq('id', e.id);
			if (feil) {
				console.log(`  FEIL              ${e.tittel}: ${feil.message}`);
				døde++;
				continue;
			}
		}
		console.log(`  ${SKRIV ? 'rettet' : 'ville rettet'}      ${e.tittel}`);
		rettet++;
	}

	console.log(
		`\n${SKRIV ? 'Ferdig' : 'Tørrkjøring'}. rettet=${rettet}  allerede riktig=${alleredeRiktig}` +
			`  ukjent hos KODE=${ukjent}  hoppet over=${døde}`
	);
	if (!SKRIV && rettet) console.log('Kjør på nytt med --skriv for å gjøre endringen.');
}

main();
