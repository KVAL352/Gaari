import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'cornerteateret';
const BASE_URL = 'https://cornerteateret.no';
const LIST_URL = `${BASE_URL}/program`;
const VENUE = 'Cornerteateret';
const ADDRESS = 'Kong Christian Frederiks Plass 4, Bergen';

function guessCategory(title: string): string {
	const t = title.toLowerCase();
	if (t.includes('konsert') || t.includes('jazz') || t.includes('bass') || t.includes('feat.') || t.includes('dj')) return 'music';
	if (t.includes('teater') || t.includes('impro') || t.includes('revy') || t.includes('forestilling')) return 'theatre';
	if (t.includes('standup') || t.includes('stand-up') || t.includes('quiz') || t.includes('pub')) return 'nightlife';
	if (t.includes('barn') || t.includes('kids') || t.includes('children')) return 'family';
	if (t.includes('workshop') || t.includes('kurs')) return 'workshop';
	if (t.includes('film') || t.includes('kino')) return 'culture';
	if (t.includes('kor') || t.includes('choir') || t.includes('pubkor')) return 'music';
	return 'theatre';
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Cornerteateret events (HTML)...`);

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
		const startTime = startTimeEl.first().text().trim() || '19:00';
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

		// Category
		const category = guessCategory(title);

		// Venue — from meta address or default
		const addressEl = el.find('li.eventlist-meta-address');
		const venueText = addressEl.length
			? addressEl.clone().children().remove().end().text().trim()
			: '';
		const venueName = venueText || VENUE;
		const address = ADDRESS;
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
			language: title.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
