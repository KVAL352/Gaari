import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, deleteEventByUrl } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'dvrtvest';
const BASE_URL = 'https://www.detvestnorsketeateret.no';
const CALENDAR_URL = `${BASE_URL}/kalender`;
const VENUE = 'Det Vestnorske Teateret';
const ADDRESS = 'Engen 1, Bergen';

interface ListingEvent {
	title: string;
	datetime: string; // YYYY-MM-DD HH:MM:SS
	detailPath: string;
	ticketUrl?: string;
	soldOut: boolean;
}

interface ShowDetail {
	image?: string;
	description?: string;
	scene?: string;
}

function guessCategory(title: string): string {
	const t = title.toLowerCase();
	if (t.includes('konsert') || t.includes('quintet') || t.includes('quartet') || t.includes('trio') || t.includes('jazz') || t.includes('band')) return 'music';
	if (t.includes('barn') || t.includes('kids') || t.includes('famili')) return 'family';
	if (t.includes('standup') || t.includes('stand-up') || t.includes('quiz')) return 'nightlife';
	if (t.includes('festival') || t.includes('jubileum')) return 'festival';
	if (t.includes('workshop') || t.includes('kurs')) return 'workshop';
	if (t.includes('omvisning') || t.includes('vandring')) return 'tours';
	// DVT is primarily a theater
	return 'theatre';
}

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchListingPage(url: string): Promise<ListingEvent[]> {
	const html = await fetchHTML(url);
	if (!html) return [];

	const $ = cheerio.load(html);
	const events: ListingEvent[] = [];

	$('li.PerformanceUpcoming__dateListItem').each((_, el) => {
		const title = $(el).find('p.PerformanceUpcoming__performanceName').text().trim();
		if (!title) return;

		const timeEl = $(el).find('time.PerformanceUpcoming__performanceDatetime');
		const datetime = timeEl.attr('datetime') || '';
		if (!datetime) return;

		const detailLink = $(el).find('a.PerformanceUpcoming__performanceInfo').attr('href') || '';
		const ticketBtn = $(el).find('vt-button').attr('href') || '';
		const itemText = $(el).text().toLowerCase();

		events.push({
			title,
			datetime,
			detailPath: detailLink,
			ticketUrl: ticketBtn || undefined,
			soldOut: itemText.includes('utseld') || itemText.includes('utsolgt'),
		});
	});

	return events;
}

async function fetchShowDetail(path: string): Promise<ShowDetail> {
	const url = `${BASE_URL}${path}`;
	const html = await fetchHTML(url);
	if (!html) return {};

	const $ = cheerio.load(html);
	const result: ShowDetail = {};

	// Image from og:image meta tag
	const ogImage = $('meta[property="og:image"]').attr('content');
	if (ogImage) result.image = ogImage;

	// Description from og:description or lead section
	const ogDesc = $('meta[property="og:description"]').attr('content');
	if (ogDesc && ogDesc.length > 20) {
		result.description = ogDesc.slice(0, 500);
	} else {
		const lead = $('section.PerformanceEntry__lead').text().trim();
		if (lead.length > 20) result.description = lead.slice(0, 500);
	}

	// Scene/venue from meta items
	$('ol.PerformanceEntry__metaItems li.PerformanceEntry__metaItem').each((_, el) => {
		const name = $(el).find('span.PerformanceEntry__metaName').text().trim().toLowerCase();
		const value = $(el).find('span.PerformanceEntry__metaValue').text().trim();
		if (name === 'scene' && value) result.scene = value;
	});

	return result;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Det Vestnorske Teateret events...`);

	// Step 1: Fetch all listing pages
	const allEvents: ListingEvent[] = [];
	let page = 1;

	while (true) {
		const url = page === 1 ? CALENDAR_URL : `${CALENDAR_URL}?page=${page}`;
		console.log(`[${SOURCE}]   Page ${page}...`);

		const events = await fetchListingPage(url);
		if (events.length === 0) break;

		allEvents.push(...events);
		page++;
		await delay(3000);
	}

	console.log(`[${SOURCE}] Found ${allEvents.length} performance dates across ${page - 1} pages`);

	// Step 2: Group by detail path to fetch show details efficiently
	const showPaths = [...new Set(allEvents.map(e => e.detailPath).filter(Boolean))];
	const showDetails = new Map<string, ShowDetail>();

	console.log(`[${SOURCE}] Fetching details for ${showPaths.length} unique shows...`);
	for (const path of showPaths) {
		await delay(3000);
		showDetails.set(path, await fetchShowDetail(path));
	}

	// Step 3: Insert events
	let found = allEvents.length;
	let inserted = 0;

	for (const event of allEvents) {
		const sourceUrl = event.ticketUrl || `${BASE_URL}${event.detailPath}`;

		// Delete sold-out events from DB
		if (event.soldOut) {
			if (await deleteEventByUrl(sourceUrl)) console.log(`  - Removed sold-out: ${event.title}`);
			continue;
		}

		if (await eventExists(sourceUrl)) continue;

		const detail = showDetails.get(event.detailPath) || {};
		const category = guessCategory(event.title);

		// Parse datetime "2026-02-20 20:00:00"
		const dtParts = event.datetime.split(' ');
		const datePart = dtParts[0]; // YYYY-MM-DD
		const timePart = dtParts[1]?.replace(/\./g, ':'); // HH:MM:SS
		const dateStart = new Date(`${datePart}T${timePart || '19:00:00'}${bergenOffset(datePart)}`).toISOString();

		// Venue: use scene from detail if available
		const scene = detail.scene;
		const venueName = scene ? `${VENUE} – ${scene}` : VENUE;
		const bydel = mapBydel(VENUE);

		const aiDesc = await generateDescription({ title: event.title, venue: VENUE, category, date: dateStart, price: '' });
		const success = await insertEvent({
			slug: makeSlug(event.title, datePart),
			title_no: event.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			venue_name: venueName,
			address: ADDRESS,
			bydel,
			price: '',
			ticket_url: event.ticketUrl || `${BASE_URL}${event.detailPath}`,
			source: SOURCE,
			source_url: `${BASE_URL}${event.detailPath}`,
			image_url: detail.image,
			age_group: category === 'family' ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.title} (${datePart}, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
