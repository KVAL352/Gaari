import { supabase } from './supabase.js';

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove accents
		.replace(/[æ]/g, 'ae')
		.replace(/[ø]/g, 'o')
		.replace(/[å]/g, 'a')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')
		.slice(0, 80);
}

export function makeSlug(title: string, dateStr?: string): string {
	const base = slugify(title);
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
const NORWEGIAN_MONTHS: Record<string, number> = {
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
			return new Date(year, month, day, 12, 0, 0).toISOString();
		}
	}

	// "9 Jan 2026" format (day month year, no period)
	const dMyMatch = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
	if (dMyMatch) {
		const day = parseInt(dMyMatch[1]);
		const month = NORWEGIAN_MONTHS[dMyMatch[2].toLowerCase().slice(0, 3)];
		const year = parseInt(dMyMatch[3]);
		if (month !== undefined) {
			return new Date(year, month, day, 12, 0, 0).toISOString();
		}
	}

	// "Feb 19, 2026" format
	const enMatch = str.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
	if (enMatch) {
		const month = NORWEGIAN_MONTHS[enMatch[1].toLowerCase().slice(0, 3)];
		const day = parseInt(enMatch[2]);
		const year = parseInt(enMatch[3]);
		if (month !== undefined) {
			return new Date(year, month, day, 12, 0, 0).toISOString();
		}
	}

	// "19/02/2026" or "2026-02-19" format
	const slashMatch = str.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
	if (slashMatch) {
		const day = parseInt(slashMatch[1]);
		const month = parseInt(slashMatch[2]) - 1;
		const year = parseInt(slashMatch[3]);
		return new Date(year, month, day, 12, 0, 0).toISOString();
	}

	return null;
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

export async function insertEvent(event: ScrapedEvent): Promise<boolean> {
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
		.replace(/20\d{2}/g, '')           // Remove years
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
		// Check if one title contains the other (handles "Venue: Event Title" vs "Event Title")
		if (normalized.includes(existingNorm) || existingNorm.includes(normalized)) {
			return true;
		}
		// Check high overlap (Levenshtein-like: shared substring ratio)
		if (normalized.length >= 8 && existingNorm.length >= 8) {
			const shorter = normalized.length < existingNorm.length ? normalized : existingNorm;
			const longer = normalized.length < existingNorm.length ? existingNorm : normalized;
			if (longer.includes(shorter.slice(0, Math.floor(shorter.length * 0.8)))) {
				return true;
			}
		}
	}

	return false;
}

// Remove expired events (date_end or date_start is in the past)
export async function removeExpiredEvents(): Promise<number> {
	const now = new Date().toISOString();

	// Delete events where date_end is past (multi-day events that have ended)
	const { data: endedEvents } = await supabase
		.from('events')
		.select('id')
		.not('date_end', 'is', null)
		.lt('date_end', now);

	// Delete events where date_start is past and no date_end
	const { data: pastEvents } = await supabase
		.from('events')
		.select('id')
		.is('date_end', null)
		.lt('date_start', now);

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
const CATEGORY_LABELS_NO: Record<string, string> = {
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

export function makeDescription(title: string, venueName: string, category: string): string {
	const catLabel = CATEGORY_LABELS_NO[category] || 'Arrangement';
	return `${catLabel} på ${venueName}`;
}

// Delay helper for rate limiting
export function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch HTML with error handling
export async function fetchHTML(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
				'Accept': 'text/html',
				'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.5',
			},
		});
		if (!res.ok) {
			console.error(`  HTTP ${res.status} for ${url}`);
			return null;
		}
		return await res.text();
	} catch (err: any) {
		console.error(`  Fetch error for ${url}:`, err.message);
		return null;
	}
}
