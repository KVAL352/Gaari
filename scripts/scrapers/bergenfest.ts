import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bergenfest';
const BASE_URL = 'https://www.bergenfest.no';
const ARTISTS_URL = `${BASE_URL}/artister`;

// Card color classes map to festival days (verified from detail pages)
const COLOR_TO_DATE: Record<string, string> = {
	red: '2026-06-10',     // onsdag
	orange: '2026-06-11',  // torsdag
	green: '2026-06-12',   // fredag
	purple: '2026-06-13',  // lørdag
};

export async function scrape(): Promise<{ found: number; inserted: number }> {
	// Warn if all festival dates are in the past (needs manual update for next year)
	const allPast = Object.values(COLOR_TO_DATE).every(d => new Date(d) < new Date());
	if (allPast) {
		console.warn(`[${SOURCE}] All festival dates are in the past — scraper needs date update for next year`);
		return { found: 0, inserted: 0 };
	}

	console.log(`\n[${SOURCE}] Fetching Bergenfest artists...`);

	const html = await fetchHTML(ARTISTS_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch artists page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	const cards = $('.card').toArray();
	console.log(`[${SOURCE}] ${cards.length} artist cards found`);

	for (const card of cards) {
		const $card = $(card);
		const cls = $card.attr('class') || '';

		// Extract color → date
		const colorMatch = cls.match(/card\s+(\w+)/);
		const color = colorMatch ? colorMatch[1] : '';
		const date = COLOR_TO_DATE[color];
		if (!date) continue;

		// Extract artist name and link
		const link = $card.find('a[href*="/artister/"]').attr('href') || '';
		if (!link) continue;

		// Get artist name from link slug (more reliable than card text)
		const slug = link.split('/').filter(Boolean).pop() || '';
		const nameFromSlug = slug.replace(/-\d+$/, '').replace(/-/g, ' ');

		// Try to get name from card title or alt text
		const cardTitle = $card.find('.card-title').text().trim();
		const imgAlt = $card.find('img').attr('alt')?.trim();
		const title = cardTitle || imgAlt || nameFromSlug;
		if (!title || title.length < 2) continue;

		// Get image
		const imageUrl = $card.find('img').attr('src') || undefined;

		found++;

		const sourceUrl = `${BASE_URL}${link}`;
		if (await eventExists(sourceUrl)) continue;

		const aiDesc = await generateDescription({ title, venue: 'Bergenhus Festning', category: 'festival', date: new Date(`${date}T18:00:00+02:00`), price: '' });

		const success = await insertEvent({
			slug: makeSlug(title, date),
			title_no: `Bergenfest: ${title}`,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category: 'festival',
			date_start: new Date(`${date}T18:00:00+02:00`).toISOString(),
			venue_name: 'Bergenhus Festning',
			address: 'Koengen, Bergen',
			bydel: 'Bergenhus',
			price: '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: 'all',
			language: 'both',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${date})`);
			inserted++;
		}
	}

	return { found, inserted };
}
