import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';

const SOURCE = 'kunsthall';
const BASE_URL = 'https://kunsthall.no';
const EVENTS_URL = `${BASE_URL}/no/arrangementer/`;
const EXHIBITIONS_URL = `${BASE_URL}/no/utstillinger/`;
const VENUE = 'Bergen Kunsthall';
const ADDRESS = 'Rasmus Meyers allé 5, Bergen';

function mapEventCategory(categoryText: string): string {
	const lower = categoryText.toLowerCase().trim();
	if (lower === 'pub' || lower === 'klubb' || lower === 'club') return 'nightlife';
	if (lower === 'konsert' || lower === 'concert') return 'music';
	if (lower === 'workshop') return 'workshop';
	if (lower === 'omvisninger' || lower === 'guided tours' || lower === 'omvisning') return 'tours';
	if (lower === 'foredrag' || lower === 'talk' || lower === 'samtale' || lower === 'conversation') return 'culture';
	if (lower === 'film') return 'culture';
	if (lower === 'mat' || lower === 'food') return 'food';
	if (lower === 'performance') return 'theatre';
	if (lower === 'utstilling' || lower === 'exhibition' || lower === 'medlemsarrangement') return 'culture';
	if (lower === 'arrangement') return 'culture';
	return 'culture';
}

async function scrapeEvents(): Promise<{ found: number; inserted: number }> {
	const html = await fetchHTML(EVENTS_URL);
	if (!html) return { found: 0, inserted: 0 };

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Cards are in div.khb-cards (including hidden #morecards section)
	// Each card: div.uk-card.khb-card > a[href*="/arrangementer/"]
	const cards = $('div.khb-card').toArray().filter(el => {
		const href = $(el).find('a').attr('href') || '';
		return href.match(/\/arrangementer\/\d+-\d{4}-\d{2}-\d{2}/);
	});

	found = cards.length;
	console.log(`[${SOURCE}] Found ${found} event cards`);

	for (const card of cards) {
		const link = $(card).find('a').first();
		const href = link.attr('href') || '';
		const fullUrl = `${BASE_URL}${href}`;
		if (await eventExists(fullUrl)) continue;

		// Category from h3.khb-card-headline
		const categoryText = link.find('h3.khb-card-headline').text().trim();
		const category = categoryText ? mapEventCategory(categoryText) : 'culture';

		// Title from span.khb-card-text--clamp2
		const title = link.find('span.khb-card-text--clamp2').text().trim();
		if (!title) continue;

		// Image from figure img (uses src attr)
		const img = link.find('figure.khb-card-figure img').attr('src');

		// Date from <time> element — datetime attr is Unix timestamp
		const timeEl = link.find('div.khb-card-text time');
		const timestamp = timeEl.attr('datetime');
		if (!timestamp) continue;

		let dateStart: string;
		if (timestamp.match(/^\d{10,}$/)) {
			// Unix timestamp (seconds)
			dateStart = new Date(parseInt(timestamp) * 1000).toISOString();
		} else {
			// ISO date string
			dateStart = new Date(timestamp).toISOString();
		}

		// Time and location from text after <time>
		// Full text is like "Tir 20. mai 18:00, Sal I-V"
		const infoDiv = link.find('div.khb-card-text > div');
		const infoText = infoDiv.text().trim();

		// Extract time (HH:MM) and location after comma
		const timeMatch = infoText.match(/(\d{1,2}:\d{2})/);
		if (timeMatch) {
			const [hour, min] = timeMatch[1].split(':').map(Number);
			const d = new Date(dateStart);
			d.setUTCHours(hour - 1, min, 0, 0); // CET = UTC+1
			dateStart = d.toISOString();
		}

		const locationMatch = infoText.match(/,\s*(.+)$/);
		const location = locationMatch ? locationMatch[1].trim() : '';
		const venueName = location ? `${VENUE} – ${location}` : VENUE;

		const datePart = dateStart.slice(0, 10);
		const imageUrl = img ? `${BASE_URL}${img}` : undefined;

		const success = await insertEvent({
			slug: makeSlug(title, datePart),
			title_no: title,
			description_no: title,
			category,
			date_start: dateStart,
			venue_name: venueName,
			address: ADDRESS,
			bydel: mapBydel(VENUE),
			price: '',
			ticket_url: fullUrl,
			source: SOURCE,
			source_url: fullUrl,
			image_url: imageUrl,
			age_group: 'all',
			language: 'both',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}

async function scrapeExhibitions(): Promise<{ found: number; inserted: number }> {
	const html = await fetchHTML(EXHIBITIONS_URL);
	if (!html) return { found: 0, inserted: 0 };

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Current exhibitions are in div.khb-cards BEFORE the <hr> separator
	// Archive is after <hr> under h2 "Arkiv"
	// Only take cards from the first khb-cards section
	const firstCardsSection = $('div.khb-cards').first();
	const cards = firstCardsSection.find('div.khb-card').toArray().filter(el => {
		const href = $(el).find('a').attr('href') || '';
		return href.match(/\/utstillinger\/[\w-]+\//);
	});

	found = cards.length;
	console.log(`[${SOURCE}] Found ${found} current exhibitions`);

	for (const card of cards) {
		const link = $(card).find('a').first();
		const href = link.attr('href') || '';
		const fullUrl = `${BASE_URL}${href}`;
		if (await eventExists(fullUrl)) continue;

		// Title from span.khb-card-title or span.khb-card-text--clamp2
		const titleEl = link.find('span.khb-card-title');
		const title = titleEl.length
			? titleEl.text().trim()
			: link.find('span.khb-card-text--clamp2').text().trim();
		if (!title) continue;

		// Image — exhibitions use data-src (lazy loading via UIkit)
		const img = link.find('figure.khb-card-figure img').attr('data-src')
			|| link.find('figure.khb-card-figure img').attr('src');

		// Date range from two <time> elements
		const timeEls = link.find('div.khb-card-text time');
		if (timeEls.length < 2) continue;

		const startDatetime = $(timeEls[0]).attr('datetime');
		const endDatetime = $(timeEls[1]).attr('datetime');
		if (!startDatetime || !endDatetime) continue;

		const dateStart = new Date(startDatetime.match(/^\d{10,}$/)
			? parseInt(startDatetime) * 1000 : startDatetime).toISOString();
		const dateEnd = new Date(endDatetime.match(/^\d{10,}$/)
			? parseInt(endDatetime) * 1000 : endDatetime).toISOString();

		// Skip past exhibitions
		if (new Date(dateEnd) < new Date()) continue;

		// Location from text after the time elements
		const infoText = link.find('div.khb-card-text > div').text().trim();
		const locationMatch = infoText.match(/,\s*([^,]+)$/);
		const gallery = locationMatch ? locationMatch[1].trim() : '';
		const venueName = gallery ? `${VENUE} – ${gallery}` : VENUE;

		const datePart = dateStart.slice(0, 10);
		const imageUrl = img ? `${BASE_URL}${img}` : undefined;

		const success = await insertEvent({
			slug: makeSlug(title, datePart),
			title_no: title,
			description_no: `Utstilling: ${title}`,
			category: 'culture',
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venueName,
			address: ADDRESS,
			bydel: mapBydel(VENUE),
			price: '',
			ticket_url: fullUrl,
			source: SOURCE,
			source_url: fullUrl,
			image_url: imageUrl,
			age_group: 'all',
			language: 'both',
			status: 'approved',
		});

		if (success) {
			console.log(`  + [Exhibition] ${title}`);
			inserted++;
		}
	}

	return { found, inserted };
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Kunsthall events and exhibitions...`);

	const events = await scrapeEvents();
	await delay(1000);
	const exhibitions = await scrapeExhibitions();

	return {
		found: events.found + exhibitions.found,
		inserted: events.inserted + exhibitions.inserted,
	};
}
