import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, parseNorwegianDate } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bymuseet';
const BASE_URL = 'https://bymuseet.no';
const EVENT_URL = `${BASE_URL}/event/`;

// Map Bymuseet locations to cleaner venue names
const LOCATION_MAP: Record<string, string> = {
	'bergen sentrum': 'Bryggen',
	'bryggens museum': 'Bryggens Museum',
	'håkonshallen': 'Håkonshallen',
	'hakonshallen': 'Håkonshallen',
	'rosenkrantztårnet': 'Rosenkrantztårnet',
	'rosenkrantztarnet': 'Rosenkrantztårnet',
	'gamle bergen museum': 'Gamle Bergen Museum',
	'hordamuseet': 'Hordamuseet',
	'lepramuseet': 'Lepramuseet',
	'schøtstuene': 'Schøtstuene',
	'skolemuseet': 'Skolemuseet',
	'damsgård': 'Damsgård Hovedgård',
	'bergenhus': 'Bergenhus Festning',
};

function guessCategory(title: string, location: string): string {
	const text = `${title} ${location}`.toLowerCase();
	if (text.includes('omvisning') || text.includes('guiding') || text.includes('vandring') || text.includes('tur')) return 'tours';
	if (text.includes('foredrag') || text.includes('seminar') || text.includes('samtale')) return 'culture';
	if (text.includes('kurs') || text.includes('verksted') || text.includes('workshop')) return 'workshop';
	if (text.includes('konsert') || text.includes('musikk')) return 'music';
	if (text.includes('festival') || text.includes('marked')) return 'festival';
	if (text.includes('barn') || text.includes('familie') || text.includes('junior') || text.includes('eventyr')) return 'family';
	if (text.includes('teater') || text.includes('forestilling')) return 'theatre';
	if (text.includes('strikk') || text.includes('spinn') || text.includes('tegne') || text.includes('ull')) return 'workshop';
	return 'culture';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bymuseet i Bergen events...`);

	const html = await fetchHTML(EVENT_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch event page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Each event card: div.event > a.event-cover
	const cards = $('div.event a.event-cover').toArray();
	console.log(`[${SOURCE}] ${cards.length} event cards`);

	// For recurring events (daily tours), only keep the next upcoming occurrence
	const seen = new Set<string>();

	for (const el of cards) {
		const href = $(el).attr('href');
		if (!href) continue;

		const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

		// Skip if we already have the next occurrence of this event
		if (seen.has(fullUrl)) continue;

		// Date
		const dateText = $(el).find('.event-date').text().trim();
		if (!dateText) continue;

		const dateStart = parseNorwegianDate(dateText);
		if (!dateStart) continue;

		// Skip past events
		if (new Date(dateStart) < new Date()) continue;

		// Mark this URL as seen — only first (nearest) future date gets inserted
		seen.add(fullUrl);

		// Title
		const title = $(el).find('.title').text().trim();
		if (!title) continue;

		found++;

		if (await eventExists(fullUrl)) continue;

		// Location
		const locationText = $(el).find('.location span').text().trim().toLowerCase();
		const venueName = LOCATION_MAP[locationText] || locationText || 'Bymuseet i Bergen';
		const bydel = mapBydel(venueName);

		// Image from background-image style
		const imageStyle = $(el).find('.image-holder').attr('style') || '';
		const imageMatch = imageStyle.match(/url\(['"]?(.*?)['"]?\)/);
		const imageUrl = imageMatch ? imageMatch[1] : undefined;

		const category = guessCategory(title, locationText);

		const aiDesc = await generateDescription({ title, venue: venueName, category, date: dateStart, price: '' });

		const success = await insertEvent({
			slug: makeSlug(title, dateStart),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			venue_name: venueName,
			address: venueName + ', Bergen',
			bydel,
			price: '',
			ticket_url: fullUrl,
			source: SOURCE,
			source_url: fullUrl,
			image_url: imageUrl,
			age_group: category === 'family' ? 'family' : 'all',
			language: title.match(/\(kun engelsk\)/) ? 'en' : title.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} @ ${venueName} (${dateText})`);
			inserted++;
		}
	}

	return { found, inserted };
}
