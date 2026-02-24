import { describe, it, expect } from 'vitest';
import { getCollection, getAllCollectionSlugs } from '../collections';
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

	it('returns all 8 collections', () => {
		const slugs = getAllCollectionSlugs();
		expect(slugs).toHaveLength(8);
		expect(slugs).toContain('denne-helgen');
		expect(slugs).toContain('i-kveld');
		expect(slugs).toContain('gratis');
		expect(slugs).toContain('today-in-bergen');
		expect(slugs).toContain('familiehelg');
		expect(slugs).toContain('konserter');
		expect(slugs).toContain('studentkveld');
		expect(slugs).toContain('this-weekend');
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

	it('includes Saturday–Sunday events when now is Wednesday', () => {
		// Wednesday Feb 25, 2026
		const now = new Date('2026-02-25T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T19:00:00Z' }), // Wednesday — excluded
			makeEvent({ id: '2', date_start: '2026-02-28T14:00:00Z' }), // Saturday
			makeEvent({ id: '3', date_start: '2026-03-01T10:00:00Z' })  // Sunday
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['2', '3']);
	});

	it('returns empty array when no weekend events', () => {
		const now = new Date('2026-02-25T12:00:00'); // Wednesday
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-25T19:00:00Z' }) // Wednesday
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

	it('includes only family events on the weekend', () => {
		// Friday Feb 27, 2026
		const now = new Date('2026-02-27T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-28T14:00:00Z', age_group: 'family' }),  // Sat family
			makeEvent({ id: '2', date_start: '2026-02-28T14:00:00Z', age_group: 'all' }),      // Sat, not family
			makeEvent({ id: '3', date_start: '2026-03-01T10:00:00Z', age_group: 'family' }),   // Sun family
			makeEvent({ id: '4', date_start: '2026-03-02T10:00:00Z', age_group: 'family' })    // Mon — excluded
		];
		const result = collection.filterEvents(events, now);
		expect(result.map(e => e.id)).toEqual(['1', '3']);
	});

	it('returns empty when no family events on weekend', () => {
		const now = new Date('2026-02-27T12:00:00');
		const events = [
			makeEvent({ id: '1', date_start: '2026-02-28T14:00:00Z', age_group: 'all' })
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
