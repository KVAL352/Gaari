import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, makeDescription } from '../lib/utils.js';

const SOURCE = 'beyondthegates';
const BASE_URL = 'https://beyondthegates.no';
const LINEUP_URL = `${BASE_URL}/lineup-23`;

// Festival dates — mapped from tab labels
const DAY_MAP: Record<string, string> = {
	'wednesday jul 29': '2026-07-29',
	'thursday jul 30': '2026-07-30',
	'friday jul 31': '2026-07-31',
	'saturday aug 1': '2026-08-01',
};

// Venue addresses
const VENUE_ADDRESSES: Record<string, string> = {
	'usf verftet': 'Georgernes Verft 12, Bergen',
	'kulturhuset i bergen': 'Kong Christians gate 4, Bergen',
	'grieghallen': 'Edvard Griegs plass 1, Bergen',
};

function resolveVenue(sectionTitle: string): { venue: string; address: string; stage: string } {
	const lower = sectionTitle.toLowerCase();
	for (const [key, address] of Object.entries(VENUE_ADDRESSES)) {
		if (lower.includes(key)) {
			return { venue: sectionTitle.split('/')[0].trim(), address, stage: sectionTitle };
		}
	}
	return { venue: sectionTitle, address: 'Bergen', stage: sectionTitle };
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Beyond the Gates 2026 lineup...`);

	const html = await fetchHTML(LINEUP_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch lineup page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Get day tabs — each label maps to a menu
	const tabs = $('label[role="tab"]').toArray();
	const menus = $('div.menu.js-menu').toArray();

	console.log(`[${SOURCE}] ${tabs.length} festival days, ${menus.length} menus`);

	if (tabs.length !== menus.length) {
		console.error(`[${SOURCE}] Tab/menu count mismatch`);
		return { found: 0, inserted: 0 };
	}

	for (let i = 0; i < tabs.length; i++) {
		const dayLabel = $(tabs[i]).text().trim().toLowerCase();
		const date = DAY_MAP[dayLabel];
		if (!date) {
			console.log(`  Unknown day: "${dayLabel}"`);
			continue;
		}

		const menu = $(menus[i]);

		// Each menu has sections (venues/stages) with items (artists)
		const sections = menu.find('.menu-section').toArray();

		for (const section of sections) {
			const sectionTitle = $(section).find('.menu-section-title').text().trim();
			const { venue, address, stage } = resolveVenue(sectionTitle);
			const bydel = mapBydel(venue);

			const items = $(section).find('.menu-item').toArray();

			for (const item of items) {
				const artist = $(item).find('.menu-item-title').text().trim();
				if (!artist) continue;

				found++;

				const sourceUrl = `${LINEUP_URL}#${date}-${makeSlug(artist, date)}`;
				if (await eventExists(sourceUrl)) continue;

				// Default time: evening shows at 18:00 CEST (July)
				const dateStart = new Date(`${date}T18:00:00+02:00`).toISOString();
				const dateEnd = new Date(`${date}T23:59:00+02:00`).toISOString();

				const title = `Beyond the Gates: ${artist}`;

				const success = await insertEvent({
					slug: makeSlug(artist, date),
					title_no: title,
					description_no: `${artist} spiller på ${stage} under Beyond the Gates-festivalen i Bergen`,
					category: 'music',
					date_start: dateStart,
					date_end: dateEnd,
					venue_name: venue,
					address,
					bydel,
					price: '',
					ticket_url: 'https://www.ticketmaster.no/artist/beyond-the-gates-tickets/1180149',
					source: SOURCE,
					source_url: sourceUrl,
					image_url: undefined,
					age_group: 'all',
					language: 'both',
					status: 'approved',
				});

				if (success) {
					console.log(`  + ${artist} @ ${venue} (${date})`);
					inserted++;
				}
			}
		}
	}

	return { found, inserted };
}
