import { describe, it, expect } from 'vitest';
import { safeJsonLd, generateEventJsonLd, generateBreadcrumbJsonLd, toBergenIso, generateCollectionJsonLd, computeCanonical } from '../seo';
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

const testCollection = {
	title: { no: 'Denne helgen i Bergen', en: 'This weekend in Bergen' },
	description: { no: 'Helgens arrangementer', en: 'Weekend events' },
	slug: 'denne-helgen'
};

function makeEvents(count: number): GaariEvent[] {
	return Array.from({ length: count }, (_, i) => makeEvent({ slug: `event-${i + 1}-2026-06-20` }));
}

describe('computeCanonical', () => {
	function url(search: string): URL {
		return new URL(`https://gaari.no/no${search}`);
	}

	// Default — no filters
	it('returns base URL with no params', () => {
		const { canonical, noindex } = computeCanonical(url(''), 'no', 100);
		expect(canonical).toBe('https://gaari.no/no');
		expect(noindex).toBe(false);
	});

	// Rules 1–3: single indexable filter
	it('self-referencing canonical for single category', () => {
		const { canonical, noindex } = computeCanonical(url('?category=music'), 'no', 50);
		expect(canonical).toBe('https://gaari.no/no?category=music');
		expect(noindex).toBe(false);
	});

	it('self-referencing canonical for multi-category', () => {
		const { canonical } = computeCanonical(url('?category=music,culture'), 'no', 80);
		expect(canonical).toBe('https://gaari.no/no?category=music%2Cculture');
	});

	it('self-referencing canonical for single bydel', () => {
		const { canonical, noindex } = computeCanonical(url('?bydel=Sentrum'), 'no', 30);
		expect(canonical).toBe('https://gaari.no/no?bydel=Sentrum');
		expect(noindex).toBe(false);
	});

	// Rule 4: combined category + bydel → canonical to category version
	it('canonicals to category when both category and bydel are set', () => {
		const { canonical, noindex } = computeCanonical(url('?category=music&bydel=Sentrum'), 'no', 20);
		expect(canonical).toBe('https://gaari.no/no?category=music');
		expect(noindex).toBe(false);
	});

	// Rule 5: pagination
	it('keeps page param for paginated unfiltered view', () => {
		const { canonical, noindex } = computeCanonical(url('?page=2'), 'no', 500);
		expect(canonical).toBe('https://gaari.no/no?page=2');
		expect(noindex).toBe(false);
	});

	it('includes page param in canonical for paginated category view', () => {
		const { canonical } = computeCanonical(url('?category=music&page=3'), 'no', 40);
		expect(canonical).toBe('https://gaari.no/no?category=music&page=3');
	});

	it('strips noise params (time, price, audience) from canonical', () => {
		const { canonical } = computeCanonical(url('?time=evening&price=free&audience=family'), 'no', 100);
		expect(canonical).toBe('https://gaari.no/no');
	});

	it('strips noise params but keeps category', () => {
		const { canonical } = computeCanonical(url('?category=music&time=evening'), 'no', 50);
		expect(canonical).toBe('https://gaari.no/no?category=music');
	});

	// Rule 6: ?when= with collection page equivalent
	it('canonicals ?when=weekend to /no/denne-helgen', () => {
		const { canonical, noindex } = computeCanonical(url('?when=weekend'), 'no', 30);
		expect(canonical).toBe('https://gaari.no/no/denne-helgen');
		expect(noindex).toBe(false);
	});

	it('canonicals ?when=today to /no/i-dag', () => {
		const { canonical } = computeCanonical(url('?when=today'), 'no', 20);
		expect(canonical).toBe('https://gaari.no/no/i-dag');
	});

	it('canonicals ?when=weekend to /en/this-weekend for English', () => {
		const { canonical } = computeCanonical(new URL('https://gaari.no/en?when=weekend'), 'en', 30);
		expect(canonical).toBe('https://gaari.no/en/this-weekend');
	});

	it('canonicals ?when=today to /en/today-in-bergen for English', () => {
		const { canonical } = computeCanonical(new URL('https://gaari.no/en?when=today'), 'en', 20);
		expect(canonical).toBe('https://gaari.no/en/today-in-bergen');
	});

	it('self-referencing for ?when=tomorrow (no collection)', () => {
		const { canonical } = computeCanonical(url('?when=tomorrow'), 'no', 15);
		expect(canonical).toBe('https://gaari.no/no');
	});

	it('self-referencing for ?when=week (no collection)', () => {
		const { canonical } = computeCanonical(url('?when=week'), 'no', 60);
		expect(canonical).toBe('https://gaari.no/no');
	});

	it('?when=weekend with category → canonical to category (not collection)', () => {
		const { canonical } = computeCanonical(url('?when=weekend&category=music'), 'no', 10);
		expect(canonical).toBe('https://gaari.no/no?category=music');
	});

	// Rule 7: noindex for thin content
	it('sets noindex when event count < 5 for category filter', () => {
		const { noindex } = computeCanonical(url('?category=music'), 'no', 4);
		expect(noindex).toBe(true);
	});

	it('sets noindex when event count < 5 for combined filter canonical', () => {
		const { noindex } = computeCanonical(url('?category=music&bydel=Åsane'), 'no', 2);
		expect(noindex).toBe(true);
	});

	it('does not set noindex when event count is exactly 5', () => {
		const { noindex } = computeCanonical(url('?category=music'), 'no', 5);
		expect(noindex).toBe(false);
	});

	it('never sets noindex for unfiltered view', () => {
		const { noindex } = computeCanonical(url(''), 'no', 0);
		expect(noindex).toBe(false);
	});

	it('never sets noindex for ?when collection redirect', () => {
		const { noindex } = computeCanonical(url('?when=weekend'), 'no', 1);
		expect(noindex).toBe(false);
	});
});

describe('generateCollectionJsonLd', () => {
	it('includes mainEntity ItemList with event URLs', () => {
		const events = makeEvents(3);
		const data = JSON.parse(
			generateCollectionJsonLd(testCollection, 'no', 'https://gaari.no/no/denne-helgen', events)
		);
		expect(data.mainEntity['@type']).toBe('ItemList');
		expect(data.mainEntity.itemListElement).toHaveLength(3);
		expect(data.mainEntity.itemListElement[0]).toMatchObject({
			'@type': 'ListItem',
			position: 1,
			url: 'https://gaari.no/no/events/event-1-2026-06-20'
		});
	});

	it('positions are 1-indexed', () => {
		const events = makeEvents(2);
		const data = JSON.parse(
			generateCollectionJsonLd(testCollection, 'no', 'https://gaari.no/no/denne-helgen', events)
		);
		expect(data.mainEntity.itemListElement[0].position).toBe(1);
		expect(data.mainEntity.itemListElement[1].position).toBe(2);
	});

	it('uses lang prefix in event URLs', () => {
		const events = makeEvents(1);
		const dataNo = JSON.parse(
			generateCollectionJsonLd(testCollection, 'no', 'https://gaari.no/no/denne-helgen', events)
		);
		const dataEn = JSON.parse(
			generateCollectionJsonLd(testCollection, 'en', 'https://gaari.no/en/this-weekend', events)
		);
		expect(dataNo.mainEntity.itemListElement[0].url).toContain('/no/events/');
		expect(dataEn.mainEntity.itemListElement[0].url).toContain('/en/events/');
	});

	it('caps ItemList at 50 items but reports full numberOfItems', () => {
		const events = makeEvents(80);
		const data = JSON.parse(
			generateCollectionJsonLd(testCollection, 'no', 'https://gaari.no/no/denne-helgen', events)
		);
		expect(data.mainEntity.itemListElement).toHaveLength(50);
		expect(data.mainEntity.numberOfItems).toBe(50);
		expect(data.numberOfItems).toBe(80);
	});

	it('works with empty events list', () => {
		const data = JSON.parse(
			generateCollectionJsonLd(testCollection, 'no', 'https://gaari.no/no/denne-helgen', [])
		);
		expect(data.mainEntity.itemListElement).toHaveLength(0);
		expect(data.numberOfItems).toBe(0);
	});
});
