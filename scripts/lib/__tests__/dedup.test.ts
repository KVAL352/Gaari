import { describe, it, expect, vi } from 'vitest';

// Mock supabase and venues before importing dedup
vi.mock('../supabase.js', () => ({
	supabase: {
		from: () => ({
			select: () => ({ order: () => ({ data: [], error: null }) }),
			delete: () => ({ in: () => ({ error: null }) })
		})
	}
}));

vi.mock('../venues.js', () => ({
	isAggregatorUrl: (url: string) => {
		const aggregators = ['visitbergen.com', 'barnasnorge.no'];
		return aggregators.some((d) => url.includes(d));
	}
}));

import { titlesMatch, scoreEvent, type EventRow } from '../dedup.js';
import { normalizeTitle } from '../utils.js';

describe('titlesMatch', () => {
	it('matches exact same strings', () => {
		expect(titlesMatch('konsert på grieghallen', 'konsert på grieghallen')).toBe(true);
	});

	it('exact match works even for short titles', () => {
		// Exact equality check fires before the length guard
		expect(titlesMatch('abc', 'abc')).toBe(true);
	});

	it('rejects short titles for fuzzy matching (< 5 chars)', () => {
		// Non-exact short titles are rejected
		expect(titlesMatch('abcd', 'abcde')).toBe(false);
	});

	it('matches when one contains the other with adequate length ratio', () => {
		// "grieghallenkonsert" (18) contains "grieghallen" (11) → ratio 11/18 = 0.61 > 0.6
		expect(titlesMatch('grieghallenkonsert', 'grieghallen')).toBe(true);
	});

	it('rejects containment when length ratio is too low', () => {
		// "abcdefghijklmnopqrst" (20) contains "abcdef" (6) → ratio 6/20 = 0.3 < 0.6
		expect(titlesMatch('abcdefghijklmnopqrst', 'abcdef')).toBe(false);
	});

	it('matches 90% prefix overlap with similar length', () => {
		// Two strings that share a 90% prefix and are within 1.3x length
		const a = 'abcdefghijk'; // 11 chars
		const b = 'abcdefghijx'; // 11 chars, 90% prefix = "abcdefghij" (10 chars)
		// a includes b's 90% prefix "abcdefghij"? yes
		// length ratio: 11/11 = 1.0 <= 1.3
		expect(titlesMatch(a, b)).toBe(true);
	});

	it('rejects prefix overlap when length ratio exceeds 1.3', () => {
		const short = 'abcdefgh'; // 8 chars
		const long = 'abcdefghabcdefgh'; // 16 chars, ratio 16/8 = 2.0 > 1.3
		expect(titlesMatch(short, long)).toBe(false);
	});

	it('does not match completely different titles', () => {
		expect(titlesMatch('konsert grieghallen', 'fotball brann stadion')).toBe(false);
	});

	it('works with normalized titles (real-world scenario)', () => {
		const a = normalizeTitle('Bergenfest 2026 — Dagpass Lørdag');
		const b = normalizeTitle('Bergenfest - Dagpass lørdag');
		// After normalization, years and special chars removed
		expect(titlesMatch(a, b)).toBe(true);
	});
});

describe('scoreEvent', () => {
	const baseEvent: EventRow = {
		id: '1',
		title_no: 'Test',
		date_start: '2026-03-15T19:00:00',
		source: 'bergenlive',
		image_url: null,
		ticket_url: null,
		description_no: null
	};

	it('gives base score from SOURCE_RANK', () => {
		expect(scoreEvent(baseEvent)).toBe(5); // bergenlive = 5
	});

	it('adds 2 for image_url', () => {
		expect(scoreEvent({ ...baseEvent, image_url: 'https://example.com/img.jpg' })).toBe(7);
	});

	it('adds 2 for non-aggregator ticket_url', () => {
		expect(
			scoreEvent({ ...baseEvent, ticket_url: 'https://ticketco.events/something' })
		).toBe(7);
	});

	it('does NOT add ticket bonus for aggregator URLs', () => {
		expect(
			scoreEvent({ ...baseEvent, ticket_url: 'https://visitbergen.com/event/123' })
		).toBe(5);
	});

	it('adds 1 for description longer than 50 chars', () => {
		const longDesc = 'A'.repeat(51);
		expect(scoreEvent({ ...baseEvent, description_no: longDesc })).toBe(6);
	});

	it('does not add description bonus for short descriptions', () => {
		expect(scoreEvent({ ...baseEvent, description_no: 'Short' })).toBe(5);
	});

	it('returns 0 for unknown source', () => {
		expect(scoreEvent({ ...baseEvent, source: 'unknownsource' })).toBe(0);
	});

	it('accumulates all bonuses', () => {
		const fullEvent: EventRow = {
			...baseEvent,
			image_url: 'https://example.com/img.jpg',
			ticket_url: 'https://ticketco.events/buy',
			description_no: 'A'.repeat(60)
		};
		// 5 (bergenlive) + 2 (image) + 2 (ticket) + 1 (description) = 10
		expect(scoreEvent(fullEvent)).toBe(10);
	});
});
