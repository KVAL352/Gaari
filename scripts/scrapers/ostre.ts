import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'ostre';
const BASE_URL = 'https://ekko.no';
const LIST_URL = `${BASE_URL}/ostre`;
const VENUE = 'Østre';
const DELAY_MS = 1200;

/**
 * Parse Norwegian date format from Østre calendar: "fredag 6.3. 22:30" or "fredag 24.4. - lørdag 25.4."
 * Returns ISO date string(s). Assumes current year (or next year if date is in the past).
 */
function parseOstreDate(dateText: string): { start: string; end?: string } | null {
	// Normalize whitespace
	const text = dateText.replace(/\s+/g, ' ').trim();

	// Multi-day: "fredag 24.4. - lørdag 25.4."
	const rangeMatch = text.match(/\w+\s+(\d{1,2})\.(\d{1,2})\.\s*-\s*\w+\s+(\d{1,2})\.(\d{1,2})\./);
	if (rangeMatch) {
		const [, startDay, startMonth, endDay, endMonth] = rangeMatch;
		const startDate = resolveDate(parseInt(startDay), parseInt(startMonth), '12:00');
		const endDate = resolveDate(parseInt(endDay), parseInt(endMonth), '23:59');
		if (startDate) return { start: startDate, end: endDate || undefined };
	}

	// Single day: "fredag 6.3. 22:30" or "fredag 6.3."
	const singleMatch = text.match(/\w+\s+(\d{1,2})\.(\d{1,2})\.\s*(\d{1,2}:\d{2})?/);
	if (singleMatch) {
		const [, day, month, time] = singleMatch;
		const startDate = resolveDate(parseInt(day), parseInt(month), time || '19:00');
		if (startDate) return { start: startDate };
	}

	return null;
}

function resolveDate(day: number, month: number, time: string): string | null {
	const now = new Date();
	const year = now.getFullYear();

	// Try current year first, fall back to next year if date is in the past
	let date = buildDate(year, month, day, time);
	if (date < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
		date = buildDate(year + 1, month, day, time);
	}

	return date.toISOString();
}

function buildDate(year: number, month: number, day: number, time: string): Date {
	const [hours, minutes] = time.split(':').map(Number);
	// Build as CET/CEST (Europe/Oslo)
	const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
	// Parse as Oslo local time
	const utcGuess = new Date(iso + 'Z');
	const osloStr = utcGuess.toLocaleString('sv-SE', { timeZone: 'Europe/Oslo' });
	const osloDate = new Date(osloStr.replace(' ', 'T') + 'Z');
	const offsetMs = osloDate.getTime() - utcGuess.getTime();
	return new Date(utcGuess.getTime() - offsetMs);
}

function guessCategory(title: string, artists: string, organizer: string): string {
	const text = `${title} ${artists} ${organizer}`.toLowerCase();
	if (text.includes('klimafestival') || text.includes('klima')) return 'culture';
	if (text.includes('workshop') || text.includes('kurs') || text.includes('verksted')) return 'workshop';
	if (text.includes('film')) return 'culture';
	if (text.includes('samtale') || text.includes('foredrag')) return 'culture';
	if (text.includes('festival') || text.includes('fest ')) return 'festival';
	if (new RegExp('\\bklubb\\b').test(text) || new RegExp('\\bdj\\b').test(text) || new RegExp('\\bclub\\b').test(text)) return 'nightlife';
	return 'music'; // Østre is primarily a music venue
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Østre events from ekko.no...`);

	const listHtml = await fetchHTML(LIST_URL);
	if (!listHtml) return { found: 0, inserted: 0 };

	const $ = cheerio.load(listHtml);

	const events: Array<{
		title: string;
		dateText: string;
		organizer: string;
		artists: string;
		detailPath?: string;
		ticketUrl?: string;
	}> = [];

	$('#kalender-content .agenda-item').each((_, el) => {
		const title = $(el).find('.event-title p').text().trim();
		const dateText = $(el).find('.time .cap').text().trim();
		const organizer = $(el).find('.title p').text().trim();
		const artists = $(el).find('.artists h3 span').map((__, s) => $(s).text().trim()).get().join(', ');
		const detailPath = $(el).closest('div').find('> a').attr('href') || $(el).find('a').first().attr('href');
		const ticketUrl = $(el).find('a.ticket-link').attr('href');

		if (title && dateText) {
			events.push({
				title,
				dateText,
				organizer,
				artists,
				detailPath: detailPath?.startsWith('/') ? detailPath : undefined,
				ticketUrl,
			});
		}
	});

	console.log(`[${SOURCE}] Found ${events.length} events on calendar page`);
	if (events.length === 0) return { found: 0, inserted: 0 };

	let found = 0;
	let inserted = 0;

	for (let i = 0; i < events.length; i++) {
		const event = events[i];
		const parsed = parseOstreDate(event.dateText);
		if (!parsed) {
			console.log(`  ? Skipped "${event.title}" — unparseable date: "${event.dateText}"`);
			continue;
		}

		// Skip past events
		if (new Date(parsed.start) < new Date()) continue;

		found++;

		// Source URL: detail page if available, otherwise listing page
		const sourceUrl = event.detailPath ? `${BASE_URL}${event.detailPath}` : LIST_URL;
		if (await eventExists(sourceUrl)) continue;

		// Fetch detail page for og:image and price (only if we have a detail path)
		let imageUrl: string | undefined;
		let price = '';
		if (event.detailPath) {
			if (i > 0) await delay(DELAY_MS);
			const detailHtml = await fetchHTML(`${BASE_URL}${event.detailPath}`);
			if (detailHtml) {
				const d$ = cheerio.load(detailHtml);
				imageUrl = d$('meta[property="og:image"]').attr('content') || undefined;

				// Extract price from ticketDescription JSON in script tags
				const scriptContent = d$('script').map((_, s) => d$(s).html() || '').get().join(' ');
				const ticketDescMatch = scriptContent.match(/"ticketDescription":"((?:[^"\\]|\\.)*)"/);
				if (ticketDescMatch) {
					const raw = ticketDescMatch[1]
						.replace(/\\n/g, ' ')
						.replace(/\\"/g, '"')
						.replace(/<[^>]+>/g, ' ')
						.replace(/\s+/g, ' ')
						.trim();
					const priceMatches = [...raw.matchAll(/(\d+(?:[.,]\d+)?\s*(?:,-|kr|NOK))/gi)].map(m => m[1].trim());
					if (priceMatches.length === 1) {
						price = priceMatches[0];
					} else if (priceMatches.length > 1) {
						price = `Fra ${priceMatches[0]}`;
					}
				}
			}
		}

		const datePart = parsed.start.slice(0, 10);
		const category = guessCategory(event.title, event.artists, event.organizer);
		const bydel = mapBydel(VENUE);

		const aiDesc = await generateDescription({
			title: event.title,
			venue: VENUE,
			category,
			date: new Date(parsed.start),
			price,
		});

		const success = await insertEvent({
			slug: makeSlug(event.title, datePart),
			title_no: event.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: parsed.start,
			date_end: parsed.end,
			venue_name: VENUE,
			address: 'Østre Skostredet 3, Bergen',
			bydel,
			price,
			ticket_url: event.ticketUrl || (event.detailPath ? `${BASE_URL}${event.detailPath}` : LIST_URL),
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: 'all',
			language: event.title.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.title} (${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
