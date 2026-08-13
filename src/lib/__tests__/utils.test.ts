import { describe, it, expect } from 'vitest';
import {
	isFreeEvent,
	formatPrice,
	slugify,
	buildOutboundUrl,
	formatEventTime,
	toBergenIsoFromParts
} from '../utils';

describe('toBergenIsoFromParts', () => {
	// Regression: the submit form sent a naive "YYYY-MM-DDTHH:mm" with no offset.
	// Postgres read it as UTC, so every submitted event rendered two hours late
	// in summer. ARTED NET reported it on their Macbeth listing, 2026-08-12.
	it('stamps summer dates with CEST', () => {
		expect(toBergenIsoFromParts('2026-08-15', '11:00')).toBe('2026-08-15T11:00:00+02:00');
	});

	it('stamps winter dates with CET', () => {
		expect(toBergenIsoFromParts('2026-12-05', '09:30')).toBe('2026-12-05T09:30:00+01:00');
	});

	it('survives a round trip back to the Bergen wall clock', () => {
		const iso = toBergenIsoFromParts('2026-08-31', '18:00');
		const shown = new Date(iso).toLocaleTimeString('nb-NO', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Europe/Oslo'
		});
		expect(shown).toBe('18:00');
	});

	it('picks the right side of the spring DST boundary', () => {
		// DST starts Sunday 29 March 2026 at 01:00 UTC
		expect(toBergenIsoFromParts('2026-03-28', '12:00')).toContain('+01:00');
		expect(toBergenIsoFromParts('2026-03-30', '12:00')).toContain('+02:00');
	});

	it('picks the right side of the autumn DST boundary', () => {
		// DST ends Sunday 25 October 2026 at 01:00 UTC
		expect(toBergenIsoFromParts('2026-10-24', '12:00')).toContain('+02:00');
		expect(toBergenIsoFromParts('2026-10-26', '12:00')).toContain('+01:00');
	});
});

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

	it('shows "fra kr X" for numeric prices', () => {
		expect(formatPrice(100, 'no')).toBe('fra kr 100');
		expect(formatPrice('250', 'no')).toBe('fra kr 250');
		expect(formatPrice(100, 'en')).toBe('from kr 100');
		expect(formatPrice('250', 'en')).toBe('from kr 250');
	});

	it('adds "fra" prefix for simple "X kr" strings', () => {
		expect(formatPrice('399 kr', 'no')).toBe('fra 399 kr');
		expect(formatPrice('399 kr', 'en')).toBe('from 399 kr');
	});

	it('adds "fra" prefix for Norwegian "X,-" price format', () => {
		expect(formatPrice('200,-', 'no')).toBe('fra 200,-');
		expect(formatPrice('200,-', 'en')).toBe('from 200,-');
	});

	it('adds "fra" prefix for "X NOK" format', () => {
		expect(formatPrice('250 NOK', 'no')).toBe('fra 250 NOK');
	});

	it('returns ranges and tiers as-is', () => {
		expect(formatPrice('200–400 kr', 'no')).toBe('200–400 kr');
		expect(formatPrice('200 / Gratis', 'no')).toBe('200 / Gratis');
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

describe('formatEventTime', () => {
	// CET = UTC+1 (winter), CEST = UTC+2 (summer)

	it('hides time for midnight UTC placeholder (no known time)', () => {
		expect(formatEventTime('2026-03-06T00:00:00Z')).toBe('');
	});

	it('hides time for midnight UTC placeholder regardless of date', () => {
		expect(formatEventTime('2026-07-15T00:00:00Z')).toBe('');
	});

	it('shows 12:00 Oslo for an event at UTC 11:00 in CET (the bergenkommune bug case)', () => {
		// Real event "Lunsj med kultur" at 12:00 Oslo → stored as 11:00 UTC after fix
		expect(formatEventTime('2026-03-06T11:00:00Z', 'no')).toBe('12:00');
	});

	it('does NOT hide UTC 12:00 (was wrongly suppressed before the fix)', () => {
		// 12:00 UTC = 13:00 Oslo in CET — must be shown, not hidden
		expect(formatEventTime('2026-03-06T12:00:00Z', 'no')).toBe('13:00');
	});

	it('shows 18:00 Oslo for UTC 17:00 in CET', () => {
		expect(formatEventTime('2026-03-06T17:00:00Z', 'no')).toBe('18:00');
	});

	it('shows 12:00 Oslo for UTC 10:00 in CEST (summer)', () => {
		// CEST = UTC+2
		expect(formatEventTime('2026-07-15T10:00:00Z', 'no')).toBe('12:00');
	});

	it('returns English HH:MM format', () => {
		expect(formatEventTime('2026-03-06T17:00:00Z', 'en')).toBe('18:00');
	});

	it('handles half-hours correctly', () => {
		// 10:30 UTC = 11:30 Oslo (CET)
		expect(formatEventTime('2026-03-06T10:30:00Z', 'no')).toBe('11:30');
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
