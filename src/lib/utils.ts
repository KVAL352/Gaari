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

export function groupEventsByDate<T extends { date_start: string }>(events: T[]): Map<string, T[]> {
	const groups = new Map<string, T[]>();
	for (const event of events) {
		const key = getDateKey(event.date_start);
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(event);
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
