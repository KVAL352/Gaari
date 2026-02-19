import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';

const SOURCE = 'barnasnorge';
const BASE_URL = 'https://www.barnasnorge.no';
// Webflow CMS pagination uses collection ID prefix
const LIST_URL = `${BASE_URL}/arrangementer-for-barn/bergen`;
const PAGE_PARAM = '8e773ef3_page';
const MAX_PAGES = 10;
const DELAY_MS = 1500;

// Keywords indicating kindergarten-only events (not public)
const KINDERGARTEN_KEYWORDS = [
	'barnehage', 'barnehagebarn', 'barnehagens ansatte',
	'inviterer barnehager', 'kun ment for', 'eldste i barnehagen', 'barnehagene',
];

interface BarnEvent {
	title: string;
	detailUrl: string;
	dateTime: string; // "2026-02-19 10:00"
	address: string;
	category: string;
	isFree: boolean;
	imageUrl?: string;
}

interface VenueInfo {
	imageUrl: string | null;
	venueUrl: string | null;
	isKindergarten: boolean;
}

function parseListPage(html: string): BarnEvent[] {
	const $ = cheerio.load(html);
	const events: BarnEvent[] = [];

	$('a.event-item-component').each((_, el) => {
		const $card = $(el);

		const href = $card.attr('href');
		if (!href) return;
		const detailUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

		const title = $card.find('h2.event-item_title, h3.event-item_title').text().trim();
		if (!title || title.length < 3) return;

		const dateTime = $card.find('.event-item_date-time').attr('data-date') || '';
		if (!dateTime) return;

		const address = $card.find('.event-item_address-wrapper p').text().trim();

		// Take first category element only (second has class "hide")
		const category = $card.find('.filer-kategori').first().text().trim();

		const isFree = $card.find('.filter-gratis').text().trim().toLowerCase() === 'gratis';

		const imgSrc = $card.find('img.event-item_image').attr('src') || '';
		const imageUrl = imgSrc && !imgSrc.includes('placeholder') ? imgSrc : undefined;

		events.push({
			title: title.slice(0, 200),
			detailUrl,
			dateTime,
			address,
			category,
			isFree,
			imageUrl,
		});
	});

	return events;
}

// Check if event is for kindergartens only (not accessible to general public)
function isKindergartenEvent(event: BarnEvent): boolean {
	const text = `${event.title} ${event.category}`.toLowerCase();
	return KINDERGARTEN_KEYWORDS.some(kw => text.includes(kw));
}

// Map BarnasNorge categories to Gåri categories
function mapBarnCategory(category: string): string {
	const lower = category.toLowerCase();
	if (lower.includes('teater') || lower.includes('forestilling')) return 'theatre';
	if (lower.includes('dyr') || lower.includes('natur')) return 'tours';
	if (lower.includes('sport')) return 'sports';
	if (lower.includes('verksted') || lower.includes('kurs')) return 'workshop';
	if (lower.includes('lese') || lower.includes('forteller')) return 'culture';
	if (lower.includes('kultur')) return 'culture';
	if (lower.includes('ferie') || lower.includes('familie')) return 'family';
	if (lower.includes('musikk') || lower.includes('konsert')) return 'music';
	return 'family'; // Default — this is a children's event source
}

// Cache: detailUrl → venue info (image + URL)
const venueCache = new Map<string, VenueInfo>();

// Fetch real image + venue URL from the actual venue page via BarnasNorge JSON-LD
async function fetchVenueInfo(detailUrl: string): Promise<VenueInfo> {
	if (venueCache.has(detailUrl)) {
		return venueCache.get(detailUrl)!;
	}

	const empty: VenueInfo = { imageUrl: null, venueUrl: null, isKindergarten: false };

	try {
		const html = await fetchHTML(detailUrl);
		if (!html) { venueCache.set(detailUrl, empty); return empty; }

		const $ = cheerio.load(html);

		// Check full page text for kindergarten keywords
		const pageText = $('body').text().toLowerCase();
		const isKindergarten = KINDERGARTEN_KEYWORDS.some(kw => pageText.includes(kw));

		const ldScript = $('script[type="application/ld+json"]').first().html();
		if (!ldScript) {
			const result: VenueInfo = { imageUrl: null, venueUrl: null, isKindergarten };
			venueCache.set(detailUrl, result);
			return result;
		}

		const ld = JSON.parse(ldScript.replace(/[\x00-\x1F\x7F]/g, ' '));
		const venueUrl = ld.offers?.url;
		if (!venueUrl || !venueUrl.startsWith('http')) {
			const result: VenueInfo = { imageUrl: null, venueUrl: null, isKindergarten };
			venueCache.set(detailUrl, result);
			return result;
		}

		// Fetch the actual venue/event page for og:image
		await delay(500);
		const venueHtml = await fetchHTML(venueUrl);
		if (!venueHtml) {
			const result: VenueInfo = { imageUrl: null, venueUrl, isKindergarten };
			venueCache.set(detailUrl, result);
			return result;
		}

		const $venue = cheerio.load(venueHtml);
		const ogImage = $venue('meta[property="og:image"]').attr('content');
		const imageUrl = ogImage?.startsWith('http') ? ogImage : null;

		if (imageUrl) {
			console.log(`    [venue] ${detailUrl.split('/').pop()} → ${venueUrl.slice(0, 60)}`);
		}

		const result: VenueInfo = { imageUrl, venueUrl, isKindergarten };
		venueCache.set(detailUrl, result);
		return result;
	} catch (e: any) {
		console.log(`    [venue] Failed for ${detailUrl.split('/').pop()}: ${e.message}`);
		venueCache.set(detailUrl, empty);
		return empty;
	}
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Starting scrape of BarnasNorge (Bergen)...`);

	let found = 0;
	let inserted = 0;
	let skippedKindergarten = 0;
	const allEvents: BarnEvent[] = [];
	const seenKeys = new Set<string>(); // Deduplicate within scrape

	for (let page = 1; page <= MAX_PAGES; page++) {
		const url = page === 1 ? LIST_URL : `${LIST_URL}?${PAGE_PARAM}=${page}`;
		const html = await fetchHTML(url);
		if (!html) break;

		const events = parseListPage(html);
		if (events.length === 0) {
			console.log(`[${SOURCE}] Page ${page}: 0 events — done.`);
			break;
		}

		// Deduplicate same-URL + same-date entries within this scrape
		for (const event of events) {
			const key = `${event.detailUrl}|${event.dateTime}`;
			if (!seenKeys.has(key)) {
				seenKeys.add(key);

				// Filter out kindergarten events (not accessible to general public)
				if (isKindergartenEvent(event)) {
					skippedKindergarten++;
					continue;
				}

				allEvents.push(event);
			}
		}

		console.log(`[${SOURCE}] Page ${page}: ${events.length} events (${allEvents.length} unique public total)`);

		if (page < MAX_PAGES) await delay(DELAY_MS);
	}

	found = allEvents.length;
	if (skippedKindergarten > 0) {
		console.log(`[${SOURCE}] Skipped ${skippedKindergarten} kindergarten-only events`);
	}
	console.log(`[${SOURCE}] Total unique public events found: ${found}`);
	console.log(`[${SOURCE}] Fetching real images + venue URLs...`);

	for (const event of allEvents) {
		// Use detail URL + date as unique source_url (same event can have multiple dates)
		const sourceUrl = `${event.detailUrl}#${event.dateTime.replace(' ', 'T')}`;
		if (await eventExists(sourceUrl)) continue;

		const category = mapBarnCategory(event.category);

		// Parse date+time: "2026-02-19 10:00"
		const [datePart, timePart] = event.dateTime.split(' ');
		const dateStart = timePart
			? `${datePart}T${timePart}:00`
			: `${datePart}T12:00:00`;

		// Extract venue from address (first part before comma)
		const venueParts = event.address.split(',');
		const venue = venueParts[0]?.trim() || 'Bergen';

		const bydel = mapBydel(event.title.includes('Fana') ? 'Fana kulturhus' :
			event.title.includes('Åsane') ? 'Åsane kulturhus' :
			event.title.includes('Fyllingsdalen') ? 'Fyllingsdalen' :
			venue);

		// Get real image + venue URL from the actual event page
		await delay(DELAY_MS);
		const venueInfo = await fetchVenueInfo(event.detailUrl);

		// Skip if detail page reveals kindergarten-only content
		if (venueInfo.isKindergarten) {
			console.log(`  [skip] ${event.title} (kindergarten content on detail page)`);
			skippedKindergarten++;
			continue;
		}

		// Use real image if available, otherwise fall back to BarnasNorge
		const imageUrl = venueInfo.imageUrl || event.imageUrl;
		// Link directly to venue page, not BarnasNorge
		const ticketUrl = venueInfo.venueUrl || event.detailUrl;

		const success = await insertEvent({
			slug: makeSlug(event.title, datePart),
			title_no: event.title,
			description_no: event.title,
			category,
			date_start: new Date(dateStart).toISOString(),
			venue_name: venue,
			address: event.address || venue,
			bydel,
			price: event.isFree ? '0' : '',
			ticket_url: ticketUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: 'family',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			const flags = [
				venueInfo.imageUrl ? 'real img' : '',
				venueInfo.venueUrl ? 'venue link' : '',
			].filter(Boolean).join(', ');
			console.log(`  + ${event.title} (${venue})${flags ? ` [${flags}]` : ''}`);
			inserted++;
		}
	}

	return { found, inserted };
}
