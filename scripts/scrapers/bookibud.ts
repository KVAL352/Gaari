import { makeSlug, eventExists, insertEvent, delay, deleteEventByUrl, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';
import { mapCategory, mapBydel } from '../lib/categories.js';

/**
 * Bookibud partner-API.
 *
 * Bookibud bygde endepunktet for Gåri etter eget tilbud fra daglig leder, og
 * leverte det 19. august 2026. robots.txt er `Allow: /`, og bildeadressene er
 * permanente og kan hot-linkes. Samtykket er dokumentert i
 * scripts/lib/consent.json med omfang «visning» og «some», gitt i møtet
 * 11. august 2026.
 *
 * Merk at feeden ikke inneholder fotokreditt. Vi kan altså vise bildene, men
 * ikke kreditere opphavspersonen, og image_credit blir stående tomt.
 */
const SOURCE = 'bookibud';
const API_BASE = 'https://bookibud.com:3007/partner/v1/events';
const USER_AGENT = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';

interface BookibudPenger {
	amount: number; // ØRE, ikke kroner. 14200 er 142 kr.
	currency: string;
}

export interface BookibudRad {
	id: string;
	eventId: string;
	title: string;
	day: string;
	url: string;
	start: string;
	end?: string | null;
	venueName?: string | null;
	address?: { street?: string; zip?: string; city?: string; country?: string } | null;
	organizer?: { id: string; name: string; linkname: string } | null;
	description?: string | null;
	images?: { role: string; original?: string; cropped?: string }[] | null;
	ageLimit?: number | null;
	category?: string | null;
	isCancelled?: boolean;
	isSoldOut?: boolean;
	isFree?: boolean;
	priceFrom?: BookibudPenger | null;
	ticketCategories?: unknown[] | null;
}

/**
 * Feeden er paginert med 25 rader per side, og `page` er den eneste måten å få
 * resten. Henter vi bare første side, får vi en tredjedel av Bergen uten at noe
 * feiler — samme stille avkorting som traff nyhetsbrevtallet og dedup.
 */
async function hentAlleSider(): Promise<BookibudRad[]> {
	const nokkel = process.env.BOOKIBUD_API_KEY;
	if (!nokkel) {
		console.warn(`[${SOURCE}] BOOKIBUD_API_KEY mangler — hopper over.`);
		return [];
	}

	const rader: BookibudRad[] = [];
	let side = 1;
	let sisteSide = 1;
	let oppgittTotal: number | null = null;

	while (side <= sisteSide) {
		let res: Response;
		try {
			res = await fetch(`${API_BASE}?city=Bergen&page=${side}`, {
				headers: {
					Authorization: `Bearer ${nokkel}`,
					'User-Agent': USER_AGENT,
					Accept: 'application/json'
				}
			});
		} catch (err) {
			// `err.message` er bare «fetch failed». Aarsaken ligger i `cause`.
			const aarsak = err instanceof Error ? (err.cause as { code?: string } | undefined)?.code : undefined;
			console.error(
				`[${SOURCE}] Henting av side ${side} feilet: ${err instanceof Error ? err.message : err}${aarsak ? ` (${aarsak})` : ''}`
			);
			break;
		}

		if (!res.ok) {
			console.error(`[${SOURCE}] HTTP ${res.status} på side ${side}`);
			break;
		}

		const json = (await res.json()) as { data?: BookibudRad[]; total?: number; totalPages?: number };
		sisteSide = json.totalPages ?? 1;
		oppgittTotal = json.total ?? oppgittTotal;
		rader.push(...(json.data ?? []));

		side++;
		if (side <= sisteSide) await delay(1500);
	}

	// Uten denne linjen ser en halv henting akkurat ut som en hel.
	if (oppgittTotal !== null && rader.length !== oppgittTotal) {
		console.warn(`[${SOURCE}] Advarsel: hentet ${rader.length} rader, API-et oppgir ${oppgittTotal}.`);
	}

	return rader;
}

/**
 * Ligaer og løp Bergen Street Food viser på storskjerm.
 *
 * Kildens tittel er kampens navn — «Eliteserien: Brann - Kristiansund» — og den
 * er tilnærmet identisk med kampen brann.ts legger inn på Brann Stadion samme
 * dag. titlesMatch() i dedup.ts regner dem som samme arrangement, siden «brann
 * kristiansund» er 62 % av den lengre tittelen, og ville slettet den ene.
 * Prefikset løser to ting på én gang: dedup skiller dem, og leseren ser at
 * dette er visning på pub og ikke kampen selv.
 */
const STORSKJERM_MARKORER =
	/\b(eliteserien|toppserien|obosligaen|conference league|champions league|europa league|premier league|grand prix|formel 1|formula 1)\b/i;

export function erStorskjerm(rad: BookibudRad): boolean {
	if (STORSKJERM_MARKORER.test(rad.title)) return true;
	// Stedet er et serveringssted. En «Sports»-rad med to navn skilt av
	// bindestrek er en sending, ikke en kamp som spilles her.
	return rad.category === 'Sports' && /\s[-–]\s/.test(rad.title);
}

export function byggTittel(rad: BookibudRad): string {
	const tittel = rad.title.trim();
	if (!erStorskjerm(rad) || /^storskjerm/i.test(tittel)) return tittel;
	return `Storskjerm: ${tittel}`;
}

/**
 * Stedsnavnet må ut før vi gjetter kategori.
 *
 * «GONGSHOW MED STAND UP BERGEN» har ingen etikett fra kilden, og beskrivelsen
 * nevner Bergen Street Food. Ordet «food» i stedsnavnet gjorde et standupshow
 * til matarrangement i den første kjøringen 21. august 2026. Stedet står
 * allerede i venue_name; det har ingenting å gjøre i kategorigjettingen.
 */
function utenStedsnavn(rad: BookibudRad): string {
	const tekst = `${rad.title} ${(rad.description ?? '').slice(0, 200)}`;
	const navn = [rad.venueName, rad.organizer?.name].filter(Boolean) as string[];
	return navn.reduce(
		(t, n) => t.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' '),
		tekst
	);
}

/**
 * Halvparten av radene har `category: null`, og plattformens egne etiketter er
 * engelske. Rekkefølgen her er: eksplisitt sending → kildens etikett → gjett
 * fra tittel og beskrivelse. mapCategory() svarer 'culture' både på ekte treff
 * og som standardverdi, så et sent klokkeslett får siste ord.
 */
export function finnKategori(rad: BookibudRad): string {
	if (erStorskjerm(rad)) return 'sports';
	if (rad.category) return mapCategory(rad.category);

	const gjett = mapCategory(utenStedsnavn(rad));
	if (gjett !== 'culture') return gjett;

	const time = Number(rad.start.slice(11, 13));
	return time >= 21 ? 'nightlife' : 'culture';
}

export function formaterPris(rad: BookibudRad): string {
	if (rad.isFree) return 'Gratis';
	const ore = rad.priceFrom?.amount;
	if (typeof ore !== 'number' || ore <= 0) return '';
	if (rad.priceFrom?.currency && rad.priceFrom.currency !== 'NOK') return '';
	return `${Math.round(ore / 100)} kr`;
}

export function formaterAdresse(rad: BookibudRad): string {
	const a = rad.address;
	const postnummer = [a?.zip, a?.city].filter(Boolean).join(' ');
	return [a?.street, postnummer].filter(Boolean).join(', ') || 'Bergen';
}

function finnBilde(rad: BookibudRad): string | undefined {
	const bilder = rad.images ?? [];
	const cover = bilder.find((b) => b.role === 'COVER') ?? bilder[0];
	return cover?.original || cover?.cropped || undefined;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Henter arrangementer fra Bookibud partner-API...`);

	const rader = await hentAlleSider();
	if (rader.length === 0) return { found: 0, inserted: 0 };
	console.log(`[${SOURCE}] Hentet ${rader.length} dagsrader`);

	// Én rad per arrangementsdag. `eventId` binder dagene sammen; uten
	// gruppering ville et flerdagers arrangement se ut som duplikater.
	const grupper = new Map<string, BookibudRad[]>();
	for (const rad of rader) {
		if (!rad?.eventId || !rad.title?.trim() || !rad.start || !rad.url) continue;
		const dager = grupper.get(rad.eventId) ?? [];
		dager.push(rad);
		grupper.set(rad.eventId, dager);
	}

	let found = 0;
	let inserted = 0;
	let behandlet = 0;

	for (const dager of grupper.values()) {
		dager.sort((a, b) => a.day.localeCompare(b.day));

		// Avlysning kommer som `isCancelled: true` på raden, ikke ved at den
		// forsvinner fra feeden. Feltet må leses aktivt.
		const aktive = dager.filter((d) => !d.isCancelled && !d.isSoldOut);
		const forste = aktive[0] ?? dager[0];
		const sourceUrl = forste.url;
		found++;

		if (aktive.length === 0) {
			const grunn = dager.every((d) => d.isCancelled) ? 'avlyst' : 'utsolgt';
			if (await deleteEventByUrl(sourceUrl)) console.log(`  - Fjernet ${grunn}: ${forste.title}`);
			continue;
		}

		if (await eventExists(sourceUrl)) continue;

		const siste = aktive[aktive.length - 1];
		const tittel = byggTittel(forste);
		const kategori = finnKategori(forste);
		const pris = formaterPris(forste);
		const sted = forste.venueName?.trim() || forste.organizer?.name?.trim() || 'Bergen';

		const dateStart = new Date(forste.start).toISOString();
		// date_end settes bare på ekte flerdagsarrangementer. En nattklubb som
		// stenger 03:00 ville ellers ligge ute dagen etter, fordi
		// removeExpiredEvents() rydder på date_end når feltet finnes.
		const dateEnd =
			siste.day !== forste.day
				? new Date(siste.end ?? `${siste.day}T23:59:59${bergenOffset(siste.day)}`).toISOString()
				: undefined;

		if (behandlet > 0) await delay(200);
		behandlet++;

		const aiDesc = await generateDescription({
			title: tittel,
			venue: sted,
			category: kategori,
			date: new Date(dateStart),
			price: pris
		});

		const success = await insertEvent({
			slug: makeSlug(tittel, forste.day),
			title_no: tittel,
			title_en: aiDesc.title_en,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category: kategori,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: sted,
			address: formaterAdresse(forste),
			bydel: mapBydel(sted),
			price: pris,
			// Dyplenken er der billetten faktisk kjøpes, og skal ikke behandles
			// som aggregatorlenke. Settes bare når arrangementet koster noe.
			ticket_url: pris && pris !== 'Gratis' ? sourceUrl : undefined,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: finnBilde(forste),
			age_group: (forste.ageLimit ?? 0) >= 18 ? '18+' : 'all',
			language: /\benglish\b/i.test(tittel) ? 'en' : 'no',
			status: 'approved'
		});

		if (success) {
			console.log(`  + ${tittel} (${forste.day} ${kategori}${pris ? ' ' + pris : ''})`);
			inserted++;
		}
	}

	console.log(`[${SOURCE}] Ferdig: ${found} funnet, ${inserted} lagt inn`);
	return { found, inserted };
}

// Standalone execution
if (process.argv[1]?.includes('bookibud')) {
	scrape()
		.then((r) => {
			console.log(`\nResultat: ${r.found} funnet, ${r.inserted} lagt inn`);
			process.exit(0);
		})
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
}
