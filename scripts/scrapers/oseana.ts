import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, makeDescription } from '../lib/utils.js';

const SOURCE = 'oseana';
const BASE_URL = 'https://www.oseana.no/program/';

const NORWEGIAN_MONTHS: Record<string, number> = {
	'januar': 1, 'februar': 2, 'mars': 3, 'april': 4, 'mai': 5, 'juni': 6,
	'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12,
};

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

/** Parse "Søndag 8. mars 2026 - Kl. 13:00" → { date, time } */
function parseOseanaDate(text: string): { date: string; time: string; endDate?: string } | null {
	const clean = text.replace(/\s+/g, ' ').trim();

	// Match "DD. month YYYY" with optional "Kl. HH:MM"
	const m = clean.match(/(\d{1,2})\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s*(\d{4})(?:\s*-\s*(?:Kl\.\s*)?(\d{2}:\d{2}))?/i);
	if (m) {
		const day = parseInt(m[1]);
		const month = NORWEGIAN_MONTHS[m[2].toLowerCase()];
		const year = parseInt(m[3]);
		const time = m[4] || '19:00';
		if (!month) return null;
		const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		return { date, time };
	}

	// Date range: "DD. month YYYY - DD. month YYYY" or "DD. month - DD. month YYYY"
	const range = clean.match(/(\d{1,2})\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s*(\d{4})?\s*-\s*\w*\s*(\d{1,2})\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s*(\d{4})/i);
	if (range) {
		const day1 = parseInt(range[1]);
		const month1 = NORWEGIAN_MONTHS[range[2].toLowerCase()];
		const year1 = range[3] ? parseInt(range[3]) : parseInt(range[6]);
		const day2 = parseInt(range[4]);
		const month2 = NORWEGIAN_MONTHS[range[5].toLowerCase()];
		const year2 = parseInt(range[6]);
		if (!month1 || !month2) return null;

		const date = `${year1}-${String(month1).padStart(2, '0')}-${String(day1).padStart(2, '0')}`;
		const endDate = `${year2}-${String(month2).padStart(2, '0')}-${String(day2).padStart(2, '0')}`;
		return { date, time: '12:00', endDate };
	}

	return null;
}

function guessCategory(title: string, classes: string): string {
	const text = `${title} ${classes}`.toLowerCase();
	if (text.includes('konsert') || text.includes('musikk') || text.includes('jazz')) return 'music';
	if (text.includes('barn') || text.includes('familie')) return 'family';
	if (text.includes('teater') || text.includes('framsyning') || text.includes('revy')) return 'theatre';
	if (text.includes('foredrag') || text.includes('debatt')) return 'culture';
	if (text.includes('utstilling')) return 'culture';
	if (text.includes('kurs') || text.includes('workshop')) return 'workshop';
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

		// Parse date from p text
		const dateText = $el.find('p').first().text().trim();
		const parsed = parseOseanaDate(dateText);
		if (!parsed) continue;

		// Skip past events
		const startDate = new Date(`${parsed.date}T${parsed.time}:00${bergenOffset(parsed.date)}`);
		if (isNaN(startDate.getTime()) || startDate.getTime() < Date.now() - 86400000) continue;

		found++;
		if (await eventExists(sourceUrl)) continue;

		const classes = $el.attr('class') || '';
		const category = guessCategory(title, classes);
		const status = $el.find('.status').text().trim().toLowerCase();
		if (status.includes('utseld') || status.includes('avlyst')) continue;

		const dateEnd = parsed.endDate
			? new Date(`${parsed.endDate}T22:00:00${bergenOffset(parsed.endDate)}`).toISOString()
			: undefined;

		const success = await insertEvent({
			slug: makeSlug(title, parsed.date),
			title_no: title,
			description_no: makeDescription(title, 'Oseana', category),
			category,
			date_start: startDate.toISOString(),
			date_end: dateEnd,
			venue_name: 'Oseana',
			address: 'Os, Bergen',
			bydel: 'Ytrebygda',
			price: '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: undefined,
			age_group: category === 'family' ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
