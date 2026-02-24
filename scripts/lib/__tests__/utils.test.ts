import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing utils
vi.mock('../supabase.js', () => ({
	supabase: {
		from: () => ({
			select: () => ({ eq: () => ({ limit: () => ({ data: [] }) }) }),
			insert: () => ({ error: null }),
			delete: () => ({ in: () => ({ error: null }) })
		})
	}
}));

import {
	parseNorwegianDate,
	bergenOffset,
	normalizeTitle,
	slugify,
	stripHtml,
	makeDescription,
	makeDescriptionEn,
	isOptedOut
} from '../utils.js';

describe('parseNorwegianDate', () => {
	it('parses ISO format', () => {
		const result = parseNorwegianDate('2026-02-19');
		expect(result).not.toBeNull();
		expect(new Date(result!).toISOString()).toContain('2026-02-19');
	});

	it('parses "19. feb 2026" (Norwegian format)', () => {
		const result = parseNorwegianDate('19. feb 2026');
		expect(result).not.toBeNull();
		const d = new Date(result!);
		expect(d.getUTCFullYear()).toBe(2026);
		expect(d.getUTCMonth()).toBe(1); // February
		expect(d.getUTCDate()).toBe(19);
	});

	it('parses "9 Jan 2026" (day month year, no period)', () => {
		const result = parseNorwegianDate('9 Jan 2026');
		expect(result).not.toBeNull();
		const d = new Date(result!);
		expect(d.getUTCMonth()).toBe(0); // January
		expect(d.getUTCDate()).toBe(9);
	});

	it('parses "Feb 19, 2026" (English format)', () => {
		const result = parseNorwegianDate('Feb 19, 2026');
		expect(result).not.toBeNull();
		const d = new Date(result!);
		expect(d.getUTCMonth()).toBe(1);
		expect(d.getUTCDate()).toBe(19);
	});

	it('parses "19/02/2026" (slash format)', () => {
		const result = parseNorwegianDate('19/02/2026');
		expect(result).not.toBeNull();
		const d = new Date(result!);
		expect(d.getUTCMonth()).toBe(1);
		expect(d.getUTCDate()).toBe(19);
	});

	it('returns null for empty string', () => {
		expect(parseNorwegianDate('')).toBeNull();
	});

	it('returns null for unparseable string', () => {
		expect(parseNorwegianDate('not a date')).toBeNull();
	});

	it('sets time to 12:00 UTC for non-ISO formats', () => {
		const result = parseNorwegianDate('19. feb 2026');
		const d = new Date(result!);
		expect(d.getUTCHours()).toBe(12);
	});
});

describe('bergenOffset', () => {
	it('returns +01:00 for winter dates (CET)', () => {
		expect(bergenOffset('2026-01-15')).toBe('+01:00');
		expect(bergenOffset('2026-12-01')).toBe('+01:00');
	});

	it('returns +02:00 for summer dates (CEST)', () => {
		expect(bergenOffset('2026-06-15')).toBe('+02:00');
		expect(bergenOffset('2026-07-01')).toBe('+02:00');
	});

	it('returns +01:00 just before DST start (last Sunday of March)', () => {
		// 2026: March 29 is last Sunday of March
		// Day before DST transition
		expect(bergenOffset('2026-03-28')).toBe('+01:00');
	});

	it('returns +02:00 on DST start day', () => {
		// 2026: March 29 is last Sunday of March (DST starts 01:00 UTC)
		// At noon UTC on March 29, DST is active
		expect(bergenOffset('2026-03-29')).toBe('+02:00');
	});

	it('returns +02:00 just before DST end (last Sunday of October)', () => {
		// 2026: October 25 is last Sunday of October
		// Day before
		expect(bergenOffset('2026-10-24')).toBe('+02:00');
	});

	it('returns +01:00 on DST end day', () => {
		// 2026: October 25 is last Sunday of October (DST ends 01:00 UTC)
		// At noon UTC on October 25, DST is no longer active
		expect(bergenOffset('2026-10-25')).toBe('+01:00');
	});
});

describe('normalizeTitle', () => {
	it('lowercases and removes accents', () => {
		expect(normalizeTitle('Café Ørjan')).toBe('cafeorjan');
	});

	it('removes years', () => {
		expect(normalizeTitle('Festival 2026')).toBe('festival');
	});

	it('removes "bergen" and "i bergen"', () => {
		expect(normalizeTitle('Konsert i Bergen')).toBe('konsert');
	});

	it('replaces Norwegian characters', () => {
		expect(normalizeTitle('Ål Ærlig Ødegaard')).toBe('alaerligodegaard');
	});

	it('keeps only alphanumeric characters', () => {
		expect(normalizeTitle('Hello, World! (Live)')).toBe('helloworldlive');
	});
});

describe('slugify (scraper)', () => {
	it('converts Norwegian characters', () => {
		// NFD decomposes å before the explicit replacement, so å→a (not aa)
		expect(slugify('Blå ørret')).toBe('bla-orret');
	});

	it('removes accents via NFD normalization', () => {
		expect(slugify('Café événement')).toBe('cafe-evenement');
	});

	it('truncates at 80 characters', () => {
		const longText = 'a'.repeat(100);
		expect(slugify(longText).length).toBeLessThanOrEqual(80);
	});

	it('strips leading/trailing dashes', () => {
		expect(slugify('--hello--')).toBe('hello');
	});
});

describe('stripHtml', () => {
	it('removes HTML tags', () => {
		expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
	});

	it('collapses whitespace', () => {
		expect(stripHtml('Hello   \n\n  world')).toBe('Hello world');
	});

	it('handles empty string', () => {
		expect(stripHtml('')).toBe('');
	});
});

describe('makeDescription', () => {
	it('creates Norwegian description', () => {
		const result = makeDescription('Konsert', 'Grieghallen', 'music');
		expect(result).toBe('Konsert — Konsert på Grieghallen');
	});

	it('falls back to "Arrangement" for unknown category', () => {
		const result = makeDescription('Event', 'Venue', 'unknown');
		expect(result).toContain('Arrangement');
	});

	it('truncates to 160 characters', () => {
		const longTitle = 'A'.repeat(200);
		const result = makeDescription(longTitle, 'Venue', 'music');
		expect(result.length).toBeLessThanOrEqual(160);
	});
});

describe('makeDescriptionEn', () => {
	it('creates English description', () => {
		const result = makeDescriptionEn('Concert', 'Grieghallen', 'music');
		expect(result).toBe('Concert at Grieghallen');
	});

	it('truncates to 160 characters', () => {
		const longTitle = 'A'.repeat(200);
		const result = makeDescriptionEn(longTitle, 'Venue', 'music');
		expect(result.length).toBeLessThanOrEqual(160);
	});
});

describe('isOptedOut', () => {
	// isOptedOut depends on loaded opt-out domains.
	// Without loading, it returns false for everything (opt-out domains is null).
	it('returns false when no opt-outs are loaded', () => {
		expect(isOptedOut('https://example.com/event')).toBe(false);
	});

	it('returns false for invalid URL', () => {
		expect(isOptedOut('not-a-url')).toBe(false);
	});
});
