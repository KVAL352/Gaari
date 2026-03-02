import { describe, it, expect } from 'vitest';
import { matchesTimeOfDay, getWeekendDates, isSameDay, toOsloDateStr, addDays, getEndOfWeekDateStr, buildQueryString, getEasterDate, getISOWeekDates, getContextualHighlight } from '../event-filters';

describe('matchesTimeOfDay', () => {
	// Winter (CET, UTC+1): 19:00 UTC = 20:00 Oslo = evening
	it('classifies winter evening correctly (UTC+1)', () => {
		expect(matchesTimeOfDay('2026-01-15T19:00:00Z', ['evening'])).toBe(true);
		expect(matchesTimeOfDay('2026-01-15T19:00:00Z', ['morning'])).toBe(false);
	});

	// Summer (CEST, UTC+2): 19:00 UTC = 21:00 Oslo = evening
	it('classifies summer evening correctly (UTC+2)', () => {
		expect(matchesTimeOfDay('2026-07-15T19:00:00Z', ['evening'])).toBe(true);
		expect(matchesTimeOfDay('2026-07-15T19:00:00Z', ['night'])).toBe(false);
	});

	it('classifies morning', () => {
		// 08:00 UTC in winter = 09:00 Oslo
		expect(matchesTimeOfDay('2026-01-15T08:00:00Z', ['morning'])).toBe(true);
	});

	it('classifies daytime', () => {
		// 13:00 UTC in winter = 14:00 Oslo
		expect(matchesTimeOfDay('2026-01-15T13:00:00Z', ['daytime'])).toBe(true);
	});

	it('classifies night', () => {
		// 22:00 UTC in winter = 23:00 Oslo
		expect(matchesTimeOfDay('2026-01-15T22:00:00Z', ['night'])).toBe(true);
	});

	it('classifies early morning as night', () => {
		// 03:00 UTC in winter = 04:00 Oslo (< 6, so night)
		expect(matchesTimeOfDay('2026-01-15T03:00:00Z', ['night'])).toBe(true);
		expect(matchesTimeOfDay('2026-01-15T03:00:00Z', ['morning'])).toBe(false);
	});

	it('matches any of multiple time ranges', () => {
		// 09:00 Oslo = morning
		expect(matchesTimeOfDay('2026-01-15T08:00:00Z', ['morning', 'evening'])).toBe(true);
	});

	it('returns true for invalid date (includes event)', () => {
		expect(matchesTimeOfDay('not-a-date', ['morning'])).toBe(true);
	});

	it('returns false for empty times array', () => {
		expect(matchesTimeOfDay('2026-01-15T08:00:00Z', [])).toBe(false);
	});

	it('returns false for unknown time-of-day value', () => {
		expect(matchesTimeOfDay('2026-01-15T08:00:00Z', ['afternoon'])).toBe(false);
	});
});

describe('getWeekendDates', () => {
	it('Monday returns upcoming Friday through Sunday', () => {
		const mon = new Date('2026-02-23T12:00:00'); // Monday
		const { start, end } = getWeekendDates(mon);
		expect(start).toBe('2026-02-27'); // Friday
		expect(end).toBe('2026-03-01'); // Sunday
	});

	it('Friday includes Friday as start', () => {
		const fri = new Date('2026-02-27T12:00:00'); // Friday
		const { start, end } = getWeekendDates(fri);
		expect(start).toBe('2026-02-27'); // Friday itself
		expect(end).toBe('2026-03-01'); // Sunday
	});

	it('Saturday returns same Saturday and Sunday', () => {
		const sat = new Date('2026-02-28T12:00:00'); // Saturday
		const { start, end } = getWeekendDates(sat);
		expect(start).toBe('2026-02-28'); // Same Saturday
		expect(end).toBe('2026-03-01'); // Sunday
	});

	it('Sunday returns previous Saturday and same Sunday', () => {
		const sun = new Date('2026-03-01T12:00:00'); // Sunday
		const { start, end } = getWeekendDates(sun);
		expect(start).toBe('2026-02-28'); // Previous Saturday
		expect(end).toBe('2026-03-01'); // Same Sunday
	});
});

describe('isSameDay', () => {
	it('matches same day', () => {
		expect(isSameDay('2026-02-24T18:00:00Z', '2026-02-24')).toBe(true);
	});

	it('rejects different day', () => {
		expect(isSameDay('2026-02-25T18:00:00Z', '2026-02-24')).toBe(false);
	});
});

describe('toOsloDateStr', () => {
	it('formats a UTC date to Oslo date string', () => {
		// In winter, midnight UTC is 01:00 Oslo — same date
		const d = new Date('2026-01-15T12:00:00Z');
		expect(toOsloDateStr(d)).toBe('2026-01-15');
	});

	it('handles date boundary in winter (23:30 UTC = 00:30 next day in Oslo)', () => {
		const d = new Date('2026-01-15T23:30:00Z');
		// UTC+1: 23:30 UTC = 00:30 Jan 16 Oslo
		expect(toOsloDateStr(d)).toBe('2026-01-16');
	});
});

describe('addDays', () => {
	it('adds one day', () => {
		const d = new Date('2026-02-24T12:00:00');
		const result = addDays(d, 1);
		expect(result.getDate()).toBe(25);
	});

	it('does not mutate the original date', () => {
		const d = new Date('2026-02-24T12:00:00');
		addDays(d, 5);
		expect(d.getDate()).toBe(24);
	});

	it('crosses month boundary', () => {
		const d = new Date('2026-02-28T12:00:00');
		const result = addDays(d, 1);
		expect(result.getMonth()).toBe(2); // March (0-indexed)
		expect(result.getDate()).toBe(1);
	});
});

describe('getEndOfWeekDateStr', () => {
	it('Monday returns Sunday', () => {
		const mon = new Date('2026-02-23T12:00:00'); // Monday
		expect(getEndOfWeekDateStr(mon)).toBe('2026-03-01');
	});

	it('Sunday returns same Sunday', () => {
		const sun = new Date('2026-03-01T12:00:00'); // Sunday
		expect(getEndOfWeekDateStr(sun)).toBe('2026-03-01');
	});

	it('Saturday returns next day Sunday', () => {
		const sat = new Date('2026-02-28T12:00:00'); // Saturday
		expect(getEndOfWeekDateStr(sat)).toBe('2026-03-01');
	});
});

describe('buildQueryString', () => {
	it('sets a new parameter', () => {
		expect(buildQueryString('', 'when', 'today')).toBe('when=today');
	});

	it('removes a parameter when value is empty', () => {
		expect(buildQueryString('when=today&category=music', 'when', '')).toBe('category=music');
	});

	it('resets page when changing a non-page filter', () => {
		expect(buildQueryString('when=today&page=3', 'category', 'music')).toBe('when=today&category=music');
	});

	it('does not reset page when changing page itself', () => {
		const result = buildQueryString('when=today', 'page', '2');
		expect(result).toContain('page=2');
		expect(result).toContain('when=today');
	});
});

describe('getEasterDate', () => {
	it.each([
		[2024, 3, 31],  // March 31
		[2025, 4, 20],  // April 20
		[2026, 4, 5],   // April 5
		[2027, 3, 28],  // March 28
		[2028, 4, 16],  // April 16
		[2029, 4, 1],   // April 1
		[2030, 4, 21],  // April 21
		[2031, 4, 13],  // April 13
		[2033, 4, 17],  // April 17
		[2035, 3, 25],  // March 25
		[2038, 4, 25],  // April 25
	])('computes Easter Sunday for %i as %i-%i', (year, month, day) => {
		const easter = getEasterDate(year);
		expect(easter.getFullYear()).toBe(year);
		expect(easter.getMonth() + 1).toBe(month);
		expect(easter.getDate()).toBe(day);
	});
});

describe('getISOWeekDates', () => {
	it('week 9 of 2026 is Feb 23 – Mar 1', () => {
		const { start, end } = getISOWeekDates(2026, 9);
		expect(start).toBe('2026-02-23');
		expect(end).toBe('2026-03-01');
	});

	it('week 41 of 2026 is Oct 5 – Oct 11', () => {
		const { start, end } = getISOWeekDates(2026, 41);
		expect(start).toBe('2026-10-05');
		expect(end).toBe('2026-10-11');
	});

	it('week 1 of 2026 starts in Dec 2025', () => {
		const { start, end } = getISOWeekDates(2026, 1);
		expect(start).toBe('2025-12-29');
		expect(end).toBe('2026-01-04');
	});

	it('week 1 of 2025 is Dec 30 2024 – Jan 5 2025', () => {
		// Jan 4 2025 is Saturday → Monday of that week is Dec 30
		const { start, end } = getISOWeekDates(2025, 1);
		expect(start).toBe('2024-12-30');
		expect(end).toBe('2025-01-05');
	});

	it('week 52 of 2026 is Dec 21 – Dec 27', () => {
		const { start, end } = getISOWeekDates(2026, 52);
		expect(start).toBe('2026-12-21');
		expect(end).toBe('2026-12-27');
	});

	it('week 53 of 2020 (long year) is Dec 28 – Jan 3', () => {
		const { start, end } = getISOWeekDates(2020, 53);
		expect(start).toBe('2020-12-28');
		expect(end).toBe('2021-01-03');
	});

	it('week 9 of 2027 is Mar 1 – Mar 7', () => {
		const { start, end } = getISOWeekDates(2027, 9);
		expect(start).toBe('2027-03-01');
		expect(end).toBe('2027-03-07');
	});
});

describe('getContextualHighlight', () => {
	it('returns "today" after 16:00 on a weekday', () => {
		// Wednesday 17:00
		expect(getContextualHighlight(new Date(2026, 2, 4, 17, 0))).toBe('today');
	});

	it('returns "today" at 22:00 on a weekday', () => {
		// Tuesday 22:00
		expect(getContextualHighlight(new Date(2026, 2, 3, 22, 0))).toBe('today');
	});

	it('returns empty string before 16:00 on a weekday', () => {
		// Wednesday 10:00
		expect(getContextualHighlight(new Date(2026, 2, 4, 10, 0))).toBe('');
	});

	it('returns "weekend" on Friday after 12:00', () => {
		// Friday 14:00
		expect(getContextualHighlight(new Date(2026, 2, 6, 14, 0))).toBe('weekend');
	});

	it('returns "today" on Friday after 16:00 (today takes precedence)', () => {
		// Friday 18:00 — after 16:00, "today" wins
		expect(getContextualHighlight(new Date(2026, 2, 6, 18, 0))).toBe('today');
	});

	it('returns "weekend" on Saturday morning', () => {
		// Saturday 10:00
		expect(getContextualHighlight(new Date(2026, 2, 7, 10, 0))).toBe('weekend');
	});

	it('returns "today" on Saturday after 16:00', () => {
		// Saturday 17:00
		expect(getContextualHighlight(new Date(2026, 2, 7, 17, 0))).toBe('today');
	});

	it('returns "weekend" on Sunday morning', () => {
		// Sunday 11:00
		expect(getContextualHighlight(new Date(2026, 2, 8, 11, 0))).toBe('weekend');
	});

	it('returns empty string on Monday morning', () => {
		// Monday 09:00
		expect(getContextualHighlight(new Date(2026, 2, 2, 9, 0))).toBe('');
	});
});
