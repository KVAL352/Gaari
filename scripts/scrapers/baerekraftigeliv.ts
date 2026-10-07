import { makeSlug, eventExists, insertEvent, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';
import { resolveTicketUrl } from '../lib/venues.js';

const SOURCE = 'baerekraftigeliv';
const FEED_URL = 'https://gjer.no/@bll/feed/ics';
const BYDEL = 'Årstad'; // Landås, jf. mapBydel

// Arrangøren er Bærekraftige Liv Landås. Gruppesiden ligger på gjer.no, en
// Mobilizon-side, så feeden kan i prinsippet få arrangementer fra andre steder
// enn Landås. Derfor krever vi koordinater innenfor Bergen og hopper over alt
// uten sted (se docs/new-scraper-checklist.md, punkt A).
const BERGEN_BOUNDS = { latMin: 60.2, latMax: 60.6, lonMin: 5.1, lonMax: 5.6 };

interface IcsEvent {
	summary: string;
	start: string;
	end?: string;
	location?: string;
	geo?: string;
	url?: string;
	image?: string;
}

// RFC 5545: lange linjer brytes med CRLF + mellomrom eller tab. Verdier
// escapes med backslash.
function unfold(text: string): string[] {
	return text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
}

function unescapeIcs(value: string): string {
	return value.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
}

// «20261010T100000» eller «20261010T100000Z». Feeden bruker TZID=Europe/Oslo,
// så klokkeslettet er lokalt og tolkes med Bergen-offset.
function parseIcsDate(value: string): string | undefined {
	const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
	if (!m) return undefined;
	const [, y, mo, d, h, mi, s, z] = m;
	const datePart = `${y}-${mo}-${d}`;
	const iso = z
		? `${datePart}T${h}:${mi}:${s}Z`
		: `${datePart}T${h}:${mi}:${s}${bergenOffset(datePart)}`;
	const date = new Date(iso);
	return isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseEvents(ics: string): IcsEvent[] {
	const events: IcsEvent[] = [];
	let current: Partial<IcsEvent> | null = null;

	for (const line of unfold(ics)) {
		if (line === 'BEGIN:VEVENT') {
			current = {};
			continue;
		}
		if (line === 'END:VEVENT') {
			if (current?.summary && current.start) events.push(current as IcsEvent);
			current = null;
			continue;
		}
		if (!current) continue;

		const colon = line.indexOf(':');
		if (colon < 0) continue;
		const name = line.slice(0, colon).split(';')[0].toUpperCase();
		const value = line.slice(colon + 1);

		if (name === 'SUMMARY') current.summary = unescapeIcs(value);
		else if (name === 'DTSTART') {
			const iso = parseIcsDate(value);
			if (iso) current.start = iso;
		} else if (name === 'DTEND') current.end = parseIcsDate(value);
		else if (name === 'LOCATION') current.location = unescapeIcs(value);
		else if (name === 'GEO') current.geo = value.trim();
		else if (name === 'ATTACH' && /FMTTYPE=image\//i.test(line.slice(0, colon)) && /^https?:\/\//.test(value)) {
			current.image = value.trim();
		}
		else if (name === 'URL') current.url = value.trim();
	}
	return events;
}

function isInBergen(geo?: string): boolean {
	if (!geo) return false;
	const [lat, lon] = geo.split(';').map(Number);
	if (isNaN(lat) || isNaN(lon)) return false;
	return (
		lat >= BERGEN_BOUNDS.latMin && lat <= BERGEN_BOUNDS.latMax &&
		lon >= BERGEN_BOUNDS.lonMin && lon <= BERGEN_BOUNDS.lonMax
	);
}

function mapCategory(title: string): string {
	if (/barn|skjermfri|leke/i.test(title)) return 'family';
	if (/spikk|søm|kurs|verksted/i.test(title)) return 'workshop';
	return 'culture';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bærekraftige Liv Landås events from ICS feed...`);

	let ics: string;
	try {
		const res = await fetch(FEED_URL, {
			headers: { 'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)' },
		});
		if (!res.ok) {
			console.error(`[${SOURCE}] Feed returned ${res.status}`);
			return { found: 0, inserted: 0 };
		}
		ics = await res.text();
	} catch (err: any) {
		console.error(`[${SOURCE}] Feed error: ${err.message}`);
		return { found: 0, inserted: 0 };
	}

	const events = parseEvents(ics);
	console.log(`[${SOURCE}] ${events.length} events in feed`);

	let found = 0;
	let inserted = 0;
	const now = Date.now();

	for (const ev of events) {
		if (!ev.url) continue;
		if (new Date(ev.start).getTime() < now) continue;

		if (!ev.location || !isInBergen(ev.geo)) {
			console.log(`  - hopper over «${ev.summary}»: mangler sted eller ligger utenfor Bergen`);
			continue;
		}

		found++;
		if (await eventExists(ev.url)) continue;

		// «Sykkelkaféen på Landås, Lægdesvingen 3, 5096 Bergen, Norge»: navnet er
		// første ledd, resten er adressen. Står bare et navn, har vi ingen adresse.
		const [venueName, ...rest] = ev.location.split(',').map(s => s.trim());
		const fullAddress = rest.length > 0
			? rest.filter(p => !/^norge$/i.test(p)).join(', ')
			: `${venueName}, Bergen`;

		const category = mapCategory(ev.summary);

		const aiDesc = await generateDescription({
			title: ev.summary,
			venue: venueName,
			category,
			date: new Date(ev.start),
			price: '',
			bydel: BYDEL,
			address: fullAddress,
		});

		// Bildet vises som hot-link. Samtykket (kun visning) står i consent.json.
		const success = await insertEvent({
			slug: makeSlug(ev.summary, ev.start),
			title_no: ev.summary,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: ev.start,
			date_end: ev.end,
			venue_name: venueName,
			address: fullAddress,
			bydel: BYDEL,
			price: '',
			ticket_url: resolveTicketUrl(venueName, ev.url),
			source: SOURCE,
			source_url: ev.url,
			image_url: ev.image,
			age_group: category === 'family' ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${ev.summary} (${category}, ${ev.start.slice(0, 10)})`);
			inserted++;
		}
	}

	return { found, inserted };
}
