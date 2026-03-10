import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'swingnsweetjazzclub';
const BASE_URL = 'https://www.swing-n-sweet.no/arrangementer';

const NORWEGIAN_MONTHS: Record<string, number> = {
	januar: 1, februar: 2, mars: 3, april: 4, mai: 5, juni: 6,
	juli: 7, august: 8, september: 9, oktober: 10, november: 11, desember: 12,
};

function parseDate(text: string): string | null {
	// Format: "Lørdag 14. mars, Lille Ole Bull"
	const match = text.match(/(\d{1,2})\.\s*(\w+)/);
	if (!match) return null;

	const day = parseInt(match[1]);
	const monthName = match[2].toLowerCase();
	const month = NORWEGIAN_MONTHS[monthName];
	if (!month) return null;

	const now = new Date();
	let year = now.getFullYear();
	// If month is in the past, assume next year
	if (month < now.getMonth() + 1 || (month === now.getMonth() + 1 && day < now.getDate())) {
		year++;
	}

	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Swing 'n Sweet Jazzclub events...`);

	const html = await fetchHTML(BASE_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Upcoming events are in the active tab's w-dyn-item elements
	const items = $('.w-tab-pane.w--tab-active .w-dyn-item').toArray();
	console.log(`[${SOURCE}] ${items.length} upcoming events`);

	for (const el of items) {
		const dateText = $(el).find('.text-block-2').text().trim();
		const title = $(el).find('h3').text().trim();
		if (!title) continue;

		const date = parseDate(dateText);
		if (!date) {
			console.log(`  ~ Skipping "${title}" — could not parse date: "${dateText}"`);
			continue;
		}

		found++;

		// TicketCo link is the primary link
		const ticketLink = $(el).find('a[href*="ticketco"]').attr('href') || '';
		const sourceUrl = ticketLink || `${BASE_URL}#${makeSlug(title, date)}`;

		if (await eventExists(sourceUrl)) continue;

		const imageUrl = $(el).find('img').attr('src') || undefined;

		const offset = bergenOffset(date);
		// Events are Saturday evenings, typically 20:00
		const dateStart = `${date}T20:00:00${offset}`;

		const aiDesc = await generateDescription({
			title,
			venue: "Swing 'n Sweet Jazzclub",
			category: 'music',
			date: new Date(dateStart),
			price: '',
		});

		const success = await insertEvent({
			slug: makeSlug(title, date),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category: 'music',
			date_start: new Date(dateStart).toISOString(),
			venue_name: 'Lille Ole Bull',
			address: 'Ole Bulls plass 9, Bergen',
			bydel: 'Sentrum',
			price: '',
			ticket_url: ticketLink || undefined,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${date})`);
			inserted++;
		}

		await delay(1000);
	}

	return { found, inserted };
}
