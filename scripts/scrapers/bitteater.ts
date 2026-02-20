import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, makeDescription } from '../lib/utils.js';

const SOURCE = 'bitteater';
const BASE_URL = 'https://bitteater.no/program/';

const NORWEGIAN_MONTHS: Record<string, number> = {
	'januar': 1, 'februar': 2, 'mars': 3, 'april': 4, 'mai': 5, 'juni': 6,
	'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12,
};

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

/** Parse BIT date strings like "27. – 28. februar" or "28. januar- 24. juni" or "6. mars" */
function parseBITDate(dateStr: string): { start: string; end: string | undefined } | null {
	const clean = dateStr.replace(/\s+/g, ' ').trim();

	// Range with same month: "27. – 28. februar"
	const sameMonth = clean.match(/(\d{1,2})\.\s*[–-]\s*(\d{1,2})\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)/i);
	if (sameMonth) {
		const month = NORWEGIAN_MONTHS[sameMonth[3].toLowerCase()];
		if (month) {
			const year = guessYear(month, parseInt(sameMonth[1]));
			const mm = String(month).padStart(2, '0');
			const start = `${year}-${mm}-${String(parseInt(sameMonth[1])).padStart(2, '0')}`;
			const end = `${year}-${mm}-${String(parseInt(sameMonth[2])).padStart(2, '0')}`;
			return { start, end };
		}
	}

	// Range with different months: "28. januar- 24. juni"
	const diffMonth = clean.match(/(\d{1,2})\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s*[–-]\s*(\d{1,2})\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)/i);
	if (diffMonth) {
		const month1 = NORWEGIAN_MONTHS[diffMonth[2].toLowerCase()];
		const month2 = NORWEGIAN_MONTHS[diffMonth[4].toLowerCase()];
		if (month1 && month2) {
			const year1 = guessYear(month1, parseInt(diffMonth[1]));
			const year2 = guessYear(month2, parseInt(diffMonth[3]));
			const start = `${year1}-${String(month1).padStart(2, '0')}-${String(parseInt(diffMonth[1])).padStart(2, '0')}`;
			const end = `${year2}-${String(month2).padStart(2, '0')}-${String(parseInt(diffMonth[3])).padStart(2, '0')}`;
			return { start, end };
		}
	}

	// Single date: "6. mars"
	const single = clean.match(/(\d{1,2})\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)/i);
	if (single) {
		const month = NORWEGIAN_MONTHS[single[2].toLowerCase()];
		if (month) {
			const year = guessYear(month, parseInt(single[1]));
			const start = `${year}-${String(month).padStart(2, '0')}-${String(parseInt(single[1])).padStart(2, '0')}`;
			return { start, end: undefined };
		}
	}

	return null;
}

function guessYear(month: number, day: number): number {
	const now = new Date();
	const year = now.getFullYear();
	const candidate = new Date(year, month - 1, day);
	return candidate.getTime() < now.getTime() - 60 * 86400000 ? year + 1 : year;
}

function mapCategory(cat: string): string {
	const lower = cat.toLowerCase();
	if (lower.includes('dans')) return 'theatre';
	if (lower.includes('teater') || lower.includes('forestilling') || lower.includes('performance')) return 'theatre';
	if (lower.includes('konsert') || lower.includes('musikk')) return 'music';
	if (lower.includes('workshop')) return 'workshop';
	if (lower.includes('festival')) return 'festival';
	if (lower.includes('barn') || lower.includes('familie')) return 'family';
	if (lower.includes('sosial')) return 'culture';
	return 'culture';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching BIT Teatergarasjen events...`);

	const html = await fetchHTML(BASE_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch program page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	const events = $('a.event-box').toArray();
	console.log(`[${SOURCE}] ${events.length} events found`);

	for (const el of events) {
		const $el = $(el);
		const href = $el.attr('href');
		if (!href) continue;

		const title = $el.find('h3').text().trim();
		if (!title) continue;

		const subtitle = $el.find('h4.sub-title').text().trim();
		const dateStr = $el.find('span.event-date').text().trim();
		const venue = $el.find('span.event-venue').text().trim();
		const category = $el.find('.event-category').text().trim();
		const imageUrl = $el.find('img').first().attr('src') || undefined;

		const parsed = parseBITDate(dateStr);
		if (!parsed) continue;

		// Skip past events
		const startDate = new Date(`${parsed.start}T19:00:00${bergenOffset(parsed.start)}`);
		if (isNaN(startDate.getTime()) || startDate.getTime() < Date.now() - 86400000) continue;

		found++;

		const sourceUrl = href.startsWith('http') ? href : `https://bitteater.no${href}`;
		if (await eventExists(sourceUrl)) continue;

		const gariCategory = mapCategory(category);
		const fullTitle = subtitle ? `${title} – ${subtitle}` : title;
		const dateStart = startDate.toISOString();
		const dateEnd = parsed.end
			? new Date(`${parsed.end}T22:00:00${bergenOffset(parsed.end)}`).toISOString()
			: undefined;

		const success = await insertEvent({
			slug: makeSlug(title, parsed.start),
			title_no: fullTitle,
			description_no: makeDescription(fullTitle, venue || 'BIT Teatergarasjen', gariCategory),
			category: gariCategory,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venue || 'BIT Teatergarasjen',
			address: 'Nøstegaten 54, Bergen',
			bydel: 'Sentrum',
			price: '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: category.toLowerCase().includes('barn') ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${fullTitle} (${gariCategory}, ${dateStr})`);
			inserted++;
		}
	}

	return { found, inserted };
}
