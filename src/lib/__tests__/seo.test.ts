import { describe, it, expect } from 'vitest';
import { safeJsonLd, generateEventJsonLd, generateBreadcrumbJsonLd, toBergenIso } from '../seo';
import type { GaariEvent } from '../types';

describe('safeJsonLd', () => {
	it('escapes <script> to prevent XSS', () => {
		const result = safeJsonLd({ text: '<script>alert("xss")</script>' });
		expect(result).not.toContain('<script>');
		expect(result).toContain('\\u003cscript>');
	});

	it('escapes all < characters', () => {
		const result = safeJsonLd({ text: 'a < b' });
		expect(result).not.toContain('< b');
		expect(result).toContain('\\u003c b');
	});

	it('produces valid JSON', () => {
		const result = safeJsonLd({ name: 'Test', value: 42 });
		// After unescaping \u003c back to <, it should parse
		const parsed = JSON.parse(result);
		expect(parsed.name).toBe('Test');
		expect(parsed.value).toBe(42);
	});
});

function makeEvent(overrides: Partial<GaariEvent> = {}): GaariEvent {
	return {
		id: '1',
		slug: 'test-event',
		title_no: 'Test Event',
		description_no: 'En test beskrivelse',
		category: 'music',
		date_start: '2026-03-15T19:00:00+01:00',
		venue_name: 'Test Venue',
		address: 'Test Gate 1',
		bydel: 'Sentrum',
		price: 0,
		age_group: 'all',
		language: 'no',
		status: 'approved',
		...overrides
	};
}

describe('generateEventJsonLd', () => {
	it('includes price 0 and NOK for free events', () => {
		const json = generateEventJsonLd(makeEvent({ price: 0 }), 'no', 'https://gaari.no/no/events/test');
		const data = JSON.parse(json);
		expect(data.offers.price).toBe('0');
		expect(data.offers.priceCurrency).toBe('NOK');
	});

	it('includes numeric price for paid events', () => {
		const json = generateEventJsonLd(makeEvent({ price: 250 }), 'no', 'https://gaari.no/no/events/test');
		const data = JSON.parse(json);
		expect(data.offers.price).toBe('250');
		expect(data.offers.priceCurrency).toBe('NOK');
	});

	it('sets EventCancelled status for cancelled events', () => {
		const json = generateEventJsonLd(
			makeEvent({ status: 'cancelled' }),
			'no',
			'https://gaari.no/no/events/test'
		);
		const data = JSON.parse(json);
		expect(data.eventStatus).toBe('https://schema.org/EventCancelled');
		expect(data.offers.availability).toBe('https://schema.org/Discontinued');
	});

	it('uses English title when lang=en and title_en exists', () => {
		const json = generateEventJsonLd(
			makeEvent({ title_en: 'English Title' }),
			'en',
			'https://gaari.no/en/events/test'
		);
		const data = JSON.parse(json);
		expect(data.name).toBe('English Title');
	});

	it('falls back to Norwegian title when lang=en but no title_en', () => {
		const json = generateEventJsonLd(
			makeEvent({ title_en: undefined }),
			'en',
			'https://gaari.no/en/events/test'
		);
		const data = JSON.parse(json);
		expect(data.name).toBe('Test Event');
	});

	it('does not include priceCurrency when price is unknown string', () => {
		const json = generateEventJsonLd(
			makeEvent({ price: 'Se arrangør' }),
			'no',
			'https://gaari.no/no/events/test'
		);
		const data = JSON.parse(json);
		expect(data.offers.priceCurrency).toBeUndefined();
	});
});

describe('toBergenIso', () => {
	it('converts summer UTC to CEST (+02:00)', () => {
		// 2026-06-20T16:00:00Z → 18:00 local CEST
		expect(toBergenIso('2026-06-20T16:00:00.000Z')).toBe('2026-06-20T18:00:00+02:00');
	});

	it('converts winter UTC to CET (+01:00)', () => {
		// 2026-12-10T18:00:00Z → 19:00 local CET
		expect(toBergenIso('2026-12-10T18:00:00.000Z')).toBe('2026-12-10T19:00:00+01:00');
	});

	it('handles input already with +01:00 offset', () => {
		// 2026-03-15T19:00:00+01:00 = 18:00 UTC, winter → +01:00 → 19:00 local
		expect(toBergenIso('2026-03-15T19:00:00+01:00')).toBe('2026-03-15T19:00:00+01:00');
	});

	it('handles DST boundary — just before switch (CET)', () => {
		// 2026: last Sunday of March is March 29. DST starts at 01:00 UTC.
		// 00:59 UTC on March 29 → still CET
		expect(toBergenIso('2026-03-29T00:59:00.000Z')).toBe('2026-03-29T01:59:00+01:00');
	});

	it('handles DST boundary — just after switch (CEST)', () => {
		// 01:00 UTC on March 29 → CEST starts
		expect(toBergenIso('2026-03-29T01:00:00.000Z')).toBe('2026-03-29T03:00:00+02:00');
	});

	it('returns original string for invalid date', () => {
		expect(toBergenIso('not-a-date')).toBe('not-a-date');
	});

	it('generates startDate with Bergen timezone offset in JSON-LD', () => {
		// date_start is a summer UTC string — startDate in JSON-LD should have +02:00
		const json = generateEventJsonLd(
			makeEvent({ date_start: '2026-06-20T16:00:00.000Z' }),
			'no',
			'https://gaari.no/no/events/test'
		);
		const data = JSON.parse(json);
		expect(data.startDate).toBe('2026-06-20T18:00:00+02:00');
	});
});

describe('generateBreadcrumbJsonLd', () => {
	it('last item has no URL', () => {
		const json = generateBreadcrumbJsonLd([
			{ name: 'Hjem', url: 'https://gaari.no/no' },
			{ name: 'Arrangementer', url: 'https://gaari.no/no/events' },
			{ name: 'Konsert på Grieghallen' }
		]);
		const data = JSON.parse(json);
		const items = data.itemListElement;

		expect(items[0].item).toBe('https://gaari.no/no');
		expect(items[1].item).toBe('https://gaari.no/no/events');
		expect(items[2].item).toBeUndefined();
	});

	it('positions are 1-indexed', () => {
		const json = generateBreadcrumbJsonLd([
			{ name: 'A', url: 'https://gaari.no' },
			{ name: 'B' }
		]);
		const data = JSON.parse(json);
		expect(data.itemListElement[0].position).toBe(1);
		expect(data.itemListElement[1].position).toBe(2);
	});
});
