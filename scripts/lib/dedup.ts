import { supabase } from './supabase.js';
import { normalizeTitle, deleteEventsAndImages } from './utils.js';
import { isAggregatorUrl } from './venues.js';

// Source quality ranking — higher = prefer to keep
// Tier 5: canonical venue sources (own website, authoritative)
// Tier 4: venue/club sources (own website, good quality)
// Tier 3: city/community aggregators (Bergen-focused, good coverage)
// Tier 2: ticket platforms & general aggregators (prefer venue source when available)
// Tier 1: low-quality / disabled sources
const SOURCE_RANK: Record<string, number> = {
	// Tier 5 — major performance venues & festivals
	dns: 5,
	olebull: 5,
	grieghallen: 5,
	usfverftet: 5,
	forumscene: 5,
	dvrtvest: 5,
	bitteater: 5,
	harmonien: 5,
	kode: 5,
	carteblanche: 5,
	festspillene: 5,
	bergenfest: 5,
	nattjazz: 5,
	beyondthegates: 5,
	brann: 5,
	kulturhusetibergen: 5,
	biff: 5,
	borealis: 5,
	bergenpride: 5,
	kvarteret: 5,
	ostre: 5,
	fyllingsdalenteater: 5,
	jungelfest: 5,
	generasjonsfestivalen: 5,

	// Tier 5 — organiser-supplied, entered by hand after they asked to be listed.
	// No scraper backs these, but they rank at the top on purpose: the organiser
	// gave us the details and confirmed image rights themselves. Left unranked
	// they score 0, and any scraper that later picks up the same event wins the
	// dedup and deletes the entry we have written consent for.
	julivillaveien: 5,
	highvoltage: 5,
	fortellerstraedet: 5,

	// Innsendt av arrangøren selv gjennom /submit, og godkjent av et menneske
	// før den kom hit — pending-rader er utenfor dedup, se hentDedupKandidater().
	//
	// Tier 4 og ikke 5: de håndinnlagte kildene over er arrangører Kjersti har
	// hatt kontakt med, mens en skjemainnsending er uverifisert utover selve
	// godkjenningen. Har en scene sin egen scraper, er den utgaven som regel
	// bedre vedlikeholdt — Kjøtt Festival kom inn 23. august med tittelen «Kjøtt
	// Festival » og én dato, mens bergenkjott-scraperen hadde riktig tittel og
	// begge dagene. Tier 4 lar likevel innsendingen slå billettplattformene, som
	// er tilfellet der arrangøren faktisk vet best.
	innsending: 4,

	// Tier 4 — venue / club sources
	nordnessjobad: 4,
	raabrent: 4,
	colonialen: 4,
	bergenkjott: 4,
	paintnsip: 4,
	bergenfilmklubb: 4,
	cornerteateret: 4,
	kunsthall: 4,
	visningsromusf: 4,
	litthusbergen: 4,
	bergenbibliotek: 4,
	floyen: 4,
	bjorgvinblues: 4,
	swingnsweetjazzclub: 4,
	bek: 4,
	vvv: 4,
	bymuseet: 4,
	akvariet: 4,
	museumvest: 4,
	oconnors: 4,
	stenematglede: 4,
	'gg-bergen': 4,
	bodega: 4,
	mediacity: 4,
	bergenchamber: 4,
	dnt: 4,
	brettspill: 4,
	studiovertikal: 4,

	// Bookibud er arrangorens egen bookingplattform, ikke en konkurrerende
	// oppforingsside. API-et er bygget for Gaari, feltene er strukturerte og
	// bildelenkene permanente, saa den slaar community-kildene i tier 3.
	bookibud: 4,

	// Tier 3 — city / community aggregators
	loddefjord: 3,
	studentbergen: 3,
	bergenlive: 3,
	bergenkommune: 3,

	// Tier 2 — ticket platforms & general aggregators (prefer venue source when available)
	ticketco: 2,
	billetto: 2,
	hoopla: 2,
	tikkio: 2,

	// Tier 1 — low-quality / disabled
	kulturikveld: 1,
	barnasnorge: 1,
	eventbrite: 1,
};

export interface EventRow {
	id: string;
	title_no: string;
	date_start: string;
	source: string;
	venue_name: string | null;
	image_url: string | null;
	ticket_url: string | null;
	description_no: string | null;
}

/**
 * Ord som ikke skiller ett arrangement fra et annet.
 *
 * Ukedager og måneder står med fordi flere scrapere skriver dem inn i tittelen
 * («Språkkafé — torsdag 3. september»). Sammenlikner vi to arrangementer som
 * allerede har samme dato, er de ordene garantert like og sier ingenting.
 */
const TITTEL_STOPPORD = new Set([
	'og', 'eller', 'til', 'fra', 'med', 'uten', 'for', 'pa', 'på', 'av', 'om', 'den', 'det', 'som',
	'the', 'and', 'with', 'feat', 'pres', 'presents', 'vs', 'kl',
	'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lordag', 'lørdag', 'sondag', 'søndag',
	'januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli',
	'august', 'september', 'oktober', 'november', 'desember'
]);

/** Stedsnavn som ikke er et sted. Billettplattformene setter dem når arrangøren ikke fylte ut noe. */
const GENERISKE_STEDER = new Set(['bergen', 'bergensentrum', 'norge', 'norway', 'sentrum']);

function betydningsbaerendeOrd(tittel: string): Set<string> {
	return new Set(
		tittel
			.toLowerCase()
			.replace(/[^a-zæøå0-9\s]/g, ' ')
			.split(/\s+/)
			.filter((o) => o.length >= 3 && !TITTEL_STOPPORD.has(o) && !/^\d+$/.test(o))
	);
}

function normaliserSted(navn?: string | null): string {
	return (navn ?? '').toLowerCase().replace(/[^a-zæøå0-9]/g, '');
}

/**
 * Samme sted? Tåler at to kilder skriver navnet ulikt, som «Landmark» og
 * «Landmark Bergen Kunsthall». Krever at det korte navnet er starten på det
 * lange, ikke bare at det finnes et sted inni, ellers ville «Bergen» matchet
 * «Bergen Kjøtt». Generiske stedsnavn teller aldri som treff.
 */
export function sammeSted(a?: string | null, b?: string | null): boolean {
	const na = normaliserSted(a);
	const nb = normaliserSted(b);
	if (!na || !nb) return false;
	if (GENERISKE_STEDER.has(na) || GENERISKE_STEDER.has(nb)) return false;
	if (na === nb) return true;
	const [kort, lang] = na.length <= nb.length ? [na, nb] : [nb, na];
	return kort.length >= 6 && lang.startsWith(kort);
}

/**
 * Løsere titteltest, kun gyldig når stedet og datoen allerede er like.
 *
 * titlesMatch() sammenlikner tegn for tegn og bommer når to kilder skriver
 * samme konsert ulikt. Landmark 23. august 2026 lå ute to ganger, som
 * «Perfect Sounds Forever:Ryan Davis & the Roadhouse Band» fra kunsthall og
 * «Ryan Davis & the Roadhouse Band (US) + Styrofoam Winos» fra ticketco. Den
 * ene har arrangørprefiks, den andre landkode og oppvarmingsband, og ingen av
 * dem er en delstreng av den andre.
 *
 * Kravet om minst to felles ord hindrer at ett tilfeldig sammenfall holder.
 * Kravet om 60 prosent av den korteste hindrer at et langt program sluker et
 * kort arrangement som tilfeldigvis nevner de samme ordene.
 */
export function titlerMatcherPaaSammeSted(a: string, b: string, kildeA?: string, kildeB?: string): boolean {
	// Samme kilde teller aldri. Lister én scraper to arrangementer på samme sted
	// og dato, vet den at de er forskjellige, og forskjellen ligger som regel i
	// det ene ordet denne testen kaster bort.
	//
	// Tørrkjøringen 18. august 2026 gjorde poenget: «Mandagsfilmen matiné:
	// Elskling» og «Mandagsfilmen: Elskling» er to visninger av samme film,
	// «Pianostykker av Edvard Grieg» og «Holbergsuiten av Edvard Grieg» er to
	// konserter i samme serie, og «Ytre Arna juniorklubb» og «Ytre Arna UNG» er
	// to tilbud. Alle tre kom fra én kilde, og alle tre ville blitt slettet.
	// Testen finnes for å fange samme arrangement meldt av to kilder.
	if (kildeA && kildeB && kildeA === kildeB) return false;

	const oa = betydningsbaerendeOrd(a);
	const ob = betydningsbaerendeOrd(b);
	if (oa.size === 0 || ob.size === 0) return false;
	let felles = 0;
	for (const o of oa) if (ob.has(o)) felles++;
	if (felles < 2) return false;
	return felles / Math.min(oa.size, ob.size) >= 0.6;
}

export function scoreEvent(e: EventRow): number {
	let score = SOURCE_RANK[e.source] || 0;
	if (e.image_url) score += 2;
	if (e.ticket_url && !isAggregatorUrl(e.ticket_url)) score += 2;
	if (e.description_no && e.description_no.length > 50) score += 1;
	return score;
}

export function titlesMatch(a: string, b: string, kildeA?: string | null, kildeB?: string | null): boolean {
	if (a === b) return true;
	if (a.length < 5 || b.length < 5) return false;

	// Check if one contains the other — with length ratio guard
	// Prevents short generic titles (e.g. "konsert") matching inside longer specific ones
	if (a.includes(b) || b.includes(a)) {
		const shorter = a.length < b.length ? a : b;
		const longer = a.length < b.length ? b : a;
		if (shorter.length >= longer.length * 0.6) return true;
	}

	// Check 90% prefix overlap with similar length requirement
	if (a.length >= 8 && b.length >= 8) {
		const shorter = a.length < b.length ? a : b;
		const longer = a.length < b.length ? b : a;
		// Require similar length (no more than 30% difference)
		if (longer.length <= shorter.length * 1.3) {
			if (longer.includes(shorter.slice(0, Math.floor(shorter.length * 0.9)))) {
				return true;
			}
		}
	}

	// Shared prefix match — catches same event with different venue suffixes
	// e.g. "Litterær lunsj på biblioteket" vs "Litterær lunsj med KODE"
	//
	// Samme kilde teller ikke her, av samme grunn som i titlerMatcherPaaSammeSted.
	// Denne testen teller like tegn fra starten, og et serie- eller stedsnavn er
	// ofte langt nok til å bære treffet alene. «Barnas kulturhus:» er 15 tegn
	// normalisert, så «Barnas kulturhus: Psst!» og «Barnas kulturhus:
	// Skrøneverksted og Kunstpilotverksteder» deler nok til å passere begge
	// kravene, enda det er to forskjellige verksteder samme dag. Tegntelling kan
	// ikke skille et arrangementsnavn fra et serienavn; kilden kan.
	//
	// Vernet ligger bare her. Testene over krever at den ene tittelen er
	// innholdt i den andre, og der er samme kilde på begge sider som regel et
	// ekte duplikat — «Den Store Heavy Metal Festen XXV» og samme tittel med
	// «|| Hulen» hengt på kommer begge fra ticketco.
	const minLen = Math.min(a.length, b.length);
	if (minLen >= 14 && !(kildeA && kildeB && kildeA === kildeB)) {
		let shared = 0;
		while (shared < minLen && a[shared] === b[shared]) shared++;
		if (shared >= 14 && shared >= minLen * 0.6) return true;
	}

	return false;
}

/**
 * Radene dedup har lov til å vurdere.
 *
 * Ligger her og ikke i deduplicate() fordi dedup-dryrun.ts hentet sitt eget
 * utvalg med en egen kopi av spørringen. To kopier betyr at tørrkjøringen kan
 * vise noe annet enn kjøringen gjør, og da er den verdiløs nettopp når den
 * trengs: rett før en regelendring får slette noe. Én funksjon, begge kaller
 * den. Se [[pattern_single_source_of_truth]].
 */
export async function hentDedupKandidater(): Promise<EventRow[]> {
	// Supabase gir maks 1000 rader per svar, uten feilmelding når det er flere.
	// Uten paginering her så dedup bare de 1000 tidligste arrangementene, siden
	// sorteringen er stigende på dato, og alt bakenfor den grensen ble aldri
	// ryddet. 20. august 2026 gikk grensen ved 7. oktober, med 1914 rader i
	// basen. Samme paginering som credit-backfill.ts og enrich-titles.ts bruker.
	const PAGE_SIZE = 1000;
	const events: EventRow[] = [];

	for (let page = 0; ; page++) {
		const { data, error } = await supabase
			.from('events')
			.select('id, title_no, date_start, source, venue_name, image_url, ticket_url, description_no')
			// Bare publiserte arrangementer. Innsendinger fra skjemaet ligger som
			// pending til et menneske har sett på dem, og de har ingen source, så
			// de scorer 0 i scoreEvent() og taper mot enhver scraper som finner
			// det samme. 23. august 2026 sendte arrangøren av Kjøtt Festival inn
			// festivalen; klokka 07:00 dagen etter slettet dedup innsendingen til
			// fordel for bergenkjott-scraperens utgave, før noen hadde lest den.
			// Loggen sa «Dup: "Kjøtt Festival " (null) → keeping ...» og det var
			// hele varselet. Køen skal ikke tømmes av pipeline; det er nettopp
			// pending-statusen som betyr at avgjørelsen ikke er tatt ennå.
			.eq('status', 'approved')
			// Canaries holdes utenfor. De er oppdiktede arrangementer plantet for
			// å avsløre kopiering, og source 'canary' står ikke i SOURCE_RANK, så
			// de scorer 0 og ville tapt mot enhver scraper som fant samme tittel
			// på samme dato. Da forsvinner beviset uten et ord i loggen, og
			// canary-scan ville lett etter en felle som ikke lenger fantes.
			// Å deduplisere syntetiske rader gir uansett ingen mening.
			// Kolonnen er NOT NULL DEFAULT false, så filteret slipper gjennom alt
			// annet — se 20260528120000_canary_events.sql.
			.eq('is_canary', false)
			// Sortert på id, ikke dato: range() deler opp etter posisjon, og
			// date_start er ikke unik, så to rader med samme dato kan bytte plass
			// mellom to kall og havne i hver sin pulje — eller i ingen. Dedup
			// grupperer på dato selv, så rekkefølgen inn spiller ingen rolle.
			.order('id')
			.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

		if (error) {
			// Kaster i stedet for å returnere tom liste. En tom liste her ville
			// sett ut som «ingen duplikater» både i kjøringen og i tørrkjøringen.
			throw new Error(`Dedup fetch error: ${error.message}`);
		}
		if (!data || data.length === 0) break;
		events.push(...data);
		if (data.length < PAGE_SIZE) break;
	}

	return events;
}

export async function deduplicate(): Promise<number> {
	let events: EventRow[];
	try {
		events = await hentDedupKandidater();
	} catch (err) {
		console.error(' ', err instanceof Error ? err.message : err);
		return 0;
	}

	// Group by date (YYYY-MM-DD)
	const byDate = new Map<string, EventRow[]>();
	for (const e of events) {
		const day = e.date_start.slice(0, 10);
		if (!byDate.has(day)) byDate.set(day, []);
		byDate.get(day)!.push(e);
	}

	// Hele raden og ikke bare id-en: deleteEventsAndImages() trenger image_url
	// for aa finne fila som hoerer til.
	const radenSomSlettes: EventRow[] = [];

	for (const [, dayEvents] of byDate) {
		if (dayEvents.length < 2) continue;

		// Normalize all titles for this day
		const normalized = dayEvents.map(e => ({
			...e,
			norm: normalizeTitle(e.title_no),
		}));

		// Find duplicate groups
		const used = new Set<number>();

		for (let i = 0; i < normalized.length; i++) {
			if (used.has(i)) continue;

			const group = [normalized[i]];
			used.add(i);

			for (let j = i + 1; j < normalized.length; j++) {
				if (used.has(j)) continue;
				const treff =
					titlesMatch(
						normalized[i].norm,
						normalized[j].norm,
						normalized[i].source,
						normalized[j].source
					) ||
					(sammeSted(normalized[i].venue_name, normalized[j].venue_name) &&
						titlerMatcherPaaSammeSted(
							normalized[i].title_no,
							normalized[j].title_no,
							normalized[i].source,
							normalized[j].source
						));
				if (treff) {
					group.push(normalized[j]);
					used.add(j);
				}
			}

			if (group.length < 2) continue;

			// Keep the best-scored event, delete the rest
			group.sort((a, b) => scoreEvent(b) - scoreEvent(a));
			const keeper = group[0];
			for (let k = 1; k < group.length; k++) {
				console.log(`  Dup: "${group[k].title_no}" (${group[k].source}) → keeping "${keeper.title_no}" (${keeper.source})`);
				radenSomSlettes.push(group[k]);
			}
		}
	}

	if (radenSomSlettes.length === 0) return 0;

	// Gaar gjennom deleteEventsAndImages, ikke rett paa .delete(). Dedup var den
	// tredje sletteveien som fjernet raden og lot fila staa igjen i boetta, og
	// den lagde et nytt foreldreloest bilde 24. august, dagen etter at de to
	// andre veiene ble tettet. Helperen sletter bildene foerst og roerer aldri
	// noe utenfor events/, saa de delte fallback-bildene er trygge.
	const { deleted, imagesRemoved } = await deleteEventsAndImages(radenSomSlettes);
	if (imagesRemoved > 0) {
		console.log(`  Slettet ${imagesRemoved} opplastede bilder sammen med duplikatene`);
	}

	return deleted;
}
