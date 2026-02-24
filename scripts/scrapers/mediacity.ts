import * as cheerio from 'cheerio';
import { mapBydel, mapCategory } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'mediacity';
const ICAL_URL = 'https://mediacitybergen.no/ical/events-feed';
const VENUE = 'Media City Bergen';
const ADDRESS = 'Lars Hilles gate 30, Bergen';

interface ICalEvent {
	summary: string;
	dtstart: string;
	dtend?: string;
	location?: string;
	description?: string;
	uid: string;
}

function parseICalDate(value: string): string | null {
	// DTSTART;TZID=Europe/Oslo:20260304T090000 → ISO string
	// or DTSTART:20260304T090000Z → ISO string
	const dateMatch = value.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
	if (!dateMatch) return null;

	const [, year, month, day, hour, min, sec] = dateMatch;
	const isUtc = value.includes('Z');
	const isCET = value.includes('Europe/Oslo');

	if (isUtc) {
		return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`).toISOString();
	}

	// Assume CET (UTC+1) for Oslo timezone
	if (isCET) {
		const offset = isDST(parseInt(year), parseInt(month) - 1, parseInt(day)) ? '+02:00' : '+01:00';
		return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}${offset}`).toISOString();
	}

	// Default: treat as local CET
	return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}+01:00`).toISOString();
}

function isDST(year: number, month: number, day: number): boolean {
	// Simple DST check for Central European Time
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

function parseICalEvents(ical: string): ICalEvent[] {
	const events: ICalEvent[] = [];
	const blocks = ical.split('BEGIN:VEVENT');

	for (let i = 1; i < blocks.length; i++) {
		const block = blocks[i].split('END:VEVENT')[0];
		const event: Partial<ICalEvent> = {};

		// Unfold lines (continuation lines start with space/tab)
		const unfolded = block.replace(/\r?\n[ \t]/g, '');

		for (const line of unfolded.split(/\r?\n/)) {
			if (line.startsWith('SUMMARY:')) {
				event.summary = line.slice('SUMMARY:'.length).trim();
			} else if (line.startsWith('DTSTART')) {
				event.dtstart = line;
			} else if (line.startsWith('DTEND')) {
				event.dtend = line;
			} else if (line.startsWith('LOCATION:')) {
				event.location = line.slice('LOCATION:'.length).trim().replace(/\\,/g, ',').replace(/\\n/g, ', ');
			} else if (line.startsWith('DESCRIPTION:')) {
				event.description = line.slice('DESCRIPTION:'.length).trim().replace(/\\n/g, ' ').replace(/\\,/g, ',').slice(0, 500);
			} else if (line.startsWith('UID:')) {
				event.uid = line.slice('UID:'.length).trim();
			}
		}

		if (event.summary && event.dtstart && event.uid) {
			events.push(event as ICalEvent);
		}
	}

	return events;
}

/**
 * Fetch the medieklyngen events listing page once,
 * then look up ticket/detail URLs for individual events by title match.
 */
async function fetchEventDetailUrls(): Promise<Map<string, { detailUrl: string; ticketUrl?: string }>> {
	const map = new Map<string, { detailUrl: string; ticketUrl?: string }>();
	const html = await fetchHTML('https://medieklyngen.no/events/');
	if (!html) return map;

	const $ = cheerio.load(html);

	// Each event link on the listing page
	$('a[href*="/events/"]').each((_, el) => {
		const href = $(el).attr('href');
		if (!href || href === '/events/' || href === 'https://medieklyngen.no/events/') return;

		const title = $(el).text().trim().toLowerCase();
		if (!title) return;

		const fullUrl = href.startsWith('http') ? href : `https://medieklyngen.no${href}`;
		map.set(title, { detailUrl: fullUrl });
	});

	return map;
}

/**
 * Fetch a detail page and look for an external ticket link (e.g. checkin.no, eventbrite.com)
 */
async function fetchTicketUrl(detailUrl: string): Promise<string | undefined> {
	const html = await fetchHTML(detailUrl);
	if (!html) return undefined;

	const $ = cheerio.load(html);

	// Look for links to ticket platforms
	const ticketDomains = ['checkin.no', 'eventbrite', 'ticketco', 'ticketmaster', 'hoopla'];
	const links = $('a[href]').toArray();
	for (const link of links) {
		const href = $(link).attr('href') || '';
		if (ticketDomains.some(d => href.includes(d))) {
			return href;
		}
	}

	return undefined;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Media City Bergen events (iCal)...`);

	const res = await fetch(ICAL_URL, {
		headers: {
			'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
			'Accept': 'text/calendar',
		},
	});

	if (!res.ok) {
		console.error(`[${SOURCE}] HTTP ${res.status}`);
		return { found: 0, inserted: 0 };
	}

	const ical = await res.text();
	const events = parseICalEvents(ical);
	const now = new Date();
	const futureEvents = events.filter(e => {
		const start = parseICalDate(e.dtstart);
		return start && new Date(start) > now;
	});

	console.log(`[${SOURCE}] Found ${futureEvents.length} upcoming events`);

	// Fetch listing page once to map titles → detail URLs
	const detailMap = await fetchEventDetailUrls();

	let found = futureEvents.length;
	let inserted = 0;

	for (const event of futureEvents) {
		const eventUrl = `https://medieklyngen.no/events/#${event.uid}`;
		if (await eventExists(eventUrl)) continue;

		const dateStart = parseICalDate(event.dtstart);
		if (!dateStart) continue;

		const dateEnd = event.dtend ? parseICalDate(event.dtend) || undefined : undefined;
		const datePart = dateStart.slice(0, 10);
		const venueName = event.location || VENUE;
		const bydel = mapBydel(venueName);

		// Dynamic category from title + description
		const category = mapCategory(`${event.summary} ${event.description || ''}`);

		// Look up detail page URL by matching title
		const titleLower = event.summary.toLowerCase();
		const detail = detailMap.get(titleLower);
		let ticketUrl = detail?.detailUrl || 'https://medieklyngen.no/events/';

		// If we have a detail page, check for external ticket links
		if (detail?.detailUrl) {
			await delay(1500);
			const externalTicket = await fetchTicketUrl(detail.detailUrl);
			if (externalTicket) ticketUrl = externalTicket;
		}

		const aiDesc = await generateDescription({ title: event.summary, venue: venueName, category, date: new Date(dateStart), price: '' });

		const success = await insertEvent({
			slug: makeSlug(event.summary, datePart),
			title_no: event.summary,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venueName,
			address: event.location || ADDRESS,
			bydel,
			price: '',
			ticket_url: ticketUrl,
			source: SOURCE,
			source_url: eventUrl,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.summary} (${datePart}) [${category}]`);
			inserted++;
		}
	}

	return { found, inserted };
}
