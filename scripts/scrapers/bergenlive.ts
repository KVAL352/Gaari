import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { resolveTicketUrl } from '../lib/venues.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, parseNorwegianDate } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bergenlive';
const URL = 'https://www.bergenlive.no/konsertkalender';

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching ${URL}...`);

	const html = await fetchHTML(URL);
	if (!html) return { found: 0, inserted: 0 };

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	const cards = $('.card');
	console.log(`[${SOURCE}] Found ${cards.length} event cards`);

	for (const el of cards.toArray()) {
		const card = $(el);

		const title = card.find('.card-title').first().text().trim();
		if (!title || title.length < 2) continue;

		// Event info contains date + venue
		const eventInfo = card.find('.event-info').text().trim();

		// Parse date from event info (e.g., "Lørdag 21. februar 2026")
		const dateMatch = eventInfo.match(/(\d{1,2}\.\s*\w+\s*\d{4})/);
		const dateStr = dateMatch ? dateMatch[1] : '';
		const dateStart = parseNorwegianDate(dateStr);
		if (!dateStart) continue;

		// Parse venue — it's whatever comes after the date
		const venue = eventInfo.replace(/.*\d{4}\s*/, '').trim() || 'Bergen';

		// Get links: first is detail page, second is ticket link
		const links = card.find('a').map((_, a) => $(a).attr('href')).get();
		const detailUrl = links.find(l => l?.includes('bergenlive.no')) || '';
		const ticketUrl = links.find(l => l?.includes('ticketmaster')) || detailUrl;

		if (!detailUrl) continue;

		// Get image
		const imgSrc = card.find('source').first().attr('srcset');
		const imageUrl = imgSrc ? imgSrc.split(' ')[0].replace(/\?.*$/, '') : undefined;

		found++;

		// Check dedup
		if (await eventExists(detailUrl)) continue;

		const bydel = mapBydel(venue);

		const aiDesc = await generateDescription({ title, venue, category: 'music', date: dateStart, price: '' });

		const success = await insertEvent({
			slug: makeSlug(title, dateStart),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category: 'music',
			date_start: dateStart,
			venue_name: venue,
			address: venue,
			bydel,
			price: '',
			ticket_url: resolveTicketUrl(venue, ticketUrl),
			source: SOURCE,
			source_url: detailUrl,
			image_url: imageUrl,
			age_group: 'all',
			language: 'both',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${venue}, ${dateStr})`);
			inserted++;
		}
	}

	return { found, inserted };
}
