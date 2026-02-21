import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML } from '../lib/utils.js';

const SOURCE = 'brann';
const LIST_URL = 'https://www.brann.no/terminliste';
const VENUE = 'Brann Stadion';
const ADDRESS = 'Kniksens plass 1, Bergen';
const BYDEL = 'Bergenhus';

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(3, 5));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching SK Brann home fixtures...`);

	const html = await fetchHTML(LIST_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch fixtures page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Get all future matches
	const rows = $('tr.future__match__terminlist').toArray();
	console.log(`[${SOURCE}] ${rows.length} total future fixtures`);

	for (const row of rows) {
		const dateCell = $(row).find('.schedule__match__item--date');
		const dateText = dateCell.text();

		// Only home matches at Brann stadion
		if (!dateText.toLowerCase().includes('brann stadion')) continue;

		// Extract teams
		const teamsCell = $(row).find('.schedule__match__item--teams');
		const opponent = teamsCell.find('.schedule__team--opponent').text().trim();
		if (!opponent) continue;

		// Extract date: "DD.MM.YYYY" and time "HH:MM"
		const dateMatch = dateText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
		const timeMatch = dateText.match(/(\d{2}):(\d{2})/);
		if (!dateMatch) continue;

		const [, dd, mm, yyyy] = dateMatch;
		const dateStr = `${dd}.${mm}`;
		const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '17:00';
		const isoDate = `${yyyy}-${mm}-${dd}`;
		const offset = bergenOffset(dateStr);

		const dateStart = new Date(`${isoDate}T${time}:00${offset}`).toISOString();

		// Skip past matches
		if (new Date(dateStart) < new Date()) continue;

		found++;

		// Extract league from image alt text
		const leagueImg = $(row).find('.schedule__match__item--league img');
		const league = leagueImg.attr('alt')?.replace(/\s*[-–]\s*.+/, '').trim() || 'Fotball';

		// Ticket URL
		const ticketLink = $(row).find('.schedule__match__item--ticket a').attr('href') || 'https://www.brann.no/billetter';
		const ticketUrl = ticketLink.startsWith('http') ? ticketLink : `https://www.brann.no${ticketLink}`;

		const sourceUrl = `${LIST_URL}#${isoDate}-brann-vs-${makeSlug(opponent, '')}`;
		if (await eventExists(sourceUrl)) continue;

		const title = `Brann – ${opponent}`;

		const success = await insertEvent({
			slug: makeSlug(`brann-${opponent}`, isoDate),
			title_no: title,
			description_no: `${league}: SK Brann mot ${opponent} på Brann Stadion`,
			category: 'sports',
			date_start: dateStart,
			venue_name: VENUE,
			address: ADDRESS,
			bydel: BYDEL,
			price: '',
			ticket_url: ticketUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: undefined,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${league}, ${isoDate} ${time})`);
			inserted++;
		}
	}

	return { found, inserted };
}
