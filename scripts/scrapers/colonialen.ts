import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'colonialen';
const BASE_URL = 'https://colonialen.no';
const LIST_URL = `${BASE_URL}/kalender`;

function mapCategory(catText: string): string {
	const lower = catText.toLowerCase();
	if (lower.includes('kurs')) return 'workshop';
	if (lower.includes('smaking')) return 'food';
	return 'food';
}

function resolveVenue(title: string): { name: string; address: string } {
	const t = title.toLowerCase();
	if (t.includes('sann') || t.includes('vinskole')) return { name: 'Colonialen Sann', address: 'Øvre Ole Bulls plass 4, Bergen' };
	if (t.includes('fetevaren')) return { name: 'Colonialen Fetevaren', address: 'Kong Oscars gate 44, Bergen' };
	if (t.includes('litt') || t.includes('litteraturhuset')) return { name: 'Colonialen Litteraturhuset', address: 'Østre Skostredet 5-7, Bergen' };
	return { name: 'Colonialen', address: 'Bergen' };
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Colonialen events (HTML)...`);

	const html = await fetchHTML(LIST_URL);
	if (!html) return { found: 0, inserted: 0 };

	const $ = cheerio.load(html);
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

		// Date — first time.event-date is start, second (if multiday) is end
		const dateEls = el.find('time.event-date');
		const startDateStr = dateEls.eq(0).attr('datetime'); // YYYY-MM-DD
		if (!startDateStr) continue;

		const endDateStr = dateEls.length > 1 ? dateEls.eq(1).attr('datetime') : null;

		// Time
		const startTimeEl = el.find('time.event-time-localized-start, time.event-time-localized');
		const endTimeEl = el.find('time.event-time-localized-end');
		const startTime = startTimeEl.first().text().trim() || '18:00';
		const endTime = endTimeEl.first().text().trim();

		const offset = bergenOffset(startDateStr);
		const dateStart = new Date(`${startDateStr}T${startTime}:00${offset}`).toISOString();
		const dateEnd = endDateStr
			? new Date(`${endDateStr}T${endTime || '23:00'}:00${bergenOffset(endDateStr)}`).toISOString()
			: endTime
				? new Date(`${startDateStr}T${endTime}:00${offset}`).toISOString()
				: undefined;

		// Image
		const imgEl = el.find('a.eventlist-column-thumbnail img');
		const imageUrl = imgEl.attr('data-src') || imgEl.attr('src') || undefined;

		// Category from listing tags
		const catEls = el.find('.eventlist-cats a');
		const categories = catEls.map((_, c) => $(c).text().trim()).get();
		const category = categories.length ? mapCategory(categories.join(' ')) : 'food';

		// Venue — resolve from title keywords (no tags in HTML version)
		const { name: venueName, address } = resolveVenue(title);
		const bydel = mapBydel(venueName);

		const aiDesc = await generateDescription({ title, venue: venueName, category, date: dateStart, price: '' });

		const success = await insertEvent({
			slug: makeSlug(title, startDateStr),
			title_no: title,
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
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${venueName}, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
