import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'vvv';
const BASE_URL = 'https://www.varmerevaterevillere.no';
const PROGRAM_URL = `${BASE_URL}/program`;
const YEAR = new Date().getFullYear();

function guessCategory(title: string, venue: string): string {
	const text = `${title} ${venue}`.toLowerCase();
	if (text.includes('konsert') || text.includes('dj') || text.includes('musikk') || text.includes('club')) return 'music';
	if (text.includes('film') || text.includes('kino')) return 'culture';
	if (text.includes('workshop') || text.includes('kurs') || text.includes('verksted')) return 'workshop';
	if (text.includes('debatt') || text.includes('panel') || text.includes('samtale') || text.includes('seminar') || text.includes('konferanse')) return 'culture';
	if (text.includes('barn') || text.includes('junior') || text.includes('familie')) return 'family';
	if (text.includes('mat') || text.includes('food') || text.includes('frokost') || text.includes('middag')) return 'food';
	if (text.includes('tur') || text.includes('vandring')) return 'tours';
	if (text.includes('standup') || text.includes('komikk') || text.includes('comedy')) return 'theatre';
	return 'culture';
}

const MONTH_MAP: Record<string, number> = {
	jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
	jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Varmere Våtere Villere festival program...`);

	const html = await fetchHTML(PROGRAM_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch program page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Each event is a summary-item with record-type-event
	const items = $('div.summary-item').toArray();
	console.log(`[${SOURCE}] ${items.length} program items`);

	for (const el of items) {
		// Title and link
		const titleLink = $(el).find('.summary-title-link');
		const title = titleLink.text().trim();
		const path = titleLink.attr('href');
		if (!title || !path) continue;

		// Date from thumbnail overlay (use .first() — carousel has 3 copies)
		const monthText = $(el).find('.summary-thumbnail-event-date-month').first().text().trim().toLowerCase();
		const dayText = $(el).find('.summary-thumbnail-event-date-day').first().text().trim();
		if (!monthText || !dayText) continue;

		const month = MONTH_MAP[monthText.slice(0, 3)];
		const day = parseInt(dayText);
		if (!month || isNaN(day)) continue;

		const dateStr = `${YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

		// Time from 24-hour span (use .first() — carousel has 3 copies)
		const timeText = $(el).find('.event-time-24hr').first().text().trim();
		let startTime = '12:00';
		let endTime: string | undefined;

		if (timeText) {
			const timeMatch = timeText.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
			if (timeMatch) {
				startTime = timeMatch[1].padStart(5, '0');
				endTime = timeMatch[2].padStart(5, '0');
			} else {
				const singleMatch = timeText.match(/(\d{1,2}:\d{2})/);
				if (singleMatch) startTime = singleMatch[1].padStart(5, '0');
			}
		}

		// March is CET (+01:00)
		const offset = '+01:00';
		const dateStart = new Date(`${dateStr}T${startTime}:00${offset}`).toISOString();
		const dateEnd = endTime ? new Date(`${dateStr}T${endTime}:00${offset}`).toISOString() : undefined;

		// Skip past events
		if (new Date(dateStart) < new Date()) continue;

		found++;

		// Source URL
		const sourceUrl = `${BASE_URL}${path}`;
		if (await eventExists(sourceUrl)) continue;

		// Venue from location link (use .first() — carousel has 3 copies per viewport)
		const locationLink = $(el).find('.summary-metadata-item--location a').first();
		const venue = locationLink.text().trim() || 'Bergen sentrum';
		const bydel = mapBydel(venue);

		// Image (use .first() — carousel has 3 copies)
		const img = $(el).find('.summary-thumbnail-image').first();
		const imageUrl = img.attr('data-src') || undefined;
		const optimizedImage = imageUrl?.includes('squarespace-cdn.com')
			? `${imageUrl.split('?')[0]}?format=750w`
			: imageUrl;

		const category = guessCategory(title, venue);

		const aiDesc = await generateDescription({ title, venue, category, date: dateStart, price: '' });

		const success = await insertEvent({
			slug: makeSlug(title, dateStr),
			title_no: `VVV: ${title}`,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venue,
			address: venue + ', Bergen',
			bydel,
			price: '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: optimizedImage,
			age_group: category === 'family' ? 'family' : 'all',
			language: title.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} @ ${venue} (${dateStr})`);
			inserted++;
		}
	}

	return { found, inserted };
}
