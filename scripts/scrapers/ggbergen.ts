import { makeSlug, eventExists, insertEvent, delay, bergenOffset, stripHtml } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';
import { mapBydel } from '../lib/categories.js';

const SOURCE = 'gg-bergen';
const VENUE = 'GG Bergen';
const ADDRESS = 'Herman Grans vei 6, 5162 Laksevåg';
const WEBSITE = 'https://ggbergen.org';

// 3 public Google Calendars shared by GG Bergen
const CALENDARS = [
	{
		id: '2125bfe3a44c509c90627e12906446e6416028444f1d8049c266f68b352bd438@group.calendar.google.com',
		label: 'FGC Fredager',
	},
	{
		id: 'mo0b2bv274mgpcqdffj3hf238o@group.calendar.google.com',
		label: 'Nintendo / Lørdager',
	},
	{
		id: '42f35cca3d25857f267c1b3e0ab094b8b11b9e09c07ed175082d5c182a9728be@group.calendar.google.com',
		label: 'Spesielle & Eksterne',
	},
];

const LOOKAHEAD_DAYS = 30;
const USER_AGENT = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';

// ── iCal parsing helpers ──────────────────────────────────────────────

interface ICalEvent {
	uid: string;
	summary: string;
	dtstart: string; // ISO 8601 UTC
	dtend?: string;
	location?: string;
	description?: string;
	rrule?: string;
	exdates: string[]; // ISO 8601 UTC dates to exclude
	recurrenceId?: string;
}

/** Unfold iCal long lines (continuation lines start with space or tab) */
function unfold(ics: string): string {
	return ics.replace(/\r?\n[ \t]/g, '');
}

/** Get value of an iCal property from a line */
function getProp(lines: string[], prop: string): string | undefined {
	for (const line of lines) {
		// Match property name, possibly with params (e.g. DTSTART;TZID=...)
		if (line.startsWith(prop + ':') || line.startsWith(prop + ';')) {
			const colonIdx = line.indexOf(':');
			return colonIdx >= 0 ? line.substring(colonIdx + 1).trim() : undefined;
		}
	}
	return undefined;
}

/** Get all values of a property (for EXDATE which can appear multiple times) */
function getAllProp(lines: string[], prop: string): string[] {
	const values: string[] = [];
	for (const line of lines) {
		if (line.startsWith(prop + ':') || line.startsWith(prop + ';')) {
			const colonIdx = line.indexOf(':');
			if (colonIdx >= 0) values.push(line.substring(colonIdx + 1).trim());
		}
	}
	return values;
}

/**
 * Parse an iCal datetime value to an ISO 8601 UTC string.
 * Handles: 20250613T170000Z (UTC), 20250613T170000 (floating/local),
 * and dates paired with a TZID (treat as Europe/Brussels ≈ Europe/Oslo).
 */
function parseICalDate(value: string, fallbackDate?: string): string {
	// Remove any trailing whitespace
	value = value.trim();

	if (value.endsWith('Z')) {
		// Already UTC
		const y = value.slice(0, 4), mo = value.slice(4, 6), d = value.slice(6, 8);
		const h = value.slice(9, 11), mi = value.slice(11, 13), s = value.slice(13, 15);
		return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
	}

	// Floating or TZID date — treat as Europe/Oslo (same offset as Brussels)
	if (value.length >= 15 && value.includes('T')) {
		const y = value.slice(0, 4), mo = value.slice(4, 6), d = value.slice(6, 8);
		const h = value.slice(9, 11), mi = value.slice(11, 13), s = value.slice(13, 15);
		const dateStr = `${y}-${mo}-${d}`;
		const offset = bergenOffset(dateStr);
		return new Date(`${dateStr}T${h}:${mi}:${s}${offset}`).toISOString();
	}

	// Date-only (YYYYMMDD)
	if (value.length === 8) {
		const y = value.slice(0, 4), mo = value.slice(4, 6), d = value.slice(6, 8);
		return `${y}-${mo}-${d}T00:00:00Z`;
	}

	return fallbackDate || new Date().toISOString();
}

/** Parse VEVENT blocks from iCal text */
function parseEvents(ics: string): ICalEvent[] {
	const unfolded = unfold(ics);
	const events: ICalEvent[] = [];
	const blocks = unfolded.split('BEGIN:VEVENT');

	for (let i = 1; i < blocks.length; i++) {
		const endIdx = blocks[i].indexOf('END:VEVENT');
		if (endIdx === -1) continue;
		const block = blocks[i].substring(0, endIdx);
		const lines = block.split(/\r?\n/).filter(l => l.trim());

		const uid = getProp(lines, 'UID') || `unknown-${i}`;
		const summary = getProp(lines, 'SUMMARY') || '';
		const dtstart = getProp(lines, 'DTSTART') || '';
		const dtend = getProp(lines, 'DTEND');
		const location = getProp(lines, 'LOCATION')?.replace(/\\,/g, ',').replace(/\\n/g, '\n');
		const description = getProp(lines, 'DESCRIPTION')?.replace(/\\,/g, ',').replace(/\\n/g, '\n');
		const rrule = getProp(lines, 'RRULE');
		const recurrenceId = getProp(lines, 'RECURRENCE-ID');
		const exdateValues = getAllProp(lines, 'EXDATE');

		const exdates = exdateValues.map(v => parseICalDate(v).slice(0, 10));

		events.push({
			uid,
			summary: summary.replace(/\\,/g, ',').replace(/\\;/g, ';'),
			dtstart: parseICalDate(dtstart),
			dtend: dtend ? parseICalDate(dtend) : undefined,
			location,
			description,
			rrule,
			exdates,
			recurrenceId,
		});
	}

	return events;
}

// ── RRULE expansion ───────────────────────────────────────────────────

interface ExpandedEvent {
	uid: string;
	summary: string;
	dtstart: string;
	dtend?: string;
	location?: string;
	description?: string;
}

/** Expand recurring events into individual occurrences within the lookahead window */
function expandEvents(icalEvents: ICalEvent[]): ExpandedEvent[] {
	const now = new Date();
	const cutoff = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
	const todayStr = now.toISOString().slice(0, 10);
	const cutoffStr = cutoff.toISOString().slice(0, 10);
	const result: ExpandedEvent[] = [];

	// Collect recurrence-id overrides (these replace specific instances of a recurring event)
	const overrides = new Set<string>();
	for (const ev of icalEvents) {
		if (ev.recurrenceId) {
			const overrideDate = parseICalDate(ev.recurrenceId).slice(0, 10);
			overrides.add(`${ev.uid.split('_')[0]}:${overrideDate}`);
		}
	}

	for (const ev of icalEvents) {
		if (!ev.summary || !ev.dtstart) continue;

		// If this is a recurrence override, treat as a single event
		if (ev.recurrenceId) {
			const startDate = ev.dtstart.slice(0, 10);
			if (startDate >= todayStr && startDate <= cutoffStr) {
				result.push({
					uid: ev.uid,
					summary: ev.summary,
					dtstart: ev.dtstart,
					dtend: ev.dtend,
					location: ev.location,
					description: ev.description,
				});
			}
			continue;
		}

		if (!ev.rrule) {
			// Single event
			const startDate = ev.dtstart.slice(0, 10);
			if (startDate >= todayStr && startDate <= cutoffStr) {
				result.push({
					uid: ev.uid,
					summary: ev.summary,
					dtstart: ev.dtstart,
					dtend: ev.dtend,
					location: ev.location,
					description: ev.description,
				});
			}
			continue;
		}

		// Parse RRULE
		const rules = Object.fromEntries(
			ev.rrule.split(';').map(part => {
				const [k, v] = part.split('=');
				return [k, v];
			})
		);

		const freq = rules.FREQ;
		const interval = parseInt(rules.INTERVAL || '1', 10);
		const until = rules.UNTIL ? parseICalDate(rules.UNTIL) : cutoff.toISOString();
		const count = rules.COUNT ? parseInt(rules.COUNT, 10) : undefined;
		const byDay = rules.BYDAY; // e.g. "FR", "SA"

		if (freq !== 'WEEKLY' && freq !== 'DAILY') {
			// Only handle WEEKLY and DAILY for now
			const startDate = ev.dtstart.slice(0, 10);
			if (startDate >= todayStr && startDate <= cutoffStr) {
				result.push({
					uid: ev.uid,
					summary: ev.summary,
					dtstart: ev.dtstart,
					dtend: ev.dtend,
					location: ev.location,
					description: ev.description,
				});
			}
			continue;
		}

		// Calculate duration for dtend offset
		const startMs = new Date(ev.dtstart).getTime();
		const durationMs = ev.dtend ? new Date(ev.dtend).getTime() - startMs : 0;

		const effectiveUntil = new Date(Math.min(new Date(until).getTime(), cutoff.getTime()));
		const step = freq === 'WEEKLY' ? interval * 7 : interval;

		let current = new Date(ev.dtstart);
		let generated = 0;

		while (current <= effectiveUntil) {
			if (count !== undefined && generated >= count) break;

			const dateStr = current.toISOString().slice(0, 10);

			if (dateStr >= todayStr && dateStr <= cutoffStr) {
				// Check EXDATE exclusions
				if (!ev.exdates.includes(dateStr)) {
					// Check for recurrence override
					const baseUid = ev.uid.split('_')[0];
					if (!overrides.has(`${baseUid}:${dateStr}`)) {
						const instanceStart = current.toISOString();
						result.push({
							uid: `${ev.uid}_${dateStr}`,
							summary: ev.summary,
							dtstart: instanceStart,
							dtend: durationMs ? new Date(current.getTime() + durationMs).toISOString() : undefined,
							location: ev.location,
							description: ev.description,
						});
					}
				}
			}

			current = new Date(current.getTime() + step * 24 * 60 * 60 * 1000);
			generated++;
		}
	}

	return result;
}

// ── Main scraper ──────────────────────────────────────────────────────

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Scraping GG Bergen Google Calendars...`);

	let found = 0;
	let inserted = 0;

	for (let ci = 0; ci < CALENDARS.length; ci++) {
		const cal = CALENDARS[ci];
		if (ci > 0) await delay(1500);

		const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(cal.id)}/public/basic.ics`;
		console.log(`  [${cal.label}] Fetching calendar...`);

		let icsText: string;
		try {
			const res = await fetch(icsUrl, {
				headers: { 'User-Agent': USER_AGENT },
			});
			if (!res.ok) {
				console.warn(`  [${cal.label}] HTTP ${res.status} — skipping`);
				continue;
			}
			icsText = await res.text();
		} catch (err) {
			console.warn(`  [${cal.label}] Fetch failed: ${err instanceof Error ? err.message : err}`);
			continue;
		}

		const icalEvents = parseEvents(icsText);
		const expanded = expandEvents(icalEvents);
		console.log(`  [${cal.label}] ${icalEvents.length} calendar entries → ${expanded.length} upcoming events`);

		for (const ev of expanded) {
			found++;

			// Build a stable source URL from calendar ID + UID + date
			const dateStr = ev.dtstart.slice(0, 10);
			const sourceUrl = `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(ev.uid)}&ctz=Europe/Oslo`;

			if (await eventExists(sourceUrl)) continue;

			// Determine category from event title
			const category = guessCategory(ev.summary);

			// GG Bergen events are free with 13+ age limit
			const price = 'Gratis';
			const ageGroup = 'all';

			// Clean up title — remove "GGB Laksevåg - " prefix
			const title = ev.summary
				.replace(/^GGB\s+Laksevåg\s*-\s*/i, '')
				.replace(/^GGB\s+/i, '')
				.trim();

			// Venue: use event location if different from default, else default
			const location = ev.location || '';
			const venueName = location.includes('GG Bergen') || !location
				? VENUE
				: location.split(',')[0].trim() || VENUE;
			const address = location.includes(',')
				? location.split(',').slice(1).join(',').trim()
				: ADDRESS;
			const bydel = mapBydel(venueName) || mapBydel(location) || 'Laksevåg';

			const aiDesc = await generateDescription({
				title,
				venue: venueName,
				category,
				date: new Date(ev.dtstart),
				price,
			});

			const success = await insertEvent({
				slug: makeSlug(title, dateStr),
				title_no: title,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				category,
				date_start: ev.dtstart,
				date_end: ev.dtend,
				venue_name: venueName,
				address,
				bydel,
				price,
				ticket_url: WEBSITE,
				source: SOURCE,
				source_url: sourceUrl,
				image_url: undefined,
				age_group: ageGroup,
				language: 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${title} (${dateStr} ${category})`);
				inserted++;
			}
		}
	}

	console.log(`[${SOURCE}] Done: found ${found}, inserted ${inserted}`);
	return { found, inserted };
}

function guessCategory(title: string): string {
	const lower = title.toLowerCase();
	if (lower.includes('fighting game') || lower.includes('fgc') || lower.includes('turnering')) return 'culture';
	if (lower.includes('smash') || lower.includes('nintendo') || lower.includes('mario')) return 'culture';
	if (lower.includes('spillkveld') || lower.includes('spillkultur') || lower.includes('brettspill')) return 'culture';
	if (lower.includes('pokémon') || lower.includes('pokemon')) return 'culture';
	if (lower.includes('konsert') || lower.includes('music')) return 'music';
	if (lower.includes('fest') || lower.includes('party')) return 'nightlife';
	if (lower.includes('barn') || lower.includes('familie')) return 'family';
	return 'culture';
}
