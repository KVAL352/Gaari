import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { resolveTicketUrl } from '../lib/venues.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, parseNorwegianDate, bergenOffset, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bergenlive';
const URL = 'https://www.bergenlive.no/konsertkalender';

/**
 * Fetch the detail page and extract the start time from
 * `<meta itemprop="startDate" content="YYYY-MM-DD HH:MM" />`.
 * Returns "HH:MM" or null.
 */
async function fetchDetailTime(detailUrl: string): Promise<string | null> {
	const html = await fetchHTML(detailUrl);
	if (!html) return null;
	const $ = cheerio.load(html);
	const startDate = $('meta[itemprop="startDate"]').attr('content') || '';
	const m = startDate.match(/\d{4}-\d{2}-\d{2}\s+(\d{1,2}):(\d{2})/);
	if (!m) return null;
	return `${m[1].padStart(2, '0')}:${m[2]}`;
}

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
		const dateOnly = parseNorwegianDate(dateStr);
		if (!dateOnly) continue;
		const datePart = dateOnly.slice(0, 10); // "YYYY-MM-DD"

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

		// Fetch detail page for the actual start time (listing has only the date)
		const detailTime = await fetchDetailTime(detailUrl);
		await delay(1000);
		const dateStart = detailTime
			? new Date(`${datePart}T${detailTime}:00${bergenOffset(datePart)}`).toISOString()
			: (() => { const [y, m, d] = datePart.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).toISOString(); })(); // midnight UTC → time hidden on frontend

		const bydel = mapBydel(venue);

		const aiDesc = await generateDescription({ title, venue, category: 'music', date: dateStart, price: '' });

		// Use ticket URL if specific, otherwise fall back to detail page
		let resolvedTicketUrl = resolveTicketUrl(venue, ticketUrl);
		try {
			const parsed = new URL(resolvedTicketUrl);
			const path = parsed.pathname.replace(/\/+$/, '');
			if (!path) resolvedTicketUrl = detailUrl; // Generic homepage — use detail page
		} catch { /* keep as-is */ }

		const success = await insertEvent({
			slug: makeSlug(title, dateStart),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category: 'music',
			date_start: dateStart,
			venue_name: venue,
			address: venue,
			bydel,
			price: '',
			ticket_url: resolvedTicketUrl,
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
