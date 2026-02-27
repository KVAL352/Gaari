import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, detectFreeFromText } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'oconnors';
const BASE_URL = 'https://oconnors.no';
const LIST_URL = `${BASE_URL}/bergen/hva-skjer/`;
const VENUE = "O'Connor's Irish Pub";
const ADDRESS = 'Bryggen 27, Bergen';
const DELAY_MS = 1500;

function parseTime(timeStr: string): { hours: number; minutes: number } | null {
	const match = timeStr.match(/(\d{1,2}):(\d{2})/);
	if (!match) return null;
	return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
}

function guessCategory(title: string): string {
	const t = title.toLowerCase();
	if (t.includes('quiz')) return 'nightlife';
	if (t.includes('st. patrick') || t.includes('patrick')) return 'festival';
	if (t.includes('sport') || t.includes('fotball') || t.includes('kamp')) return 'sports';
	if (t.includes('live') || t.includes('music') || t.includes('musikk') || t.includes('dj') || t.includes('konsert')) return 'music';
	return 'nightlife';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching O'Connor's Bergen events...`);

	const html = await fetchHTML(LIST_URL);
	if (!html) return { found: 0, inserted: 0 };

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	const cards = $('a[href*="/bergen/event/"]');
	console.log(`[${SOURCE}] Found ${cards.length} event cards`);

	for (let i = 0; i < cards.length; i++) {
		const card = cards.eq(i);
		const href = card.attr('href');
		if (!href) continue;

		const sourceUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

		// Extract title from h2 or h3
		const title = (card.find('.t2-post-title').text() || card.find('h2, h3').text()).trim();
		if (!title) continue;

		// Extract date from <time datetime="..."> element (ISO format)
		const timeEl = card.find('time[datetime]');
		const datetime = timeEl.attr('datetime');
		if (!datetime) {
			console.log(`  [${SOURCE}] No datetime attribute for "${title}"`);
			continue;
		}

		const eventDate = new Date(datetime);
		if (isNaN(eventDate.getTime())) continue;

		// Skip past events
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		if (eventDate < now) continue;

		found++;

		if (await eventExists(sourceUrl)) continue;

		// Extract time range from list items (e.g. "22:00 – 02:00")
		const timeItems = card.find('.wp-block-post-terms li');
		let timeText = '';
		timeItems.each((_, li) => {
			const text = $(li).text().trim();
			if (text.match(/\d{1,2}:\d{2}/)) {
				timeText = text;
			}
		});

		// Apply start time from the <time> datetime if available, otherwise from text
		let dateEnd: string | undefined;
		if (timeText) {
			const endTimeMatch = timeText.match(/[–-]\s*(\d{1,2}:\d{2})/);
			if (endTimeMatch) {
				const endTime = parseTime(endTimeMatch[1]);
				if (endTime) {
					const endDate = new Date(eventDate);
					endDate.setHours(endTime.hours, endTime.minutes, 0, 0);
					// If end time is before start time, it's the next day
					if (endDate <= eventDate) {
						endDate.setDate(endDate.getDate() + 1);
					}
					dateEnd = endDate.toISOString();
				}
			}
		}

		// Image
		const imageUrl = card.find('.t2-post-featured-image img').attr('src') || undefined;

		const dateStart = eventDate.toISOString();
		const datePart = dateStart.slice(0, 10);
		const category = guessCategory(title);
		const bydel = mapBydel(VENUE);

		// Fetch detail page for age info and free admission check
		let ageGroup = 'all';
		let price = '';

		if (i > 0) await delay(DELAY_MS);

		const detailHtml = await fetchHTML(sourceUrl);
		if (detailHtml) {
			const $d = cheerio.load(detailHtml);

			// Extract age from summary box
			$d('.resthon-events-summary__box li').each((_, li) => {
				const label = $d(li).find('.label').text().trim().toLowerCase();
				const value = $d(li).find('.value').text().trim();
				if (label === 'alder' && value) {
					ageGroup = value.includes('18') || value.includes('20') || value.includes('21') || value.includes('23') ? '18+' : 'all';
				}
			});

			// Check description for free admission
			const bodyText = $d('.entry-content, .wp-block-post-content').text();
			if (detectFreeFromText(title, bodyText)) {
				price = '0';
			}
		}

		const aiDesc = await generateDescription({ title, venue: VENUE, category, date: eventDate, price });

		const success = await insertEvent({
			slug: makeSlug(title, datePart),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: VENUE,
			address: ADDRESS,
			bydel,
			price,
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: ageGroup,
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
