import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';
import { mapBydel, hasAdultAgeLimit } from '../lib/categories.js';
import { resolveTicketUrl } from '../lib/venues.js';
import * as cheerio from 'cheerio';

// Det Akademiske Kvarter, via Samfunnet i Bergen (samfunnetibergen.no).
// Den gamle kilden kvarteret.no/api/events svarer 404, så kildenavnet `kvarteret`
// bor nå her. robots.txt tillater alt (kildegransker 2026-11-03), og Samfunnet
// har hvitelistet vår User-Agent. Sitemap + JSON-LD (schema.org/Event) på hver side.
const SOURCE = 'kvarteret';
const BASE = 'https://www.samfunnetibergen.no';
const SITEMAP_URL = `${BASE}/sitemap.xml`;
const VENUE = 'Det Akademiske Kvarter';
const ADDRESS = 'Olav Kyrres gate 49, 5015 Bergen';

// Tittel som ikke er for allmennheten: fadderuker og velkomstuker er for
// nye studenter ved en bestemt fakultetsenhet (CLAUDE.md: ingen ikke-offentlige).
const EXCLUDED_TITLE_RE = /velkomstuke|fadder/i;

export interface LdOffer {
	price?: string | number;
	url?: string;
}

export interface LdEvent {
	name?: string;
	url?: string;
	startDate?: string;
	endDate?: string;
	description?: string;
	image?: string | string[];
	keywords?: string[] | string;
	isAccessibleForFree?: boolean;
	eventStatus?: string;
	location?: { name?: string; address?: { postalCode?: string } };
	offers?: LdOffer | LdOffer[];
}

/** Første Event i en JSON-LD-blokk, enten @graph eller enkeltobjekt. */
export function findEvent(json: unknown): LdEvent | null {
	const obj = json as { '@graph'?: unknown[]; '@type'?: string } | null;
	if (!obj) return null;
	const nodes = Array.isArray(obj['@graph']) ? obj['@graph'] : [obj];
	const ev = nodes.find((n) => (n as { '@type'?: string })?.['@type'] === 'Event');
	return (ev as LdEvent) ?? null;
}

export function extractEvent(html: string): LdEvent | null {
	const $ = cheerio.load(html);
	for (const el of $('script[type="application/ld+json"]').toArray()) {
		try {
			const ev = findEvent(JSON.parse($(el).html() ?? ''));
			if (ev) return ev;
		} catch {
			// ugyldig blokk, prøv neste
		}
	}
	return null;
}

export function isExcluded(title: string): boolean {
	return EXCLUDED_TITLE_RE.test(title);
}

/** Bare adresser i Bergen (postnummer 5xxx). Mangler postnummer: avvis, ikke gjett. */
export function isBergen(postalCode: string | undefined): boolean {
	return !!postalCode && /^5\d{3}$/.test(postalCode.trim());
}

/** Kilden gir UTC («...Z») for lokal tid. Ugyldig dato gir null. */
export function toIso(start: string | undefined): string | null {
	if (!start) return null;
	const d = new Date(start);
	return isNaN(d.getTime()) ? null : d.toISOString();
}

export function mapCategory(keywords: string[] | string | undefined): string {
	const kw = (Array.isArray(keywords) ? keywords : (keywords ?? '').split(','))
		.map((k) => k.trim().toLowerCase());
	if (kw.includes('quiz')) return 'nightlife';
	if (kw.includes('forestilling') || kw.includes('revy') || kw.includes('teater')) return 'theatre';
	if (kw.includes('konserter') || kw.includes('konsert') || kw.includes('festival')) return 'music';
	if (kw.includes('faglig') || kw.includes('foredrag') || kw.includes('panelsamtale')) return 'culture';
	if (kw.includes('åpen øving')) return 'workshop';
	if (kw.includes('film')) return 'culture';
	return 'student';
}

/** Gratis gir '0'. Ellers første tilbuds pris (ordinær), eller tom streng når den ikke står. */
export function parsePrice(ev: LdEvent): string {
	const offers = Array.isArray(ev.offers) ? ev.offers : ev.offers ? [ev.offers] : [];
	if (ev.isAccessibleForFree === true) return '0';
	const n = Number(String(offers[0]?.price ?? '').replace(/[^\d.]/g, ''));
	if (!isFinite(n) || offers[0]?.price == null || String(offers[0].price) === '') return '';
	return n === 0 ? '0' : `${Math.round(n)} kr`;
}

export function pickTicketUrl(ev: LdEvent): string | undefined {
	const offers = Array.isArray(ev.offers) ? ev.offers : ev.offers ? [ev.offers] : [];
	const url = offers.find((o) => o.url && /^https?:/.test(o.url))?.url;
	return url ? resolveTicketUrl(VENUE, url) : undefined;
}

export function isCancelled(ev: LdEvent): boolean {
	return !!ev.eventStatus && /Cancel|Postponed/i.test(ev.eventStatus);
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Samfunnet i Bergen sitemap...`);

	const sitemap = await fetchHTML(SITEMAP_URL);
	if (!sitemap) {
		console.error(`[${SOURCE}] Sitemap unavailable`);
		return { found: 0, inserted: 0 };
	}

	const urls = [...sitemap.matchAll(/<loc>([^<]+\/nb\/arrangementer\/[^<]+)<\/loc>/g)].map((m) => m[1]);
	console.log(`[${SOURCE}] ${urls.length} event pages in sitemap`);

	let found = 0;
	let inserted = 0;

	for (const url of urls) {
		// Spar forespørsler: kjent adresse trenger ikke hentes på nytt.
		if (await eventExists(url)) {
			found++;
			continue;
		}

		await delay(1000);
		const html = await fetchHTML(url);
		if (!html) continue;

		const ev = extractEvent(html);
		const title = ev?.name?.trim();
		if (!ev || !title) {
			console.log(`  - skip (ingen Event i JSON-LD): ${url.split('/').pop()}`);
			continue;
		}
		if (isExcluded(title)) {
			console.log(`  - skip (ikke for allmennheten): ${title}`);
			continue;
		}
		if (isCancelled(ev)) {
			console.log(`  - skip (avlyst): ${title}`);
			continue;
		}
		if (!isBergen(ev.location?.address?.postalCode)) {
			console.log(`  - skip (utenfor Bergen eller postnummer mangler): ${title}`);
			continue;
		}

		const dateStart = toIso(ev.startDate);
		if (!dateStart || new Date(dateStart) < new Date()) continue;
		const dateEnd = toIso(ev.endDate) ?? undefined;

		found++;

		const category = mapCategory(ev.keywords);
		const bydel = mapBydel(VENUE);
		const price = parsePrice(ev);

		const aiDesc = await generateDescription({
			title,
			venue: VENUE,
			category,
			date: new Date(dateStart),
			price,
			bydel,
			address: ADDRESS
		});

		const success = await insertEvent({
			slug: makeSlug(title, dateStart),
			title_no: title,
			title_en: aiDesc.title_en,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: VENUE,
			address: ADDRESS,
			bydel,
			price,
			ticket_url: pickTicketUrl(ev) ?? url,
			source: SOURCE,
			source_url: url,
			// Ingen bilder før Samfunnet i Bergen har svart. Hotlink-raden `kvarteret`
			// gjelder Det Akademiske Kvarter (varslet 11. mai), ikke Samfunnet, og
			// SOURCE står på den lista, så isImageAllowed() ville sluppet dem gjennom.
			// Avgjort 2026-11-17. Ved et ja: legg inn rad i consent.json, så denne linja.
			image_url: undefined,
			// Aldersgrensen står i kildens egen tekst («Aldersgrense 20 år»), ikke i
			// den genererte beskrivelsen insertEvent ser. Les den fra kilden.
			age_group: hasAdultAgeLimit(title, ev.description) ? '18+' : 'students',
			language: aiDesc.title_en ? 'both' : 'no',
			status: 'approved'
		});

		if (success) {
			console.log(`  + ${title} (${category}, ${dateStart.slice(0, 10)})`);
			inserted++;
		}
	}

	return { found, inserted };
}
