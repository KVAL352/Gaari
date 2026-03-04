import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'borealis';
const BASE_URL = 'https://www.borealisfestival.no';

// Festival config — update annually when program is published
const FESTIVAL_YEAR = 2026;
const FESTIVAL_DATES = { start: '2026-03-10', end: '2026-03-15' };
const LISTING_PATH = `/festival-${FESTIVAL_YEAR}/hva-skjer-${FESTIVAL_YEAR}/`;

// Norwegian month names → 0-indexed month
const MONTHS: Record<string, number> = {
	'januar': 0, 'februar': 1, 'mars': 2, 'april': 3, 'mai': 4, 'juni': 5,
	'juli': 6, 'august': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
};

/** Parse h2 text like "Onsdag 11. mars" → "2026-03-11" */
function parseDateHeader(text: string): string | null {
	const match = text.match(/(\d{1,2})\.\s*(\w+)/);
	if (!match) return null;
	const day = parseInt(match[1]);
	const monthName = match[2].toLowerCase();
	const month = MONTHS[monthName];
	if (month === undefined) return null;
	return `${FESTIVAL_YEAR}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Parse "17.30–19.30" or "18.00-00.00" → { startH, startM, endH, endM } */
function parseTimeRange(text: string): { startH: number; startM: number; endH: number; endM: number } | null {
	const match = text.match(/(\d{1,2})[.:](\d{2})\s*[–—-]\s*(\d{1,2})[.:](\d{2})/);
	if (!match) return null;
	return {
		startH: parseInt(match[1]), startM: parseInt(match[2]),
		endH: parseInt(match[3]), endM: parseInt(match[4]),
	};
}

/** Build ISO datetime string in CET (UTC+1). Entire festival is before DST (Mar 29, 2026). */
function toCETIso(date: string, hours: number, minutes: number): string {
	return new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+01:00`).toISOString();
}

function isFreeText(text: string): boolean {
	return /\b(gratis|free)\b/i.test(text);
}

function guessCategory(title: string): string {
	const t = title.toLowerCase();
	if (/workshop|verksted/.test(t)) return 'workshop';
	if (/familie|family|barn/.test(t)) return 'family';
	if (/samtale|discussion|talk/.test(t)) return 'culture';
	if (/utstilling|exhibition/.test(t)) return 'culture';
	if (/fest\b|party|bar\b|dj/.test(t)) return 'nightlife';
	return 'music';
}

function resolveVenue(rawVenue: string): { name: string; address: string } {
	const v = rawVenue.toLowerCase().replace(/\s+/g, ' ').trim();

	if (v.includes('cornerteateret')) return { name: 'Cornerteateret', address: 'Nordnesgaten 22, Bergen' };
	if (v.includes('bergen kunsthall')) return { name: 'Bergen Kunsthall', address: 'Rasmus Meyers allé 5, Bergen' };
	if (v.includes('nordnes sjøbad')) return { name: 'Nordnes Sjøbad', address: 'Nordnesbakken 30, Bergen' };
	if (v.includes('kultursalen') || v.includes('åsane kulturhus')) return { name: 'Åsane kulturhus', address: 'Åsane Senter, Bergen' };
	if (v.includes('bergen kjøtt')) return { name: 'Bergen Kjøtt', address: 'Skutevikstorget 1, Bergen' };
	if (v.includes('sardinen') || v.includes('usf verftet')) return { name: 'USF Verftet', address: 'Georgernes Verft 12, Bergen' };
	if (v.includes('østre')) return { name: 'Østre', address: 'Olav Kyrres gate 49, Bergen' };
	if (v.includes('vestre')) return { name: 'Vestre', address: 'Olav Kyrres gate 49, Bergen' };
	if (v.includes('troldsalen') || v.includes('troldhaugen')) return { name: 'Troldhaugen', address: 'Troldhaugvegen 65, Bergen' };
	if (v.includes('laugaren')) return { name: 'Laugaren', address: 'Georgernes Verft 12, Bergen' };
	if (v.includes('torrfjellet') || v.includes('fløyen')) return { name: 'Fløyen', address: 'Fløyen, Bergen' };
	if (v.includes('bek')) return { name: 'BEK', address: 'Lyder Sagens gate 44, Bergen' };
	if (v.includes('lydgalleriet')) return { name: 'Lydgalleriet', address: 'Østre Skostredet 3, Bergen' };
	if (v.includes('bergen internasjonale kultursenter')) return { name: 'Bergen internasjonale kultursenter', address: 'Kong Oscars gate 7, Bergen' };
	if (v.includes('rommet')) return { name: 'Rommet', address: 'Georgernes Verft 12, Bergen' };
	if (v.includes('mat & prat') || v.includes('mat &amp; prat')) return { name: 'Kafé Mat & Prat', address: 'Bergen' };

	// Fallback: clean up the raw text
	return { name: rawVenue.split(',')[0].trim(), address: 'Bergen' };
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	// Check if festival dates are all past
	if (new Date(FESTIVAL_DATES.end) < new Date()) {
		console.warn(`[${SOURCE}] All festival dates are in the past — update FESTIVAL_YEAR/FESTIVAL_DATES for next year`);
		return { found: 0, inserted: 0 };
	}

	const listingUrl = `${BASE_URL}${LISTING_PATH}`;
	console.log(`\n[${SOURCE}] Fetching Borealis festival program...`);

	const html = await fetchHTML(listingUrl);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch listing page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Structure: h2 (date header) → figure.schedule > table > tbody > tr (events)
	const headers = $('h2').toArray();
	console.log(`[${SOURCE}] ${headers.length} date sections found`);

	for (const header of headers) {
		const headerText = $(header).text().trim();

		// Skip "Gjentagende" (recurring) section — those events are already listed per day
		if (/gjentagende/i.test(headerText)) continue;

		const date = parseDateHeader(headerText);
		if (!date) {
			console.log(`  [${SOURCE}] Skipping header: "${headerText}"`);
			continue;
		}

		// Find the schedule table(s) following this h2
		const tables: cheerio.Element[] = [];
		let sibling = $(header).next();
		while (sibling.length && !sibling.is('h2')) {
			if (sibling.is('figure.schedule') || sibling.find('table').length) {
				sibling.find('tr').each((_, tr) => tables.push(tr));
			}
			sibling = sibling.next();
		}

		for (const row of tables) {
			const tds = $(row).find('td');
			if (tds.length < 3) continue;

			// Column 0: Title (with event link)
			const titleCell = tds.eq(0);
			const eventLink = titleCell.find(`a[href*="/events${FESTIVAL_YEAR}/"]`).first();
			const rawTitle = titleCell.text().trim().replace(/\s+/g, ' ');
			if (!rawTitle || rawTitle.length < 3) continue;

			// Column 1: Venue
			const rawVenue = tds.eq(1).text().trim().replace(/\s+/g, ' ');

			// Column 2: Time
			const rawTime = tds.eq(2).text().trim();
			const time = parseTimeRange(rawTime);
			if (!time) continue; // Skip rows without parseable time (catches recurring summaries)

			// Column 3: Ticket info
			const ticketCell = tds.eq(3);
			const ticketText = ticketCell.text().trim();
			const ticketLink = ticketCell.find('a[href*="ticketco"]').attr('href')
				|| ticketCell.find('a[href*="periode.no"]').attr('href')
				|| undefined;

			const isFree = isFreeText(ticketText);

			// Build source_url — unique per timeslot
			const eventDetailUrl = eventLink.attr('href') || '';
			const timeSlug = `${date}-${String(time.startH).padStart(2, '0')}${String(time.startM).padStart(2, '0')}`;
			const sourceUrl = eventDetailUrl
				? `${eventDetailUrl}#${timeSlug}`
				: `${listingUrl}#${makeSlug(rawTitle, date)}-${String(time.startH).padStart(2, '0')}${String(time.startM).padStart(2, '0')}`;

			found++;

			if (await eventExists(sourceUrl)) continue;

			const venue = resolveVenue(rawVenue);
			const title = `Borealis: ${rawTitle}`;
			const category = guessCategory(rawTitle);

			const aiDesc = await generateDescription({
				title: rawTitle,
				venue: venue.name,
				category,
				date: new Date(toCETIso(date, time.startH, time.startM)),
				price: isFree ? 'Gratis' : '',
			});

			// End time: handle cross-midnight (e.g. 21.00–01.30)
			const endDate = time.endH < time.startH
				? `${FESTIVAL_YEAR}-${String(parseInt(date.slice(5, 7))).padStart(2, '0')}-${String(parseInt(date.slice(8)) + 1).padStart(2, '0')}`
				: date;

			const success = await insertEvent({
				slug: makeSlug(rawTitle, date),
				title_no: title,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				category,
				date_start: toCETIso(date, time.startH, time.startM),
				date_end: toCETIso(endDate, time.endH, time.endM),
				venue_name: venue.name,
				address: venue.address,
				bydel: mapBydel(venue.name),
				price: isFree ? 'Gratis' : '',
				ticket_url: ticketLink,
				source: SOURCE,
				source_url: sourceUrl,
				image_url: undefined,
				age_group: 'all',
				language: 'both',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${rawTitle} (${date} ${String(time.startH).padStart(2, '0')}:${String(time.startM).padStart(2, '0')})`);
				inserted++;
			}
		}
	}

	return { found, inserted };
}
