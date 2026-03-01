import { describe, it, expect } from 'vitest';
import { getCollection, getAllCollectionSlugs, getFooterCollections } from '../collections';
import type { GaariEvent } from '../types';

function makeEvent(overrides: Partial<GaariEvent> = {}): GaariEvent {
	return {
		id: '1',
		slug: 'test-event-2026-02-24',
		title_no: 'Test event',
		description_no: 'Test',
		category: 'music',
		date_start: '2026-02-24T18:00:00Z',
		venue_name: 'Test Venue',
		address: 'Test Address',
		bydel: 'Sentrum',
		price: 0,
		age_group: 'all',
		language: 'no',
		status: 'approved',
		...overrides
	};
}

describe('getCollection', () => {
	it('returns collection for valid slug', () => {
		const c = getCollection('denne-helgen');
		expect(c).toBeDefined();
		expect(c!.id).toBe('weekend');
	});

	it('returns undefined for unknown slug', () => {
		expect(getCollection('gibberish')).toBeUndefined();
	});

	it('returns all 39 collections', () => {
		const slugs = getAllCollectionSlugs();
		expect(slugs).toHaveLength(39);
		// Original 14
		expect(slugs).toContain('denne-helgen');
		expect(slugs).toContain('i-kveld');
		expect(slugs).toContain('gratis');
		expect(slugs).toContain('today-in-bergen');
		expect(slugs).toContain('familiehelg');
		expect(slugs).toContain('konserter');
		expect(slugs).toContain('studentkveld');
		expect(slugs).toContain('this-weekend');
		expect(slugs).toContain('i-dag');
		expect(slugs).toContain('free-things-to-do-bergen');
		expect(slugs).toContain('regndagsguide');
		expect(slugs).toContain('sentrum');
		expect(slugs).toContain('voksen');
		expect(slugs).toContain('for-ungdom');
		// 7 seasonal NO
		expect(slugs).toContain('17-mai');
		expect(slugs).toContain('julemarked');
		expect(slugs).toContain('paske');
		expect(slugs).toContain('sankthans');
		expect(slugs).toContain('nyttarsaften');
		expect(slugs).toContain('vinterferie');
		expect(slugs).toContain('hostferie');
		// 6 seasonal EN
		expect(slugs).toContain('17th-of-may-bergen');
		expect(slugs).toContain('christmas-bergen');
		expect(slugs).toContain('easter-bergen');
		expect(slugs).toContain('midsummer-bergen');
		expect(slugs).toContain('new-years-eve-bergen');
		expect(slugs).toContain('winter-break-bergen');
		// 6 festival NO (Fase 2 + 2b)
		expect(slugs).toContain('festspillene');
		expect(slugs).toContain('bergenfest');
		expect(slugs).toContain('beyond-the-gates');
		expect(slugs).toContain('nattjazz');
		expect(slugs).toContain('bergen-pride');
		expect(slugs).toContain('biff');
		// 6 festival EN (Fase 2 + 2b)
		expect(slugs).toContain('bergen-international-festival');
		expect(slugs).toContain('bergenfest-bergen');
		expect(slugs).toContain('beyond-the-gates-bergen');
		expect(slugs).toContain('nattjazz-bergen');
		expect(slugs).toContain('bergen-pride-festival');
		expect(slugs).toContain('biff-bergen');
	});

	it('each collection has bilingual title and description', () => {
		for (const slug of getAllCollectionSlugs()) {
			const c = getCollection(slug)!;
			expect(c.title.no).toBeTruthy();
			expect(c.title.en).toBeTruthy();
			expect(c.description.no).toBeTruthy();
			expect(c.description.en).toBeTruthy();
		}
	});

	it('every collection has a newsletterHeading', () => {
		for (const slug of getAllCollectionSlugs()) {
			const c = getCollection(slug)!;
			expect(c.newsletterHeading).toBeDefined();
			expect(c.newsletterHeading!.no).toBeTruthy();
			expect(c.newsletterHeading!.en).toBeTruthy();
		}
	});
});

describe('getFooterCollections', () => {
	it('returns only collections configured for NO footer', () => {
		const cols = getFooterCollections('no');
		expect(cols.length).toBeGreaterThan(0);
		for (const c of cols) {
			expect(c.footer?.langs).toContain('no');
		}
	});

	it('returns only collections configured for EN footer', () => {
		const cols = getFooterCollections('en');
		expect(cols.length).toBeGreaterThan(0);
		for (const c of cols) {
			expect(c.footer?.langs).toContain('en');
		}
	});

	it('returns collections sorted by order', () => {
		for (const lang of ['no', 'en'] as const) {
			const cols = getFooterCollections(lang);
			for (let i = 1; i < cols.length; i++) {
				expect(cols[i].footer!.order).toBeGreaterThanOrEqual(cols[i - 1].footer!.order);
			}
		}
	});

	it('does not include denne-helgen in EN footer', () => {
		const cols = getFooterCollections('en');
		expect(cols.find(c => c.slug === 'denne-helgen')).toBeUndefined();
	});

	it('does not include this-weekend in NO footer', () => {
		const cols = getFooterCollections('no');
		expect(cols.find(c => c.slug === 'this-weekend')).toBeUndefined();
	});

	it('every footer collection has a footerLabel or title', () => {
		for (const lang of ['no', 'en'] as const) {
			for (const col of getFooterCollections(lang)) {
				const label = (col.footerLabel ?? col.title)[lang];
				expect(label).toBeTruthy();
			}
		}
	});
});

describe('weekend filter (denne-helgen)', () => {
	const collection = getCollection('denne-helgen')!;

	it('includes Friday–Sunday events when now is Friday', () => {
		// Friday Feb 27, 2026
		const now = new Date('2026-02-27T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-27T19:00:00Z' }), // Friday
			makeEvent({ id: '2', date_start: '2026-02-28T14:00:00Z' }), // Saturday
			makeEvent({ id: '3', date_start: '2026-03-01T10:00:00Z' }), // Sunday
			makeEvent({ id: '4', date_start: '2026-03-02T10:00:00Z' })  // Monday — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2', '3']);
	});

	it('includes Friday–Sunday events when now is Wednesday', () => {
		// Wednesday Feb 25, 2026
		const now = new Date('2026-02-25T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T19:00:00Z' }), // Wednesday — excluded
			makeEvent({ id: '2', date_start: '2026-02-27T19:00:00Z' }), // Friday — included
			makeEvent({ id: '3', date_start: '2026-02-28T14:00:00Z' }), // Saturday
			makeEvent({ id: '4', date_start: '2026-03-01T10:00:00Z' })  // Sunday
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['2', '3', '4']);
	});

	it('returns empty array when no weekend events', () => {
		const now = new Date('2026-02-25T12:00:00'); // Wednesday
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T19:00:00Z' }), // Wednesday
			makeEvent({ id: '2', date_start: '2026-02-26T19:00:00Z' })  // Thursday
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});

	it('handles empty event list', () => {
		const now = new Date('2026-02-27T12:00:00');
		expect(collection.filterEvents([], now)).toHaveLength(0);
	});
});

describe('tonight filter (i-kveld)', () => {
	const collection = getCollection('i-kveld')!;

	it('includes today evening/night events', () => {
		// Feb 24, 2026 — winter CET (UTC+1)
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-24T17:00:00Z' }), // 18:00 Oslo = evening ✓
			makeEvent({ id: '2', date_start: '2026-02-24T21:30:00Z' }), // 22:30 Oslo = night ✓
			makeEvent({ id: '3', date_start: '2026-02-24T08:00:00Z' }), // 09:00 Oslo = morning ✗
			makeEvent({ id: '4', date_start: '2026-02-25T18:00:00Z' })  // Tomorrow — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('returns empty array when no evening events today', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-24T08:00:00Z' }) // morning
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});

	it('handles empty event list', () => {
		const now = new Date('2026-02-24T12:00:00');
		expect(collection.filterEvents([], now)).toHaveLength(0);
	});
});

describe('free filter (gratis)', () => {
	const collection = getCollection('gratis')!;

	it('includes free events this week', () => {
		// Monday Feb 23, 2026
		const now = new Date('2026-02-23T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-24T18:00:00Z', price: 0 }),        // Free, this week ✓
			makeEvent({ id: '2', date_start: '2026-02-25T18:00:00Z', price: 'Gratis' }),  // Free, this week ✓
			makeEvent({ id: '3', date_start: '2026-02-24T18:00:00Z', price: 250 }),        // Paid — excluded
			makeEvent({ id: '4', date_start: '2026-03-05T18:00:00Z', price: 0 })           // Free, next week — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('matches various free price formats', () => {
		const now = new Date('2026-02-23T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-24T18:00:00Z', price: '0 kr' }),
			makeEvent({ id: '2', date_start: '2026-02-24T18:00:00Z', price: 'Free' }),
			makeEvent({ id: '3', date_start: '2026-02-24T18:00:00Z', price: '0,-' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(3);
	});

	it('returns empty array when no free events', () => {
		const now = new Date('2026-02-23T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-24T18:00:00Z', price: 250 })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});

	it('handles empty event list', () => {
		const now = new Date('2026-02-23T12:00:00');
		expect(collection.filterEvents([], now)).toHaveLength(0);
	});
});

describe('today filter (today-in-bergen)', () => {
	const collection = getCollection('today-in-bergen')!;

	it('includes only today events', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-24T10:00:00Z' }), // Today ✓
			makeEvent({ id: '2', date_start: '2026-02-24T20:00:00Z' }), // Today ✓
			makeEvent({ id: '3', date_start: '2026-02-25T10:00:00Z' })  // Tomorrow — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('returns empty array when no events today', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T10:00:00Z' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});

	it('handles empty event list', () => {
		const now = new Date('2026-02-24T12:00:00');
		expect(collection.filterEvents([], now)).toHaveLength(0);
	});
});

describe('family weekend filter (familiehelg)', () => {
	const collection = getCollection('familiehelg')!;

	it('includes family events by age_group, category, or title keywords', () => {
		// Friday Feb 27, 2026
		const now = new Date('2026-02-27T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-28T14:00:00Z', age_group: 'family' }),  // age_group match
			makeEvent({ id: '2', date_start: '2026-02-28T14:00:00Z', category: 'family', age_group: 'all' }),  // category match
			makeEvent({ id: '3', date_start: '2026-03-01T10:00:00Z', title_no: 'Familielørdag: Teater', age_group: 'all', category: 'theatre' }),  // title match
			makeEvent({ id: '4', date_start: '2026-02-28T14:00:00Z', age_group: 'all', category: 'theatre' }),  // no match
			makeEvent({ id: '5', date_start: '2026-03-02T10:00:00Z', age_group: 'family' })    // Mon — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2', '3']);
	});

	it('matches barnelørdag and barnas in title', () => {
		const now = new Date('2026-02-27T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-28T10:00:00Z', title_no: 'Barnelørdag: Konsert', age_group: 'all', category: 'music' }),
			makeEvent({ id: '2', date_start: '2026-02-28T10:00:00Z', title_no: 'Barnas kulturhus: SANS', age_group: 'all', category: 'theatre' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(2);
	});

	it('returns empty when no family events on weekend', () => {
		const now = new Date('2026-02-27T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-28T14:00:00Z', age_group: 'all', category: 'theatre' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});
});

describe('concerts filter (konserter)', () => {
	const collection = getCollection('konserter')!;

	it('includes only music events this week', () => {
		// Monday Feb 23, 2026
		const now = new Date('2026-02-23T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-24T19:00:00Z', category: 'music' }),     // This week, music
			makeEvent({ id: '2', date_start: '2026-02-25T19:00:00Z', category: 'theatre' }),    // This week, not music
			makeEvent({ id: '3', date_start: '2026-03-05T19:00:00Z', category: 'music' })       // Next week — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1']);
	});

	it('returns empty when no concerts this week', () => {
		const now = new Date('2026-02-23T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-24T19:00:00Z', category: 'theatre' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});
});

describe('student night filter (studentkveld)', () => {
	const collection = getCollection('studentkveld')!;

	it('includes student/nightlife evening events today and tomorrow', () => {
		// Feb 24, 2026 (CET = UTC+1)
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-24T18:00:00Z', age_group: 'students' }),  // Today evening, students
			makeEvent({ id: '2', date_start: '2026-02-24T21:00:00Z', category: 'nightlife' }),   // Today night, nightlife
			makeEvent({ id: '3', date_start: '2026-02-25T18:00:00Z', category: 'student' }),     // Tomorrow evening, student cat
			makeEvent({ id: '4', date_start: '2026-02-24T08:00:00Z', age_group: 'students' }),   // Today morning — excluded
			makeEvent({ id: '5', date_start: '2026-02-26T18:00:00Z', category: 'nightlife' })    // Day after tomorrow — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2', '3']);
	});

	it('returns empty when no matching events', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-24T18:00:00Z', category: 'culture', age_group: 'all' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});
});

describe('this-weekend filter (English)', () => {
	const collection = getCollection('this-weekend')!;

	it('is the English weekend collection', () => {
		expect(collection.title.en).toBe('This Weekend in Bergen');
	});

	it('includes weekend events same as denne-helgen', () => {
		// Friday Feb 27, 2026
		const now = new Date('2026-02-27T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-27T19:00:00Z' }), // Friday
			makeEvent({ id: '2', date_start: '2026-02-28T14:00:00Z' }), // Saturday
			makeEvent({ id: '3', date_start: '2026-03-01T10:00:00Z' }), // Sunday
			makeEvent({ id: '4', date_start: '2026-03-02T10:00:00Z' })  // Monday — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2', '3']);
	});
});

describe('today filter Norwegian (i-dag)', () => {
	const collection = getCollection('i-dag')!;

	it('includes only today events', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-24T10:00:00Z' }), // Today ✓
			makeEvent({ id: '2', date_start: '2026-02-24T20:00:00Z' }), // Today ✓
			makeEvent({ id: '3', date_start: '2026-02-25T10:00:00Z' })  // Tomorrow — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('returns empty when no events today', () => {
		const now = new Date('2026-02-24T12:00:00');
		expect(collection.filterEvents([makeEvent({ date_start: '2026-02-25T10:00:00Z' })], now)).toHaveLength(0);
	});
});

describe('free events English (free-things-to-do-bergen)', () => {
	const collection = getCollection('free-things-to-do-bergen')!;

	it('includes free events within 2 weeks', () => {
		// Feb 24 (Monday) — addDays(now,13) = Mar 9 = last included day
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T18:00:00Z', price: 0 }),        // Free, day 2 ✓
			makeEvent({ id: '2', date_start: '2026-03-09T18:00:00Z', price: 0 }),        // Free, day 14 ✓
			makeEvent({ id: '3', date_start: '2026-03-10T18:00:00Z', price: 0 }),        // Free, day 15 — excluded
			makeEvent({ id: '4', date_start: '2026-02-25T18:00:00Z', price: 250 })       // Paid — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('returns empty when no free events', () => {
		const now = new Date('2026-02-24T12:00:00');
		expect(collection.filterEvents([makeEvent({ price: 200 })], now)).toHaveLength(0);
	});
});

describe('rainy day filter (regndagsguide)', () => {
	const collection = getCollection('regndagsguide')!;

	it('includes indoor category events within 2 weeks', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T18:00:00Z', category: 'music' }),     // Indoor ✓
			makeEvent({ id: '2', date_start: '2026-02-25T18:00:00Z', category: 'theatre' }),   // Indoor ✓
			makeEvent({ id: '3', date_start: '2026-02-25T18:00:00Z', category: 'tours' }),     // Outdoor — excluded
			makeEvent({ id: '4', date_start: '2026-02-25T18:00:00Z', category: 'sports' }),    // Outdoor — excluded
			makeEvent({ id: '5', date_start: '2026-03-10T18:00:00Z', category: 'music' })      // Day 15 — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('returns empty when no indoor events', () => {
		const now = new Date('2026-02-24T12:00:00');
		expect(collection.filterEvents([makeEvent({ category: 'tours' })], now)).toHaveLength(0);
	});
});

describe('sentrum filter', () => {
	const collection = getCollection('sentrum')!;

	it('includes Sentrum bydel events within 2 weeks', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T18:00:00Z', bydel: 'Sentrum' }),     // Sentrum ✓
			makeEvent({ id: '2', date_start: '2026-03-09T18:00:00Z', bydel: 'Sentrum' }),     // Day 14, Sentrum ✓
			makeEvent({ id: '3', date_start: '2026-02-25T18:00:00Z', bydel: 'Bergenhus' }),   // Wrong bydel — excluded
			makeEvent({ id: '4', date_start: '2026-03-10T18:00:00Z', bydel: 'Sentrum' })      // Day 15 — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('returns empty when no Sentrum events', () => {
		const now = new Date('2026-02-24T12:00:00');
		expect(collection.filterEvents([makeEvent({ bydel: 'Fana' })], now)).toHaveLength(0);
	});
});

describe('youth filter (for-ungdom)', () => {
	const collection = getCollection('for-ungdom')!;

	it('returns collection with correct metadata', () => {
		expect(collection).toBeDefined();
		expect(collection.id).toBe('ungdom');
		expect(collection.title.no).toContain('ungdom');
		expect(collection.title.en).toContain('Teens');
	});

	it('includes youth-relevant categories within 2 weeks', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T18:00:00Z', category: 'music', age_group: 'all' }),
			makeEvent({ id: '2', date_start: '2026-02-25T18:00:00Z', category: 'sports', age_group: 'all' }),
			makeEvent({ id: '3', date_start: '2026-02-25T18:00:00Z', category: 'workshop', age_group: 'all' }),
			makeEvent({ id: '4', date_start: '2026-02-25T18:00:00Z', category: 'festival', age_group: 'all' }),
			makeEvent({ id: '5', date_start: '2026-02-25T18:00:00Z', category: 'student', age_group: 'all' }),
			makeEvent({ id: '6', date_start: '2026-02-25T18:00:00Z', category: 'culture', age_group: 'all' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(6);
	});

	it('excludes 18+, nightlife, and food', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T18:00:00Z', category: 'music', age_group: '18+' }),
			makeEvent({ id: '2', date_start: '2026-02-25T18:00:00Z', category: 'nightlife', age_group: 'all' }),
			makeEvent({ id: '3', date_start: '2026-02-25T18:00:00Z', category: 'food', age_group: 'all' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});

	it('includes family events', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T14:00:00Z', age_group: 'family', category: 'theatre' }),
			makeEvent({ id: '2', date_start: '2026-02-25T14:00:00Z', category: 'family', age_group: 'all' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(2);
	});

	it('includes events with youth keywords in title', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T18:00:00Z', title_no: 'UKM ungdomskveld', category: 'theatre', age_group: 'all' }),
			makeEvent({ id: '2', date_start: '2026-02-25T18:00:00Z', title_no: 'Kurs for unge filmskapere', category: 'theatre', age_group: 'all' }),
			makeEvent({ id: '3', date_start: '2026-02-25T18:00:00Z', title_no: 'Tenåringsklubb', category: 'theatre', age_group: 'all' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(3);
	});

	it('includes events with youth keywords in description', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T18:00:00Z', description_no: 'Åpent for ungdom og voksne', category: 'theatre', age_group: 'all' }),
			makeEvent({ id: '2', date_start: '2026-02-25T18:00:00Z', description_no: 'For alle fra 13–18 år', category: 'theatre', age_group: 'all' }),
			makeEvent({ id: '3', date_start: '2026-02-25T18:00:00Z', description_no: 'Anbefalt fra 12 år', category: 'theatre', age_group: 'all' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(3);
	});

	it('does not match description keywords if age_group is 18+', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T18:00:00Z', description_no: 'Ungdomsfest med DJ', category: 'theatre', age_group: '18+' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});

	it('excludes events outside 2-week window', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-03-10T18:00:00Z', category: 'music', age_group: 'all' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});

	it('excludes tours category', () => {
		const now = new Date('2026-02-24T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T18:00:00Z', category: 'tours', age_group: 'all' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});

	it('handles empty event list', () => {
		const now = new Date('2026-02-24T12:00:00');
		expect(collection.filterEvents([], now)).toHaveLength(0);
	});
});

// ── Seasonal collection filters ────────────────────────────────────

describe('17. mai filter (17-mai)', () => {
	const collection = getCollection('17-mai')!;

	it('exists and is seasonal', () => {
		expect(collection).toBeDefined();
		expect(collection.seasonal).toBe(true);
	});

	it('includes events May 14–18', () => {
		const now = new Date('2026-05-10T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-05-14T10:00:00Z' }), // May 14 ✓
			makeEvent({ id: '2', date_start: '2026-05-15T10:00:00Z' }), // May 15 ✓
			makeEvent({ id: '3', date_start: '2026-05-17T10:00:00Z' }), // May 17 ✓
			makeEvent({ id: '4', date_start: '2026-05-18T10:00:00Z' }), // May 18 ✓
			makeEvent({ id: '5', date_start: '2026-05-13T10:00:00Z' }), // May 13 — excluded
			makeEvent({ id: '6', date_start: '2026-05-19T10:00:00Z' })  // May 19 — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2', '3', '4']);
	});

	it('returns empty outside May window', () => {
		const now = new Date('2026-03-01T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-03-15T10:00:00Z' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});

	it('EN counterpart uses same filter', () => {
		const en = getCollection('17th-of-may-bergen')!;
		expect(en).toBeDefined();
		expect(en.seasonal).toBe(true);
		const now = new Date('2026-05-10T12:00:00');
		const events = [makeEvent({ id: '1', date_start: '2026-05-17T10:00:00Z' })];
		expect(en.filterEvents(events, now)).toHaveLength(1);
	});
});

describe('julemarked filter', () => {
	const collection = getCollection('julemarked')!;

	it('includes events Nov 15 – Dec 23', () => {
		const now = new Date('2026-11-01T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-11-15T10:00:00Z' }), // Nov 15 ✓
			makeEvent({ id: '2', date_start: '2026-12-01T18:00:00Z' }), // Dec 1 ✓
			makeEvent({ id: '3', date_start: '2026-12-23T10:00:00Z' }), // Dec 23 ✓
			makeEvent({ id: '4', date_start: '2026-11-14T10:00:00Z' }), // Nov 14 — excluded
			makeEvent({ id: '5', date_start: '2026-12-24T10:00:00Z' })  // Dec 24 — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2', '3']);
	});

	it('EN counterpart works', () => {
		const en = getCollection('christmas-bergen')!;
		expect(en).toBeDefined();
		const now = new Date('2026-11-01T12:00:00');
		const events = [makeEvent({ id: '1', date_start: '2026-12-01T18:00:00Z' })];
		expect(en.filterEvents(events, now)).toHaveLength(1);
	});
});

describe('påske filter (paske)', () => {
	const collection = getCollection('paske')!;

	it('includes events from Palm Sunday to Easter Monday 2026', () => {
		// Easter 2026: April 5. Palm Sunday = March 29. Easter Monday = April 6.
		const now = new Date('2026-03-20T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-03-29T10:00:00Z' }), // Palm Sunday ✓
			makeEvent({ id: '2', date_start: '2026-04-02T18:00:00Z' }), // Skjærtorsdag ✓
			makeEvent({ id: '3', date_start: '2026-04-05T10:00:00Z' }), // Easter Sunday ✓
			makeEvent({ id: '4', date_start: '2026-04-06T10:00:00Z' }), // Easter Monday ✓
			makeEvent({ id: '5', date_start: '2026-03-28T10:00:00Z' }), // Before Palm Sunday — excluded
			makeEvent({ id: '6', date_start: '2026-04-07T10:00:00Z' })  // After Easter Monday — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2', '3', '4']);
	});

	it('uses correct Easter date for 2027 (March 28)', () => {
		// Easter 2027: March 28. Palm Sunday = March 21. Easter Monday = March 29.
		const now = new Date('2027-03-15T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2027-03-21T10:00:00Z' }), // Palm Sunday ✓
			makeEvent({ id: '2', date_start: '2027-03-29T10:00:00Z' }), // Easter Monday ✓
			makeEvent({ id: '3', date_start: '2027-03-20T10:00:00Z' })  // Day before Palm Sunday — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('EN counterpart works', () => {
		const en = getCollection('easter-bergen')!;
		expect(en).toBeDefined();
		const now = new Date('2026-03-20T12:00:00');
		const events = [makeEvent({ id: '1', date_start: '2026-04-05T10:00:00Z' })];
		expect(en.filterEvents(events, now)).toHaveLength(1);
	});
});

describe('sankthans filter', () => {
	const collection = getCollection('sankthans')!;

	it('includes events June 21–24', () => {
		const now = new Date('2026-06-15T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-06-21T18:00:00Z' }), // June 21 ✓
			makeEvent({ id: '2', date_start: '2026-06-23T20:00:00Z' }), // Sankthansaften ✓
			makeEvent({ id: '3', date_start: '2026-06-24T10:00:00Z' }), // June 24 ✓
			makeEvent({ id: '4', date_start: '2026-06-20T18:00:00Z' }), // June 20 — excluded
			makeEvent({ id: '5', date_start: '2026-06-25T10:00:00Z' })  // June 25 — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2', '3']);
	});

	it('EN counterpart works', () => {
		const en = getCollection('midsummer-bergen')!;
		expect(en).toBeDefined();
		const now = new Date('2026-06-15T12:00:00');
		const events = [makeEvent({ id: '1', date_start: '2026-06-23T20:00:00Z' })];
		expect(en.filterEvents(events, now)).toHaveLength(1);
	});
});

describe('nyttårsaften filter', () => {
	const collection = getCollection('nyttarsaften')!;

	it('includes events Dec 29 – Jan 1 (cross-year)', () => {
		const now = new Date('2026-12-20T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-12-29T18:00:00Z' }), // Dec 29 ✓
			makeEvent({ id: '2', date_start: '2026-12-31T22:00:00Z' }), // NYE ✓
			makeEvent({ id: '3', date_start: '2027-01-01T10:00:00Z' }), // New Year's Day ✓
			makeEvent({ id: '4', date_start: '2026-12-28T18:00:00Z' }), // Dec 28 — excluded
			makeEvent({ id: '5', date_start: '2027-01-02T10:00:00Z' })  // Jan 2 — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2', '3']);
	});

	it('in January, shows previous year NYE window', () => {
		const now = new Date('2027-01-01T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-12-31T22:00:00Z' }), // NYE ✓
			makeEvent({ id: '2', date_start: '2027-01-01T10:00:00Z' }), // New Year's Day ✓
			makeEvent({ id: '3', date_start: '2027-12-31T22:00:00Z' })  // Next year's NYE — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('EN counterpart works', () => {
		const en = getCollection('new-years-eve-bergen')!;
		expect(en).toBeDefined();
		const now = new Date('2026-12-20T12:00:00');
		const events = [makeEvent({ id: '1', date_start: '2026-12-31T22:00:00Z' })];
		expect(en.filterEvents(events, now)).toHaveLength(1);
	});
});

describe('vinterferie filter', () => {
	const collection = getCollection('vinterferie')!;

	it('includes events in ISO week 9 of 2026 (Feb 23 – Mar 1)', () => {
		const now = new Date('2026-02-15T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-23T10:00:00Z' }), // Mon wk9 ✓
			makeEvent({ id: '2', date_start: '2026-02-27T18:00:00Z' }), // Fri wk9 ✓
			makeEvent({ id: '3', date_start: '2026-03-01T10:00:00Z' }), // Sun wk9 ✓
			makeEvent({ id: '4', date_start: '2026-02-22T10:00:00Z' }), // Sun wk8 — excluded
			makeEvent({ id: '5', date_start: '2026-03-02T10:00:00Z' })  // Mon wk10 — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2', '3']);
	});

	it('EN counterpart works', () => {
		const en = getCollection('winter-break-bergen')!;
		expect(en).toBeDefined();
		const now = new Date('2026-02-15T12:00:00');
		const events = [makeEvent({ id: '1', date_start: '2026-02-25T10:00:00Z' })];
		expect(en.filterEvents(events, now)).toHaveLength(1);
	});
});

describe('høstferie filter', () => {
	const collection = getCollection('hostferie')!;

	it('includes events in ISO week 41 of 2026 (Oct 5 – Oct 11)', () => {
		const now = new Date('2026-09-25T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-10-05T10:00:00Z' }), // Mon wk41 ✓
			makeEvent({ id: '2', date_start: '2026-10-08T18:00:00Z' }), // Thu wk41 ✓
			makeEvent({ id: '3', date_start: '2026-10-11T10:00:00Z' }), // Sun wk41 ✓
			makeEvent({ id: '4', date_start: '2026-10-04T10:00:00Z' }), // Sun wk40 — excluded
			makeEvent({ id: '5', date_start: '2026-10-12T10:00:00Z' })  // Mon wk42 — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2', '3']);
	});

	it('returns empty outside week 41', () => {
		const now = new Date('2026-03-01T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-03-15T10:00:00Z' })
		];
		expect(collection.filterEvents(events, now)).toHaveLength(0);
	});
});

describe('seasonal collections metadata', () => {
	const seasonalSlugs = [
		'17-mai', '17th-of-may-bergen',
		'julemarked', 'christmas-bergen',
		'paske', 'easter-bergen',
		'sankthans', 'midsummer-bergen',
		'nyttarsaften', 'new-years-eve-bergen',
		'vinterferie', 'winter-break-bergen',
		'hostferie',
		// Festival collections (Fase 2)
		'festspillene', 'bergen-international-festival',
		'bergenfest', 'bergenfest-bergen',
		'beyond-the-gates', 'beyond-the-gates-bergen',
		'nattjazz', 'nattjazz-bergen',
		// Festival collections (Fase 2b)
		'bergen-pride', 'bergen-pride-festival',
		'biff', 'biff-bergen'
	];

	it('all seasonal collections have seasonal flag', () => {
		for (const slug of seasonalSlugs) {
			const c = getCollection(slug)!;
			expect(c.seasonal, `${slug} should be seasonal`).toBe(true);
		}
	});

	it('all seasonal collections have 3+ FAQ questions per language', () => {
		for (const slug of seasonalSlugs) {
			const c = getCollection(slug)!;
			if (c.faq) {
				for (const lang of ['no', 'en'] as const) {
					expect(c.faq[lang].length, `${slug} ${lang} FAQ count`).toBeGreaterThanOrEqual(3);
				}
			}
		}
	});

	it('all seasonal collections have quickAnswer', () => {
		for (const slug of seasonalSlugs) {
			const c = getCollection(slug)!;
			expect(c.quickAnswer, `${slug} should have quickAnswer`).toBeDefined();
			expect(c.quickAnswer!.no).toBeTruthy();
			expect(c.quickAnswer!.en).toBeTruthy();
		}
	});

	it('non-seasonal collections do not have seasonal flag', () => {
		const nonSeasonal = ['denne-helgen', 'i-kveld', 'gratis', 'familiehelg'];
		for (const slug of nonSeasonal) {
			const c = getCollection(slug)!;
			expect(c.seasonal).toBeFalsy();
		}
	});
});

// ── Festival collection filters (Fase 2) ──────────────────────────

describe('festspillene filter', () => {
	const collection = getCollection('festspillene')!;
	const now = new Date('2026-05-20T12:00:00');

	it('includes events with fib.no source_url', () => {
		const events = [
			makeEvent({ id: '1', source_url: 'https://www.fib.no/program/2026/#abc123' }),
			makeEvent({ id: '2', source_url: 'https://www.fib.no/program/2026/#def456' }),
			makeEvent({ id: '3', source_url: 'https://www.bergenfest.no/artister/foo' })
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('excludes events without source_url', () => {
		const events = [
			makeEvent({ id: '1', source_url: undefined }),
			makeEvent({ id: '2', source_url: 'https://www.fib.no/program/2026/#abc' })
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['2']);
	});

	it('EN slug resolves to same filter', () => {
		const en = getCollection('bergen-international-festival')!;
		const events = [
			makeEvent({ id: '1', source_url: 'https://www.fib.no/program/2026/#abc' }),
			makeEvent({ id: '2', source_url: 'https://example.com/event' })
		];
		expect(en.filterEvents(events, now).map(e => e.id)).toEqual(['1']);
	});
});

describe('bergenfest filter', () => {
	const collection = getCollection('bergenfest')!;
	const now = new Date('2026-06-10T12:00:00');

	it('includes events with bergenfest.no source_url', () => {
		const events = [
			makeEvent({ id: '1', source_url: 'https://www.bergenfest.no/artister/artist-a' }),
			makeEvent({ id: '2', source_url: 'https://www.bergenfest.no/artister/artist-b' }),
			makeEvent({ id: '3', source_url: 'https://www.fib.no/program/2026/#abc' })
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('has maxPerVenue of 50', () => {
		expect(collection.maxPerVenue).toBe(50);
		const en = getCollection('bergenfest-bergen')!;
		expect(en.maxPerVenue).toBe(50);
	});
});

describe('beyond the gates filter', () => {
	const collection = getCollection('beyond-the-gates')!;
	const now = new Date('2026-07-29T12:00:00');

	it('includes events with beyondthegates.no source_url', () => {
		const events = [
			makeEvent({ id: '1', source_url: 'https://beyondthegates.no/lineup-23#2026-07-29-band' }),
			makeEvent({ id: '2', source_url: 'https://beyondthegates.no/lineup-23#2026-07-30-band' }),
			makeEvent({ id: '3', source_url: 'https://www.bergenfest.no/artister/foo' })
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('EN slug resolves to same filter', () => {
		const en = getCollection('beyond-the-gates-bergen')!;
		const events = [
			makeEvent({ id: '1', source_url: 'https://beyondthegates.no/lineup-23#2026-07-29-band' })
		];
		expect(en.filterEvents(events, now)).toHaveLength(1);
	});
});

describe('nattjazz filter', () => {
	const collection = getCollection('nattjazz')!;
	const now = new Date('2026-05-25T12:00:00');

	it('includes events with nattjazz.ticketco.no source_url', () => {
		const events = [
			makeEvent({ id: '1', source_url: 'https://nattjazz.ticketco.no/no/nb/events/12345' }),
			makeEvent({ id: '2', source_url: 'https://nattjazz.ticketco.no/no/nb/events/67890' }),
			makeEvent({ id: '3', source_url: 'https://hulen.ticketco.no/no/nb/events/11111' })
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('excludes other ticketco subdomains', () => {
		const events = [
			makeEvent({ id: '1', source_url: 'https://kvarteret.ticketco.no/no/nb/events/111' }),
			makeEvent({ id: '2', source_url: 'https://nattjazz.ticketco.no/no/nb/events/222' })
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['2']);
	});

	it('EN slug resolves to same filter', () => {
		const en = getCollection('nattjazz-bergen')!;
		const events = [
			makeEvent({ id: '1', source_url: 'https://nattjazz.ticketco.no/no/nb/events/123' })
		];
		expect(en.filterEvents(events, now)).toHaveLength(1);
	});
});

// ── Festival collection filters (Fase 2b) ─────────────────────────

describe('bergen pride filter', () => {
	const collection = getCollection('bergen-pride')!;
	const now = new Date('2026-06-15T12:00:00');

	it('includes events with bergenpride.no source_url', () => {
		const events = [
			makeEvent({ id: '1', source_url: 'https://bergenpride.no/program-friday-13th/#event-one' }),
			makeEvent({ id: '2', source_url: 'https://bergenpride.ticketco.events/no/nb/events/12345' }),
			makeEvent({ id: '3', source_url: 'https://www.bergenfest.no/artister/foo' })
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('EN slug resolves to same filter', () => {
		const en = getCollection('bergen-pride-festival')!;
		const events = [
			makeEvent({ id: '1', source_url: 'https://bergenpride.no/program-tuesday-17th/#drag-show' }),
			makeEvent({ id: '2', source_url: 'https://example.com/event' })
		];
		expect(en.filterEvents(events, now).map(e => e.id)).toEqual(['1']);
	});
});

describe('biff filter', () => {
	const collection = getCollection('biff')!;
	const now = new Date('2026-10-18T12:00:00');

	it('includes events with biff.no source_url', () => {
		const events = [
			makeEvent({ id: '1', source_url: 'https://www.biff.no/f/some-film/1234#show-5678' }),
			makeEvent({ id: '2', source_url: 'https://www.biff.no/f/another-film/5678#show-9012' }),
			makeEvent({ id: '3', source_url: 'https://www.fib.no/program/2026/#abc' })
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '2']);
	});

	it('includes events page items', () => {
		const events = [
			makeEvent({ id: '1', source_url: 'https://www.biff.no/article/some-event' }),
			makeEvent({ id: '2', source_url: 'https://www.biff.no/f/film/123#show-456' })
		];
		const result = collection.filterEvents(events, now);
		expect(result).toHaveLength(2);
	});

	it('EN slug resolves to same filter', () => {
		const en = getCollection('biff-bergen')!;
		const events = [
			makeEvent({ id: '1', source_url: 'https://www.biff.no/f/some-film/1234#show-5678' })
		];
		expect(en.filterEvents(events, now)).toHaveLength(1);
	});
});

describe('festival collections EN counterparts', () => {
	const pairs: [string, string][] = [
		['festspillene', 'bergen-international-festival'],
		['bergenfest', 'bergenfest-bergen'],
		['beyond-the-gates', 'beyond-the-gates-bergen'],
		['nattjazz', 'nattjazz-bergen'],
		['bergen-pride', 'bergen-pride-festival'],
		['biff', 'biff-bergen']
	];

	for (const [noSlug, enSlug] of pairs) {
		it(`${noSlug} ↔ ${enSlug} both resolve`, () => {
			expect(getCollection(noSlug)).toBeDefined();
			expect(getCollection(enSlug)).toBeDefined();
		});

		it(`${noSlug} ↔ ${enSlug} have same FAQ count per language`, () => {
			const no = getCollection(noSlug)!;
			const en = getCollection(enSlug)!;
			if (no.faq && en.faq) {
				expect(no.faq.no.length).toBe(no.faq.en.length);
				expect(en.faq.no.length).toBe(en.faq.en.length);
			}
		});
	}
});
