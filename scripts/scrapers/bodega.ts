import { makeSlug, eventExists, insertEvent, delay, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';
import { mapCategory, mapBydel } from '../lib/categories.js';

const SOURCE = 'bodega';
const VENUE = 'Bodega';
const ADDRESS = 'Kong Oscars gate 23, Bergen';
const WEBSITE = 'https://bodega.part.no';
const USER_AGENT = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';

const CALENDAR_ID = 'c_c409dccf5a16127d2a7f0d580415f20414b709812e08bf6a3dc25e677f45e6cd@group.calendar.google.com';
const API_KEY = process.env.BODEGA_GCAL_API_KEY || '';

// Keywords for non-public events
const EXCLUDE_KEYWORDS = [
	'stengt', 'lukket selskap', 'privat', 'ferie',
	'barnehage', 'barnehagebarn', 'sfo', 'skoleklasse',
	'skolebesøk', 'klassebesøk', 'kun for',
];

interface GCalEvent {
	id: string;
	summary?: string;
	description?: string;
	start: { dateTime?: string; date?: string };
	end?: { dateTime?: string; date?: string };
	htmlLink: string;
}

function isExcluded(title: string, description: string): boolean {
	const combined = `${title} ${description}`.toLowerCase();
	return EXCLUDE_KEYWORDS.some(kw => combined.includes(kw));
}

function parseDescription(raw: string): { subtitle: string; body: string; organizer: string } {
	let subtitle = '';
	let body = raw;
	let organizer = '';

	// Split on /// separator — subtitle before, description after
	if (raw.includes('///')) {
		const parts = raw.split('///');
		subtitle = parts[0].trim();
		body = parts.slice(1).join('///').trim();
	}

	// Extract [OrganizerName] brackets
	const orgMatch = body.match(/\[([^\]]+)\]/);
	if (orgMatch) {
		organizer = orgMatch[1].trim();
		body = body.replace(/\[[^\]]+\]/, '').trim();
	}

	return { subtitle, body, organizer };
}

/** Word-boundary check — avoids false positives like "format" matching "mat" */
function hasWord(text: string, word: string): boolean {
	return new RegExp(`\\b${word}\\b`).test(text);
}
/** Check for Norwegian compound words ending with the keyword */
function hasCompound(text: string, suffix: string): boolean {
	return new RegExp(`\\w${suffix}\\b`).test(text);
}

function guessCategory(title: string, description: string): string {
	const text = `${title} ${description}`.toLowerCase();
	if (hasWord(text, 'konsert') || hasWord(text, 'live') || hasWord(text, 'dj') || hasWord(text, 'musikk') || hasWord(text, 'music') || hasWord(text, 'band')) return 'music';
	if (hasWord(text, 'quiz') || hasCompound(text, 'quiz') || hasCompound(text, 'kviss')) return 'nightlife';
	if (hasWord(text, 'stand-up') || hasCompound(text, 'standup') || hasWord(text, 'komedie') || hasWord(text, 'comedy')) return 'nightlife';
	if (hasWord(text, 'fest') || hasWord(text, 'party') || hasWord(text, 'natt') || hasWord(text, 'klubb')) return 'nightlife';
	if (text.includes('mat og drikke') || hasWord(text, 'food') || hasWord(text, 'øl') || hasWord(text, 'vin') || hasCompound(text, 'smaking') || hasWord(text, 'tasting')) return 'food';
	if (hasWord(text, 'workshop') || hasWord(text, 'kurs')) return 'workshop';
	if (hasWord(text, 'utstilling') || hasWord(text, 'kunst') || hasWord(text, 'art')) return 'culture';
	return 'nightlife'; // bar venue default
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bodega Google Calendar events...`);

	const now = new Date();
	const timeMin = now.toISOString();
	const timeMax = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(); // 6 months

	const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?` +
		`key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&maxResults=200&singleEvents=true&orderBy=startTime`;

	let events: GCalEvent[];
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': USER_AGENT },
		});
		if (!res.ok) {
			console.error(`[${SOURCE}] HTTP ${res.status}: ${await res.text()}`);
			return { found: 0, inserted: 0 };
		}
		const data = await res.json();
		events = data.items || [];
	} catch (err) {
		console.error(`[${SOURCE}] Fetch failed: ${err instanceof Error ? err.message : err}`);
		return { found: 0, inserted: 0 };
	}

	console.log(`[${SOURCE}] Fetched ${events.length} calendar events`);

	let found = 0;
	let inserted = 0;

	for (let i = 0; i < events.length; i++) {
		const ev = events[i];
		const title = ev.summary?.trim();
		if (!title) continue;

		const rawDescription = ev.description || '';

		// Filter non-public events
		if (isExcluded(title, rawDescription)) {
			console.log(`  - Skipping non-public: "${title}"`);
			continue;
		}

		found++;

		// Use Google Calendar HTML link as source_url (unique per event)
		const sourceUrl = ev.htmlLink || `https://calendar.google.com/calendar/event?eid=${ev.id}`;

		if (await eventExists(sourceUrl)) continue;

		// Parse dates — Google Calendar API returns dateTime (with timezone) or date (all-day)
		const startRaw = ev.start.dateTime || ev.start.date;
		const endRaw = ev.end?.dateTime || ev.end?.date;

		if (!startRaw) continue;

		let dateStart: string;
		let dateEnd: string | undefined;

		if (ev.start.dateTime) {
			// dateTime includes timezone offset — parse directly
			dateStart = new Date(ev.start.dateTime).toISOString();
		} else if (ev.start.date) {
			// All-day event — use midnight placeholder
			dateStart = `${ev.start.date}T00:00:00Z`;
		} else {
			continue;
		}

		if (ev.end?.dateTime) {
			dateEnd = new Date(ev.end.dateTime).toISOString();
		} else if (ev.end?.date) {
			// All-day end date — Google uses exclusive end date, so it's already the next day
			dateEnd = undefined; // Skip end for all-day events
		}

		const datePart = dateStart.slice(0, 10);
		const { subtitle, body, organizer } = parseDescription(rawDescription);
		const category = guessCategory(title, rawDescription);
		const bydel = mapBydel(VENUE);

		// Build a richer title context for AI description
		const titleForAi = subtitle ? `${title} — ${subtitle}` : title;

		if (i > 0) await delay(1000);

		const aiDesc = await generateDescription({
			title: titleForAi,
			venue: VENUE,
			category,
			date: new Date(dateStart),
			price: '',
		});

		const success = await insertEvent({
			slug: makeSlug(title, datePart),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: VENUE,
			address: ADDRESS,
			bydel,
			price: '',
			ticket_url: undefined,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: undefined,
			age_group: '18+',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${datePart} ${category})`);
			inserted++;
		}
	}

	console.log(`[${SOURCE}] Done: found ${found}, inserted ${inserted}`);
	return { found, inserted };
}

// Standalone execution
if (process.argv[1]?.includes('bodega')) {
	scrape().then(r => {
		console.log(`\nResult: ${r.found} found, ${r.inserted} inserted`);
		process.exit(0);
	}).catch(err => {
		console.error(err);
		process.exit(1);
	});
}
