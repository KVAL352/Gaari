import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bergenpride';
// Must be www: the bare apex (bergenpride.no) 301-redirects to the www root and
// drops the path, so program pages return an empty SPA shell. www serves the
// pre-rendered program content directly.
const BASE_URL = 'https://www.bergenpride.no';
const DELAY_MS = 1500;
const FALLBACK_IMAGE = 'https://cdn.vev.design/private/mC0LTzRlF5YCXni49Kl530JDBeE3/image/ohTUjkB0xN_2j7ucg.svg';

// bergenpride.no is a Vev SPA. Each day of the programme is a separate page whose
// URL slug is STALE (named for a previous year, e.g. /program-friday-13th/), but
// whose content carries the real date in an <h3> heading ("Tuesday, June 2nd").
// We therefore discover the day pages dynamically from the homepage nav and read
// the date from the page content — no hardcoded date mapping to go stale.
const FALLBACK_DAY_PAGES = [
	'program-friday-13th', 'program-saturday-14th', 'program-sunday-15th',
	'program-monday-16th', 'program-tuesday-17th', 'program-wednesday-18th',
	'program-thursday-19th', 'program-friday-20th', 'program-friday-20th-copy',
];

const MONTHS: Record<string, number> = {
	january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
	july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};
// Day heading inside a programme page, e.g. "Tuesday, June 2nd" or "Thursday June 4th".
const DAY_HEADING = /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b[\s,–-]+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
// Time separator varies on the site: "Tid: 19:00" and "Tid: 19.00" both occur.
const TIME_RE = /Tid:\s*(\d{1,2})[:.](\d{2})/i;

function guessCategory(title: string, venue: string): string {
	const text = `${title} ${venue}`.toLowerCase();
	const w = (word: string) => new RegExp(`\\b${word}\\b`).test(text);
	if (w('konsert') || w('dj') || w('musikk') || w('drag') || w('show')) return 'nightlife';
	if (w('parade') || w('tog')) return 'festival';
	if (w('workshop') || w('kurs') || w('samtale') || w('debatt') || w('q&a')) return 'workshop';
	if (w('barn') || w('familie') || w('kids') || w('ungdom') || w('youth') || w('kafé') || w('kafe')) return 'family';
	if (w('fest') || w('party') || w('park') || w('quiz')) return 'nightlife';
	if (w('utstilling') || w('film') || w('kunst') || w('foredrag')) return 'culture';
	return 'festival';
}

/**
 * Resolve the festival year for a given month. The programme runs late May to early
 * June. Scraping happens around that window, so the current year is correct; if a
 * parsed date lands far in the past (off-season scrape of next year's stale slugs),
 * roll forward a year. removeExpiredEvents() prunes anything that slips through.
 */
function resolveYear(month: number, day: number): number {
	const now = new Date();
	let year = now.getUTCFullYear();
	const candidate = new Date(Date.UTC(year, month - 1, day));
	const daysAgo = (now.getTime() - candidate.getTime()) / 86_400_000;
	if (daysAgo > 90) year += 1;
	return year;
}

interface ParsedEvent {
	title: string;
	venue: string;
	date: string; // YYYY-MM-DD
	time: string; // HH:MM
}

/**
 * Parse one day's programme page. Walks the rendered text blocks in document order.
 * Day headings set the current date; each "Tid: HH:MM" marker closes an event whose
 * title and venue are the two preceding content blocks (skipping "Read more" toggles
 * and other time lines). Pattern in the DOM is: TITLE → VENUE → "Tid: HH:MM".
 */
export function parseDayPage(html: string): ParsedEvent[] {
	const $ = cheerio.load(html);

	const seq: string[] = [];
	$('h1,h2,h3,h4,h5,strong,b,p,span,div,a').each((_, el) => {
		const own = $(el).clone().children().remove().end().text().trim();
		if (own && own.length <= 140 && own !== seq[seq.length - 1]) seq.push(own);
	});

	const events: ParsedEvent[] = [];
	let currentDate = '';

	const lookBack = (from: number, floor: number): { s: string; j: number } | null => {
		for (let j = from; j >= floor; j--) {
			const s = seq[j];
			if (/^read more$/i.test(s) || TIME_RE.test(s)) continue;
			return { s, j };
		}
		return null;
	};

	let prevTidIdx = -1;
	let lastTitle = '';
	for (let i = 0; i < seq.length; i++) {
		const dh = seq[i].match(DAY_HEADING);
		if (dh) {
			const month = MONTHS[dh[1].toLowerCase()];
			const day = parseInt(dh[2], 10);
			if (month && day) {
				const year = resolveYear(month, day);
				currentDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			}
			continue;
		}

		const tm = seq[i].match(TIME_RE);
		if (!tm || !currentDate) continue;

		const time = `${tm[1].padStart(2, '0')}:${tm[2]}`;
		const floor = Math.max(0, i - 5);
		const venueBlock = lookBack(i - 1, floor);
		const titleBlock = venueBlock ? lookBack(venueBlock.j - 1, floor) : null;

		let title = (titleBlock?.s || venueBlock?.s || '').replace(/^[-–\s]+/, '').trim();
		let venue = titleBlock && venueBlock ? venueBlock.s : 'Bergen Pride';

		// Multi-part event (e.g. "Piknik og filmkveld" with a second time/venue): the
		// only title candidate sits at/before the previous event's time line, so there
		// is no fresh title here. Reuse the previous title; this block is just a second
		// venue/slot. Pipeline dedup (normalised title + date) collapses the slots.
		if (titleBlock && titleBlock.j <= prevTidIdx && lastTitle) {
			title = lastTitle;
			venue = venueBlock!.s;
		} else if (DAY_HEADING.test(title) || title.length < 3) {
			title = venue.replace(/^[-–\s]+/, '').trim();
			venue = 'Bergen Pride';
		}
		if (title.length < 3) { prevTidIdx = i; continue; }

		events.push({ title, venue, date: currentDate, time });
		prevTidIdx = i;
		lastTitle = title;
	}

	// Vev renders each event twice (responsive variants); collapse exact repeats.
	const seen = new Set<string>();
	return events.filter(e => {
		const key = `${e.title}|${e.date}|${e.time}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/** Discover day-programme page slugs from the homepage nav (excludes -en / -ungdom). */
async function discoverDayPages(): Promise<string[]> {
	const html = await fetchHTML(`${BASE_URL}/`);
	if (!html) return FALLBACK_DAY_PAGES;
	const slugs = new Set<string>();
	const re = /"path":"(program-(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)[a-z0-9-]*)"/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) slugs.add(m[1]);
	return slugs.size > 0 ? [...slugs] : FALLBACK_DAY_PAGES;
}

// PAUSE under Regnbuedagene 2026 (29. mai–6. juni). Programmet er allerede hentet
// inn (events m/ per-event-bilder backfillet 2026-06-02 fra Vev CSS-var-mapping).
// Bergen Pride republiserer Vev-siden under festivalen, så daglig re-scrape ville
// risikere dublett-events fra endrede titler. Tidlig retur (ikke fjerning fra map)
// pauser fetchingen uten å endre kildetellingen eller røre eksisterende events.
// FJERN denne guarden etter 6. juni for å re-aktivere scraperen.
const PAUSED_UNTIL = '2026-06-07';

export async function scrape(): Promise<{ found: number; inserted: number }> {
	if (new Date().toISOString().slice(0, 10) < PAUSED_UNTIL) {
		console.log(`\n[${SOURCE}] PAUSET under Regnbuedagene (til ${PAUSED_UNTIL}) — hopper over.`);
		return { found: 0, inserted: 0 };
	}

	console.log(`\n[${SOURCE}] Fetching Bergen Pride events...`);

	let found = 0;
	let inserted = 0;

	const dayPages = await discoverDayPages();
	console.log(`[${SOURCE}] ${dayPages.length} programme pages to scan`);

	// Skip events already in the past — removeExpiredEvents() would prune them on the
	// next run anyway, so inserting them only burns AI-description calls.
	const todayOslo = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Oslo' });

	for (const slug of dayPages) {
		const pageUrl = `${BASE_URL}/${slug}/`;
		const html = await fetchHTML(pageUrl);
		if (!html) {
			await delay(DELAY_MS);
			continue;
		}

		const events = parseDayPage(html);
		if (events.length === 0) {
			await delay(DELAY_MS);
			continue;
		}
		console.log(`[${SOURCE}] ${slug}: ${events.length} events`);

		for (const event of events) {
			if (event.date < todayOslo) continue;
			found++;

			const titleSlug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
			const sourceUrl = `${pageUrl}#${event.date}-${titleSlug}`;
			if (await eventExists(sourceUrl)) continue;

			const [hours, minutes] = event.time.split(':').map(Number);
			// June in Bergen is CEST (UTC+2).
			const startDate = new Date(`${event.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+02:00`);
			if (isNaN(startDate.getTime())) continue;

			const category = guessCategory(event.title, event.venue);
			const bydel = mapBydel(event.venue);

			const aiDesc = await generateDescription({
				title: event.title,
				venue: event.venue,
				category,
				date: startDate.toISOString(),
			});

			const success = await insertEvent({
				slug: makeSlug(event.title, event.date),
				title_no: event.title,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				title_en: aiDesc.title_en,
				category,
				date_start: startDate.toISOString(),
				venue_name: event.venue,
				address: 'Bergen',
				bydel,
				price: '',
				ticket_url: pageUrl,
				source: SOURCE,
				source_url: sourceUrl,
				image_url: FALLBACK_IMAGE,
				age_group: 'all',
				language: 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${event.title} (${event.venue}, ${event.date} ${event.time})`);
				inserted++;
			}
		}

		await delay(DELAY_MS);
	}

	return { found, inserted };
}
