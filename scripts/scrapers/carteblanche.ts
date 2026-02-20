import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, makeDescription } from '../lib/utils.js';

const SOURCE = 'carteblanche';
const PROGRAM_URL = 'https://carteblanche.no/forestillinger-og-arrangement/';

const NORWEGIAN_MONTHS: Record<string, number> = {
	'januar': 1, 'februar': 2, 'mars': 3, 'april': 4, 'mai': 5, 'juni': 6,
	'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12,
};

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

/** Parse "28. mai" → "2026-05-28" */
function parseShortDate(text: string): string | null {
	const m = text.match(/(\d{1,2})\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)/i);
	if (!m) return null;
	const day = parseInt(m[1]);
	const month = NORWEGIAN_MONTHS[m[2].toLowerCase()];
	if (!month) return null;

	const now = new Date();
	let year = now.getFullYear();
	const candidate = new Date(year, month - 1, day);
	if (candidate.getTime() < now.getTime() - 60 * 86400000) year++;

	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Parse time from "kl. 20:00–21:05" or "kl. 09:30–10:45" */
function parseTime(text: string): string {
	const m = text.match(/(\d{2}:\d{2})/);
	return m ? m[1] : '20:00';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Carte Blanche events...`);

	const html = await fetchHTML(PROGRAM_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Get all non-archive items from the first (upcoming) calendar list
	const items = $('.show-calendar-list').first()
		.find('.show-listitem').not('.show-listitem-archive').toArray();
	console.log(`[${SOURCE}] ${items.length} upcoming performances found`);

	// Group by show title (h2 text)
	const byTitle = new Map<string, typeof items>();
	for (const item of items) {
		const title = $(item).find('h2').first().text().trim();
		if (!title) continue;
		if (!byTitle.has(title)) byTitle.set(title, []);
		byTitle.get(title)!.push(item);
	}

	console.log(`[${SOURCE}] ${byTitle.size} unique shows`);

	for (const [title, showItems] of byTitle) {
		// Check first item's location — skip shows not in Bergen
		const firstLocation = $(showItems[0]).find('.col-location').text().trim();
		if (firstLocation && !firstLocation.toLowerCase().includes('bergen') &&
			!firstLocation.toLowerCase().includes('studio bergen') &&
			!firstLocation.toLowerCase().includes('nøstegaten') &&
			!firstLocation.toLowerCase().includes('kode') &&
			!firstLocation.toLowerCase().includes('permanenten')) {
			// Check if ANY performance is in Bergen
			const hasBergen = showItems.some(item => {
				const loc = $(item).find('.col-location').text().trim().toLowerCase();
				return loc.includes('bergen') || loc.includes('studio') ||
					loc.includes('nøstegaten') || loc.includes('kode') || loc.includes('permanenten');
			});
			if (!hasBergen) continue;
		}

		// Collect dates and info from all performances
		const dates: string[] = [];
		let location = '';
		let ticketUrl = '';
		let detailUrl = '';
		let time = '20:00';

		for (const item of showItems) {
			const $item = $(item);
			const groupText = $item.find('.col-group').text().replace(/\s+/g, ' ').trim();

			// Parse date — handle "28. mai" and date ranges "29. mai–10. juni"
			const parsed = parseShortDate(groupText);
			if (parsed) dates.push(parsed);

			if (!location) {
				const loc = $item.find('.col-location').text().trim()
					.replace(/\s*\(urpremiere\)/i, '').trim();
				if (loc) location = loc;
			}
			if (time === '20:00') time = parseTime(groupText);

			// Get links: first a is ticket, second is detail page
			const links = $item.find('a').toArray();
			for (const a of links) {
				const href = $(a).attr('href') || '';
				const text = $(a).text().trim().toLowerCase();
				if (!ticketUrl && (text.includes('billett') || text.includes('kjøp'))) {
					ticketUrl = href;
				}
				if (!detailUrl && (text.includes('forestilling') || text.includes('workshop') || text.includes('les mer'))) {
					detailUrl = href;
				}
			}
		}

		if (dates.length === 0) continue;
		dates.sort();

		// Skip if all dates are past
		const firstDate = dates[0];
		const lastDate = dates[dates.length - 1];
		const startDate = new Date(`${firstDate}T${time}:00${bergenOffset(firstDate)}`);
		if (isNaN(startDate.getTime()) || startDate.getTime() < Date.now() - 86400000) continue;

		found++;

		// Use detail page URL as source_url for dedup
		const sourceUrl = detailUrl || PROGRAM_URL;
		if (await eventExists(sourceUrl)) continue;

		const dateEnd = dates.length > 1 && lastDate !== firstDate
			? new Date(`${lastDate}T22:00:00${bergenOffset(lastDate)}`).toISOString()
			: undefined;

		const category = title.toLowerCase().includes('workshop') || title.toLowerCase().includes('klasse') ? 'workshop'
			: title.toLowerCase().includes('familie') ? 'family'
			: 'theatre';

		const success = await insertEvent({
			slug: makeSlug(title, firstDate),
			title_no: `Carte Blanche: ${title}`,
			description_no: makeDescription(`Carte Blanche: ${title}`, location || 'Studio Bergen', category),
			category,
			date_start: startDate.toISOString(),
			date_end: dateEnd,
			venue_name: location || 'Studio Bergen',
			address: 'Nøstegaten 119, Bergen',
			bydel: 'Sentrum',
			price: '',
			ticket_url: ticketUrl || sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: undefined,
			age_group: category === 'family' ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			const perf = dates.length > 1 ? ` (${dates.length} performances)` : '';
			console.log(`  + Carte Blanche: ${title}${perf}`);
			inserted++;
		}
	}

	return { found, inserted };
}
