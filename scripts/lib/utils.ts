import { supabase } from './supabase.js';

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[æ]/g, 'ae')
		.replace(/[ø]/g, 'o')
		.replace(/[å]/g, 'a')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove accents
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')
		.slice(0, 80);
}

export function makeSlug(title: string, dateStr?: string): string {
	const base = slugify(title) || 'event';
	if (dateStr) {
		const date = new Date(dateStr);
		if (!isNaN(date.getTime())) {
			const ymd = date.toISOString().slice(0, 10);
			return `${base}-${ymd}`;
		}
	}
	return `${base}-${Date.now().toString(36)}`;
}

// Parse Norwegian date strings like "19. feb 2026", "Feb 19, 2026", etc.
export const NORWEGIAN_MONTHS: Record<string, number> = {
	'jan': 0, 'januar': 0,
	'feb': 1, 'februar': 1,
	'mar': 2, 'mars': 2,
	'apr': 3, 'april': 3,
	'mai': 4,
	'jun': 5, 'juni': 5,
	'jul': 6, 'juli': 6,
	'aug': 7, 'august': 7,
	'sep': 8, 'september': 8,
	'okt': 9, 'oktober': 9,
	'nov': 10, 'november': 10,
	'des': 11, 'desember': 11,
};

export function parseNorwegianDate(str: string): string | null {
	if (!str) return null;
	str = str.trim();

	// Try ISO format first
	const isoDate = new Date(str);
	if (!isNaN(isoDate.getTime()) && str.includes('-')) {
		return isoDate.toISOString();
	}

	// Norwegian format: "19. feb 2026" or "19. februar 2026"
	const noMatch = str.match(/(\d{1,2})\.\s*(\w+)\s*(\d{4})/);
	if (noMatch) {
		const day = parseInt(noMatch[1]);
		const month = NORWEGIAN_MONTHS[noMatch[2].toLowerCase()];
		const year = parseInt(noMatch[3]);
		if (month !== undefined) {
			return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
		}
	}

	// "9 Jan 2026" format (day month year, no period)
	const dMyMatch = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
	if (dMyMatch) {
		const day = parseInt(dMyMatch[1]);
		const month = NORWEGIAN_MONTHS[dMyMatch[2].toLowerCase().slice(0, 3)];
		const year = parseInt(dMyMatch[3]);
		if (month !== undefined) {
			return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
		}
	}

	// "Feb 19, 2026" format
	const enMatch = str.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
	if (enMatch) {
		const month = NORWEGIAN_MONTHS[enMatch[1].toLowerCase().slice(0, 3)];
		const day = parseInt(enMatch[2]);
		const year = parseInt(enMatch[3]);
		if (month !== undefined) {
			return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
		}
	}

	// "19/02/2026" or "2026-02-19" format
	const slashMatch = str.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
	if (slashMatch) {
		const day = parseInt(slashMatch[1]);
		const month = parseInt(slashMatch[2]) - 1;
		const year = parseInt(slashMatch[3]);
		return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
	}

	return null;
}

/**
 * Proper CET/CEST offset for Bergen, Norway.
 * DST: last Sunday of March 01:00 UTC → last Sunday of October 01:00 UTC.
 */
export function bergenOffset(dateStr: string): string {
	const d = new Date(dateStr + 'T12:00:00Z');
	const year = d.getUTCFullYear();
	// Last Sunday of March
	const marchLast = new Date(Date.UTC(year, 2, 31));
	const dstStart = new Date(Date.UTC(year, 2, 31 - marchLast.getUTCDay(), 1));
	// Last Sunday of October
	const octLast = new Date(Date.UTC(year, 9, 31));
	const dstEnd = new Date(Date.UTC(year, 9, 31 - octLast.getUTCDay(), 1));
	return (d >= dstStart && d < dstEnd) ? '+02:00' : '+01:00';
}

/**
 * Strip HTML tags from a string.
 */
export function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Check if an event with this source_url already exists
export async function eventExists(sourceUrl: string): Promise<boolean> {
	const { data } = await supabase
		.from('events')
		.select('id')
		.eq('source_url', sourceUrl)
		.limit(1);

	return (data && data.length > 0) || false;
}

// Delete a sold-out event by source_url (returns true if an event was deleted)
export async function deleteEventByUrl(sourceUrl: string): Promise<boolean> {
	const { data } = await supabase.from('events').delete().eq('source_url', sourceUrl).select('id');
	return (data && data.length > 0) || false;
}

// Opt-out filtering — domains that have requested removal
let optOutDomains: Set<string> | null = null;

export async function loadOptOuts(): Promise<void> {
	const { data, error } = await supabase
		.from('opt_out_requests')
		.select('domain')
		.eq('status', 'approved');

	if (error) {
		console.error('CRITICAL: Failed to load opt-outs:', error.message);
		throw new Error('Cannot proceed without opt-out list');
	}

	optOutDomains = new Set((data || []).map(r => r.domain.toLowerCase()));
	if (optOutDomains.size > 0) {
		console.log(`Loaded ${optOutDomains.size} opt-out domain(s): ${[...optOutDomains].join(', ')}`);
	}
}

/** Get loaded opt-out domains (for reuse in scrape.ts without duplicate query) */
export function getOptOutDomains(): string[] {
	return optOutDomains ? [...optOutDomains] : [];
}

export function isOptedOut(sourceUrl: string): boolean {
	if (!optOutDomains || optOutDomains.size === 0) return false;
	try {
		const hostname = new URL(sourceUrl).hostname.replace(/^www\./, '');
		// Check exact match AND subdomain match (e.g. api.example.com matches example.com)
		for (const domain of optOutDomains) {
			if (hostname === domain || hostname.endsWith('.' + domain)) return true;
		}
		return false;
	} catch {
		return false;
	}
}

// Detect free events from title/description text when price field is empty
const FREE_KEYWORDS = /\b(gratis|fri inngang|free entry|free admission|free event|ingen inngangspenger|kostnadsfritt)\b/i;

export function detectFreeFromText(title: string, description: string): boolean {
	return FREE_KEYWORDS.test(title) || FREE_KEYWORDS.test(description);
}

// Insert an event into Supabase
export interface ScrapedEvent {
	slug: string;
	title_no: string;
	title_en?: string;
	description_no: string;
	description_en?: string;
	category: string;
	date_start: string;
	date_end?: string;
	venue_name: string;
	address: string;
	bydel: string;
	price: string;
	ticket_url?: string;
	source: string;
	source_url: string;
	image_url?: string;
	age_group: string;
	language: string;
	status: string;
}

function isValidUrl(str: string): boolean {
	try {
		const u = new URL(str);
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

export async function insertEvent(event: ScrapedEvent): Promise<boolean> {
	// Validate required fields
	if (!event.title_no || event.title_no.trim().length < 2) {
		console.warn(`  Skipping event with empty/short title: "${event.title_no}"`);
		return false;
	}
	if (!event.slug || event.slug.length < 3) {
		console.warn(`  Skipping event with invalid slug: "${event.slug}"`);
		return false;
	}
	if (!event.date_start || isNaN(new Date(event.date_start).getTime())) {
		console.warn(`  Skipping event with invalid date_start: "${event.date_start}" (${event.title_no})`);
		return false;
	}
	if (!event.source_url || !isValidUrl(event.source_url)) {
		console.warn(`  Skipping event with invalid source_url: "${event.source_url}" (${event.title_no})`);
		return false;
	}

	// Reject past events (before start of today UTC)
	const todayStart = new Date();
	todayStart.setUTCHours(0, 0, 0, 0);
	const eventDate = new Date(event.date_start);
	if (eventDate < todayStart && !event.date_end) {
		return false; // Silently skip past events
	}

	// Sanitize optional ticket_url
	if (event.ticket_url && !isValidUrl(event.ticket_url)) {
		event.ticket_url = undefined;
	}

	if (isOptedOut(event.source_url)) {
		return false;
	}

	// Infer free price from title/description when price is empty
	if (!event.price && detectFreeFromText(event.title_no, event.description_no)) {
		event.price = 'Gratis';
	}

	const { error } = await supabase.from('events').insert(event);
	if (error) {
		// Duplicate slug — skip silently
		if (error.code === '23505') return false;
		console.error(`  Error inserting "${event.title_no}":`, error.message);
		return false;
	}
	return true;
}

// Normalize title for deduplication comparison
export function normalizeTitle(title: string): string {
	return title
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/[å]/g, 'a')
		.replace(/\b20[2-3]\d\b/g, '')     // Remove plausible years (2020-2039)
		.replace(/\b(bergen|i bergen)\b/g, '') // Remove "bergen"
		.replace(/[^a-z0-9]/g, '')         // Only alphanumeric
		.trim();
}

// Check if a similar event already exists (cross-source deduplication)
export async function findDuplicate(title: string, dateStart: string): Promise<boolean> {
	const dateDay = dateStart.slice(0, 10); // YYYY-MM-DD
	const normalized = normalizeTitle(title);
	if (normalized.length < 5) return false; // Too short to match reliably

	// Fetch events on the same day
	const { data } = await supabase
		.from('events')
		.select('title_no')
		.gte('date_start', `${dateDay}T00:00:00`)
		.lte('date_start', `${dateDay}T23:59:59`);

	if (!data || data.length === 0) return false;

	for (const existing of data) {
		const existingNorm = normalizeTitle(existing.title_no);
		// Check if one title contains the other — with length ratio guard
		if (normalized.includes(existingNorm) || existingNorm.includes(normalized)) {
			const shorter = normalized.length < existingNorm.length ? normalized : existingNorm;
			const longer = normalized.length < existingNorm.length ? existingNorm : normalized;
			if (shorter.length >= longer.length * 0.6) return true;
		}
		// Check 90% prefix overlap (tightened from 80%) with length ratio
		if (normalized.length >= 8 && existingNorm.length >= 8) {
			const shorter = normalized.length < existingNorm.length ? normalized : existingNorm;
			const longer = normalized.length < existingNorm.length ? existingNorm : normalized;
			if (longer.length <= shorter.length * 1.3) {
				if (longer.includes(shorter.slice(0, Math.floor(shorter.length * 0.9)))) {
					return true;
				}
			}
		}
	}

	return false;
}

// Remove expired events (date_end or date_start is in the past)
export async function removeExpiredEvents(): Promise<number> {
	// Use start-of-today as cutoff — don't delete today's events even if their time has passed
	const todayStart = new Date();
	todayStart.setUTCHours(0, 0, 0, 0);
	const cutoff = todayStart.toISOString();

	// Delete events where date_end is past (multi-day events that have ended)
	const { data: endedEvents } = await supabase
		.from('events')
		.select('id')
		.not('date_end', 'is', null)
		.lt('date_end', cutoff);

	// Delete events where date_start is before today and no date_end
	const { data: pastEvents } = await supabase
		.from('events')
		.select('id')
		.is('date_end', null)
		.lt('date_start', cutoff);

	const allIds = [
		...(endedEvents || []).map(e => e.id),
		...(pastEvents || []).map(e => e.id),
	];

	if (allIds.length === 0) return 0;

	// Delete in batches
	let deleted = 0;
	for (let i = 0; i < allIds.length; i += 100) {
		const batch = allIds.slice(i, i + 100);
		const { error } = await supabase
			.from('events')
			.delete()
			.in('id', batch);
		if (!error) deleted += batch.length;
	}

	return deleted;
}

// Generate a factual description from event metadata (avoids copying copyrighted text)
export const CATEGORY_LABELS_NO: Record<string, string> = {
	music: 'Konsert',
	culture: 'Kulturarrangement',
	theatre: 'Teater/scenekunst',
	family: 'Familieaktivitet',
	food: 'Mat og drikke',
	festival: 'Festival/marked',
	sports: 'Sport/friluft',
	nightlife: 'Uteliv',
	workshop: 'Kurs/workshop',
	student: 'Studentarrangement',
	tours: 'Tur/omvisning',
};

const CATEGORY_LABELS_EN: Record<string, string> = {
	music: 'Concert',
	culture: 'Cultural event',
	theatre: 'Theatre/performing arts',
	family: 'Family activity',
	food: 'Food & drink',
	festival: 'Festival/market',
	sports: 'Sports/outdoors',
	nightlife: 'Nightlife',
	workshop: 'Workshop/course',
	student: 'Student event',
	tours: 'Tour/guided visit',
};

export function makeDescription(title: string, venueName: string, category: string): string {
	const catLabel = CATEGORY_LABELS_NO[category] || 'Arrangement';
	return `${title} — ${catLabel} på ${venueName}`.slice(0, 160);
}

export function makeDescriptionEn(title: string, venueName: string, category: string): string {
	const catLabel = CATEGORY_LABELS_EN[category] || 'Event';
	return `${title} at ${venueName}`.slice(0, 160);
}

// Delay helper for rate limiting
export function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// SSRF protection: block requests to private/internal networks
function isPrivateUrl(urlStr: string): boolean {
	try {
		const parsed = new URL(urlStr);

		// Only allow http(s)
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;

		const hostname = parsed.hostname.toLowerCase();

		// Block localhost variants
		if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
		if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return true;

		// Block all bracketed IPv6 addresses
		if (hostname.startsWith('[')) return true;

		// Block numeric IP representations (decimal, hex, octal)
		if (/^(0x[\da-f]+|\d{8,})$/i.test(hostname)) return true;

		// Block private IPv4 ranges and cloud metadata
		const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
		if (ipv4Match) {
			const [, a, b] = ipv4Match.map(Number);
			if (a === 10) return true;                          // 10.0.0.0/8
			if (a === 127) return true;                         // 127.0.0.0/8 loopback
			if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
			if (a === 192 && b === 168) return true;             // 192.168.0.0/16
			if (a === 169 && b === 254) return true;             // link-local / cloud metadata
			if (a === 0) return true;                            // 0.0.0.0/8
		}

		return false;
	} catch {
		return true; // Invalid URL = block
	}
}

// Fetch HTML with error handling, SSRF protection, and timeout
export async function fetchHTML(url: string): Promise<string | null> {
	if (isPrivateUrl(url)) {
		console.error(`  Blocked private/internal URL: ${url}`);
		return null;
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15s timeout

	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
				'Accept': 'text/html',
				'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.5',
			},
			redirect: 'follow',
			signal: controller.signal,
		});

		// Check final URL after redirects for SSRF
		if (res.url && isPrivateUrl(res.url)) {
			console.error(`  Blocked redirect to private URL: ${res.url}`);
			return null;
		}

		if (!res.ok) {
			console.error(`  HTTP ${res.status} for ${url}`);
			return null;
		}
		return await res.text();
	} catch (err: any) {
		if (err.name === 'AbortError') {
			console.error(`  Timeout fetching ${url}`);
		} else {
			console.error(`  Fetch error for ${url}:`, err.message);
		}
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
}
