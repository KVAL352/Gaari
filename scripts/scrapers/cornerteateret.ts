import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'cornerteateret';
const BASE_URL = 'https://cornerteateret.no';
const LIST_URL = `${BASE_URL}/program`;
const VENUE = 'Cornerteateret';
const ADDRESS = 'Kong Christian Frederiks Plass 4, Bergen';

function guessCategory(title: string): string {
	const t = title.toLowerCase();
	const w = (word: string) => new RegExp(`\\b${word}\\b`).test(t);
	if (w('konsert') || w('jazz') || w('bass') || t.includes('feat.') || w('dj')) return 'music';
	if (w('teater') || w('impro') || w('revy') || w('forestilling')) return 'theatre';
	if (w('standup') || w('stand-up') || w('quiz') || w('pub')) return 'nightlife';
	if (w('barn') || w('kids') || w('children')) return 'family';
	if (w('workshop') || w('kurs')) return 'workshop';
	if (w('film') || w('kino')) return 'culture';
	if (w('kor') || w('choir') || w('pubkor')) return 'music';
	return 'theatre';
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Cornerteateret events (HTML)...`);

	const html = await fetchHTML(LIST_URL);
	if (!html) return { found: 0, inserted: 0 };

	const $ = cheerio.load(html);
	const articles = $('article.eventlist-event--upcoming');
	console.log(`[${SOURCE}] Found ${articles.length} upcoming events`);

	const found = articles.length;
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
			title_en: aiDesc.title_en,
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
