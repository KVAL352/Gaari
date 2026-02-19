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
