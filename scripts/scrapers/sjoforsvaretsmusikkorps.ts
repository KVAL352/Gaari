import { makeSlug, eventExists, insertEvent, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';
import { mapBydel } from '../lib/categories.js';
import { getVenueLocation, resolveTicketUrl } from '../lib/venues.js';

// Sjøforsvarets musikkorps (Forsvaret). Skriftlig ja til bilder og SoMe
// 2026-11-12, se docs/bildesamtykke.md. robots.txt finnes ikke (404).
const SOURCE = 'sjoforsvaretsmusikkorps';
const BASE = 'https://kultur.forsvaret.no';
const API_URL =
	`${BASE}/forsvarets-musikk/sjoforsvaretsmusikkorps/_/service/no.bouvet.kultur/list-activity-service` +
	'?units=6979a968-0335-4170-9d4a-1abaca08671a';

// Korpset turnerer, og kilden lister også konserter utenfor Bergen. Bare disse
// stedene slipper gjennom. Alt annet forkastes og logges, aldri gjettes.
const BERGEN_VENUES = ['håkonshallen', 'mariakirken', 'grieghallen'];

// Uteholdt til arrangøren har svart på om de er åpne for alle (CLAUDE.md: ingen
// ikke-offentlige arrangementer). Kirkeparade er en militær seremoni. Spurt i
// svaret til korpset, 2026-11-17. Fjern fra listen når svaret er ja.
const EXCLUDED_TITLES = ['kirkeparade'];

export function isExcluded(title: string): boolean {
	const lower = title.toLowerCase();
	return EXCLUDED_TITLES.some((t) => lower.includes(t));
}

interface Hit {
	url: string;
	title: string;
	data?: {
		event?: {
			start?: string;
			location?: string;
			ticket?: {
				_selected?: string;
				buy?: { link?: { linkType?: { external?: { url?: string } } } };
			};
		};
	};
	image?: { wide?: { srcSet?: string; copyright?: string } };
}

/**
 * Stedsfeltet er fritekst: «Håkonshallen, Bergen», «Peer Gynt-salen,
 * Grieghallen», «Oseana, Os». Gir stedsnavnet, eller null når stedet ikke er
 * kjent som et sted i Bergen. Null betyr: ikke legg inn.
 */
export function bergenVenue(location: string | undefined): string | null {
	if (!location) return null;
	const lower = location.toLowerCase();
	const known = BERGEN_VENUES.find((v) => lower.includes(v));
	if (known) {
		return known.charAt(0).toUpperCase() + known.slice(1);
	}
	return null;
}

/** Størst bilde på maks 1024 px bredde fra srcSet, som absolutt adresse. */
export function pickImage(srcSet: string | undefined): string | undefined {
	if (!srcSet) return undefined;
	let best: { w: number; url: string } | undefined;
	for (const part of srcSet.split(',')) {
		const m = part.trim().match(/^(\S+)\s+(\d+)w$/);
		if (!m) continue;
		const w = Number(m[2]);
		if (w <= 1024 && (!best || w > best.w)) best = { w, url: m[1] };
	}
	if (!best) return undefined;
	return new URL(best.url, `${BASE}/`).toString();
}

/**
 * Starttiden står i `data.event.start` som lokal tid uten sone. Feltet
 * `dateTime.start.time` ligger en time for sent og skal ikke brukes: 3. og 4.
 * desember viste 19:00 i `data.event.start` og samme tid hos Grieghallen og
 * Oseana, mens `dateTime` sa 20:00 for Oseana.
 */
export function toIso(start: string | undefined): string | null {
	const m = start?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
	if (!m) return null;
	const d = new Date(`${m[1]}T${m[2]}:00${bergenOffset(m[1])}`);
	return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching concerts...`);

	let hits: Hit[] = [];
	try {
		const res = await fetch(API_URL, {
			headers: {
				'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
				Accept: 'application/json'
			}
		});
		if (!res.ok) {
			console.error(`[${SOURCE}] API returned ${res.status}`);
			return { found: 0, inserted: 0 };
		}
		const json = (await res.json()) as { hits?: Hit[] };
		hits = json.hits ?? [];
	} catch (err: any) {
		console.error(`[${SOURCE}] API error: ${err.message}`);
		return { found: 0, inserted: 0 };
	}

	console.log(`[${SOURCE}] ${hits.length} concerts in source`);

	let found = 0;
	let inserted = 0;

	for (const hit of hits) {
		const ev = hit.data?.event;
		const title = hit.title?.trim();
		if (!ev || !title) continue;
		if (isExcluded(title)) {
			console.log(`  - skip (venter på svar om offentlig): ${title}`);
			continue;
		}

		const venue = bergenVenue(ev.location);
		if (!venue) {
			console.log(`  - skip (utenfor Bergen eller ukjent sted): ${title}, ${ev.location ?? '?'}`);
			continue;
		}

		const dateStart = toIso(ev.start);
		if (!dateStart || new Date(dateStart) < new Date()) continue;

		found++;

		// Kilden har ett detaljsted per hit, men flere datoer deler tittel.
		// Dato i source_url holder dem fra hverandre.
		const detailUrl = new URL(hit.url, `${BASE}/`).toString();
		const sourceUrl = `${detailUrl}#${dateStart.slice(0, 16)}`;
		if (await eventExists(sourceUrl)) continue;

		const loc = getVenueLocation(venue);
		const address = loc ? `${loc.street}, ${loc.postalCode} Bergen` : `${venue}, Bergen`;
		const bydel = mapBydel(venue);

		const rawTicket = ev.ticket?.buy?.link?.linkType?.external?.url;
		const ticketUrl = rawTicket ? resolveTicketUrl(venue, rawTicket) : undefined;

		const credit = hit.image?.wide?.copyright?.trim();
		const imageUrl = pickImage(hit.image?.wide?.srcSet);

		const aiDesc = await generateDescription({
			title: `${title} med Sjøforsvarets musikkorps`,
			venue,
			category: 'music',
			date: new Date(dateStart),
			price: '',
			bydel,
			address
		});

		const success = await insertEvent({
			slug: makeSlug(`${title}-${venue}`, dateStart),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category: 'music',
			date_start: dateStart,
			venue_name: venue,
			address,
			bydel,
			price: '',
			ticket_url: ticketUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			image_credit: credit ? `Foto: ${credit}` : undefined,
			age_group: 'all',
			language: 'no',
			status: 'approved'
		});

		if (success) {
			console.log(`  + ${title} (${venue}, ${dateStart.slice(0, 10)})`);
			inserted++;
		}
	}

	return { found, inserted };
}
