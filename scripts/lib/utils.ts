import type * as cheerio from 'cheerio';
import { CONSENT_RECORDS } from './consent-doc.js';
import { supabase } from './supabase.js';
import { getSourceFallbackImage } from './venues.js';
import { EVENT_IMAGE_BUCKET, eventImageStoragePath } from '../../src/lib/storage-path.js';

/**
 * Generic photo-credit extractor for scrapers that load HTML with cheerio.
 *
 * Strategy (first match wins):
 *   1. Unsplash filename heuristic — `*-unsplash.{jpg,png,webp}` in imageUrl
 *   2. Figure img alt/title containing photo-credit keywords
 *   3. Visible body text: "Foto: …" / "Fotograf: …" / "Illustrasjon: …" / "© …"
 *   4. Known illustrator names (Ragnar Rørnes — Bergen Bibliotek's house illustrator)
 *
 * Pass `title` to truncate credit at the event's own title — Plone/WordPress
 * templates often place the title right after the credit, and the body-text
 * regex would otherwise slurp it into the captured string.
 *
 * Returns undefined when no credit can be found. Output is trimmed and capped at 80 chars.
 */
export function extractImageCredit(
	$: cheerio.CheerioAPI,
	imageUrl?: string,
	title?: string
): string | undefined {
	// 1. Unsplash detected from image filename — most reliable signal
	if (imageUrl && /-unsplash\.(jpe?g|png|webp)(?:$|[?#])/i.test(imageUrl)) {
		return 'Bilde: Unsplash';
	}

	// 2. Figure img alt/title attribute — only when the value looks like a credit
	// (starts with "Foto:" / "Fotograf:" / "Illustrasjon:" or contains ©).
	// "Et foto av en ridende cowboy" is alt text describing the image, not credit,
	// so we require the keyword at the start with a separator.
	const figureImg = $('figure img').first();
	const alt = (figureImg.attr('alt') || '').trim();
	if (alt && (/^(?:foto|fotograf|illustrasjon|illustrasjonsfoto)\s*[:\-—–]/i.test(alt) || /©/.test(alt))) {
		const c = cleanCredit(alt, title);
		if (c) return c;
	}
	const imgTitle = (figureImg.attr('title') || '').trim();
	if (imgTitle && (/^(?:foto|fotograf|illustrasjon|illustrasjonsfoto)\s*[:\-—–]/i.test(imgTitle) || /©/.test(imgTitle))) {
		const c = cleanCredit(imgTitle, title);
		if (c) return c;
	}

	// 3. Body text: "Foto: Navn Navnesen" / "Fotograf: Navn" / "Illustrasjon: Navn"
	//
	// Preserve block-level boundaries as newlines so the regex stops at the natural
	// end of the credit line — otherwise sentences after the credit get slurped in
	// (e.g. "Foto: Mika Ranta Støttet av Stiftelsen…"). Cheerio's `.text()` would
	// flatten everything to a single line.
	$('br, p, div, figcaption, li, footer, aside, h1, h2, h3, h4, h5, h6').each((_i, el) => {
		$(el).append('\n');
	});
	const bodyText = $('body').text().replace(/[ \t]+/g, ' ').replace(/\n+/g, '\n').trim();
	// Capture stops at newline, comma, or parens. Periods that look like sentence
	// boundaries (period followed by lowercase or end) also stop; "Off."-style
	// abbreviation periods (followed by optional whitespace then an uppercase letter)
	// are allowed through.
	const photoMatch = bodyText.match(/(?:Foto|Fotograf|Illustrasjon|Illustrasjonsfoto)\s*:\s*((?:\.(?=\s*[A-ZÆØÅ])|[^.\n,()]){2,80})/i);
	if (photoMatch) {
		const c = cleanCredit(photoMatch[0], title);
		if (c) return c;
	}

	// "Illustrasjon av Ragnar Rørnes" — Bergen Bibliotek's house illustrator
	if (/Ragnar\s+R(?:ø|o)rnes/i.test(bodyText)) return 'Illustrasjon: Ragnar Rørnes';

	// 4. Unsplash mentioned in body text (e.g. "Bilde fra Unsplash")
	if (/Unsplash/i.test(bodyText)) return 'Bilde: Unsplash';

	return undefined;
}

/**
 * Trim a raw credit string. If the event title appears inside the credit,
 * truncate before the title — Plone/WP templates often write the title
 * directly after a "Foto: X" line with no separator, and the body-text regex
 * captures both. Always cap at 80 chars as a safety net.
 */
/** Sentence-starter words that frequently follow a credit line in Norwegian event
 *  templates (Squarespace, custom CMS). Capture stops here so we don't slurp the
 *  next paragraph. Lowercase compare. */
const CREDIT_STOPWORDS = new Set([
	'waiver', 'ansvarsfraskrivelse', 'ansvarlig',
	'kjøp', 'kjøpte', 'bestill', 'reduser', 'fribillett',
	'sponset', 'støttet', 'velkommen', 'åpne', 'lukk', 'bildetekst',
	'mer', 'pris', 'inkludert', 'gratis', 'praktisk', 'klikk',
	'programmet', 'forestillingen', 'konserten', 'stykket', 'filmen',
	'med', 'du', 'vi', 'han', 'hun', 'den', 'det', 'en', 'et', 'av', 'til',
	'før', 'etter', 'også', 'bien'
]);

function cleanCredit(raw: string, title?: string): string {
	let cleaned = raw.trim();
	if (title && title.length >= 6) {
		const titleStart = title.slice(0, 12);
		const idx = cleaned.indexOf(titleStart);
		if (idx > 4) cleaned = cleaned.slice(0, idx).trim();
	}

	// Stop at known sentence-starter tokens (Squarespace/custom CMS continuations)
	// and at any CSS-class-like artefact (`#block-...`).
	const m = cleaned.match(/^([^:]+:)\s*(.*)$/);
	if (m) {
		const prefix = m[1];
		const tokens = m[2].split(/\s+/);
		const kept: string[] = [];
		for (const tok of tokens) {
			if (tok.startsWith('#')) break;
			if (CREDIT_STOPWORDS.has(tok.toLowerCase().replace(/[.,;:]+$/, ''))) break;
			kept.push(tok);
		}
		cleaned = `${prefix} ${kept.join(' ')}`.trim();
	}

	// Drop trailing artefacts: punctuation, dash, colon, pipe, whitespace
	cleaned = cleaned.replace(/[\s\-:|.,;"]+$/, '').trim();

	// Reject result that is just the prefix with no name (e.g. "Foto" after
	// title-truncation chewed up the whole captured string).
	if (/^(?:Foto|Fotograf|Illustrasjon|Illustrasjonsfoto|©)\s*:?\s*$/i.test(cleaned)) return '';

	return cleaned.slice(0, 80);
}

/**
 * Bildesamtykke. Begge listene bygges fra scripts/lib/consent.json, som er
 * fasiten. Rediger aldri kildene her; rediger JSON-fila og kjør
 * `npx tsx scripts/consent.ts sync`.
 *
 * Grunnen til at det er én fil og ikke to lister: tidligere lå kildene her og
 * begrunnelsen i docs/bildesamtykke.md, og de kunne drive fra hverandre. Nå
 * finnes det bare ett sted å gjøre feil.
 *
 * IMAGE_APPROVED_SOURCES styrer visning på gaari.no, som kan hvile på
 * hot-link med opt-out. PROMO_APPROVED_SOURCES styrer aktiv promotering i
 * Gåris egne kanaler, og krever alltid et dokumentert ja.
 */
export { CONSENT_RECORDS };

export const IMAGE_APPROVED_SOURCES = new Set<string>(
	CONSENT_RECORDS.filter((k) => k.omfang.includes('visning')).map((k) => k.slug)
);

/**
 * Aktiv promotering krever dokumentert ja. Grunnlaget sjekkes her og ikke bare
 * i dokumentasjonen, så en kilde med hot-link-grunnlag ikke kan havne i
 * SoMe-listen ved en feil i JSON-fila.
 */
export const PROMO_APPROVED_SOURCES = new Set<string>(
	CONSENT_RECORDS.filter(
		(k) => k.omfang.includes('some') && k.grunnlag === 'dokumentert'
	).map((k) => k.slug)
);

export function isPromoApproved(source: string): boolean {
	return PROMO_APPROVED_SOURCES.has(source);
}

/**
 * Venues/arrangører som har eksplisitt sagt nei til bildebruk pga tredjeparts-rettigheter.
 * Sjekkes ved hver insert/update mot BÅDE venue_name OG title — selv om kilden er
 * IMAGE_APPROVED_SOURCES, blokkeres bildet hvis enten matcher.
 *
 * Trengs fordi arrangører som Bjørgvin Blues holder events på andre venues (Madam Felle),
 * der venue_name ikke matcher arrangørens navn. Tittelen inneholder typisk arrangørens navn.
 *
 * Matchet via case-insensitive substring.
 *
 * Datoene viser til korrespondansen i Protonmail Folders/Gaari/Avtaler, og
 * hvem som sa hva staar i private/bildesamtykke-full.md. Navnene hoerer ikke
 * hjemme her; repoet er offentlig.
 */
const IMAGE_BLOCKED_VENUE_PATTERNS = [
	'hulen', // Arrangoeren 2026-04-23: betinget ja (kreditering eller plakat). Vi har ikke kreditering-felt; blokker til SoMe-batchen 2026-06-01.
	'bjørgvin blues', 'bjorgvin blues', 'bjørgvin bluesklubb', 'bjorgvin bluesklubb', // Arrangoeren 2026-04-24: tredjeparts blir for omfattende.
	'bergen live', 'bergenlive', // Arrangoeren 2026-04-20: pressebilder fra artist.
	'sk brann', 'brann stadion', // Klubben 2026-04-19: NTB/Bildbyrån/freelance/presse.
	'bek ', // BEK 2026-04-21: kunstnerne eier bildene. Trailing space for å unngå false-match.
	'mg event', // Arrangoeren 2026-05-06: arrangementene er greit, bildene ikke. Events OK, bilder nei.
	'beyond the gates', 'beyondthegates', // Festivalen 2026-05-07: bilder fra mange forskjellige opphavsmenn, ikke entydig tillatelse.
];

/**
 * Sperre på adresse, ikke på navn.
 *
 * IMAGE_BLOCKED_VENUE_PATTERNS leter i venue_name og tittel, og det holder bare
 * så lenge arrangørens navn faktisk står der. Billettplattformene setter ofte
 * «Bergen» som sted, og da avgjør tittelen alene. Hulens egne konserter heter
 * som regel «... || Hulen», men ikke alltid: «ROCKOUT 2026 || 40 års Jubileum»
 * og «Den Store Heavy Metal Festen XXV» nevner ikke scenen med ett ord, og lå
 * derfor ute med bilde 18. august 2026 selv om Hulen har stått sperret siden
 * 23. april.
 *
 * Underdomenet lyver ikke. Alt som selges via hulen.ticketco.events er Hulens
 * arrangement, uansett hva det heter.
 */
const IMAGE_BLOCKED_URL_PATTERNS = [
	'hulen.ticketco.events' // Samme avslag 2026-04-23, se merknaden over 'hulen'.
];

/**
 * Per-event approvals (substring match on source_url).
 * Use when the scraper source hosts many organizers (e.g. billetto, ticketco)
 * and only specific organizers have granted permission.
 */
const IMAGE_APPROVED_URL_PATTERNS: string[] = [
	'billetto.no/e/pavels-juke-joint', // Arrangoeren bekreftet 2026-04-17
	// Utdanning i Bergen bekreftet 2026-04-21:
	// Kun løp/tur-arrangement hvor StudentBergen eier bildene selv. Resten bruker arrangørbilder.
	'studentbergen.no/studentkalender/ulriken-opp',
	'studentbergen.no/studentkalender/7-fjellsturen',
	'studentbergen.no/studentkalender/17-mai-feiring-i-bergen',
	'studentbergen.no/studentkalender/bergen-eco-trail',
];

/**
 * Bergen Bibliotek: interne og gjentagende events (språkkafé, verksted, familietid) bruker
 * egne bilder av rom/aktiviteter — trygt å vise. Forelesninger og forfatterbesøk bruker ofte
 * pressefoto som biblioteket selv ikke har videredistribusjonsrett på (se NTB-saken).
 * Se feedback_bergenbibliotek_images.md i memory.
 */
const BIBLIOTEK_RISKY_TITLE_KEYWORDS = [
	'foredrag', 'forelesning',
	'forfatter',
	'litterær lunsj', 'litterært råd',
	' møter ',
	'samtale med', 'spørretime med',
	'dypdykk',
	'den offentlige samtalen',
	'månedens klassiker',
];

/**
 * Bergen kommune kulturkalender: Elen Langeland (kulturkontoret) bekreftet 2026-04-27 at logoer
 * (UNG-klubber) og stockbilder er OK. Personbilder uten eksterne avtaler er usikre — "der dere er
 * usikre, er det best å ta en avsjekk hos oss, eller la være å bruke bilde". Vi blokkerer titler
 * som typisk indikerer navngitt person (foredrag, konsert med X, jazzgalleri-serie, forfatter).
 */
const BERGENKOMMUNE_RISKY_TITLE_KEYWORDS = [
	'foredrag', 'forelesning', 'konsertforedrag',
	'forfatter',
	'litterær',
	'samtale med',
	'mestermøte',
	'jazzgalleri',
	'det melodiske',
	'konsert med', 'konsert m/',
];

/**
 * HEAD-request bildets URL med Referer: gaari.no for å sjekke om kilden tillater
 * ekstern lenking. Implementerer VG Bild-Kunst-doktrinen (C-392/19): tekniske
 * sperrer mot embedding må respekteres.
 *
 * Returnerer false KUN ved permanent client-error (4xx) eller eksplisitt
 * robots-header som blokkerer image-bruk. 5xx/timeout/network-feil → true
 * (ikke straff kilder for midlertidig nedetid).
 */
const hotlinkCache = new Map<string, boolean>();

export async function verifyHotlinkable(imageUrl: string): Promise<boolean> {
	const cached = hotlinkCache.get(imageUrl);
	if (cached !== undefined) return cached;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 5000);
	let result = true;
	try {
		const res = await fetch(imageUrl, {
			method: 'HEAD',
			headers: {
				'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
				'Referer': 'https://gaari.no',
			},
			redirect: 'follow',
			signal: controller.signal,
		});
		// Permanent client errors → blokkert
		if (res.status >= 400 && res.status < 500) {
			result = false;
		} else {
			const robotsTag = res.headers.get('x-robots-tag');
			if (robotsTag && /noimageindex|noai/i.test(robotsTag)) result = false;
		}
	} catch {
		// Network error / timeout → ikke straff
		result = true;
	} finally {
		clearTimeout(timeoutId);
	}

	hotlinkCache.set(imageUrl, result);
	return result;
}

const FALLBACK_URL_PREFIX = 'supabase.co/storage/v1/object/public/event-images/fallback/';

/**
 * Image credit som signaliserer at bildet kan brukes selv om tittelen ellers
 * ville blitt blokkert (forfatter/foredrag-keywords). Bekreftet av Bergen
 * offentlige bibliotek 2026-05-12: forfatterportretter fra
 * forlag er OK når fotografen er kreditert.
 */
const CREDIT_UNLOCKS_BLOCKED_TITLE = /Foto\s*:|Fotograf\s*:|Illustrasjon\s*:|Illustrasjonsfoto\s*:|Ragnar\s+R(?:ø|o)rnes|Unsplash/i;

/**
 * Eksportert fordi sperren ellers bare gjelder ved innlegging. Sier en arrangør
 * nei i dag, blir bildene som allerede står i basen liggende, og et nei som
 * bare gjelder framover er ikke et nei. `enforce-image-blocks.ts` bruker denne
 * til å gå gjennom det som allerede ligger inne.
 */
export function isImageAllowed(source: string, sourceUrl: string, title: string, venueName?: string, imageUrl?: string, imageCredit?: string): boolean {
	// Blokker venues/arrangører som har sagt nei — sjekker både venue_name og title.
	// Vår egen fallback-grafikk (logo) er unntatt: den hostes hos oss og er
	// eksplisitt godkjent for hver kilde i SOURCE_FALLBACK_IMAGES.
	const isOurFallback = imageUrl && imageUrl.includes(FALLBACK_URL_PREFIX);
	if (!isOurFallback) {
		const haystack = `${venueName || ''} ${title || ''}`.toLowerCase();
		if (IMAGE_BLOCKED_VENUE_PATTERNS.some(p => haystack.includes(p))) return false;
		const url = (sourceUrl || '').toLowerCase();
		if (IMAGE_BLOCKED_URL_PATTERNS.some(p => url.includes(p))) return false;
	}
	// Bildet er lastet opp gjennom /submit av arrangøren selv.
	//
	// Opplastingen skjer bare når avsenderen har krysset av for at de har
	// rettighetene; uten den avkryssingen sendes ingen fil. Porten er altså
	// allerede passert, og listen over godkjente kilder svarer på et annet
	// spørsmål: om VI kan hente et bilde fra noen andres side.
	//
	// Uten dette unntaket falt innsendinger mellom stolene. `source` er ikke
	// satt for dem, og tom streng finnes ikke i IMAGE_APPROVED_SOURCES, så
	// `enforce-image-blocks.ts` nullet `image_url` neste gang den kjørte. Fila
	// ble liggende i bøtta. Resultatet var det verst tenkelige av to verdener:
	// vi lagret bildet uten å vise det. Macbeth-innsendingen fra 9. august
	// mistet bildet sitt 11. august på denne måten, og fila lå igjen til den ble
	// ryddet 25. august.
	//
	// Sperrelisten over står fortsatt over dette. Har en arrangør sagt nei,
	// hjelper det ikke at noen andre laster opp bildet gjennom skjemaet.
	if (eventImageStoragePath(imageUrl) !== null) return true;

	if (IMAGE_APPROVED_SOURCES.has(source)) return true;
	if (IMAGE_APPROVED_URL_PATTERNS.some(p => sourceUrl.includes(p))) return true;
	if (source === 'bergenbibliotek') {
		const t = (title || '').toLowerCase();
		const isRiskyTitle = BIBLIOTEK_RISKY_TITLE_KEYWORDS.some(kw => t.includes(kw));
		if (!isRiskyTitle) return true;
		// Risky title (foredrag, forfatter, …) — slipp gjennom hvis kreditering finnes
		return !!(imageCredit && CREDIT_UNLOCKS_BLOCKED_TITLE.test(imageCredit));
	}
	if (source === 'bergenkommune') {
		const t = (title || '').toLowerCase();
		return !BERGENKOMMUNE_RISKY_TITLE_KEYWORDS.some(kw => t.includes(kw));
	}
	return false;
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[æ]/g, 'ae')
		.replace(/[ø]/g, 'o')
		.replace(/[å]/g, 'a')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove accents
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')
		.slice(0, 80);
}

export function makeSlug(title: string, dateStr?: string): string {
	const base = slugify(title) || 'event';
	if (dateStr) {
		const date = new Date(dateStr);
		if (!isNaN(date.getTime())) {
			const ymd = date.toISOString().slice(0, 10);
			return `${base}-${ymd}`;
		}
	}
	return `${base}-${Date.now().toString(36)}`;
}

// Parse Norwegian date strings like "19. feb 2026", "Feb 19, 2026", etc.
export const NORWEGIAN_MONTHS: Record<string, number> = {
	'jan': 0, 'januar': 0,
	'feb': 1, 'februar': 1,
	'mar': 2, 'mars': 2,
	'apr': 3, 'april': 3,
	'mai': 4,
	'jun': 5, 'juni': 5,
	'jul': 6, 'juli': 6,
	'aug': 7, 'august': 7,
	'sep': 8, 'september': 8,
	'okt': 9, 'oktober': 9,
	'nov': 10, 'november': 10,
	'des': 11, 'desember': 11,
};

export function parseNorwegianDate(str: string): string | null {
	if (!str) return null;
	str = str.trim();

	// Try ISO format first
	const isoDate = new Date(str);
	if (!isNaN(isoDate.getTime()) && str.includes('-')) {
		return isoDate.toISOString();
	}

	// Norwegian format: "19. feb 2026" or "19. februar 2026"
	const noMatch = str.match(/(\d{1,2})\.\s*(\w+)\s*(\d{4})/);
	if (noMatch) {
		const day = parseInt(noMatch[1]);
		const month = NORWEGIAN_MONTHS[noMatch[2].toLowerCase()];
		const year = parseInt(noMatch[3]);
		if (month !== undefined) {
			return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
		}
	}

	// "9 Jan 2026" format (day month year, no period)
	const dMyMatch = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
	if (dMyMatch) {
		const day = parseInt(dMyMatch[1]);
		const month = NORWEGIAN_MONTHS[dMyMatch[2].toLowerCase().slice(0, 3)];
		const year = parseInt(dMyMatch[3]);
		if (month !== undefined) {
			return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
		}
	}

	// "Feb 19, 2026" format
	const enMatch = str.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
	if (enMatch) {
		const month = NORWEGIAN_MONTHS[enMatch[1].toLowerCase().slice(0, 3)];
		const day = parseInt(enMatch[2]);
		const year = parseInt(enMatch[3]);
		if (month !== undefined) {
			return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
		}
	}

	// "19/02/2026" or "2026-02-19" format
	const slashMatch = str.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
	if (slashMatch) {
		const day = parseInt(slashMatch[1]);
		const month = parseInt(slashMatch[2]) - 1;
		const year = parseInt(slashMatch[3]);
		return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
	}

	return null;
}

/**
 * Proper CET/CEST offset for Bergen, Norway.
 * DST: last Sunday of March 01:00 UTC → last Sunday of October 01:00 UTC.
 */
export function bergenOffset(dateStr: string): string {
	const d = new Date(dateStr + 'T12:00:00Z');
	const year = d.getUTCFullYear();
	// Last Sunday of March
	const marchLast = new Date(Date.UTC(year, 2, 31));
	const dstStart = new Date(Date.UTC(year, 2, 31 - marchLast.getUTCDay(), 1));
	// Last Sunday of October
	const octLast = new Date(Date.UTC(year, 9, 31));
	const dstEnd = new Date(Date.UTC(year, 9, 31 - octLast.getUTCDay(), 1));
	return (d >= dstStart && d < dstEnd) ? '+02:00' : '+01:00';
}

/**
 * Strip HTML tags from a string.
 */
export function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// In-memory cache of existing source_urls — loaded once per pipeline run by loadExistingUrls()
let existingUrlsCache: Set<string> | null = null;

// Load all existing source_urls into memory. Call once at pipeline start.
// Falls back to per-event DB queries if not called (e.g. when running a single scraper).
export async function loadExistingUrls(): Promise<void> {
	const cache = new Set<string>();
	const PAGE_SIZE = 1000;
	let page = 0;

	while (true) {
		const { data, error } = await supabase
			.from('events')
			.select('source_url')
			.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

		if (error) {
			console.error('loadExistingUrls failed on page', page, ':', error.message);
			break; // fail open — scrapers continue, UNIQUE constraint handles duplicates
		}

		if (!data || data.length === 0) break;
		data.forEach(row => { if (row.source_url) cache.add(row.source_url); });
		if (data.length < PAGE_SIZE) break;
		page++;
	}

	existingUrlsCache = cache;
	console.log(`Loaded ${cache.size} existing source_urls into cache`);
}

// Check if an event with this source_url already exists
export async function eventExists(sourceUrl: string): Promise<boolean> {
	// Use in-memory cache when available (eliminates per-event DB round-trips)
	if (existingUrlsCache !== null) {
		return existingUrlsCache.has(sourceUrl);
	}

	// Fallback: direct DB query (cache not loaded — single-scraper runs)
	const { data } = await supabase
		.from('events')
		.select('id')
		.eq('source_url', sourceUrl)
		.limit(1);

	return (data && data.length > 0) || false;
}

// Check if an existing event has a non-null image_url (for scraper self-healing).
// Assumes event exists — caller should check eventExists() first.
export async function eventHasImage(sourceUrl: string): Promise<boolean> {
	const { data } = await supabase
		.from('events')
		.select('image_url')
		.eq('source_url', sourceUrl)
		.limit(1);
	return !!(data && data[0]?.image_url);
}

// Status for self-healing — one query, both flags. Use this when a scraper may
// want to backfill either field to avoid two round-trips.
export async function getEventImageStatus(sourceUrl: string): Promise<{ hasImage: boolean; hasCredit: boolean }> {
	const { data } = await supabase
		.from('events')
		.select('image_url, image_credit')
		.eq('source_url', sourceUrl)
		.limit(1);
	const row = data?.[0];
	return { hasImage: !!row?.image_url, hasCredit: !!row?.image_credit };
}

// Update image_url for an existing event, only if currently null (safe for concurrent scrapes).
// Honors the same allowlist as insertEvent — refuses to set image on unapproved events.
export async function updateEventImage(sourceUrl: string, imageUrl: string): Promise<boolean> {
	const { data: existing } = await supabase
		.from('events')
		.select('source, title_no, venue_name')
		.eq('source_url', sourceUrl)
		.limit(1);
	const row = existing?.[0];
	if (!row) return false;
	if (!isImageAllowed(row.source, sourceUrl, row.title_no, row.venue_name, imageUrl)) return false;
	if (!(await verifyHotlinkable(imageUrl))) return false;

	const { data, error } = await supabase
		.from('events')
		.update({ image_url: imageUrl })
		.eq('source_url', sourceUrl)
		.is('image_url', null)
		.select('id');
	if (error) {
		console.error(`  Failed to update image for ${sourceUrl}:`, error.message);
		return false;
	}
	return (data && data.length > 0) || false;
}

// Update image_credit for an existing event, only if currently null.
// Caller is responsible for verifying credit makes sense for the image.
export async function updateEventCredit(sourceUrl: string, credit: string): Promise<boolean> {
	const trimmed = credit.trim().slice(0, 200);
	if (!trimmed) return false;
	const { data, error } = await supabase
		.from('events')
		.update({ image_credit: trimmed })
		.eq('source_url', sourceUrl)
		.is('image_credit', null)
		.select('id');
	if (error) {
		console.error(`  Failed to update credit for ${sourceUrl}:`, error.message);
		return false;
	}
	return (data && data.length > 0) || false;
}

// Delete a sold-out event by source_url (returns true if an event was deleted)
export async function deleteEventByUrl(sourceUrl: string): Promise<boolean> {
	// Henter foerst, sletter etterpaa. Raden maa leses mens den finnes, ellers
	// er image_url borte naar bildet skal ryddes.
	const { data } = await supabase
		.from('events')
		.select('id, image_url')
		.eq('source_url', sourceUrl);
	if (!data || data.length === 0) return false;

	const { deleted } = await deleteEventsAndImages(data);
	return deleted > 0;
}

// Opt-out filtering — domains that have requested removal
let optOutDomains: Set<string> | null = null;

export async function loadOptOuts(): Promise<void> {
	const { data, error } = await supabase
		.from('opt_out_requests')
		.select('domain')
		.eq('status', 'approved');

	if (error) {
		console.error('CRITICAL: Failed to load opt-outs:', error.message);
		throw new Error('Cannot proceed without opt-out list');
	}

	optOutDomains = new Set((data || []).map(r => r.domain.toLowerCase()));
	if (optOutDomains.size > 0) {
		console.log(`Loaded ${optOutDomains.size} opt-out domain(s): ${[...optOutDomains].join(', ')}`);
	}
}

/** Get loaded opt-out domains (for reuse in scrape.ts without duplicate query) */
export function getOptOutDomains(): string[] {
	return optOutDomains ? [...optOutDomains] : [];
}

export function isOptedOut(sourceUrl: string): boolean {
	if (!optOutDomains || optOutDomains.size === 0) return false;
	try {
		const hostname = new URL(sourceUrl).hostname.replace(/^www\./, '');
		// Check exact match AND subdomain match (e.g. api.example.com matches example.com)
		for (const domain of optOutDomains) {
			if (hostname === domain || hostname.endsWith('.' + domain)) return true;
		}
		return false;
	} catch {
		return false;
	}
}

// Detect free events from title/description text when price field is empty
const FREE_KEYWORDS = /(?:^|\s|—)(gratis|fri inngang|free entry|free admission|free event|ingen inngangspenger|kostnadsfritt|åpen dag|open day|gratis inngang|fri entré|fri entre)(?:\s|$|[.,!?;:])/i;

export function detectFreeFromText(title: string, description: string): boolean {
	return FREE_KEYWORDS.test(title) || FREE_KEYWORDS.test(description);
}

// Insert an event into Supabase
export interface ScrapedEvent {
	slug: string;
	title_no: string;
	title_en?: string;
	description_no: string;
	description_en?: string;
	category: string;
	date_start: string;
	date_end?: string;
	venue_name: string;
	address: string;
	bydel: string;
	price: string;
	ticket_url?: string;
	source: string;
	source_url: string;
	image_url?: string;
	image_credit?: string;
	age_group: string;
	language: string;
	status: string;
}

function isValidUrl(str: string): boolean {
	try {
		const u = new URL(str);
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

export async function insertEvent(event: ScrapedEvent): Promise<boolean> {
	// Validate required fields
	if (!event.title_no || event.title_no.trim().length < 2) {
		console.warn(`  Skipping event with empty/short title: "${event.title_no}"`);
		return false;
	}
	if (!event.slug || event.slug.length < 3) {
		console.warn(`  Skipping event with invalid slug: "${event.slug}"`);
		return false;
	}
	if (!event.date_start || isNaN(new Date(event.date_start).getTime())) {
		console.warn(`  Skipping event with invalid date_start: "${event.date_start}" (${event.title_no})`);
		return false;
	}
	if (!event.source_url || !isValidUrl(event.source_url)) {
		console.warn(`  Skipping event with invalid source_url: "${event.source_url}" (${event.title_no})`);
		return false;
	}

	// Reject past events (before start of today UTC)
	const todayStart = new Date();
	todayStart.setUTCHours(0, 0, 0, 0);
	const eventDate = new Date(event.date_start);
	if (eventDate < todayStart && !event.date_end) {
		return false; // Silently skip past events
	}

	// Sanitize optional ticket_url
	if (event.ticket_url && !isValidUrl(event.ticket_url)) {
		event.ticket_url = undefined;
	}

	// Only allow images from sources/URLs/titles with explicit written permission.
	if (event.image_url && !isImageAllowed(event.source, event.source_url, event.title_no, event.venue_name, event.image_url, event.image_credit)) {
		event.image_url = undefined;
		event.image_credit = undefined;
	}

	// Respekter tekniske sperrer (VG Bild-Kunst C-392/19).
	if (event.image_url && !(await verifyHotlinkable(event.image_url))) {
		event.image_url = undefined;
		event.image_credit = undefined;
	}

	if (isOptedOut(event.source_url)) {
		return false;
	}

	// Skip non-public events (members-only, kindergartens, school visits, etc.)
	const NON_PUBLIC_KEYWORDS = [
		'kun for medlemmer', 'members only', 'only for members',
		'barnehage', 'barnehagebarn', 'barnehagar', 'barnehager',
		'sfo', 'skoleklasse', 'skolebesøk', 'skolebesok', 'klassebesøk', 'klassebesok',
	];
	const titleLower = event.title_no?.toLowerCase() ?? '';
	if (NON_PUBLIC_KEYWORDS.some(kw => titleLower.includes(kw))) {
		console.warn(`  Skipping non-public event: "${event.title_no}"`);
		return false;
	}

	// Infer free price from title/description when price is empty
	if (!event.price && detectFreeFromText(event.title_no, event.description_no)) {
		event.price = 'Gratis';
	}

	// Apply venue fallback image when scraper didn't provide one
	if (!event.image_url && event.source) {
		const fallback = getSourceFallbackImage(event.source);
		if (fallback) event.image_url = fallback;
	}

	const { error } = await supabase.from('events').insert(event);
	if (error) {
		// Duplicate slug — skip silently
		if (error.code === '23505') return false;
		console.error(`  Error inserting "${event.title_no}":`, error.message);
		return false;
	}
	return true;
}

// Normalize title for deduplication comparison
export function normalizeTitle(title: string): string {
	return title
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/[å]/g, 'a')
		.replace(/\b20[2-3]\d\b/g, '')     // Remove plausible years (2020-2039)
		.replace(/\b(bergen|i bergen)\b/g, '') // Remove "bergen"
		.replace(/[^a-z0-9]/g, '')         // Only alphanumeric
		.trim();
}

// Check if a similar event already exists (cross-source deduplication)
export async function findDuplicate(title: string, dateStart: string): Promise<boolean> {
	const dateDay = dateStart.slice(0, 10); // YYYY-MM-DD
	const normalized = normalizeTitle(title);
	if (normalized.length < 5) return false; // Too short to match reliably

	// Fetch events on the same day
	const { data } = await supabase
		.from('events')
		.select('title_no')
		.gte('date_start', `${dateDay}T00:00:00`)
		.lte('date_start', `${dateDay}T23:59:59`);

	if (!data || data.length === 0) return false;

	for (const existing of data) {
		const existingNorm = normalizeTitle(existing.title_no);
		// Check if one title contains the other — with length ratio guard
		if (normalized.includes(existingNorm) || existingNorm.includes(normalized)) {
			const shorter = normalized.length < existingNorm.length ? normalized : existingNorm;
			const longer = normalized.length < existingNorm.length ? existingNorm : normalized;
			if (shorter.length >= longer.length * 0.6) return true;
		}
		// Check 90% prefix overlap (tightened from 80%) with length ratio
		if (normalized.length >= 8 && existingNorm.length >= 8) {
			const shorter = normalized.length < existingNorm.length ? normalized : existingNorm;
			const longer = normalized.length < existingNorm.length ? existingNorm : normalized;
			if (longer.length <= shorter.length * 1.3) {
				if (longer.includes(shorter.slice(0, Math.floor(shorter.length * 0.9)))) {
					return true;
				}
			}
		}
	}

	return false;
}

// Remove expired events (date_end or date_start is in the past)
/**
 * Slett arrangementer OG bildene deres.
 *
 * Fantes ikke foer 2026-08-23, og det er grunnen til at 17 filer paa 31 MB laa
 * igjen i boetta uten et arrangement som pekte paa dem: begge sletteveiene
 * under fjernet raden i basen og lot fila staa.
 *
 * Eksportert 2026-08-25 fordi det fantes flere sletteveier enn de to. Da
 * deduplicate() i dedup.ts lagde et nytt foreldreloest bilde 24. august,
 * dagen etter at de to foerste ble tettet, viste et soek fire til:
 * deleteEventByUrl(), refreshStaleMultiDateEvents() og opt-out-ryddingen i
 * scrape.ts gikk alle rett paa .delete(). Alle fire gaar naa gjennom denne.
 *
 * De to som IKKE gjoer det, og hvorfor det er greit: admin-ops.ts og
 * /admin/submissions kaller eventImageStoragePath() selv rett foer sletting,
 * og canary-manage.ts sletter bare vaare egne planta canary-rader, som ikke
 * har opplastede bilder. Regelen aa holde er ikke «kall denne funksjonen»,
 * men «ingen slettevei skal etterlate en fil i boetta».
 *
 * eventImageStoragePath() avgjoer hva som er trygt aa roere. Den nekter aa
 * returnere noe utenfor events/, saa de delte fallback/-bildene kan ikke
 * treffes herfra uansett hvor mange arrangementer som peker paa dem.
 *
 * Bildene slettes FOER radene. Feiler storage-kallet, staar arrangementet
 * fortsatt i basen og forsoekes paa nytt neste kjoering. Motsatt rekkefoelge
 * ville gjort en feilet sletting usynlig for alltid — raden som pekte paa fila
 * er da borte.
 */
export async function deleteEventsAndImages(
	rows: Array<{ id: string; slug?: string | null; image_url?: string | null }>
): Promise<{ deleted: number; imagesRemoved: number }> {
	if (rows.length === 0) return { deleted: 0, imagesRemoved: 0 };

	const paths = rows
		.map(r => eventImageStoragePath(r.image_url))
		.filter((p): p is string => p !== null);

	let imagesRemoved = 0;
	for (let i = 0; i < paths.length; i += 100) {
		const batch = paths.slice(i, i + 100);
		const { error } = await supabase.storage.from(EVENT_IMAGE_BUCKET).remove(batch);
		if (error) {
			console.warn(`  Kunne ikke slette ${batch.length} bilder: ${error.message}`);
		} else {
			imagesRemoved += batch.length;
		}
	}

	const ids = rows.map(r => r.id);
	let deleted = 0;
	for (let i = 0; i < ids.length; i += 100) {
		const batch = ids.slice(i, i + 100);
		const { error } = await supabase.from('events').delete().in('id', batch);
		if (!error) deleted += batch.length;
	}

	return { deleted, imagesRemoved };
}

export async function removeExpiredEvents(): Promise<{ deleted: number; slugs: string[] }> {
	// Use start-of-today as cutoff — don't delete today's events even if their time has passed
	const todayStart = new Date();
	todayStart.setUTCHours(0, 0, 0, 0);
	const cutoff = todayStart.toISOString();

	// Delete events where date_end is past (multi-day events that have ended)
	const { data: endedEvents } = await supabase
		.from('events')
		.select('id, slug, image_url')
		.not('date_end', 'is', null)
		.lt('date_end', cutoff);

	// Delete events where date_start is before today and no date_end
	const { data: pastEvents } = await supabase
		.from('events')
		.select('id, slug, image_url')
		.is('date_end', null)
		.lt('date_start', cutoff);

	const allEntries = [
		...(endedEvents || []),
		...(pastEvents || []),
	];

	if (allEntries.length === 0) return { deleted: 0, slugs: [] };

	const allSlugs = allEntries.map(e => e.slug).filter(Boolean);

	const { deleted, imagesRemoved } = await deleteEventsAndImages(allEntries);
	if (imagesRemoved > 0) console.log(`  Slettet ${imagesRemoved} tilhoerende bilder`);

	return { deleted, slugs: allSlugs };
}

// Sources whose scrapers have been disabled. Any events still tagged with these
// sources are stale — drop them at the start of every pipeline run so they don't
// linger on collection pages. Note: scraper-health.ts has its own narrower list
// for filtering historical scraper_runs rows.
export const DISABLED_SOURCES = ['bergenlive', 'oseana', 'barnasnorge', 'eventbrite', 'kulturikveld'];

export async function removeDisabledSourceEvents(): Promise<number> {
	const { data } = await supabase
		.from('events')
		.select('id, slug, image_url')
		.in('source', DISABLED_SOURCES);

	if (!data || data.length === 0) return 0;

	const { deleted } = await deleteEventsAndImages(data);
	return deleted;
}

// Scrapers that set date_start/date_end to discrete show dates (first/last performance).
// When the first show passes, the event shows a stale date — delete so the scraper
// re-inserts with the next future show date.
const DISCRETE_DATE_SOURCES = ['olebull', 'dns', 'grieghallen', 'carteblanche', 'harmonien'];

export async function refreshStaleMultiDateEvents(): Promise<number> {
	const todayStart = new Date();
	todayStart.setUTCHours(0, 0, 0, 0);
	const cutoff = todayStart.toISOString();
	const now = new Date().toISOString();

	const { data } = await supabase
		.from('events')
		.select('id, title_no, source, image_url')
		.in('source', DISCRETE_DATE_SOURCES)
		.lt('date_start', cutoff)
		.gt('date_end', now);

	if (!data || data.length === 0) return 0;

	const { deleted } = await deleteEventsAndImages(data);
	return deleted;
}

// Generate a factual description from event metadata (avoids copying copyrighted text)
export const CATEGORY_LABELS_NO: Record<string, string> = {
	music: 'Konsert',
	culture: 'Kulturarrangement',
	theatre: 'Teater/scenekunst',
	family: 'Familieaktivitet',
	food: 'Mat og drikke',
	festival: 'Festival/marked',
	sports: 'Sport/friluft',
	nightlife: 'Uteliv',
	workshop: 'Kurs/workshop',
	student: 'Studentarrangement',
	tours: 'Tur/omvisning',
};

const CATEGORY_LABELS_EN: Record<string, string> = {
	music: 'Concert',
	culture: 'Cultural event',
	theatre: 'Theatre/performing arts',
	family: 'Family activity',
	food: 'Food & drink',
	festival: 'Festival/market',
	sports: 'Sports/outdoors',
	nightlife: 'Nightlife',
	workshop: 'Workshop/course',
	student: 'Student event',
	tours: 'Tour/guided visit',
};

export function makeDescription(title: string, venueName: string, category: string): string {
	const catLabel = CATEGORY_LABELS_NO[category] || 'Arrangement';
	return `${title} — ${catLabel} på ${venueName}`.slice(0, 160);
}

export function makeDescriptionEn(title: string, venueName: string, category: string): string {
	const catLabel = CATEGORY_LABELS_EN[category] || 'Event';
	return `${title} at ${venueName}`.slice(0, 160);
}

// Delay helper for rate limiting
export function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// SSRF protection: block requests to private/internal networks
function isPrivateUrl(urlStr: string): boolean {
	try {
		const parsed = new URL(urlStr);

		// Only allow http(s)
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;

		const hostname = parsed.hostname.toLowerCase();

		// Block localhost variants
		if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
		if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return true;

		// Block all bracketed IPv6 addresses
		if (hostname.startsWith('[')) return true;

		// Block numeric IP representations (decimal, hex, octal)
		if (/^(0x[\da-f]+|\d{8,})$/i.test(hostname)) return true;

		// Block private IPv4 ranges and cloud metadata
		const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
		if (ipv4Match) {
			const [, a, b] = ipv4Match.map(Number);
			if (a === 10) return true;                          // 10.0.0.0/8
			if (a === 127) return true;                         // 127.0.0.0/8 loopback
			if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
			if (a === 192 && b === 168) return true;             // 192.168.0.0/16
			if (a === 169 && b === 254) return true;             // link-local / cloud metadata
			if (a === 0) return true;                            // 0.0.0.0/8
		}

		return false;
	} catch {
		return true; // Invalid URL = block
	}
}

// Fetch HTML with error handling, SSRF protection, and timeout.
// Accepts an optional external AbortSignal (e.g. from a per-scraper pipeline controller).
// If the external signal fires, the AbortError is re-thrown so callers can detect it.
// If the internal 15s timeout fires, returns null (existing behaviour).
export async function fetchHTML(url: string, options: { signal?: AbortSignal } = {}): Promise<string | null> {
	if (isPrivateUrl(url)) {
		console.error(`  Blocked private/internal URL: ${url}`);
		return null;
	}

	const internalController = new AbortController();
	const timeoutId = setTimeout(() => internalController.abort(), 15_000); // 15s timeout

	// Compose external signal (pipeline abort) with internal 15s timeout
	const signal = options.signal
		? AbortSignal.any([options.signal, internalController.signal])
		: internalController.signal;

	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
				'Accept': 'text/html',
				'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.5',
			},
			redirect: 'follow',
			signal,
		});

		// Check final URL after redirects for SSRF
		if (res.url && isPrivateUrl(res.url)) {
			console.error(`  Blocked redirect to private URL: ${res.url}`);
			return null;
		}

		if (!res.ok) {
			console.error(`  HTTP ${res.status} for ${url}`);
			return null;
		}
		return await res.text();
	} catch (err: any) {
		if (err.name === 'AbortError') {
			if (options.signal?.aborted) throw err; // External abort — propagate to caller
			console.error(`  Timeout fetching ${url}`);
		} else {
			console.error(`  Fetch error for ${url}:`, err.message);
		}
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Mask an email address for logging.
 *
 * The repo is public, so GitHub Actions logs are public too. Scripts that mail
 * real people used to print the recipient, which published subscriber and
 * submitter addresses to anyone who opened the run. Keep enough to tell two
 * recipients apart when debugging, and nothing more.
 *
 *   maskEmail('kari.nordmann@example.com')  ->  'k***@example.com'
 */
export function maskEmail(email: string | null | undefined): string {
	if (!email) return '(ingen adresse)';
	const at = email.lastIndexOf('@');
	if (at <= 0) return '***';
	return `${email[0]}***${email.slice(at)}`;
}

/**
 * Hent alle rader fra en spørring, ikke bare de første 1000.
 *
 * Supabase svarer med maksimalt 1000 rader og sier ikke fra når den kutter.
 * `.limit(5000)` gir 1000 uten feilmelding, uten advarsel, uten noe i svaret
 * som antyder at det mangler noe. Det har gitt tre feil på fem dager:
 * dedup ryddet bare deler av basen (20. august), nyhetsbrevtallet i
 * morgenbriefingen viste en tredjedel av mottakerne (21. august), og
 * sitemapen manglet alt som skjedde de neste seks ukene (24. august).
 *
 * Bruk denne i stedet for å paginere for hånd.
 *
 * **Sorter alltid på en unik kolonne** — vanligvis `id`. `.range()` deler opp
 * etter posisjon i resultatet, så en sorteringsnøkkel med like verdier kan
 * gi rader som hoppes over eller kommer med to ganger. Trenger du en annen
 * rekkefølge, sorter i minnet etterpå.
 *
 * @example
 * const rader = await fetchAllRows(
 *   (fra, til) => supabase.from('events')
 *     .select('source, date_start')
 *     .eq('status', 'approved')
 *     .order('id', { ascending: true })
 *     .range(fra, til),
 *   'kildestatistikk'
 * );
 */
export async function fetchAllRows<T>(
	build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
	label = 'spørring'
): Promise<T[]> {
	const PAGE_SIZE = 1000;
	const MAX_PAGES = 100; // 100 000 rader — sikring mot en løkke som aldri stopper
	const rows: T[] = [];

	for (let page = 0; page < MAX_PAGES; page++) {
		const { data, error } = await build(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

		if (error) {
			// Delvis svar er farligere enn ingen svar, fordi det ser komplett ut.
			throw new Error(`fetchAllRows(${label}) feilet på side ${page}: ${error.message}`);
		}
		if (!data || data.length === 0) break;

		rows.push(...data);
		if (data.length < PAGE_SIZE) break;

		if (page === MAX_PAGES - 1) {
			console.warn(`fetchAllRows(${label}): traff sidegrensen på ${MAX_PAGES} sider — svaret kan være ufullstendig.`);
		}
	}

	return rows;
}
