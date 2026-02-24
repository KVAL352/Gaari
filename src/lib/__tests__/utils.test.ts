import { describe, it, expect } from 'vitest';
import { isFreeEvent, formatPrice, slugify } from '../utils';

describe('isFreeEvent', () => {
	it('returns true for 0 (number)', () => {
		expect(isFreeEvent(0)).toBe(true);
	});

	it('returns true for "0" (string)', () => {
		expect(isFreeEvent('0')).toBe(true);
	});

	it('returns true for "Free"', () => {
		expect(isFreeEvent('Free')).toBe(true);
	});

	it('returns true for "Gratis"', () => {
		expect(isFreeEvent('Gratis')).toBe(true);
	});

	it('returns false for null', () => {
		expect(isFreeEvent(null)).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isFreeEvent('')).toBe(false);
	});

	it('returns false for "kr 100"', () => {
		expect(isFreeEvent('kr 100')).toBe(false);
	});

	it('returns false for numeric price', () => {
		expect(isFreeEvent(50)).toBe(false);
	});
});

describe('formatPrice', () => {
	it('shows "Trolig gratis" for free events in Norwegian', () => {
		expect(formatPrice(0, 'no')).toBe('Trolig gratis');
		expect(formatPrice('0', 'no')).toBe('Trolig gratis');
		expect(formatPrice('Gratis', 'no')).toBe('Trolig gratis');
	});

	it('shows "Likely free" for free events in English', () => {
		expect(formatPrice(0, 'en')).toBe('Likely free');
		expect(formatPrice('Free', 'en')).toBe('Likely free');
	});

	it('shows "kr X" for numeric prices', () => {
		expect(formatPrice(100, 'no')).toBe('kr 100');
		expect(formatPrice('250', 'en')).toBe('kr 250');
	});

	it('returns string price as-is for non-numeric strings', () => {
		expect(formatPrice('Fra kr 200', 'no')).toBe('Fra kr 200');
	});

	it('shows "Se pris" / "See price" for null/empty', () => {
		expect(formatPrice(null, 'no')).toBe('Se pris');
		expect(formatPrice(null, 'en')).toBe('See price');
		expect(formatPrice('', 'no')).toBe('Se pris');
	});
});

describe('slugify', () => {
	it('converts Norwegian characters', () => {
		expect(slugify('Blå ørret på åsen')).toBe('bla-orret-pa-asen');
	});

	it('reduces accented characters via NFD normalization', () => {
		expect(slugify('Café événement')).toBe('cafe-evenement');
		expect(slugify('Über Müller')).toBe('uber-muller');
		expect(slugify('El Niño')).toBe('el-nino');
	});

	it('replaces spaces with dashes', () => {
		expect(slugify('hello world')).toBe('hello-world');
	});

	it('removes special characters', () => {
		expect(slugify('Event (Live!) @ Bergen')).toBe('event-live-bergen');
	});

	it('strips leading and trailing dashes', () => {
		expect(slugify('--hello--')).toBe('hello');
	});

	it('handles empty string', () => {
		expect(slugify('')).toBe('');
	});
});
