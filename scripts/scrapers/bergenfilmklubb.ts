import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bergenfilmklubb';
const BASE_URL = 'https://bergenfilmklubb.no';
const LIST_URL = `${BASE_URL}/program`;
const VENUE = 'Tivoli, Det Akademiske Kvarter';
const ADDRESS = 'Olav Kyrres gate 49, Bergen';

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Filmklubb events (HTML)...`);

	const html = await fetchHTML(LIST_URL);
	if (!html) return { found: 0, inserted: 0 };

	const $ = cheerio.load(html);
	// Only upcoming events — skip past section
	const articles = $('article.eventlist-event--upcoming');
	console.log(`[${SOURCE}] Found ${articles.length} upcoming events`);

	let found = articles.length;
	let inserted = 0;

	for (let i = 0; i < articles.length; i++) {
		const el = articles.eq(i);

		// Title and detail URL
		const titleLink = el.find('h1.eventlist-title a.eventlist-title-link');
		const title = titleLink.text().trim();
		const detailPath = titleLink.attr('href');
		if (!title || !detailPath) continue;

		const sourceUrl = `${BASE_URL}${detailPath}`;
		if (await eventExists(sourceUrl)) continue;

		// Date
		const dateEl = el.find('time.event-date');
		const dateStr = dateEl.first().attr('datetime'); // YYYY-MM-DD
		if (!dateStr) continue;

		// Time — bergenfilmklubb uses event-time-24hr-start/end
		const startTimeEl = el.find('time.event-time-24hr-start');
		const endTimeEl = el.find('.event-time-24hr time.event-time-12hr-end');
		const startTime = startTimeEl.first().text().trim() || '19:00';
		const endTime = endTimeEl.first().text().trim();

		const offset = bergenOffset(dateStr);
		const dateStart = new Date(`${dateStr}T${startTime}:00${offset}`).toISOString();
		const dateEnd = endTime
			? new Date(`${dateStr}T${endTime}:00${offset}`).toISOString()
			: undefined;

		// Image — bergenfilmklubb only has data-src (no src)
		const imgEl = el.find('a.eventlist-column-thumbnail img');
		const imageUrl = imgEl.attr('data-src') || imgEl.attr('src') || undefined;

		// Venue — from meta address if available
		const addressEl = el.find('li.eventlist-meta-address');
		const venueText = addressEl.length
			? addressEl.clone().children().remove().end().text().trim()
			: '';
		const venueName = venueText || VENUE;
		const address = ADDRESS;
		const bydel = mapBydel(venueName);

		const aiDesc = await generateDescription({ title, venue: venueName, category: 'culture', date: dateStart, price: '' });

		const success = await insertEvent({
			slug: makeSlug(title, dateStr),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category: 'culture',
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
			language: 'both',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title}`);
			inserted++;
		}
	}

	return { found, inserted };
}
