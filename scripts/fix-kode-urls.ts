/**
 * Engangsretting: KODE-kildelenker pekte til en seksjon som ikke finnes.
 *
 * Historikken er to runder med samme feil. Først lå alt under
 * /hva-skjer/utstillinger/, og bare utstillinger fungerte. 12. august flyttet
 * denne fila alt annet til /hva-skjer/arrangementer/ — og den seksjonen finnes
 * ikke i det hele tatt. Etter «rettingen» ga 61 av 68 KODE-arrangementer 404.
 *
 * Begge gangene ble seksjonen gjettet ut fra navnet på arrangementstypen.
 * KODE har den liggende som slug på eventType-dokumentet i Sanity, og den
 * slugen er ikke utledbar: «Kurs og verksted» blir /verksted/,
 * «Familieaktiviteter» blir /familie/ og «Arrangement» står i entall. Nå
 * spørres det om slugen i stedet.
 *
 *   npx tsx scripts/fix-kode-urls.ts          viser hva som ville skjedd
 *   npx tsx scripts/fix-kode-urls.ts --skriv  gjør endringen
 *
 * Grunnen til at feilen overlevde en stikkprøve: kodebergen.no er Next.js med
 * `fallback: true`. Første kall til en sti som ikke er bygd svarer 200 med et
 * tomt skall og bygger siden i bakgrunnen. Er stien ugyldig, blir den 404 —
 * etterpå. Stikkprøven målte altså sitt eget første besøk. Derfor ser den nå
 * etter ekte innhold i svaret, ikke etter statuskoden.
 */
import { supabase } from './lib/supabase.js';
import { delay } from './lib/utils.js';

const SANITY = 'https://zv9pm4dt.apicdn.sanity.io/v2021-10-21/data/query/production';
const UA = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';
const SKRIV = process.argv.includes('--skriv');

function byggUrl(slug: string, typeSlug: string): string {
	return `https://www.kodebergen.no/hva-skjer/${encodeURIComponent(typeSlug.trim())}/${encodeURIComponent(slug.trim())}`;
}

/**
 * Et 200-svar er ikke nok. Next.js svarer 200 med et tomt skall for stier den
 * ennå ikke har bygd, og markerer det i __NEXT_DATA__. Vi krever at svaret er
 * en ferdig bygd side på ruten for arrangementssider.
 */
function erEkteSide(kropp: string): boolean {
	return kropp.includes('"page":"/hva-skjer/[type]/[slug]"') && kropp.includes('"isFallback":false');
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
		'*[_type=="event" && __i18n_lang=="no"]{title, startDate, "slug": slug.current, "typeSlug": eventType->slug.current}'
	);
	const res = await fetch(`${SANITY}?query=${query}`, { headers: { 'User-Agent': UA } });
	if (!res.ok) {
		console.error(`KODEs API svarte HTTP ${res.status}. Avbryter uten å røre noe.`);
		process.exit(1);
	}
	type KodeRad = { title: string | null; startDate: string | null; slug: string; typeSlug: string | null };
	const rå = (await res.json()).result as KodeRad[];

	const fasit = new Map<string, string>();
	for (const e of rå) {
		// Uten seksjon har vi ingen adresse. Da er det bedre å la raden stå urørt
		// og telle den som ukjent enn å bygge en ny gjetning.
		if (e.slug && e.typeSlug) fasit.set(e.slug.trim(), e.typeSlug);
	}

	// KODE gir samme arrangement ny slug fra tid til annen, og resirkulerer den
	// gamle til en annen dato. Da peker vår lagrede adresse enten på ingenting
	// eller på feil dag, og slugen er ikke lenger noe å kjenne raden igjen på.
	// Derfor slår vi opp på dato og tittel når slugen ikke lenger finnes.
	const påDato = new Map<string, KodeRad[]>();
	for (const e of rå) {
		if (!e.slug || !e.typeSlug || !e.startDate || !e.title) continue;
		const bøtte = påDato.get(e.startDate) ?? [];
		bøtte.push(e);
		påDato.set(e.startDate, bøtte);
	}

	/** Entydig treff på samme dag der KODEs tittel innleder vår. Ellers ingenting. */
	function finnPåDato(dato: string, tittel: string): KodeRad | null {
		const kandidater = (påDato.get(dato) ?? []).filter((e) =>
			tittel.toLowerCase().startsWith(e.title!.trim().toLowerCase())
		);
		return kandidater.length === 1 ? kandidater[0] : null;
	}

	console.log(`Fasit fra KODE: ${fasit.size} arrangementer.\n`);

	const nå = new Date().toISOString();
	const { data, error } = await supabase
		.from('events')
		.select('id, title_no, source_url, date_start')
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

		// Datoen er den paalitelige noekkelen, ikke slugen. KODE gir arrangementer
		// ny slug og resirkulerer den gamle til en annen dag, saa en lagret adresse
		// kan baade forsvinne og — verre — peke paa feil arrangement uten aa gaa i
		// stykker. Derfor slaar vi opp paa dato og tittel foerst, og faller tilbake
		// paa slugen bare naar dagen ikke gir et entydig treff.
		const dato = String(rad.date_start ?? '').slice(0, 10);
		const treff = dato ? finnPåDato(dato, rad.title_no) : null;

		let ny: string;
		if (treff) {
			ny = byggUrl(treff.slug, treff.typeSlug!);
		} else if (fasit.has(slug)) {
			ny = byggUrl(slug, fasit.get(slug)!);
		} else {
			// Fjernet fra KODEs program siden vi hentet det, eller uten seksjon i
			// deres CMS. Da vet vi ikke hvilken seksjon det hoerer til, og aa gjette
			// ville bare bytte én 404 mot en annen.
			console.log(`  ukjent hos KODE   ${tittel}`);
			ukjent++;
			continue;
		}


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
	// 404 uansett seksjon, så det er ikke regelen som er gal.
	//
	// Et enkelt avslag sier altså ingenting om regelen. Det gjør et mønster av
	// dem: blir vi strupet, eller er seksjonsregelen feil, faller alle prøvene
	// samtidig. Derfor kreves flertall, og hver enkelt prøve skrives ut slik at
	// et ekte problem fortsatt er synlig.
	//
	// Prøven ser etter ferdig bygd innhold, ikke etter 200. Det var nettopp et
	// 200 fra en uferdig fallback-side som slapp /arrangementer/ gjennom.
	const PRØVER = 5;
	const KREVES = 3;
	if (endringer.length > 0) {
		const steg = Math.max(1, Math.floor(endringer.length / PRØVER));
		const utvalg = endringer.filter((_, i) => i % steg === 0).slice(0, PRØVER);
		let ok = 0;
		for (const e of utvalg) {
			await delay(1500);
			let dom = 'nettverksfeil';
			try {
				const svar = await fetch(e.ny, { headers: { 'User-Agent': UA } });
				const kropp = await svar.text();
				if (svar.status !== 200) dom = `HTTP ${svar.status}`;
				else if (!erEkteSide(kropp)) dom = '200 men uferdig side';
				else {
					dom = 'ekte side';
					ok++;
				}
			} catch {
				/* beholder nettverksfeil */
			}
			console.log(`  stikkprøve ${dom.padEnd(20)} ${e.ny}`);
		}
		console.log(`  ${ok} av ${utvalg.length} stikkprøver traff en ekte side.\n`);
		if (ok < Math.min(KREVES, utvalg.length)) {
			console.error(
				'For få stikkprøver gikk gjennom. Enten er seksjonsregelen gal, eller\n' +
					'så strupes vi av kodebergen.no. Vent en time og prøv igjen før du\n' +
					'konkluderer. Ingenting er skrevet.'
			);
			process.exit(1);
		}
	}

	// To rader kan bytte adresse med hverandre naar KODE resirkulerer en slug.
	// Da smeller unik-indeksen paa den foerste, og gaar gjennom naar den andre
	// har sluppet adressen. Derfor én ekstra runde paa det som feilet.
	let igjen = endringer;
	for (let runde = 0; runde < 2 && igjen.length > 0; runde++) {
		const feilet: typeof igjen = [];
		for (const e of igjen) {
			if (SKRIV) {
				const { error: feil } = await supabase
					.from('events')
					.update({ source_url: e.ny })
					.eq('id', e.id);
				if (feil) {
					if (runde === 0) {
						feilet.push(e);
					} else {
						console.log(`  FEIL              ${e.tittel}: ${feil.message}`);
						døde++;
					}
					continue;
				}
			}
			console.log(`  ${SKRIV ? 'rettet' : 'ville rettet'}      ${e.tittel}`);
			rettet++;
		}
		igjen = feilet;
	}


	console.log(
		`\n${SKRIV ? 'Ferdig' : 'Tørrkjøring'}. rettet=${rettet}  allerede riktig=${alleredeRiktig}` +
			`  ukjent hos KODE=${ukjent}  hoppet over=${døde}`
	);
	if (!SKRIV && rettet) console.log('Kjør på nytt med --skriv for å gjøre endringen.');
}

main();
