import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, deleteEventByUrl } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'oseana';
const BASE_URL = 'https://www.oseana.no/program/';
const VENUE = 'Oseana';
const ADDRESS = 'Oseana, Os';

const NORWEGIAN_MONTHS: Record<string, number> = {
	'januar': 1, 'februar': 2, 'mars': 3, 'april': 4, 'mai': 5, 'juni': 6,
	'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12,
};

const MONTH_PATTERN = '(?:januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)';

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

function buildDate(day: number, month: number, year: number): string {
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function inferYear(month: number): number {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;
	// If month is more than 2 months in the past, assume next year
	return (month < currentMonth - 2) ? currentYear + 1 : currentYear;
}

/**
 * Parse Oseana date formats:
 * - "Torsdag 5. mars 2026 - Kl. 19:00" (single date with year and time)
 * - "Torsdag 21. mai - Kl. 19:30" (single date without year)
 * - "Onsdag 17. september 2025 - søndag 5. april 2026" (range, both years)
 * - "Søndag 11. januar - søndag 28. juni 2026" (range, year only on end)
 * - "Onsdag 11. februar - søndag 5. april 2026" (range, year only on end)
 */
function parseOseanaDate(text: string): { date: string; time: string; endDate?: string } | null {
	const clean = text.replace(/\s+/g, ' ').trim();

	// Try date range FIRST (must come before single-date to avoid grabbing end date only)
	// Use \S* instead of \w* to match Norwegian day names containing ø, å, etc.
	const rangeRe = new RegExp(
		`(\\d{1,2})\\.\\s*(${MONTH_PATTERN})\\s*(\\d{4})?\\s*-\\s*\\S*\\s*(\\d{1,2})\\.\\s*(${MONTH_PATTERN})\\s*(\\d{4})`,
		'i'
	);
	const range = clean.match(rangeRe);
	if (range) {
		const day1 = parseInt(range[1]);
		const month1 = NORWEGIAN_MONTHS[range[2].toLowerCase()];
		const year1 = range[3] ? parseInt(range[3]) : parseInt(range[6]);
		const day2 = parseInt(range[4]);
		const month2 = NORWEGIAN_MONTHS[range[5].toLowerCase()];
		const year2 = parseInt(range[6]);
		if (!month1 || !month2) return null;

		const date = buildDate(day1, month1, year1);
		const endDate = buildDate(day2, month2, year2);
		return { date, time: '12:00', endDate };
	}

	// Single date with year: "5. mars 2026" with optional "- Kl. HH:MM"
	const withYear = new RegExp(
		`(\\d{1,2})\\.\\s*(${MONTH_PATTERN})\\s*(\\d{4})(?:\\s*-\\s*(?:Kl\\.\\s*)?(\\d{1,2}[:.:]\\d{2}))?`,
		'i'
	);
	const m = clean.match(withYear);
	if (m) {
		const day = parseInt(m[1]);
		const month = NORWEGIAN_MONTHS[m[2].toLowerCase()];
		const year = parseInt(m[3]);
		const time = m[4]?.replace('.', ':') || '19:00';
		if (!month) return null;
		return { date: buildDate(day, month, year), time };
	}

	// Single date without year: "21. mai - Kl. 19:30"
	const noYear = new RegExp(
		`(\\d{1,2})\\.\\s*(${MONTH_PATTERN})(?:\\s*-\\s*(?:Kl\\.\\s*)?(\\d{1,2}[:.:]\\d{2}))?`,
		'i'
	);
	const ny = clean.match(noYear);
	if (ny) {
		const day = parseInt(ny[1]);
		const month = NORWEGIAN_MONTHS[ny[2].toLowerCase()];
		if (!month) return null;
		const year = inferYear(month);
		const time = ny[3]?.replace('.', ':') || '19:00';
		return { date: buildDate(day, month, year), time };
	}

	return null;
}

function extractImage($el: cheerio.Cheerio<cheerio.Element>): string | undefined {
	const style = $el.find('.image-container').attr('style') || '';
	const m = style.match(/background-image:\s*url\(([^)]+)\)/);
	if (!m) return undefined;
	const url = m[1].trim().replace(/^['"]|['"]$/g, '');
	if (!url) return undefined;
	return url.startsWith('http') ? url : `https://www.oseana.no${url}`;
}

/** Fetch detail page for price, ticket URL, and sold-out status */
async function fetchDetailInfo(url: string): Promise<{ price: string; ticketUrl?: string; soldOut: boolean }> {
	const html = await fetchHTML(url);
	if (!html) return { price: '', soldOut: false };
	const $ = cheerio.load(html);

	// Sold-out detection: <span class="sale-status sold_out">
	const soldOut = $('span.sale-status.sold_out').length > 0;

	// Price from <div class="price-and-actions"> <p><strong>Pris</strong><br/>PRICE</p>
	const priceP = $('div.price-and-actions p').first().text().trim();
	let price = '';
	if (priceP) {
		// Remove the "Pris" label, keep just the value (e.g. "630,-" or "650 - 695,-")
		price = priceP.replace(/^Pris\s*/i, '').trim();
		// Normalize: "650 - 695,-" → "650–695 kr", "630,-" → "630 kr"
		const range = price.match(/^(\d+)\s*-\s*(\d+)\s*,?-?$/);
		if (range) {
			price = `${range[1]}–${range[2]} kr`;
		} else {
			const single = price.match(/^(\d+)\s*,?-?$/);
			if (single) {
				price = `${single[1]} kr`;
			}
		}
	}

	// Ticket URL from tix.no link
	const ticketLink = $('a.button.purchase').attr('href');
	const ticketUrl = ticketLink || undefined;

	return { price, ticketUrl, soldOut };
}

function guessCategory(title: string, classes: string): string {
	const text = `${title} ${classes}`.toLowerCase();
	if (text.includes('konsert') || text.includes('musikk') || text.includes('jazz')) return 'music';
	if (text.includes('barn') || text.includes('familie') || text.includes('familieverkstad')) return 'family';
	if (text.includes('teater') || text.includes('framsyning') || text.includes('revy')) return 'theatre';
	if (text.includes('standup') || text.includes('humor') || text.includes('komikk')) return 'culture';
	if (text.includes('foredrag') || text.includes('debatt')) return 'culture';
	if (text.includes('utstilling') || text.includes('omvisning') || text.includes('omvising')) return 'culture';
	if (text.includes('yoga') || text.includes('kurs') || text.includes('workshop') || text.includes('verkstad')) return 'workshop';
	if (text.includes('festival')) return 'festival';
	return 'culture';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Oseana events...`);

	const html = await fetchHTML(BASE_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch program page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	const teases = $('article.tease').toArray();
	console.log(`[${SOURCE}] ${teases.length} events on program page`);

	for (const el of teases) {
		const $el = $(el);

		const title = $el.find('h4').first().text().trim();
		if (!title) continue;

		// Get detail URL from first link
		const link = $el.find('a').first().attr('href');
		if (!link) continue;
		const sourceUrl = link.startsWith('http') ? link : `https://www.oseana.no${link}`;

		// Parse date from p.when text
		const dateText = $el.find('p.when').text().trim();
		const parsed = parseOseanaDate(dateText);
		if (!parsed) {
			console.log(`  ? Skipped (unparseable date): "${dateText}" — ${title}`);
			continue;
		}

		// For date ranges (exhibitions), skip if end date is past
		if (parsed.endDate) {
			const endDate = new Date(`${parsed.endDate}T22:00:00${bergenOffset(parsed.endDate)}`);
			if (!isNaN(endDate.getTime()) && endDate.getTime() < Date.now()) continue;
		} else {
			// For single dates, skip if event is past
			const startDate = new Date(`${parsed.date}T${parsed.time}:00${bergenOffset(parsed.date)}`);
			if (isNaN(startDate.getTime()) || startDate.getTime() < Date.now() - 86400000) continue;
		}

		// Check sold-out from listing badge
		const listingSoldOut = $el.find('span.sale-status.sold_out').length > 0;
		if (listingSoldOut) {
			if (await deleteEventByUrl(sourceUrl)) {
				console.log(`  [sold-out] Deleted: ${title}`);
			}
			continue;
		}

		found++;
		if (await eventExists(sourceUrl)) continue;

		const classes = $el.attr('class') || '';
		const category = guessCategory(title, classes);

		const startDate = new Date(`${parsed.date}T${parsed.time}:00${bergenOffset(parsed.date)}`);
		const dateEnd = parsed.endDate
			? new Date(`${parsed.endDate}T22:00:00${bergenOffset(parsed.endDate)}`).toISOString()
			: undefined;

		const imageUrl = extractImage($el);

		// Fetch detail page for price, ticket URL, and sold-out confirmation
		await delay(1000);
		const detail = await fetchDetailInfo(sourceUrl);
		if (detail.soldOut) {
			console.log(`  [sold-out] Skipped: ${title}`);
			continue;
		}

		const aiDesc = await generateDescription({ title, venue: VENUE, category, date: startDate, price: detail.price });
		const success = await insertEvent({
			slug: makeSlug(title, parsed.date),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: startDate.toISOString(),
			date_end: dateEnd,
			venue_name: VENUE,
			address: ADDRESS,
			bydel: 'Ytrebygda',
			price: detail.price,
			ticket_url: detail.ticketUrl || sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: category === 'family' ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} — ${detail.price || 'no price'} (${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
