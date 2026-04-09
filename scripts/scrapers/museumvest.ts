import { mapCategory } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'museumvest';

// Bergen-relevant Museum Vest museums with their Museum24 site IDs
const MUSEUMS = [
	{ name: 'Norges Fiskerimuseum', subdomain: 'fiskerimuseum', siteId: 124, bydel: 'Bergenhus' },
	{ name: 'Bergens Sjøfartsmuseum', subdomain: 'sjofartsmuseum', siteId: 125, bydel: 'Sentrum' },
	{ name: 'Det Hanseatiske Museum', subdomain: 'hanseatiskemuseum', siteId: 123, bydel: 'Bergenhus' },
];

const DAY_INDEX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

interface M24TimePeriod {
	start_date: string;   // "YYYYMMDD-HHmmss-microseconds"
	end_date?: string;
	start_time?: string;  // "19000101-HHmmss-microseconds" (date part is sentinel)
	end_time?: string;
	week_days?: string[]; // ["sun"] etc — recurring event
}

interface M24Event {
	id: number;
	title: string;
	path: string;
	url: string;
	image_src?: string;
	location?: { content?: { address?: { full_address?: string } } };
	sub_categories?: string[];
	event_data?: { time_periods?: M24TimePeriod[] };
}

/** "YYYYMMDD-..." → "YYYY-MM-DD" */
function parseDate(s: string): string | null {
	const m = s.match(/^(\d{4})(\d{2})(\d{2})-/);
	return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** "19000101-HHmmss-..." → "HH:MM" */
function parseTime(s: string | undefined): string {
	if (!s) return '10:00';
	const m = s.match(/^\d{8}-(\d{2})(\d{2})/);
	return m ? `${m[1]}:${m[2]}` : '10:00';
}

/** Next occurrence of a weekday on or after `after` */
function nextWeekday(day: string, after: Date): Date {
	const target = DAY_INDEX[day] ?? after.getDay();
	const result = new Date(after);
	result.setHours(0, 0, 0, 0);
	const diff = (target - result.getDay() + 7) % 7;
	result.setDate(result.getDate() + diff);
	return result;
}


export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Museum Vest events (Museum24 API)...`);

	let found = 0;
	let inserted = 0;
	const now = new Date();

	for (const museum of MUSEUMS) {
		const apiUrl = `https://${museum.subdomain}.museumvest.no/api/page/pages/list`
			+ `?is_event=true&order_by=event_start&locale=no`
			+ `&site_id=${museum.siteId}&rows=100`
			+ `&event_start_after=today&event_start_before=6m`;

		const body = await fetchHTML(apiUrl);
		if (!body) {
			console.warn(`[${SOURCE}] Failed to fetch API for ${museum.name}`);
			continue;
		}

		let pages: M24Event[];
		try {
			pages = JSON.parse(body).pages ?? [];
		} catch {
			console.warn(`[${SOURCE}] Failed to parse API response for ${museum.name}`);
			continue;
		}

		console.log(`[${SOURCE}] ${museum.name}: ${pages.length} events from API`);

		for (const event of pages) {
			const sourceUrl = `https://${event.url}`;
			if (await eventExists(sourceUrl)) continue;

			const tp = event.event_data?.time_periods?.[0];
			if (!tp?.start_date) continue;

			const startTime = parseTime(tp.start_time);
			const endTime = tp.end_time ? parseTime(tp.end_time) : undefined;

			// Determine the event date
			let eventDate: string;
			if (tp.week_days?.length) {
				// Recurring — find next upcoming occurrence
				const next = nextWeekday(tp.week_days[0], now);
				if (tp.end_date) {
					const endDateStr = parseDate(tp.end_date);
					if (endDateStr && next > new Date(endDateStr)) continue;
				}
				eventDate = next.toISOString().slice(0, 10);
			} else {
				const d = parseDate(tp.start_date);
				if (!d) continue;
				if (new Date(d) < now) continue;
				eventDate = d;
			}

			const offset = bergenOffset(eventDate);
			const dateStart = `${eventDate}T${startTime}:00${offset}`;
			const dateEnd = (endTime && endTime !== startTime)
				? `${eventDate}T${endTime}:00${offset}`
				: undefined;

			const title = event.title?.trim();
			if (!title) continue;

			found++;

			const imageUrl = event.image_src
				? event.image_src.split('?')[0] + '?dimension=800x600'
				: undefined;

			const address = event.location?.content?.address?.full_address ?? '';
			const category = /søndagsverksted/i.test(title) ? 'family' : mapCategory(title) || 'culture';
			const price = /gratis/i.test(title) ? 'Gratis' : '';

			await delay(200);

			const aiDesc = await generateDescription({
				title,
				venue: museum.name,
				category,
				date: dateStart,
				price,
			});

			const success = await insertEvent({
				slug: makeSlug(title, eventDate),
				title_no: title,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				title_en: aiDesc.title_en,
				category,
				date_start: dateStart,
				date_end: dateEnd,
				venue_name: museum.name,
				address,
				bydel: museum.bydel,
				price,
				ticket_url: sourceUrl,
				source: SOURCE,
				source_url: sourceUrl,
				image_url: imageUrl,
				age_group: /barn|familie|junior/i.test(title) ? 'family' : 'all',
				language: 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${title} @ ${museum.name} (${eventDate}) [${category}]`);
				inserted++;
			}
		}

		await delay(1000);
	}

	return { found, inserted };
}
