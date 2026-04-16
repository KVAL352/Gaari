// ── Date formatting ──

export function formatEventDate(dateStr: string, locale: 'no' | 'en' = 'no', dateEnd?: string): string {
	const date = new Date(dateStr);
	// Use Oslo timezone so SSR (UTC) and client (CET/CEST) produce identical output
	const osloDate = date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
	const nowOslo = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
	const diffDays = Math.round((new Date(osloDate).getTime() - new Date(nowOslo).getTime()) / 86400000);

	let startLabel: string;
	if (diffDays === 0) startLabel = locale === 'no' ? 'I dag' : 'Today';
	else if (diffDays === 1) startLabel = locale === 'no' ? 'I morgen' : 'Tomorrow';
	else if (diffDays >= 2 && diffDays <= 6) {
		startLabel = date.toLocaleDateString(locale === 'no' ? 'nb-NO' : 'en-GB', { weekday: 'long', timeZone: 'Europe/Oslo' });
	} else {
		startLabel = date.toLocaleDateString(locale === 'no' ? 'nb-NO' : 'en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			timeZone: 'Europe/Oslo'
		});
	}

	// Show date range for multi-day events (different calendar dates)
	if (dateEnd) {
		const endDate = new Date(dateEnd);
		const osloEnd = endDate.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
		if (osloEnd !== osloDate) {
			const loc = locale === 'no' ? 'nb-NO' : 'en-GB';
			const endLabel = endDate.toLocaleDateString(loc, { weekday: 'short', timeZone: 'Europe/Oslo' });
			const startShort = date.toLocaleDateString(loc, { weekday: 'short', timeZone: 'Europe/Oslo' });
			// Use short weekday range: "fre–lør" / "Fri–Sat"
			return `${startShort}–${endLabel}`;
		}
	}

	return startLabel;
}

/** Compact absolute date for meta titles — always "28. mar 2026" / "28 Mar 2026", never relative */
export function formatMetaDate(dateStr: string, locale: 'no' | 'en' = 'no'): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString(locale === 'no' ? 'nb-NO' : 'en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'Europe/Oslo'
	});
}

export function formatEventTime(dateStr: string, locale: 'no' | 'en' = 'no'): string {
	const date = new Date(dateStr);
	// Don't show time if it's the midnight UTC placeholder (scraped events without known times)
	if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) return '';
	// Use Oslo timezone explicitly so SSR (UTC) and client (CET/CEST) produce identical output
	return date.toLocaleTimeString(locale === 'no' ? 'nb-NO' : 'en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Oslo'
	});
}

export function formatDateSectionHeader(dateStr: string, locale: 'no' | 'en' = 'no'): string {
	const date = new Date(dateStr);
	const osloDate = date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
	const nowOslo = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
	const diffDays = Math.round((new Date(osloDate).getTime() - new Date(nowOslo).getTime()) / 86400000);

	if (diffDays === 0) return locale === 'no' ? 'I dag' : 'Today';
	if (diffDays === 1) return locale === 'no' ? 'I morgen' : 'Tomorrow';

	return date.toLocaleDateString(locale === 'no' ? 'nb-NO' : 'en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'Europe/Oslo'
	});
}

// ── Price formatting ──

export function formatPrice(price: string | number | null, locale: 'no' | 'en' = 'no'): string {
	if (isFreeEvent(price)) {
		return locale === 'no' ? 'Trolig gratis' : 'Likely free';
	}
	if (price === null || price === undefined || price === '') {
		return locale === 'no' ? 'Se pris' : 'See price';
	}
	if (typeof price === 'string' && isNaN(Number(price))) {
		// Single price (no range) — add "fra" prefix. Covers "X kr", "X,-", "X,00", "X NOK" etc.
		const simplePrice = price.match(/^(\d+)([,.][-\d0]*)?\s*(kr|nok)?$/i);
		if (simplePrice) {
			return locale === 'no' ? `fra ${price}` : `from ${price}`;
		}
		return price;
	}
	const amount = typeof price === 'string' ? Number(price) : price;
	return locale === 'no' ? `fra kr ${amount}` : `from kr ${amount}`;
}

// ── Tourist filter ──

// Norwegian-language-dependent entertainment — exclude even at tourist venues
const REQUIRES_NORWEGIAN_RE = /\bquiz\b|konferanse|\bseminar\b|\bforfatt|\bforedrag\b|\bdebatt\b|\bstand.?up|\bstandup|\bkomiker\b|\bhumorshow\b|\bklubbkveld\b|\bsmingel\b|\bprevansjon\b|\bhyttekos\b|på lerret|\bkoth\b|\bvoksenpoeng\b|\bkurs\b|\blesesirkel|\blitterær|\bhøytlesning|\bhandarbeid|\bhåndarbeid|\bstrikk|\bdatahjelp|\blinedans|\bline.?dance|\bseniordans|\bboksalg|\btensing\b|\bseniortur|\bturvenner|\bfottur|\bklovertur|\bkløvertur|\bgåtur|\bgatur\b|\bsenior\b|\bfilmklubb\b|\bknottekor|\bungdomskveld|\blanseringsfest/i;

// Categories that don't require Norwegian comprehension
const UNIVERSAL_CATEGORIES = new Set(['music', 'festival', 'nightlife', 'sports']);

// Venues tourists would visit (partial match against venue_name)
const TOURIST_VENUES = [
	// Museums & galleries
	'kode', 'permanenten', 'stenersen', 'lysverket', 'rasmus meyer', 'troldhaugen',
	'bergen kunsthall', 'akvariet', 'vilvite', 'bryggens museum', 'bymuseet',
	'hanseatiske', 'sjøfartsmuseet', 'fiskerimuseet', 'gamle bergen',
	'lepramuseet', 'schøtstuene', 'damsgård', 'rosenkrantztårnet',
	'håkonshallen', 'bergenhus festning', 'tekstilindustrimuseet', 'hordamuseet',
	'lydgalleriet',
	// Performance venues
	'grieghallen', 'ole bull', 'dns', 'den nationale scene', 'forum scene',
	'usf', 'sardinen', 'kulturhuset i bergen', 'det vestnorske teateret',
	'cornerteateret', 'bit teatergarasjen', 'carte blanche',
	'bergen kjøtt', 'oseana', 'konsertpaleet', 'studio bergen',
	// Nightlife & bars
	'hulen', 'madam felle', 'victoria', 'statsraaden', 'bodega',
	'østre', 'kvarteret', 'landmark', 'fincken',
	// Attractions & outdoor
	'fløibanen', 'fløyen', 'ulriken', 'koengen', 'nordnes sjøbad',
	// Cinema
	'bergen kino', 'cinemateket',
	// Food
	'stene matglede', 'colonialen',
];

export function isTouristFriendly(e: { title_no?: string; category?: string; venue_name?: string }): boolean {
	const title = e.title_no || '';
	if (REQUIRES_NORWEGIAN_RE.test(title)) return false;
	if (UNIVERSAL_CATEGORIES.has(e.category || '')) return true;
	const venue = (e.venue_name || '').toLowerCase();
	return TOURIST_VENUES.some(v => venue.includes(v));
}

/**
 * Extract the lowest numeric price from a price string.
 * Returns null if no price can be parsed (e.g. "Se pris", empty).
 */
export function parseLowestPrice(price: string | number | null): number | null {
	if (price === null || price === undefined || price === '') return null;
	if (typeof price === 'number') return price;
	// Normalize Norwegian thousand separators (space, non-breaking space, period before 3 digits)
	// "2 399 kr" → "2399 kr", "1.500,-" → "1500,-"
	const normalized = price.replace(/(\d)[\s\u00a0.](\d{3})\b/g, '$1$2');
	const numbers = normalized.match(/\d+/g);
	if (!numbers || numbers.length === 0) return null;
	return Math.min(...numbers.map(Number));
}

const AGE_RANGE_RE = /\((\d{1,2})\s*[-–]\s*(\d{1,2})\s*år\)/i;

// Re-export from venues.ts — single source of truth for student discounts
import { getStudentDiscount } from './venues';

/**
 * Returns true if the event's venue is known to offer student pricing.
 */
export function hasStudentPrice(venueName: string): boolean {
	return getStudentDiscount(venueName) !== undefined;
}

// ── Student filter patterns ──

// NOTE: \b doesn't work before Norwegian chars (å,æ,ø are \W in JS regex).
// Use (?:^|\s) or just drop \b for patterns starting with Norwegian letters.
const SENIOR_RE = /\bsenior|\bpensjonist|\beldretreff|(?:^|\s)eldre(?:\s|$)/i;
const CHILDREN_RE = /\bjunior(?:klubb)?(?:\s|$)|\bfor\s+barn|\bbarnas\s|\bbarneforestilling|\bfor\s+de(?:i)?\s+minste|(?:^|\s)språkle[ik]k?(?:\s|$)|\bhjelp\s+til\s+skole/i;
const YOUTH_TITLE_RE = /\bungdom|\bfor\s+ungdom|\bungdomskveld/i;
const UNG_STANDALONE_RE = /\bUNG\b/; // uppercase "UNG" = youth branding (Kulturrommet UNG)
const BUSINESS_RE = /(?:^|\s)næringsråd|(?:^|\s)næringsliv|\btransportplan|(?:^|\s)næringsforening|\bhandelsforening|(?:^|\s)årskonferanse|(?:^|\s)bærekraft|(?:^|\s)sjømaktseminar|\bserviceby/i;
const SENIOR_ACTIVITY_RE = /\benkel\s+fottur|\benkel\s+tur(?:\s|$)|\bturvenner(?:\s|$)|nabolagskaf[eé]|strikkekaf[eé]|\bdatahjelp|\blesesirkel|(?:^|\s)høytlesning\b.*(?:^|\s)håndarbeid|(?:^|\s)håndarbeid\s+for\s+alle/i;
const LITERARY_RE = /\bforfattertreff|\bbokbad|\bforfatterm[øo]te|\bboklubb(?:\s|$)|litter[æa]r\s+lunsj/i;
const BUSINESS_VENUES = ['bergen næringsråd', 'næringsforening', 'handelsforening'];

// Venues where students typically go — student-run, indie, or known student-discount venues
const STUDENT_VENUES = [
	'kvarteret', 'det akademiske kvarter',  // Norway's largest student cultural venue
	'hulen',                                 // Student-run rock club since 1968
	'garage',                                // Indie/rock, student crowd
	'landmark',                              // Alternative/indie
	'bergen kjøtt',                          // Cultural venue, young crowd
	'østre',                                 // Bar/venue, student area
	'fincken',                               // Bar, Nygårdshøyden
	'røkeriet',                              // Cultural venue
	'madam felle',                           // Popular student bar
	'café opera',                            // Student meeting spot
	'det lille teater',                       // Small theatre
	'studentsenteret',                       // UiB student centre
	'kulturhuset i bergen',                  // Alternative cultural venue
];

const STUDENT_SCORE_THRESHOLD = 3;

// Bydeler where students live and hang out — no penalty
const STUDENT_BYDELER = new Set(['Sentrum', 'Bergenhus']);

export function studentRelevanceScore(e: {
	title_no: string;
	description_no?: string;
	price: string | number;
	age_group: string;
	category: string;
	venue_name?: string;
	bydel?: string;
}): number {
	const title = e.title_no;
	const desc = e.description_no || '';
	const venue = (e.venue_name || '').toLowerCase();
	const text = `${title} ${desc}`;
	const lowest = parseLowestPrice(e.price);

	let score = 0;

	// ── Strong signals (+4) ──
	if (e.age_group === 'students' || e.category === 'student') score += 4;
	if (STUDENT_VENUES.some(sv => venue.includes(sv))) score += 4;
	if (/\bstudent/i.test(text)) score += 4;

	// ── Known student discount (+3) ──
	if (e.venue_name && getStudentDiscount(e.venue_name)) score += 3;

	// ── Price signals ──
	const isFree = lowest === 0 || (lowest === null && /gratis|\bfree\b/i.test(String(e.price)));
	if (isFree) score += 3;                           // free → strong signal
	else if (lowest !== null && lowest <= 150) score += 2;  // cheap → medium signal
	else if (lowest !== null && lowest <= 250) score += 1;  // moderate → weak signal

	// ── Category signals ──
	if (e.category === 'nightlife') score += 2;        // nightlife is core student activity
	if (e.category === 'festival') score += 2;         // festivals appeal to students
	if (e.category === 'music') score += 1;            // music needs price support
	if (e.category === 'sports') score += 2;           // Brann matches etc.
	if (e.category === 'theatre') score += 1;          // theatre needs price support

	// ── Weak positive signals (+1 each) ──
	if (e.age_group === '18+') score += 1;
	if (/quiz|\bpub\b|\bklubb/i.test(title)) score += 1;

	// ── Location penalty: outside student areas (−2) ──
	if (e.bydel && !STUDENT_BYDELER.has(e.bydel)) score -= 2;

	return score;
}

export function isStudentRelevant(e: {
	title_no: string;
	description_no?: string;
	price: string | number;
	age_group: string;
	category: string;
	venue_name?: string;
	bydel?: string;
}): boolean {
	// ── Always include: explicit student events ──
	if (e.age_group === 'students' || e.category === 'student') return true;

	// ── Hard exclusions (never student-relevant, regardless of score) ──
	if (e.age_group === 'family' || e.category === 'family') return false;
	if (e.age_group === 'youth') return false;

	const title = e.title_no;
	const desc = e.description_no || '';
	const venue = (e.venue_name || '').toLowerCase();
	const text = `${title} ${desc}`;

	if (SENIOR_RE.test(text) || SENIOR_RE.test(venue)) return false;
	if (CHILDREN_RE.test(title)) return false;
	if (YOUTH_TITLE_RE.test(title)) return false;
	if (UNG_STANDALONE_RE.test(title)) return false;
	if (BUSINESS_RE.test(text)) return false;
	if (BUSINESS_VENUES.some(v => venue.includes(v))) return false;
	if (SENIOR_ACTIVITY_RE.test(title)) return false;
	if (LITERARY_RE.test(title)) return false;

	const ageMatch = title.match(AGE_RANGE_RE);
	if (ageMatch && parseInt(ageMatch[1], 10) > 25) return false;

	const lowest = parseLowestPrice(e.price);
	if (lowest !== null && lowest > 350) return false;

	// ── Score-based inclusion ──
	return studentRelevanceScore(e) >= STUDENT_SCORE_THRESHOLD;
}

export function isFreeEvent(price: string | number | null): boolean {
	if (price === 0) return true;
	if (typeof price !== 'string' || price === '') return false;
	const normalized = price.trim().toLowerCase();
	if (normalized === '0' || normalized === 'free' || normalized === 'gratis') return true;
	return /^0\s*(kr|nok|,-|,00(\s*kr)?)$/i.test(normalized);
}

// ── Category helpers ──

import type { Category } from './types';

const categoryColors: Record<Category, string> = {
	music: 'var(--color-cat-music)',
	culture: 'var(--color-cat-culture)',
	theatre: 'var(--color-cat-theatre)',
	family: 'var(--color-cat-family)',
	food: 'var(--color-cat-food)',
	festival: 'var(--color-cat-festival)',
	sports: 'var(--color-cat-sports)',
	nightlife: 'var(--color-cat-nightlife)',
	workshop: 'var(--color-cat-workshop)',
	student: 'var(--color-cat-student)',
	tours: 'var(--color-cat-tours)'
};

export const CATEGORY_HEX_COLORS: Record<Category, string> = {
	music: '#AECDE8',
	culture: '#C5B8D9',
	theatre: '#E8B8C2',
	family: '#F5D49A',
	food: '#E8C4A0',
	festival: '#F5E0A0',
	sports: '#A8D4B8',
	nightlife: '#9BAED4',
	workshop: '#D4B89A',
	student: '#B8D4A8',
	tours: '#7FB8B8'
};

const categoryIcons: Record<Category, string> = {
	music: '🎵',
	culture: '🖼',
	theatre: '🎭',
	family: '👨‍👩‍👧',
	food: '🍽',
	festival: '🎪',
	sports: '⚽',
	nightlife: '🌙',
	workshop: '🔧',
	student: '🎓',
	tours: '🏔'
};

export function getCategoryColor(category: Category): string {
	return categoryColors[category] || 'var(--color-surface)';
}

export function getCategoryIcon(category: Category): string {
	return categoryIcons[category] || '📅';
}

// ── Slug helper ──

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[æ]/g, 'ae')
		.replace(/[ø]/g, 'o')
		.replace(/[å]/g, 'a')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove accents
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

// ── Date grouping ──

export function getDateKey(dateStr: string): string {
	// ISO date strings (YYYY-MM-DDTHH:mm) — slice is faster than Date constructor
	return dateStr.slice(0, 10);
}

/** Group events by date. Multi-day events (≤7 days) appear in each day's group
 *  so a Thu-Sat festival shows under Thu, Fri, and Sat. If `rangeFrom`/`rangeTo`
 *  are provided, expansion is clamped to that window. Long series (>7 days)
 *  appear only at date_start. Pass `expandMultiDay=false` to show every event
 *  exactly once on its start date (used where sparse 1-event days are noise).
 *
 *  For each instance in a day's group, date_start is rewritten to that day so
 *  the card renders the remaining range (on Fri it shows "fri–sun", on Sat
 *  "sat–sun", on Sun just "today"). date_end and time-of-day are preserved. */
export function groupEventsByDate<T extends { date_start: string; date_end?: string }>(events: T[], rangeFrom?: string, rangeTo?: string, expandMultiDay = true): Map<string, T[]> {
	const today = new Date().toISOString().slice(0, 10);
	const groups = new Map<string, T[]>();
	for (const event of events) {
		const startKey = getDateKey(event.date_start);
		const endKey = event.date_end ? getDateKey(event.date_end) : startKey;
		const durationDays = (new Date(endKey).getTime() - new Date(startKey).getTime()) / 86400000;
		const timeSuffix = event.date_start.slice(10); // preserve "T18:00:00+00:00"

		if (!expandMultiDay || durationDays > 7) {
			const key = startKey < today && event.date_end ? today : startKey;
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(event);
			continue;
		}

		const fromKey = rangeFrom && rangeFrom > today ? rangeFrom : today;
		const toKey = rangeTo && rangeTo < endKey ? rangeTo : endKey;
		const loopStart = startKey > fromKey ? startKey : fromKey;
		if (loopStart > toKey) continue;

		const cursor = new Date(loopStart + 'T00:00:00Z');
		const endCursor = new Date(toKey + 'T00:00:00Z');
		while (cursor <= endCursor) {
			const key = cursor.toISOString().slice(0, 10);
			if (!groups.has(key)) groups.set(key, []);
			// Rewrite date_start to the day this instance is shown under
			const instance = key === startKey
				? event
				: { ...event, date_start: key + timeSuffix };
			groups.get(key)!.push(instance as T);
			cursor.setUTCDate(cursor.getUTCDate() + 1);
		}
	}
	return groups;
}

// ── Calendar export ──

export interface CalendarEventData {
	title: string;
	description?: string;
	date_start: string;
	date_end?: string;
	venue_name?: string;
	address?: string;
}

function formatICSDate(d: string): string {
	return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatGoogleDate(d: string): string {
	return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
}

export function getGoogleCalendarUrl(event: CalendarEventData): string {
	const start = formatGoogleDate(event.date_start);
	const end = formatGoogleDate(event.date_end || event.date_start);
	const location = event.venue_name
		? `${event.venue_name}${event.address ? ', ' + event.address : ''}`
		: '';

	const params = new URLSearchParams({
		action: 'TEMPLATE',
		text: event.title,
		dates: `${start}/${end}`,
		location,
		details: event.description?.slice(0, 500) || ''
	});

	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function getOutlookCalendarUrl(event: CalendarEventData): string {
	const location = event.venue_name
		? `${event.venue_name}${event.address ? ', ' + event.address : ''}`
		: '';

	const params = new URLSearchParams({
		path: '/calendar/action/compose',
		rru: 'addevent',
		subject: event.title,
		startdt: new Date(event.date_start).toISOString(),
		enddt: new Date(event.date_end || event.date_start).toISOString(),
		location,
		body: event.description?.slice(0, 500) || ''
	});

	return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

export function generateICS(event: CalendarEventData): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Gaari//Bergen Events//NO',
		'BEGIN:VEVENT',
		`DTSTART:${formatICSDate(event.date_start)}`,
		`DTEND:${formatICSDate(event.date_end || event.date_start)}`,
		`SUMMARY:${event.title}`,
		event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
		event.venue_name ? `LOCATION:${event.venue_name}${event.address ? ', ' + event.address : ''}` : '',
		'END:VEVENT',
		'END:VCALENDAR'
	].filter(Boolean);

	return lines.join('\r\n');
}

// ── Outbound UTM tracking ──

export function buildOutboundUrl(
	url: string,
	context: string,
	venueSlug?: string,
	eventSlug?: string
): string {
	try {
		const u = new URL(url);
		u.searchParams.set('utm_source', 'gaari');
		u.searchParams.set('utm_medium', context);
		if (venueSlug) u.searchParams.set('utm_campaign', slugify(venueSlug));
		if (eventSlug) u.searchParams.set('utm_content', eventSlug);
		return u.toString();
	} catch {
		return url;
	}
}

export function downloadICS(event: CalendarEventData) {
	const ics = generateICS(event);
	const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${slugify(event.title)}.ics`;
	a.click();
	URL.revokeObjectURL(url);
}
