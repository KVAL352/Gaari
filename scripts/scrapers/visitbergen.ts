import * as cheerio from 'cheerio';
import { mapCategory, mapBydel } from '../lib/categories.js';
import { resolveTicketUrl } from '../lib/venues.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, parseNorwegianDate, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';
import { validateTicketUrl } from '../lib/ticket-validation.js';

const SOURCE = 'visitbergen';
const BASE_URL = 'https://www.visitbergen.com';
const SEARCH_URL = `${BASE_URL}/hva-skjer/searchresults`;
const MAX_PAGES = 10; // ~200 events — most venues have dedicated scrapers now
const DELAY_MS = 1500; // Polite rate limiting

// Venues with dedicated scrapers — skip these from Visit Bergen to avoid duplicate work.
// Patterns are lowercase and matched against event.venue.toLowerCase().
const DEDICATED_VENUE_PATTERNS = [
	'grieghallen', 'den nationale scene', 'ole bull', 'usf verftet', 'usf',
	'forum scene', 'cornerteateret', 'det vestnorske teater', 'bit teatergarasjen',
	'carte blanche', 'bergen filharmoni', 'harmonien', 'fyllingsdalen teater',
	'østre', 'ekko', 'bergen kunsthall', 'kode ', 'kode,', 'litteraturhuset',
	'media city', 'bek', 'bergen filmklubb', 'akvariet', 'bergen bibliotek',
	'bymuseet', 'museum vest', 'fiskerimuseum', 'sjøfartsmuseum', 'hanseatiske',
	'fløyen', 'bergen kjøtt', 'colonialen', 'råbrent', 'paint\'n sip',
	'brettspill', 'bjørgvin blues', 'nordnes sjøbad', 'o\'connor', 'gg bergen',
	'stene matglede', 'brann stadion', 'dnt', 'borealis', 'festspillene',
	'bergenfest', 'beyond the gates', 'bergen pride', 'biff',
	'kvarteret', 'det akademiske kvarter', 'kulturhuset i bergen', 'oseana',
	'bergen chamber', 'hulen', 'madam felle', 'landmark', 'statsraad lehmkuhl',
	'mandelhuset', 'hoopla', 'vvv',
];

// Check if a date_start has the noon default (= no real time was parsed)
function isNoonDefault(dateStr: string): boolean {
	return dateStr.includes('T12:00:00') || dateStr.includes('T11:00:00');
}

// Fetch the detail page and extract the actual event time for a specific date
async function fetchTimeFromDetail(detailUrl: string, dateStart: string): Promise<string | null> {
	const html = await fetchHTML(detailUrl);
	if (!html) return null;

	const $ = cheerio.load(html);
	const dateDay = dateStart.slice(0, 10); // YYYY-MM-DD
	const eventDate = new Date(dateDay);
	const day = eventDate.getUTCDate();
	const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
	const month = monthNames[eventDate.getUTCMonth()];
	const year = eventDate.getUTCFullYear();

	// Visit Bergen detail pages have opening hours like: "Venue (20 Feb 2026)\n21:00"
	// Look for the date pattern and grab the time after it
	const bodyText = $('body').text();
	const datePatterns = [
		`${day} ${month}  ${year}`,          // "20 Feb  2026" (double space on VB)
		`${day} ${month} ${year}`,           // "20 Feb 2026"
		`${day}. ${month.toLowerCase()}`,    // "20. feb"
	];

	for (const pattern of datePatterns) {
		const idx = bodyText.indexOf(pattern);
		if (idx < 0) continue;

		// Look for HH:MM in the next 100 chars after the date
		const after = bodyText.slice(idx, idx + 100);
		const timeMatch = after.match(/(\d{1,2}):(\d{2})/);
		if (timeMatch) {
			const hour = parseInt(timeMatch[1]);
			const min = parseInt(timeMatch[2]);
			if (hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
				// Build a proper ISO date with the real time (UTC)
				return `${dateDay}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
			}
		}
	}

	return null;
}

interface ListEvent {
	title: string;
	detailUrl: string;
	dateStart: string | null;
	dateEnd: string | null;
	venue: string;
	category: string;
	imageUrl?: string;
	ticketUrl?: string;
	description: string;
}

function parseListPage(html: string): { events: ListEvent[]; totalPages: number } {
	const $ = cheerio.load(html);
	const events: ListEvent[] = [];

	$('.prodListItemWrapper').each((_, el) => {
		const $w = $(el);

		// Title: second <a> with /hva-skjer/ in href (first is the image link)
		const titleLink = $w.find('a[href*="/hva-skjer/"]').eq(1);
		const title = titleLink.text().trim();
		if (!title || title.length < 3 || title === 'Les mer') return;

		// Detail URL
		const href = $w.find('a[href*="/hva-skjer/"]').first().attr('href');
		if (!href) return;
		const detailUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

		// Category from .type div
		const category = $w.find('.type').find('p').text().trim()
			|| $w.find('.type').text().replace('Type:', '').trim();

		// Dates from span.datefrom and span.dateto
		const dateFromText = $w.find('span.datefrom').first().text().trim();
		const dateToText = $w.find('span.dateto').first().text().trim();
		const dateStart = parseNorwegianDate(dateFromText);
		const dateEnd = dateToText ? parseNorwegianDate(dateToText) : null;

		if (!dateStart) return;

		// Venue from span.openingname
		const venue = $w.find('span.openingname').first().text().trim() || 'Bergen';

		// Image from data-lazy-src attribute
		const imgSrc = $w.find('.leftBlock img[data-lazy-src]').first().attr('data-lazy-src');
		let imageUrl: string | undefined;
		if (imgSrc && !imgSrc.includes('lazyloadplaceholder')) {
			imageUrl = imgSrc.startsWith('http') ? imgSrc : `${BASE_URL}${imgSrc}`;
		}

		// Ticket URL: external link (not visitbergen.com, skip junk)
		const junkDomains = ['miljofyrtarn.no', 'innovasjonnorge.no', 'visitnorway.com',
			'google.com', 'facebook.com', 'twitter.com', 'instagram.com', 'tripadvisor',
			'youtube.com', 'linkedin.com', 'pinterest.com', 'schema.org'];
		let ticketUrl: string | undefined;
		$w.find('a[href]').each((_, a) => {
			if (ticketUrl) return;
			let linkHref = $(a).attr('href') || '';
			// VB sometimes wraps external links in /engine/referrer.asp?web=...
			if (linkHref.includes('/engine/referrer.asp')) {
				const webParam = linkHref.match(/web=([^&]+)/);
				if (webParam) linkHref = decodeURIComponent(webParam[1]);
				else return;
			}
			if (linkHref.startsWith('http') && !linkHref.includes('visitbergen.com')
				&& !junkDomains.some(d => linkHref.includes(d))) {
				ticketUrl = linkHref.trim();
			}
		});

		// Description: get text after the dates/type info from centerBlock
		const centerText = $w.find('.centerBlock').text().trim();
		// The description comes after the dates block — grab text after the venue name
		const venueIdx = centerText.lastIndexOf(venue);
		const descRaw = venueIdx > 0 ? centerText.slice(venueIdx + venue.length).trim() : '';
		const description = descRaw.slice(0, 500) || title;

		events.push({
			title: title.slice(0, 200),
			detailUrl,
			dateStart,
			dateEnd,
			venue,
			category,
			imageUrl,
			ticketUrl,
			description,
		});
	});

	// Parse total pages from pagination
	let totalPages = 1;
	$('a[href*="?p="]').each((_, el) => {
		const text = $(el).text().trim();
		const num = parseInt(text);
		if (!isNaN(num) && num > totalPages) totalPages = num;
	});

	return { events, totalPages };
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Starting scrape of Visit Bergen...`);

	let found = 0;
	let inserted = 0;

	const firstHtml = await fetchHTML(SEARCH_URL);
	if (!firstHtml) return { found: 0, inserted: 0 };

	const firstPage = parseListPage(firstHtml);
	const pagesToScrape = Math.min(firstPage.totalPages, MAX_PAGES);
	console.log(`[${SOURCE}] Total pages: ${firstPage.totalPages}, scraping first ${pagesToScrape}`);
	console.log(`[${SOURCE}] Page 1: ${firstPage.events.length} events`);

	const allEvents: ListEvent[] = [...firstPage.events];

	for (let page = 2; page <= pagesToScrape; page++) {
		console.log(`[${SOURCE}] Fetching page ${page}/${pagesToScrape}...`);
		await delay(DELAY_MS);
		const html = await fetchHTML(`${SEARCH_URL}?p=${page}`);
		if (!html) continue;
		const { events } = parseListPage(html);
		console.log(`[${SOURCE}] Page ${page}: ${events.length} events`);
		allEvents.push(...events);
	}

	found = allEvents.length;
	console.log(`[${SOURCE}] Total events found: ${found}`);

	let skippedDedicated = 0;
	for (const event of allEvents) {
		// Skip venues that have their own dedicated scrapers
		const venueLower = event.venue.toLowerCase();
		if (DEDICATED_VENUE_PATTERNS.some(p => venueLower.includes(p))) {
			skippedDedicated++;
			continue;
		}

		if (await eventExists(event.detailUrl)) continue;

		let dateStart = event.dateStart!;

		// If the list page only gave us a date (noon default), fetch the real time
		if (isNoonDefault(dateStart)) {
			await delay(1500);
			const realTime = await fetchTimeFromDetail(event.detailUrl, dateStart);
			if (realTime) {
				dateStart = realTime;
			}
		}

		const category = event.category ? mapCategory(event.category) : 'culture';
		const bydel = mapBydel(event.venue);

		const aiDesc = await generateDescription({ title: event.title, venue: event.venue, category, date: dateStart, price: '' });

		// Resolve ticket URL: prefer specific event pages over generic venue homepages
		let ticketUrl = resolveTicketUrl(event.venue, event.ticketUrl) || event.detailUrl;
		// If resolved URL is just a bare domain (no meaningful path), use VB detail page instead
		try {
			const parsed = new URL(ticketUrl);
			if (parsed.pathname === '/' && !parsed.search) {
				ticketUrl = event.detailUrl;
			}
		} catch { /* keep ticketUrl as-is */ }

		// Validate external ticket URLs against the actual platform
		// Skip events where the ticket platform says the event is expired or has a different date
		if (ticketUrl !== event.detailUrl) {
			const validation = await validateTicketUrl(ticketUrl, dateStart);
			if (validation === 'expired' || validation === 'date_mismatch') {
				console.log(`  ⊘ Skipped ${event.title} — ticket URL ${validation} (${ticketUrl})`);
				continue;
			}
		}

		const success = await insertEvent({
			slug: makeSlug(event.title, dateStart),
			title_no: event.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			date_end: event.dateEnd || undefined,
			venue_name: event.venue,
			address: event.venue,
			bydel,
			price: '',
			ticket_url: ticketUrl,
			source: SOURCE,
			source_url: event.detailUrl,
			image_url: event.imageUrl,
			age_group: 'all',
			language: 'both',
			status: 'approved',
		});

		if (success) {
			const time = dateStart.slice(11, 16);
			console.log(`  + ${event.title} (${event.venue}, ${category}, ${time})`);
			inserted++;
		}
	}

	if (skippedDedicated > 0) {
		console.log(`[${SOURCE}] Skipped ${skippedDedicated} events from venues with dedicated scrapers`);
	}

	return { found, inserted };
}
