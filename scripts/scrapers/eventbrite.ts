import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'eventbrite';
const BASE_URL = 'https://www.eventbrite.com/d/norway--bergen/all-events/';

interface EBVenue {
	name: string;
	address: {
		address_1: string;
		city: string;
		localized_address_display: string;
	};
}

interface EBEvent {
	name: string;
	url: string;
	start_date: string;
	start_time: string;
	end_date: string;
	end_time: string;
	timezone: string;
	summary: string;
	is_online_event: boolean;
	is_cancelled: boolean | null;
	primary_venue: EBVenue | null;
	image: {
		original: { url: string };
	} | null;
	tags: Array<{
		prefix: string;
		display_name: string;
	}>;
}

interface EBPagination {
	page_number: number;
	page_count: number;
	object_count: number;
}

function extractServerData(html: string): { results: EBEvent[]; pagination: EBPagination } | null {
	const marker = 'window.__SERVER_DATA__ = ';
	const idx = html.indexOf(marker);
	if (idx < 0) return null;

	const jsonStart = idx + marker.length;
	const semicolonIdx = html.indexOf(';', jsonStart);
	if (semicolonIdx < 0) return null;

	try {
		const data = JSON.parse(html.slice(jsonStart, semicolonIdx));
		return {
			results: data.search_data?.events?.results || [],
			pagination: data.search_data?.events?.pagination || { page_number: 1, page_count: 1, object_count: 0 },
		};
	} catch {
		return null;
	}
}

function mapCategory(tags: EBEvent['tags']): string {
	const categoryTag = tags.find(t => t.prefix === 'EventbriteCategory');
	const formatTag = tags.find(t => t.prefix === 'EventbriteFormat');

	const cat = categoryTag?.display_name?.toLowerCase() || '';
	const fmt = formatTag?.display_name?.toLowerCase() || '';

	// Check format first — more specific than category
	if (fmt.includes('workshop') || fmt.includes('class') || fmt.includes('training')) return 'workshop';
	if (fmt.includes('conference') || fmt.includes('seminar') || fmt.includes('talk')) return 'workshop';
	if (fmt.includes('performance') || fmt.includes('concert')) return 'music';
	if (fmt.includes('festival')) return 'festival';
	if (fmt.includes('race') || fmt.includes('endurance')) return 'sports';

	// Then category
	if (cat.includes('music')) return 'music';
	if (cat.includes('food') || cat.includes('drink')) return 'food';
	if (cat.includes('sport') || cat.includes('fitness')) return 'sports';
	if (cat.includes('business')) return 'workshop';
	if (cat.includes('arts') || cat.includes('film')) return 'culture';
	if (cat.includes('science') || cat.includes('tech')) return 'culture';
	return 'culture';
}

function buildDateTime(date: string, time: string): string {
	// date: "2026-02-25", time: "17:00"
	return new Date(`${date}T${time}:00${bergenOffset(date)}`).toISOString();
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Eventbrite Bergen events...`);

	let found = 0;
	let inserted = 0;
	let page = 1;
	let pageCount = 1;

	while (page <= pageCount) {
		const url = page === 1 ? BASE_URL : `${BASE_URL}?page=${page}`;
		const html = await fetchHTML(url);

		if (!html) {
			console.error(`[${SOURCE}] Failed to fetch page ${page}`);
			break;
		}

		const data = extractServerData(html);
		if (!data) {
			console.error(`[${SOURCE}] Could not parse __SERVER_DATA__ on page ${page}`);
			break;
		}

		pageCount = data.pagination.page_count;

		if (page === 1) {
			console.log(`[${SOURCE}] Found ${data.pagination.object_count} events (${pageCount} pages)`);
		}

		for (const event of data.results) {
			found++;

			// Skip online-only and cancelled events
			if (event.is_online_event) continue;
			if (event.is_cancelled) continue;

			const sourceUrl = event.url;
			if (await eventExists(sourceUrl)) continue;

			const venue = event.primary_venue;
			const venueName = venue?.name || 'Bergen';
			const address = venue?.address?.localized_address_display || venue?.address?.address_1 || 'Bergen';
			const category = mapCategory(event.tags);
			const bydel = mapBydel(venueName);
			const dateStart = buildDateTime(event.start_date, event.start_time);
			const dateEnd = buildDateTime(event.end_date, event.end_time);
			const description = event.summary || event.name;
			const imageUrl = event.image?.original?.url || undefined;

			const aiDesc = await generateDescription({ title: event.name, venue: venueName, category, date: dateStart, price: '' });
			const success = await insertEvent({
				slug: makeSlug(event.name, event.start_date),
				title_no: event.name,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				category,
				date_start: dateStart,
				date_end: dateEnd,
				venue_name: venueName,
				address,
				bydel,
				price: '',
				ticket_url: sourceUrl,
				source: SOURCE,
				source_url: sourceUrl,
				image_url: imageUrl,
				age_group: 'all',
				language: event.name.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${event.name} (${venueName}, ${category})`);
				inserted++;
			}
		}

		page++;
		if (page <= pageCount) await delay(3000);
	}

	return { found, inserted };
}
