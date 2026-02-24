import { describe, it, expect } from 'vitest';
import { isFreeEvent, formatPrice, slugify, buildOutboundUrl } from '../utils';

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

	it('is case-insensitive', () => {
		expect(isFreeEvent('gratis')).toBe(true);
		expect(isFreeEvent('GRATIS')).toBe(true);
		expect(isFreeEvent('free')).toBe(true);
		expect(isFreeEvent('FREE')).toBe(true);
	});

	it('handles Norwegian zero-price formats', () => {
		expect(isFreeEvent('0 kr')).toBe(true);
		expect(isFreeEvent('0,-')).toBe(true);
		expect(isFreeEvent('0,00')).toBe(true);
		expect(isFreeEvent('0,00 kr')).toBe(true);
		expect(isFreeEvent('0 NOK')).toBe(true);
	});

	it('trims whitespace', () => {
		expect(isFreeEvent(' Gratis ')).toBe(true);
		expect(isFreeEvent(' 0 ')).toBe(true);
	});

	it('rejects partial matches', () => {
		expect(isFreeEvent('Fra 0 kr')).toBe(false);
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

	it('detects Norwegian zero-price formats as free', () => {
		expect(formatPrice('0 kr', 'no')).toBe('Trolig gratis');
		expect(formatPrice('0,-', 'no')).toBe('Trolig gratis');
		expect(formatPrice('0,00 kr', 'en')).toBe('Likely free');
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

describe('buildOutboundUrl', () => {
	it('appends UTM params to a basic URL', () => {
		const result = buildOutboundUrl('https://example.com/tickets', 'event_detail', 'Grieghallen', 'konsert-2026-03-01');
		const u = new URL(result);
		expect(u.searchParams.get('utm_source')).toBe('gaari');
		expect(u.searchParams.get('utm_medium')).toBe('event_detail');
		expect(u.searchParams.get('utm_campaign')).toBe('grieghallen');
		expect(u.searchParams.get('utm_content')).toBe('konsert-2026-03-01');
	});

	it('preserves existing query params', () => {
		const result = buildOutboundUrl('https://example.com/tickets?ref=123', 'event_detail', 'USF Verftet', 'jazz-natt');
		const u = new URL(result);
		expect(u.searchParams.get('ref')).toBe('123');
		expect(u.searchParams.get('utm_source')).toBe('gaari');
		expect(u.searchParams.get('utm_campaign')).toBe('usf-verftet');
	});

	it('preserves URL fragment', () => {
		const result = buildOutboundUrl('https://example.com/page#section', 'event_detail', 'Venue', 'slug');
		const u = new URL(result);
		expect(u.hash).toBe('#section');
		expect(u.searchParams.get('utm_source')).toBe('gaari');
	});

	it('omits campaign/content when venue/event missing', () => {
		const result = buildOutboundUrl('https://example.com', 'collection');
		const u = new URL(result);
		expect(u.searchParams.get('utm_source')).toBe('gaari');
		expect(u.searchParams.get('utm_medium')).toBe('collection');
		expect(u.searchParams.has('utm_campaign')).toBe(false);
		expect(u.searchParams.has('utm_content')).toBe(false);
	});

	it('slugifies venue name with Norwegian characters', () => {
		const result = buildOutboundUrl('https://example.com', 'event_detail', 'Bjørgvin Blues Club', 'event-slug');
		const u = new URL(result);
		expect(u.searchParams.get('utm_campaign')).toBe('bjorgvin-blues-club');
	});

	it('returns original URL for invalid input', () => {
		expect(buildOutboundUrl('not-a-url', 'event_detail')).toBe('not-a-url');
	});
});
