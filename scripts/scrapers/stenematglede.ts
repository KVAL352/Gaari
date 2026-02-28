import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'stenematglede';
const BASE_URL = 'https://www.stenematglede.com';
const PROGRAM_URL = `${BASE_URL}/popup-kalender`;
const VENUE = 'Stene Matglede';
const ADDRESS = 'Rogagaten 26, Bergen';

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Stene Matglede events...`);

	const html = await fetchHTML(PROGRAM_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch program page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	const events = $('article.eventlist-event--upcoming').toArray();
	console.log(`[${SOURCE}] ${events.length} upcoming events`);

	for (const el of events) {
		const titleLink = $(el).find('.eventlist-title-link');
		const title = titleLink.text().trim();
		const path = titleLink.attr('href');
		if (!title || !path) continue;

		const dateEl = $(el).find('time.event-date');
		const dateStr = dateEl.attr('datetime');
		if (!dateStr) continue;

		// Time from 24hr elements in listing
		const startTime = $(el).find('time.event-time-24hr-start').text().trim() || '18:00';

		const offset = bergenOffset(dateStr);
		const dateStart = new Date(`${dateStr}T${startTime}:00${offset}`).toISOString();

		// Skip past events
		if (new Date(dateStart) < new Date()) continue;

		found++;

		const sourceUrl = `${BASE_URL}${path}`;
		if (await eventExists(sourceUrl)) continue;

		// Image
		const img = $(el).find('img').first();
		const imageUrl = img.attr('data-src') || img.attr('src') || undefined;
		const optimizedImage = imageUrl?.includes('squarespace-cdn.com')
			? `${imageUrl.split('?')[0]}?format=750w`
			: imageUrl;

		const bydel = mapBydel(VENUE);

		const aiDesc = await generateDescription({ title, venue: VENUE, category: 'food', date: dateStart, price: '' });

		const success = await insertEvent({
			slug: makeSlug(title, dateStr),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category: 'food',
			date_start: dateStart,
			venue_name: VENUE,
			address: ADDRESS,
			bydel,
			price: '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: optimizedImage,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${dateStr})`);
			inserted++;
		}
	}

	return { found, inserted };
}
