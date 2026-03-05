import * as cheerio from 'cheerio';
import { mapBydel, mapCategory } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'mediacity';
const BASE_URL = 'https://medieklyngen.no';
const LISTING_URL = `${BASE_URL}/events/`;
const VENUE = 'Media City Bergen';
const ADDRESS = 'Lars Hilles gate 30, Bergen';

// Industry conferences — not public events
const EXCLUDE_KEYWORDS = ['konferansen', 'conference', 'summit', 'fagdag', 'bransjetreff', 'masterclass', 'future week'];

interface EventListing {
	detailUrl: string;
	title: string;
}

/**
 * Parse date string like "5. March." or "23. - 24. September." or "5. March - 12. February."
 * Returns { dateStart, dateEnd } as ISO strings (using current year context)
 */
function parseDateRange(dateStr: string, timeStr: string, year: number): { dateStart: string; dateEnd?: string } | null {
	const months: Record<string, number> = {
		// English
		january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
		july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
		// Norwegian (only those that differ)
		januar: 0, februar: 1, mars: 2, mai: 4, juni: 5,
		juli: 6, oktober: 9, desember: 11,
	};

	// Extract time: "Time: 09:00 - 16:00" or "Time: 14:15 - 16:00"
	const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
	const startHour = timeMatch ? parseInt(timeMatch[1]) : 0;
	const startMin = timeMatch ? parseInt(timeMatch[2]) : 0;
	const endHour = timeMatch ? parseInt(timeMatch[3]) : 0;
	const endMin = timeMatch ? parseInt(timeMatch[4]) : 0;

	// Clean the date string
	const clean = dateStr.replace(/\.$/, '').trim();

	// Format: "DD. - DD. Month" (same month range)
	const sameMonthRange = clean.match(/^(\d{1,2})\.\s*-\s*(\d{1,2})\.\s+(\w+)$/i);
	if (sameMonthRange) {
		const [, startDay, endDay, monthName] = sameMonthRange;
		const month = months[monthName.toLowerCase()];
		if (month === undefined) return null;

		const dateStart = toOsloIso(year, month, parseInt(startDay), startHour, startMin);
		const dateEnd = toOsloIso(year, month, parseInt(endDay), endHour, endMin);
		return { dateStart, dateEnd };
	}

	// Format: "DD. Month - DD. Month" (cross-month range)
	const crossMonthRange = clean.match(/^(\d{1,2})\.\s+(\w+)\s*-\s*(\d{1,2})\.\s+(\w+)$/i);
	if (crossMonthRange) {
		const [, startDay, startMonthName, endDay, endMonthName] = crossMonthRange;
		const startMonth = months[startMonthName.toLowerCase()];
		const endMonth = months[endMonthName.toLowerCase()];
		if (startMonth === undefined || endMonth === undefined) return null;

		const dateStart = toOsloIso(year, startMonth, parseInt(startDay), startHour, startMin);
		const dateEnd = toOsloIso(year, endMonth, parseInt(endDay), endHour, endMin);
		return { dateStart, dateEnd };
	}

	// Format: "DD. Month" (single day)
	const singleDay = clean.match(/^(\d{1,2})\.\s+(\w+)$/i);
	if (singleDay) {
		const [, day, monthName] = singleDay;
		const month = months[monthName.toLowerCase()];
		if (month === undefined) return null;

		const dateStart = toOsloIso(year, month, parseInt(day), startHour, startMin);
		const dateEnd = timeMatch ? toOsloIso(year, month, parseInt(day), endHour, endMin) : undefined;
		return { dateStart, dateEnd };
	}

	return null;
}

function toOsloIso(year: number, month: number, day: number, hour: number, min: number): string {
	// Determine CET (+01:00) or CEST (+02:00)
	const offset = isDST(year, month, day) ? '+02:00' : '+01:00';
	const pad = (n: number) => n.toString().padStart(2, '0');
	return new Date(`${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(min)}:00${offset}`).toISOString();
}

function isDST(year: number, month: number, day: number): boolean {
	// DST starts last Sunday of March, ends last Sunday of October
	const marchLast = new Date(year, 2, 31);
	const dstStart = marchLast.getDate() - marchLast.getDay();
	const octLast = new Date(year, 9, 31);
	const dstEnd = octLast.getDate() - octLast.getDay();

	if (month > 2 && month < 9) return true; // Apr-Sep
	if (month === 2 && day >= dstStart) return true; // Late March
	if (month === 9 && day < dstEnd) return true; // Early October
	return false;
}

/**
 * Scrape the listing page for upcoming event URLs.
 * The featured tile (12x1) links to external ticket sites — we derive its detail URL from its class.
 * Regular tiles (3x1) link directly to /events/slug/.
 */
async function fetchEventListings(): Promise<EventListing[]> {
	const html = await fetchHTML(LISTING_URL);
	if (!html) return [];

	const $ = cheerio.load(html);
	const listings: EventListing[] = [];
	const seen = new Set<string>();

	// Featured tile (event-tile-12x1) — its href might be external (checkin.no etc.)
	// Extract the detail page slug from the class name pattern: event-tile__full-image-XXXXX
	$('.event-tile-12x1-wrapper').each((_, wrapper) => {
		const tile = $(wrapper).find('.event-tile-12x1');
		const title = tile.find('.event-tile-12x1__content__heading').text().trim();
		// Try to find a detail page link — the slug is typically the title slugified
		// We'll construct the URL from the iCal UID in the class, or just use the title
		const classAttr = tile.attr('class') || '';
		const idMatch = classAttr.match(/event-tile__full-image-(\d+)/);
		if (title && idMatch) {
			// We need to find the detail page — check if there's one at /events/slug/
			// For now, skip featured tiles — they're usually conferences with external links
			// The regular tiles below will have the public events
		}
	});

	// Regular tiles (event-tile-3x1) — only from upcoming section (not past-event-tiles)
	$('.event-tiles:not(.past-event-tiles) .event-tile-3x1').each((_, el) => {
		const href = $(el).attr('href');
		const title = $(el).find('h3').text().trim();
		if (!href || !title) return;

		const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

		// Skip if already seen or if it's not a detail page
		if (seen.has(fullUrl) || !fullUrl.includes('/events/')) return;
		seen.add(fullUrl);

		listings.push({ detailUrl: fullUrl, title });
	});

	return listings;
}

interface EventDetail {
	title: string;
	dateStr: string;
	timeStr: string;
	venue: string;
	address: string;
	imageUrl?: string;
	ticketUrl?: string;
	description?: string;
}

/**
 * Fetch a detail page and extract event info
 */
async function fetchEventDetail(url: string): Promise<EventDetail | null> {
	const html = await fetchHTML(url);
	if (!html) return null;

	const $ = cheerio.load(html);

	const title = $('h1').first().text().trim();
	if (!title) return null;

	// Image from og:image meta tag
	const imageUrl = $('meta[property="og:image"]').attr('content') || undefined;

	// Date from <strong> after "When" heading
	let dateStr = '';
	let timeStr = '';
	$('h2').each((_, el) => {
		if ($(el).text().trim().toLowerCase() === 'when') {
			const section = $(el).parent();
			dateStr = section.find('strong').first().text().trim();
			const timeEl = section.find('.event-detail').first().text().trim();
			if (timeEl.startsWith('Time:')) {
				timeStr = timeEl;
			}
		}
	});

	// If h2 sections are siblings, try next sibling approach
	if (!dateStr) {
		$('h2').each((_, el) => {
			if ($(el).text().trim().toLowerCase() === 'when') {
				// Look for the next strong tag after this h2
				let next = $(el).next();
				while (next.length) {
					if (next.is('strong')) {
						dateStr = next.text().trim();
						break;
					}
					if (next.is('h2')) break;
					const strongInside = next.find('strong');
					if (strongInside.length) {
						dateStr = strongInside.first().text().trim();
						break;
					}
					next = next.next();
				}
				// Time
				$(el).nextAll('.event-detail').first().each((_, timeEl) => {
					const t = $(timeEl).text().trim();
					if (t.startsWith('Time:')) timeStr = t;
				});
				$(el).nextAll('p.event-detail').first().each((_, timeEl) => {
					const t = $(timeEl).text().trim();
					if (t.startsWith('Time:')) timeStr = t;
				});
			}
		});
	}

	// Venue from "Where" section
	let venue = VENUE;
	let address = ADDRESS;
	$('h2').each((_, el) => {
		if ($(el).text().trim().toLowerCase() === 'where') {
			const section = $(el).parent();
			const divs = section.find('div').not('#map');
			if (divs.length >= 1) {
				venue = divs.first().text().trim() || VENUE;
			}
			if (divs.length >= 2) {
				// Combine address lines
				const parts: string[] = [];
				divs.slice(1).each((_, d) => {
					const t = $(d).text().trim();
					if (t && t !== venue) parts.push(t);
				});
				if (parts.length) address = parts.join(', ');
			}
		}
	});

	// Ticket URL — look for link-button links to ticket platforms
	let ticketUrl: string | undefined;
	const ticketDomains = ['checkin.no', 'eventbrite', 'ticketco', 'ticketmaster', 'hoopla', 'billetto'];
	$('a.link-button--large, a.link-button').each((_, el) => {
		const href = $(el).attr('href') || '';
		if (ticketDomains.some(d => href.includes(d))) {
			ticketUrl = href;
		}
	});
	// Also check all links if no button found
	if (!ticketUrl) {
		$('a[href]').each((_, el) => {
			const href = $(el).attr('href') || '';
			if (ticketDomains.some(d => href.includes(d))) {
				ticketUrl = href;
			}
		});
	}

	return { title, dateStr, timeStr, venue, address, imageUrl, ticketUrl };
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Media City Bergen events...`);

	const listings = await fetchEventListings();
	console.log(`[${SOURCE}] Found ${listings.length} upcoming event listings`);

	// Filter out conferences
	const publicListings = listings.filter(e => {
		const title = e.title.toLowerCase();
		return !EXCLUDE_KEYWORDS.some(kw => title.includes(kw));
	});

	if (publicListings.length < listings.length) {
		console.log(`[${SOURCE}] Filtered out ${listings.length - publicListings.length} industry events`);
	}

	const found = publicListings.length;
	let inserted = 0;
	const now = new Date();
	const year = now.getFullYear();

	for (const listing of publicListings) {
		if (await eventExists(listing.detailUrl)) continue;

		await delay(1500);
		const detail = await fetchEventDetail(listing.detailUrl);
		if (!detail) {
			console.log(`  ! Could not parse: ${listing.title}`);
			continue;
		}

		if (!detail.dateStr) {
			console.log(`  ! No date found: ${listing.title}`);
			continue;
		}

		const parsed = parseDateRange(detail.dateStr, detail.timeStr, year);
		if (!parsed) {
			console.log(`  ! Could not parse date "${detail.dateStr}": ${listing.title}`);
			continue;
		}

		// Skip past events
		if (new Date(parsed.dateStart) < now) continue;

		const datePart = parsed.dateStart.slice(0, 10);
		const venueName = detail.venue || VENUE;
		const bydel = mapBydel(venueName);
		const category = mapCategory(`${detail.title} ${detail.description || ''}`);

		const aiDesc = await generateDescription({
			title: detail.title,
			venue: venueName,
			category,
			date: new Date(parsed.dateStart),
			price: '',
		});

		const success = await insertEvent({
			slug: makeSlug(detail.title, datePart),
			title_no: detail.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: parsed.dateStart,
			date_end: parsed.dateEnd,
			venue_name: venueName,
			address: detail.address,
			bydel,
			price: '',
			ticket_url: detail.ticketUrl,
			image_url: detail.imageUrl,
			source: SOURCE,
			source_url: listing.detailUrl,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${detail.title} (${datePart}) [${category}]`);
			inserted++;
		}
	}

	return { found, inserted };
}
