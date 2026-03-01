import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'kode';
const SANITY_PROJECT = 'zv9pm4dt';
const SANITY_DATASET = 'production';
const API_VERSION = '2021-10-21';

function buildApiUrl(query: string): string {
	const encoded = encodeURIComponent(query);
	return `https://${SANITY_PROJECT}.apicdn.sanity.io/v${API_VERSION}/data/query/${SANITY_DATASET}?query=${encoded}`;
}

interface KODEEvent {
	_id: string;
	title: string;
	subtitle: string | null;
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD
	startTime: string | null; // HH:MM
	endTime: string | null;
	venue: string | null;
	slug: string;
	price: string | null;
	ticketUrl: string | null;
	permanent: boolean;
	imageUrl: string | null;
}

function mapCategory(title: string, startDate: string, endDate: string): string {
	const lower = title.toLowerCase();

	if (lower.includes('konsert') || lower.includes('concert') || lower.includes('musikk')) return 'music';
	if (lower.includes('omvisning') || lower.includes('guided')) return 'tours';
	if (lower.includes('verksted') || lower.includes('workshop') || lower.includes('kurs')) return 'workshop';
	if (lower.includes('foredrag') || lower.includes('samtale') || lower.includes('talk')) return 'culture';
	if (lower.includes('barn') || lower.includes('familie') || lower.includes('folkeverksted')) return 'family';
	if (lower.includes('festival')) return 'festival';

	// Long-running events (> 14 days) are likely exhibitions
	const start = new Date(startDate);
	const end = new Date(endDate);
	const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
	if (days > 14) return 'culture'; // Exhibition

	return 'culture';
}

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching KODE Bergen events via Sanity API...`);

	const today = new Date().toISOString().slice(0, 10);
	const query = `*[_type=="event" && __i18n_lang == "no" && endDate >= "${today}"] | order(startDate asc) {
		_id, title, subtitle, startDate, endDate, startTime, endTime,
		"venue": location->title,
		"slug": slug.current,
		price, ticketUrl, permanent,
		"imageUrl": headerMedia[0].asset->url
	}`;

	const res = await fetch(buildApiUrl(query), {
		headers: {
			'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
			'Accept': 'application/json',
		},
	});

	if (!res.ok) {
		console.error(`[${SOURCE}] HTTP ${res.status}`);
		return { found: 0, inserted: 0 };
	}

	const json = await res.json();
	const events: KODEEvent[] = json.result || [];
	console.log(`[${SOURCE}] Found ${events.length} upcoming events`);

	const found = events.length;
	let inserted = 0;

	for (const event of events) {
		// Skip permanent installations
		if (event.permanent) continue;

		const slug = event.slug || event._id;
		const sourceUrl = `https://www.kodebergen.no/hva-skjer/utstillinger/${slug}`;
		if (await eventExists(sourceUrl)) continue;

		const category = mapCategory(event.title, event.startDate, event.endDate);
		const venueName = event.venue || 'KODE';
		const bydel = mapBydel(venueName);

		// Build date with time if available
		const offset = bergenOffset(event.startDate);
		const timeStr = event.startTime || '10:00';
		const dateStart = new Date(`${event.startDate}T${timeStr}:00${offset}`).toISOString();
		const dateEnd = event.endDate !== event.startDate
			? new Date(`${event.endDate}T${event.endTime || '17:00'}:00${bergenOffset(event.endDate)}`).toISOString()
			: undefined;

		const priceStr = event.price || '';
		const ticketUrl = event.ticketUrl || sourceUrl;

		const aiDesc = await generateDescription({ title: event.title, venue: venueName, category, date: dateStart, price: priceStr });
		const success = await insertEvent({
			slug: makeSlug(event.title, event.startDate),
			title_no: event.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venueName,
			address: `${venueName}, Bergen`,
			bydel,
			price: priceStr,
			ticket_url: ticketUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: event.imageUrl || undefined,
			age_group: event.title.toLowerCase().includes('barn') || event.title.toLowerCase().includes('familie') ? 'family' : 'all',
			language: event.title.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.title} @ ${venueName} (${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
