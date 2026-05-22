import { mapCategory, mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'tikkio';
const API_BASE = 'https://tikkio.com/api/public/v1';
const USER_AGENT = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';

// Bergen kommune-kode (SSB-standard, post-2020 regionreform).
// Pre-2020 var Bergen 1201, men gjeldende kode er 4601.
// Tikkios /events-endpoint støtter municipality_code direkte.
const BERGEN_MUNICIPALITY_CODE = '4601';

const EXCLUDE_KEYWORDS = [
	'medlemskap', 'membership',
	'gavekort', 'gift card',
	'barnehage', 'sfo', 'skoleklasse', 'skolebesøk',
];

interface TikkioCategory {
	code?: string;
	label?: string;
}

interface TikkioVenue {
	name?: string;
	address?: string;
	city?: string;
	country?: string;
}

interface TikkioOrganizer {
	id?: number;
	name?: string;
}

interface TikkioEvent {
	id: number;
	name: string;
	slug?: string;
	description_short?: string | null;
	description?: string | null;
	status?: string;
	starts_at: string;
	ends_at?: string | null;
	show_start?: string | null;
	timezone?: string;
	website?: string | null;
	url: string;
	image_url?: string | null;
	minimum_price?: number | null;
	currency?: string | null;
	country?: string | null;
	organizer?: TikkioOrganizer | null;
	venue?: TikkioVenue | null;
	categories?: TikkioCategory[];
}

interface TikkioListResponse {
	data: TikkioEvent[];
	meta?: {
		current_page: number;
		total_pages: number;
		has_more_pages: boolean;
	};
}

function isExcluded(ev: TikkioEvent): boolean {
	const haystack = `${ev.name} ${ev.description_short ?? ''}`.toLowerCase();
	return EXCLUDE_KEYWORDS.some(kw => haystack.includes(kw));
}

function pickCategory(ev: TikkioEvent): string {
	const labels = (ev.categories ?? [])
		.flatMap(c => [c.code, c.label])
		.filter((s): s is string => typeof s === 'string' && s.length > 0);
	for (const label of labels) {
		const mapped = mapCategory(label);
		if (mapped !== 'culture') return mapped;
	}
	// Fall back: try to match against title
	return mapCategory(ev.name);
}

function formatPrice(min: number | null | undefined, currency: string | null | undefined): string {
	if (min === 0) return '0';
	if (min && min > 0) {
		const cur = (currency || 'NOK').toUpperCase();
		return cur === 'NOK' ? `${min} NOK` : `${min} ${cur}`;
	}
	return '';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Tikkio Bergen events via Public Discovery API...`);

	let found = 0;
	let inserted = 0;

	const startsAfter = new Date().toISOString().slice(0, 10);
	const perPage = 50;
	let page = 1;
	let totalPages = 1;

	try {
		while (page <= totalPages) {
			const url = new URL(`${API_BASE}/events`);
			url.searchParams.set('municipality_code', BERGEN_MUNICIPALITY_CODE);
			url.searchParams.set('starts_after', startsAfter);
			url.searchParams.set('per_page', String(perPage));
			url.searchParams.set('page', String(page));
			url.searchParams.set('lang', 'no');

			const res = await fetch(url.toString(), {
				headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
			});

			if (!res.ok) {
				console.error(`[${SOURCE}] HTTP ${res.status} on page ${page}: ${await res.text()}`);
				break;
			}

			const body = await res.json() as TikkioListResponse;
			const events = body.data ?? [];
			totalPages = body.meta?.total_pages ?? 1;
			console.log(`[${SOURCE}] Page ${page}/${totalPages}: ${events.length} events`);

			for (let i = 0; i < events.length; i++) {
				const ev = events[i];

				// status kan være null (ikke alle events har eksplisitt status satt) — slipp gjennom
				if (ev.status && ev.status !== 'upcoming' && ev.status !== 'published') continue;
				if (isExcluded(ev)) {
					console.log(`  - Skipping non-public: "${ev.name}"`);
					continue;
				}

				// Skip long-running passes / drop-in-tilbud uten konkret enkeltdato
				if (ev.ends_at) {
					const start = new Date(ev.starts_at).getTime();
					const end = new Date(ev.ends_at).getTime();
					if (!isNaN(start) && !isNaN(end) && end - start > 90 * 24 * 60 * 60 * 1000) {
						continue;
					}
				}

				found++;

				const sourceUrl = ev.url;
				if (!sourceUrl) continue;
				if (await eventExists(sourceUrl)) continue;

				const startDate = new Date(ev.starts_at);
				if (isNaN(startDate.getTime())) {
					console.log(`  - Skipping invalid date: "${ev.name}"`);
					continue;
				}

				const endDate = ev.ends_at ? new Date(ev.ends_at) : undefined;
				const datePart = startDate.toISOString().slice(0, 10);
				const venueName = ev.venue?.name || ev.organizer?.name || 'Bergen';
				const address = ev.venue?.address || ev.venue?.city || venueName;
				const category = pickCategory(ev);
				const bydel = mapBydel(venueName);
				const price = formatPrice(ev.minimum_price, ev.currency);
				const imageUrl = ev.image_url || undefined;

				// Rate limit: 60 req/min på Tikkio. AI-call dominerer tida her, ~1-2s per event.
				if (i > 0) await delay(300);

				const aiDesc = await generateDescription({
					title: ev.name,
					venue: venueName,
					category,
					date: startDate,
					price,
				});

				const success = await insertEvent({
					slug: makeSlug(ev.name, datePart),
					title_no: ev.name,
					description_no: aiDesc.no,
					description_en: aiDesc.en,
					title_en: aiDesc.title_en,
					category,
					date_start: startDate.toISOString(),
					date_end: endDate?.toISOString(),
					venue_name: venueName,
					address,
					bydel,
					price,
					ticket_url: sourceUrl,
					source: SOURCE,
					source_url: sourceUrl,
					image_url: imageUrl,
					age_group: 'all',
					language: 'no',
					status: 'approved',
				});

				if (success) {
					console.log(`  + ${ev.name} (${venueName}, ${category})`);
					inserted++;
				}
			}

			if (!body.meta?.has_more_pages) break;
			page++;
			await delay(1100); // Stay well under 60 req/min between pages
		}
	} catch (err: any) {
		console.error(`[${SOURCE}] Error: ${err.message}`);
	}

	console.log(`[${SOURCE}] Done: found ${found}, inserted ${inserted}`);
	return { found, inserted };
}

// Standalone execution
if (process.argv[1]?.includes('tikkio')) {
	scrape().then(r => {
		console.log(`\nResult: ${r.found} found, ${r.inserted} inserted`);
		process.exit(0);
	}).catch(err => {
		console.error(err);
		process.exit(1);
	});
}
