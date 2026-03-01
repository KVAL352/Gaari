import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bergenpride';
const BASE_URL = 'https://bergenpride.no';
const DELAY_MS = 1500;

// 2025 program page URLs — updated annually when program is published.
// Bergen Pride 2026: June 13–21. URL pattern includes weekday + date.
const PROGRAM_PAGES = [
	'/program-friday-13th/',
	'/program-saturday-14th/',
	'/program-sunday-15th/',
	'/program-monday-16th/',
	'/program-tuesday-17th/',
	'/program-wednesday-18th/',
	'/program-thursday-19th/',
	'/program-friday-20th/',
	'/program-friday-20th-copy/', // Saturday 21st (parade day)
];

// Map page URL slugs to actual dates for 2026
const PAGE_DATES: Record<string, string> = {
	'friday-13th': '2026-06-13',
	'saturday-14th': '2026-06-14',
	'sunday-15th': '2026-06-15',
	'monday-16th': '2026-06-16',
	'tuesday-17th': '2026-06-17',
	'wednesday-18th': '2026-06-18',
	'thursday-19th': '2026-06-19',
	'friday-20th': '2026-06-20',
	'friday-20th-copy': '2026-06-21', // Saturday despite URL
};

function getDateFromPageUrl(pageUrl: string): string | null {
	for (const [slug, date] of Object.entries(PAGE_DATES)) {
		if (pageUrl.includes(slug)) return date;
	}
	return null;
}

function guessCategory(title: string, venue: string): string {
	const text = `${title} ${venue}`.toLowerCase();
	if (text.includes('konsert') || text.includes('dj') || text.includes('musikk') ||
		text.includes('drag') || text.includes('show')) return 'nightlife';
	if (text.includes('parade') || text.includes('tog')) return 'festival';
	if (text.includes('workshop') || text.includes('kurs') || text.includes('samtale')) return 'workshop';
	if (text.includes('barn') || text.includes('familie') || text.includes('kids') ||
		text.includes('ungdom') || text.includes('youth')) return 'family';
	if (text.includes('fest') || text.includes('party') || text.includes('park')) return 'nightlife';
	if (text.includes('utstilling') || text.includes('film') || text.includes('kunst')) return 'culture';
	return 'festival';
}

/**
 * Parse events from Vev-rendered HTML.
 * Vev uses custom <vev> elements. Events follow this pattern:
 * - Day headers: <h3> with "Day, Month Date" or similar
 * - Event title: <strong> inside <p> elements
 * - Time: "Tid: HH:MM" pattern
 * - Venue: plain text before time
 * - Description: accordion body-text div
 */
function parseVevEvents(html: string, pageDate: string): Array<{
	title: string;
	venue: string;
	time: string;
	description: string;
}> {
	const $ = cheerio.load(html);
	const events: Array<{ title: string; venue: string; time: string; description: string }> = [];

	// Find all text content blocks
	const textBlocks: string[] = [];
	$('p, h3, h4').each((_, el) => {
		const text = $(el).text().trim();
		if (text) textBlocks.push(text);
	});

	// Find description blocks (accordion content)
	const descriptions: string[] = [];
	$('.body-text div, .body-text').each((_, el) => {
		const text = $(el).text().trim();
		if (text && text.length > 20) descriptions.push(text);
	});

	// Parse events by finding "Tid:" patterns and working backwards for title/venue
	let currentTitle = '';
	let currentVenue = '';
	let descIdx = 0;

	for (let i = 0; i < textBlocks.length; i++) {
		const block = textBlocks[i];

		// Check for time pattern: "Tid: HH:MM" or "Tid: HH:MM – HH:MM"
		const timeMatch = block.match(/Tid:\s*(\d{1,2}:\d{2})/i);
		if (timeMatch) {
			// Title is usually 1-3 blocks before the time
			// Look backwards for a strong/bold title (contains actual event name)
			for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
				const prev = textBlocks[j];
				// Skip venue-like entries and time entries
				if (prev.match(/Tid:/i) || prev.match(/^\d{1,2}:\d{2}$/)) continue;
				if (!currentTitle && prev.length > 2 && prev.length < 200) {
					currentTitle = prev;
					break;
				}
			}

			// Venue is often the block right before time
			if (i > 0) {
				const prevBlock = textBlocks[i - 1];
				if (!prevBlock.match(/Tid:/i) && prevBlock.length < 100 && prevBlock !== currentTitle) {
					currentVenue = prevBlock;
				}
			}

			if (currentTitle) {
				events.push({
					title: currentTitle,
					venue: currentVenue || 'Bergen Pride',
					time: timeMatch[1],
					description: descriptions[descIdx] || '',
				});
				descIdx++;
			}

			currentTitle = '';
			currentVenue = '';
		}
	}

	return events;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Pride events...`);

	let found = 0;
	let inserted = 0;

	for (const pagePath of PROGRAM_PAGES) {
		const pageUrl = `${BASE_URL}${pagePath}`;
		const html = await fetchHTML(pageUrl);
		if (!html) {
			await delay(DELAY_MS);
			continue;
		}

		const pageDate = getDateFromPageUrl(pagePath);
		if (!pageDate) continue;

		const events = parseVevEvents(html, pageDate);
		if (events.length === 0) {
			// Vev SPA might return the shell page with no content — this is expected when
			// the program hasn't been published yet
			continue;
		}

		console.log(`[${SOURCE}] ${pagePath}: ${events.length} events`);

		for (const event of events) {
			found++;

			// Build source URL from page URL + slugified title
			const sourceUrl = `${pageUrl}#${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
			if (await eventExists(sourceUrl)) continue;

			// Parse time → full ISO datetime
			const [hours, minutes] = event.time.split(':').map(Number);
			const startDate = new Date(`${pageDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+02:00`);
			if (isNaN(startDate.getTime())) continue;

			const category = guessCategory(event.title, event.venue);
			const bydel = mapBydel(event.venue);

			const aiDesc = await generateDescription({
				title: event.title,
				venue: event.venue,
				category,
				date: startDate.toISOString(),
			});

			const success = await insertEvent({
				slug: makeSlug(event.title, pageDate),
				title_no: event.title,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				category,
				date_start: startDate.toISOString(),
				venue_name: event.venue,
				address: 'Bergen',
				bydel,
				price: '',
				ticket_url: pageUrl,
				source: SOURCE,
				source_url: sourceUrl,
				image_url: undefined,
				age_group: 'all',
				language: 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${event.title} (${event.venue}, ${pageDate} ${event.time})`);
				inserted++;
			}
		}

		await delay(DELAY_MS);
	}

	return { found, inserted };
}
