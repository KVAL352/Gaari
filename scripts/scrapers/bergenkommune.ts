import * as cheerio from 'cheerio';
import { mapCategory, mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';

const SOURCE = 'bergenkommune';
const BASE_URL = 'https://billett.bergen.kommune.no';
const LIST_URL = `${BASE_URL}/DNComponent/GetFilteredEventList`;
const MAX_PAGES = 30;
const DELAY_MS = 1000;

// Skip events targeted at kindergartens (not accessible to general public)
const KINDERGARTEN_KEYWORDS = ['barnehage', 'barnehager', 'barnehagebarn'];

interface ListEvent {
	eventId: string;
	title: string;
	detailUrl: string;
	dateStart: string;
	dateEnd: string;
	venue: string;
	subtitle: string;
	imageUrl?: string;
	tags: string;
}

interface DetailData {
	price: string;
	description: string;
	time: string;
	address: string;
	organizer: string;
	isKindergarten: boolean;
}

function parseListPage(html: string): ListEvent[] {
	const $ = cheerio.load(html);
	const events: ListEvent[] = [];

	$('.event-block[data-dn-eid]').each((_, el) => {
		const $block = $(el);
		const eventId = $block.attr('data-dn-eid') || '';
		if (!eventId) return;

		const title = $block.find('h2.event-title').text().trim();
		if (!title || title.length < 3) return;

		const dateStart = $block.find('input.event-start-date').val() as string || '';
		const dateEnd = $block.find('input.event-end-date').val() as string || '';
		if (!dateStart) return;

		// Skip events that have already ended
		const endDate = dateEnd || dateStart;
		if (new Date(endDate) < new Date(new Date().toISOString().slice(0, 10))) return;

		const href = $block.find('a[href*="/Detaljer/EVENT/"]').attr('href') || '';
		const detailUrl = href ? `${BASE_URL}${href}` : `${BASE_URL}/Detaljer/EVENT/${eventId}`;

		// Venue from address span
		const addressEl = $block.find('.event-meta address');
		const venue = addressEl.text().replace('Sted:', '').replace(/\s+/g, ' ').trim();

		const subtitle = $block.find('.event-subtitle-display').text().trim();

		// Image
		const imgSrc = $block.find('img.event-thum-img').attr('src') || '';
		const imageUrl = imgSrc && !imgSrc.includes('icon_no-image') ? imgSrc : undefined;

		const tags = ($block.find('input.tags').val() as string) || '';

		events.push({
			eventId,
			title: title.slice(0, 200),
			detailUrl,
			dateStart,
			dateEnd,
			venue: venue || 'Bergen',
			subtitle,
			imageUrl,
			tags,
		});
	});

	return events;
}

async function fetchDetail(url: string): Promise<DetailData | null> {
	const html = await fetchHTML(url);
	if (!html) return null;

	const $ = cheerio.load(html);

	// Price from hidden input
	const priceVal = ($('.detail-event-price').val() as string) || '';
	const price = priceVal === '0' ? '' : priceVal;

	// Description from .event-description
	const descHtml = $('.event-description .event-info').first();
	const description = descHtml.text().replace(/\s+/g, ' ').trim().slice(0, 500);

	// Time from next-evnt-time span
	const timeText = $('.next-evnt-time').first().text().replace('Tid:', '').replace('Tid', '').trim();

	// Address from Google Maps link
	let address = '';
	const mapsLink = $('a[href*="maps.google"]').first().attr('href') || '';
	if (mapsLink) {
		const qMatch = mapsLink.match(/[?&]q=([^&]+)/);
		if (qMatch) address = decodeURIComponent(qMatch[1]).replace(/\+/g, ' ');
	}

	// Organizer from Arrangør link
	const organizer = $('b:contains("Arrangør")').parent().text().replace('Arrangør:', '').trim()
		|| $('.detail-event-shop-name').val() as string || '';

	// Check full page text for kindergarten-only indicators
	const pageText = $('body').text().toLowerCase();
	const isKindergarten = KINDERGARTEN_KEYWORDS.some(kw => pageText.includes(kw));

	return { price, description, time: timeText, address, organizer, isKindergarten };
}

// Map Bergen Kommune tag IDs to categories (based on filter analysis)
function guessCategory(title: string, subtitle: string, tags: string): string {
	const text = `${title} ${subtitle}`.toLowerCase();

	if (text.includes('konsert') || text.includes('musikk') || text.includes('jazz') || text.includes('kor')) return 'music';
	if (text.includes('teater') || text.includes('revy') || text.includes('forestilling') || text.includes('opera')) return 'theatre';
	if (text.includes('dans')) return 'theatre';
	if (text.includes('kurs') || text.includes('verksted') || text.includes('workshop')) return 'workshop';
	if (text.includes('barn') || text.includes('familie') || text.includes('ung')) return 'family';
	if (text.includes('utstilling') || text.includes('galleri') || text.includes('kunst')) return 'culture';
	if (text.includes('film') || text.includes('kino')) return 'culture';
	if (text.includes('mat') || text.includes('smak')) return 'food';
	if (text.includes('sport') || text.includes('idrett') || text.includes('trening') || text.includes('friluft')) return 'sports';
	if (text.includes('tur') || text.includes('vandring') || text.includes('omvisning')) return 'tours';
	if (text.includes('festival') || text.includes('marked')) return 'festival';
	if (text.includes('foredrag') || text.includes('debatt') || text.includes('bibliotek')) return 'culture';

	return 'culture'; // Most kommune events are cultural
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Starting scrape of Bergen Kommune...`);

	let found = 0;
	let inserted = 0;
	const allEvents: ListEvent[] = [];

	for (let pageNo = 0; pageNo < MAX_PAGES; pageNo++) {
		const url = `${LIST_URL}?pageNo=${pageNo}&pageSize=50&loadEvenTtype=0&showPinned=false&loadEventLocation=0&searchedValue=&searchedDate=&geographicals=&activeWhatTags=&activeWhoTags=&activeWhereTags=&dateFromVal=&dateToVal=&isEventChecked=&isLeisureChecked=&enableActiveTimeSlotBasedTagFiltering=false`;

		const html = await fetchHTML(url);
		if (!html || html.trim() === '' || html.includes('No events found')) {
			console.log(`[${SOURCE}] Page ${pageNo}: empty — done.`);
			break;
		}

		const events = parseListPage(html);
		if (events.length === 0) {
			console.log(`[${SOURCE}] Page ${pageNo}: 0 events — done.`);
			break;
		}

		console.log(`[${SOURCE}] Page ${pageNo}: ${events.length} events`);
		allEvents.push(...events);

		await delay(DELAY_MS);
	}

	found = allEvents.length;
	console.log(`[${SOURCE}] Total events found: ${found}`);

	for (const event of allEvents) {
		// Skip kindergarten-only events
		const titleLower = event.title.toLowerCase();
		if (KINDERGARTEN_KEYWORDS.some(kw => titleLower.includes(kw))) {
			console.log(`  [skip] ${event.title} (kindergarten)`);
			continue;
		}

		if (await eventExists(event.detailUrl)) continue;

		// Fetch detail page for richer data
		await delay(500);
		const detail = await fetchDetail(event.detailUrl);

		// Skip if detail page reveals kindergarten-only content
		if (detail?.isKindergarten) {
			console.log(`  [skip] ${event.title} (kindergarten on detail page)`);
			continue;
		}

		const category = guessCategory(event.title, event.subtitle, event.tags);
		const bydel = mapBydel(event.venue);

		// Build time-aware date_start
		let dateStart = `${event.dateStart}T12:00:00`;
		if (detail?.time) {
			const timeMatch = detail.time.match(/(\d{1,2}[:.]\d{2})/);
			if (timeMatch) {
				dateStart = `${event.dateStart}T${timeMatch[1].replace('.', ':')}:00`;
			}
		}

		const dateEnd = event.dateEnd && event.dateEnd !== event.dateStart
			? `${event.dateEnd}T23:59:00`
			: undefined;

		const description = detail?.description || event.subtitle || event.title;
		const address = detail?.address || event.venue;

		const success = await insertEvent({
			slug: makeSlug(event.title, event.dateStart),
			title_no: event.title,
			description_no: description,
			category,
			date_start: new Date(dateStart).toISOString(),
			date_end: dateEnd ? new Date(dateEnd).toISOString() : undefined,
			venue_name: event.venue,
			address,
			bydel,
			price: detail?.price || '',
			ticket_url: event.detailUrl,
			source: SOURCE,
			source_url: event.detailUrl,
			image_url: event.imageUrl,
			age_group: category === 'family' ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.title} (${event.venue}, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
