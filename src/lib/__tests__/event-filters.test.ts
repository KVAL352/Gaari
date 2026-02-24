import { describe, it, expect } from 'vitest';
import { matchesTimeOfDay, getWeekendDates, isSameDay, toOsloDateStr } from '../event-filters';

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
	it('Monday returns upcoming Saturday and Sunday', () => {
		const mon = new Date('2026-02-23T12:00:00'); // Monday
		const { start, end } = getWeekendDates(mon);
		expect(start).toBe('2026-02-28'); // Saturday
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
