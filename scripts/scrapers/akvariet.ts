import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'akvariet';
const BASE_URL = 'https://www.akvariet.no';
const CALENDAR_URL = `${BASE_URL}/hva-skjer/aktivitetskalender/dag`;
const DAYS_AHEAD = 14;

// Recurring daily activities to skip — these repeat every day and are not discrete "events".
// Only skip on exact (case-insensitive) title match. Unique variants like
// "Vinterferieprogram: Bli kjent med havskilpadden" will still be captured.
const RECURRING_TITLES = [
	'pingvin',
	'sjøløve',
	'oter',
	'tropisk',
	'fiskefôring i rotunden',
	'åpen røktergang',
	'møt dyrepasser',
];

// Films/documentaries that screen daily — recurring, not unique events
const RECURRING_FILMS = [
	'dyrevelferd på akvariet',
	'the little prince',
	'den lille prinsen',
	'kaos i pingvindammen',
];

function isRecurring(title: string): boolean {
	const normalized = title
		.replace(/&quot;/g, '"')
		.replace(/["""]/g, '')
		.replace(/\s*\(norsk\)\s*/gi, '')
		.replace(/\s*\(engelsk\)\s*/gi, '')
		.replace(/\s*\(english\)\s*/gi, '')
		.trim()
		.toLowerCase();

	return RECURRING_TITLES.includes(normalized) || RECURRING_FILMS.includes(normalized);
}

function guessCategory(title: string): string {
	const lower = title.toLowerCase();
	if (/konsert|concert/.test(lower)) return 'music';
	if (/film|kino|prince|prinsen|dokumentar/.test(lower)) return 'culture';
	if (/workshop|kurs|lær/.test(lower)) return 'workshop';
	return 'family';
}

/**
 * Scrape one day of the Akvariet activity calendar.
 * Returns array of parsed activity cards.
 */
function parseDay($: cheerio.CheerioAPI, dateStr: string) {
	const activities: Array<{
		title: string;
		time: string;
		location: string;
		description: string;
		imageUrl?: string;
		detailUrl?: string;
	}> = [];

	// Each activity card is a div.row.mb-3.p-3.border inside the container
	$('div.row.mb-3.p-3.border').each((_i, el) => {
		const card = $(el);

		// Time: first <span> with text-primary inside the time column
		const timeText = card.find('.col-3 span.text-primary, .col-lg-2 span.text-primary').first().text().trim();
		// Extract start time (e.g. "10:30" from "10:30 - 10:45")
		const timeMatch = timeText.match(/(\d{1,2}:\d{2})/);
		const time = timeMatch ? timeMatch[1] : '';

		// Title: h3 inside the card
		const rawTitle = card.find('h3').first().text().trim()
			.replace(/&quot;/g, '"');
		if (!rawTitle) return;

		// Location: span.fw-normal after the title
		const location = card.find('.d-flex.flex-column span.fw-normal').first().text().trim();

		// Description: paragraph inside the collapse section
		const description = card.find('.collapse p').first().text().trim();

		// Image: img.img-fluid inside <picture> in the collapse section
		const imgSrc = card.find('.collapse picture img.img-fluid').first().attr('src');
		const imageUrl = imgSrc || undefined;

		// Detail link: "Les mer" button
		const detailLink = card.find('.collapse a.btn-primary[href]').first().attr('href');
		let detailUrl: string | undefined;
		if (detailLink) {
			detailUrl = detailLink.startsWith('http') ? detailLink : `${BASE_URL}${detailLink}`;
		}

		activities.push({ title: rawTitle, time, location, description, imageUrl, detailUrl });
	});

	return activities;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Scraping Akvariet activity calendar (next ${DAYS_AHEAD} days)...`);

	let found = 0;
	let inserted = 0;

	const today = new Date();

	for (let d = 0; d < DAYS_AHEAD; d++) {
		const date = new Date(today);
		date.setDate(today.getDate() + d);
		const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD

		const url = `${CALENDAR_URL}/${dateStr}`;

		if (d > 0) await delay(1500);

		const html = await fetchHTML(url);
		if (!html) {
			console.warn(`[${SOURCE}]   Failed to fetch ${dateStr}`);
			continue;
		}

		const $ = cheerio.load(html);
		const activities = parseDay($, dateStr);

		let daySpecialCount = 0;
		for (const activity of activities) {
			// Skip recurring daily activities
			if (isRecurring(activity.title)) continue;

			daySpecialCount++;
			found++;

			// Build unique source_url per event per day
			const titleSlug = activity.title
				.toLowerCase()
				.replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/[å]/g, 'a')
				.replace(/["""]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
			const sourceUrl = `${BASE_URL}/hva-skjer/aktivitetskalender/dag/${dateStr}#${titleSlug}`;

			if (await eventExists(sourceUrl)) continue;

			// Build ISO timestamp
			const offset = bergenOffset(dateStr);
			const time = activity.time || '10:00';
			const dateStart = new Date(`${dateStr}T${time}:00${offset}`).toISOString();

			const category = guessCategory(activity.title);

			const aiDesc = await generateDescription({
				title: activity.title,
				venue: 'Akvariet i Bergen',
				category,
				date: dateStart,
				price: '',
			});

			const ticketUrl = activity.detailUrl || `${BASE_URL}/kjop-billett?date=${dateStr}`;

			const success = await insertEvent({
				slug: makeSlug(activity.title, dateStr),
				title_no: activity.title,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				category,
				date_start: dateStart,
				venue_name: 'Akvariet i Bergen',
				address: 'Nordnesbakken 4, 5005 Bergen',
				bydel: 'Bergenhus',
				price: '',
				ticket_url: ticketUrl,
				source: SOURCE,
				source_url: sourceUrl,
				image_url: activity.imageUrl,
				age_group: 'family',
				language: 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${activity.title} (${dateStr} ${time}) [${category}]`);
				inserted++;
			}
		}

		if (daySpecialCount > 0) {
			console.log(`[${SOURCE}]   ${dateStr}: ${activities.length} total, ${daySpecialCount} special events`);
		}
	}

	console.log(`[${SOURCE}] Done: found ${found}, inserted ${inserted}`);
	return { found, inserted };
}
