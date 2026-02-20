import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, makeDescription } from '../lib/utils.js';

const SOURCE = 'bjorgvinblues';
const BASE_URL = 'https://www.bjorgvinblues.no/Konserter';

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bjørgvin Bluesklubb concerts...`);

	const html = await fetchHTML(BASE_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Upcoming events use p.wb-stl-custom4 with format "DD.MM.YYYY    Artist Name"
	const items = $('p.wb-stl-custom4').toArray();
	console.log(`[${SOURCE}] ${items.length} upcoming concerts`);

	for (const el of items) {
		const text = $(el).text().trim();
		const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(.+)$/);
		if (!match) continue;

		const [, day, month, year, artist] = match;
		const date = `${year}-${month}-${day}`;
		const title = artist.trim();
		if (!title) continue;

		// Skip past events
		const offset = bergenOffset(date);
		const startDate = new Date(`${date}T20:00:00${offset}`);
		if (isNaN(startDate.getTime()) || startDate.getTime() < Date.now() - 86400000) continue;

		found++;

		const sourceUrl = BASE_URL;
		// Use a unique key since all events share the same page URL
		const eventKey = `${BASE_URL}#${date}-${makeSlug(title, date)}`;
		if (await eventExists(eventKey)) continue;

		const success = await insertEvent({
			slug: makeSlug(title, date),
			title_no: `Bjørgvin Blues: ${title}`,
			description_no: makeDescription(title, 'Madam Felle', 'music'),
			category: 'music',
			date_start: startDate.toISOString(),
			venue_name: 'Madam Felle',
			address: 'Bryggen 43, Bergen',
			bydel: 'Bergenhus',
			price: '',
			ticket_url: 'https://madamefelle.ticketco.events/no/nb',
			source: SOURCE,
			source_url: eventKey,
			image_url: undefined,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${date})`);
			inserted++;
		}
	}

	return { found, inserted };
}
