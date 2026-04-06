import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'kulturhusetibergen';
const BASE_URL = 'https://www.kulturhusetibergen.no';
const PROGRAM_URL = `${BASE_URL}/program`;
const VENUE = 'Kulturhuset i Bergen';
const ADDRESS = 'Vaskerelven 8, Bergen';

// Known rooms/halls at Kulturhuset i Bergen
const ROOMS = ['Hovedsalen', 'Lillesalen', 'Restauranten', 'Galleriet', 'Mesaninen', 'Amfi'];

function extractRoom(text: string): string | null {
	for (const room of ROOMS) {
		if (text.includes(room)) return room;
	}
	return null;
}

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

/** Word-boundary check — avoids false positives like "format" matching "mat" */
function hasWord(text: string, word: string): boolean {
	return new RegExp(`\\b${word}\\b`).test(text);
}
/** Check for Norwegian compound words ending with the keyword */
function hasCompound(text: string, suffix: string): boolean {
	return new RegExp(`\\w${suffix}\\b`).test(text);
}

function guessCategory(title: string, excerpt: string): string {
	const text = `${title} ${excerpt}`.toLowerCase();
	if (text.includes('#konsert') || hasWord(text, 'konsert') || hasWord(text, 'dj') || hasWord(text, 'band') || hasCompound(text, 'konsert')) return 'music';
	if (text.includes('#dans') || hasWord(text, 'dans')) return 'culture';
	if (text.includes('#teater') || hasWord(text, 'teater') || hasCompound(text, 'standup') || hasWord(text, 'stand-up') || hasWord(text, 'revy')) return 'theatre';
	if (text.includes('#quiz') || hasWord(text, 'quiz') || hasCompound(text, 'quiz') || hasCompound(text, 'kviss') || hasWord(text, 'bingo') || hasCompound(text, 'bingo')) return 'nightlife';
	if (text.includes('#workshop') || hasWord(text, 'kurs') || hasWord(text, 'workshop')) return 'workshop';
	if (text.includes('#festival') || hasWord(text, 'festival')) return 'festival';
	if (text.includes('#barn') || hasWord(text, 'barn') || hasWord(text, 'familie')) return 'family';
	if (text.includes('#mat') || text.includes('mat og drikke') || hasCompound(text, 'matkurs') || hasCompound(text, 'smaking') || hasWord(text, 'food')) return 'food';
	if (hasWord(text, 'yoga') || hasWord(text, 'trommesirkel')) return 'workshop';
	if (hasWord(text, 'foredrag') || hasWord(text, 'debatt') || hasWord(text, 'utstilling')) return 'culture';
	return 'culture';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Kulturhuset i Bergen events...`);

	const html = await fetchHTML(PROGRAM_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch program page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Get upcoming event articles
	const events = $('article.eventlist-event--upcoming').toArray();
	console.log(`[${SOURCE}] ${events.length} upcoming events`);

	for (const el of events) {
		// Title and link
		const titleLink = $(el).find('.eventlist-title-link');
		const title = titleLink.text().trim();
		const path = titleLink.attr('href');
		if (!title || !path) continue;

		// Date from datetime attribute
		const dateEl = $(el).find('time.event-date');
		const dateStr = dateEl.attr('datetime'); // "2026-02-21"
		if (!dateStr) continue;

		// Time
		const startTimeEl = $(el).find('time.event-time-localized-start');
		const endTimeEl = $(el).find('time.event-time-localized-end');
		const startTime = startTimeEl.text().trim() || '19:00';
		const endTime = endTimeEl.text().trim();

		const offset = bergenOffset(dateStr);
		const dateStart = new Date(`${dateStr}T${startTime}:00${offset}`).toISOString();
		const dateEnd = endTime ? new Date(`${dateStr}T${endTime}:00${offset}`).toISOString() : undefined;

		// Skip past events
		if (new Date(dateStart) < new Date()) continue;

		found++;

		// Source URL
		const sourceUrl = `${BASE_URL}${path}`;
		if (await eventExists(sourceUrl)) continue;

		// Image
		const img = $(el).find('.eventlist-column-thumbnail img');
		const imageUrl = img.attr('data-src') || img.attr('src') || undefined;
		// Use smaller format for storage
		const optimizedImage = imageUrl?.includes('squarespace-cdn.com')
			? `${imageUrl.split('?')[0]}?format=750w`
			: imageUrl;

		// Category from excerpt tags
		const excerpt = $(el).find('.eventlist-excerpt').text().trim();
		const category = guessCategory(title, excerpt);
		const bydel = mapBydel(VENUE);

		// Extract room name from event content (e.g., "Hovedsalen", "Restauranten")
		const fullText = $(el).text();
		const room = extractRoom(fullText);
		const venueName = room ? `${VENUE} ${room}` : VENUE;

		const aiDesc = await generateDescription({ title, venue: venueName, category, date: dateStart, price: '' });

		const success = await insertEvent({
			slug: makeSlug(title, dateStr),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venueName,
			address: ADDRESS,
			bydel,
			price: '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: optimizedImage,
			age_group: 'all',
			language: title.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${category}, ${dateStr})`);
			inserted++;
		}
	}

	return { found, inserted };
}
