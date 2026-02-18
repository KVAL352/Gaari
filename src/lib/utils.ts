import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// ── Date formatting ──

export function formatEventDate(dateStr: string, locale: 'no' | 'en' = 'no'): string {
	const date = new Date(dateStr);
	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffDays = Math.round((eventDay.getTime() - todayStart.getTime()) / 86400000);

	if (diffDays === 0) return locale === 'no' ? 'I dag' : 'Today';
	if (diffDays === 1) return locale === 'no' ? 'I morgen' : 'Tomorrow';
	if (diffDays >= 2 && diffDays <= 6) {
		return date.toLocaleDateString(locale === 'no' ? 'nb-NO' : 'en-GB', { weekday: 'long' });
	}
	return date.toLocaleDateString(locale === 'no' ? 'nb-NO' : 'en-GB', {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});
}

export function formatEventTime(dateStr: string, locale: 'no' | 'en' = 'no'): string {
	const date = new Date(dateStr);
	return date.toLocaleTimeString(locale === 'no' ? 'nb-NO' : 'en-GB', {
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function formatDateSectionHeader(dateStr: string, locale: 'no' | 'en' = 'no'): string {
	const date = new Date(dateStr);
	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffDays = Math.round((eventDay.getTime() - todayStart.getTime()) / 86400000);

	if (diffDays === 0) return locale === 'no' ? 'I dag' : 'Today';
	if (diffDays === 1) return locale === 'no' ? 'I morgen' : 'Tomorrow';

	return date.toLocaleDateString(locale === 'no' ? 'nb-NO' : 'en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});
}

// ── Price formatting ──

export function formatPrice(price: string | number | null, locale: 'no' | 'en' = 'no'): string {
	if (price === null || price === undefined || price === '' || price === 0 || price === '0' || price === 'Free' || price === 'Gratis') {
		return locale === 'no' ? 'Gratis' : 'Free';
	}
	if (typeof price === 'string' && isNaN(Number(price))) {
		return price;
	}
	const amount = typeof price === 'string' ? Number(price) : price;
	return `kr ${amount}`;
}

export function isFreeEvent(price: string | number | null): boolean {
	return price === null || price === undefined || price === '' || price === 0 || price === '0' || price === 'Free' || price === 'Gratis';
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
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

// ── Date grouping ──

export function getDateKey(dateStr: string): string {
	const date = new Date(dateStr);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

// ── ICS export ──

export function generateICS(event: {
	title: string;
	description?: string;
	date_start: string;
	date_end?: string;
	venue_name?: string;
	address?: string;
}): string {
	const formatICSDate = (d: string) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

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

export function downloadICS(event: Parameters<typeof generateICS>[0]) {
	const ics = generateICS(event);
	const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${slugify(event.title)}.ics`;
	a.click();
	URL.revokeObjectURL(url);
}
