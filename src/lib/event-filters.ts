import type { TimeOfDay } from './types';

export function getOsloNow(): Date {
	// Get current time in Oslo timezone
	const str = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Oslo' });
	return new Date(str.replace(' ', 'T'));
}

export function toOsloDateStr(date: Date): string {
	return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
}

export function isSameDay(dateStr: string, refDateStr: string): boolean {
	return dateStr.slice(0, 10) === refDateStr;
}

export function getWeekendDates(now: Date): { start: string; end: string } {
	const day = now.getDay(); // 0=Sun, 6=Sat
	const daysToSat = day === 0 ? -1 : 6 - day; // if Sunday, Saturday was yesterday
	const sat = new Date(now);
	sat.setDate(now.getDate() + daysToSat);
	const fri = new Date(sat);
	fri.setDate(sat.getDate() - 1);
	const sun = new Date(sat);
	sun.setDate(sat.getDate() + 1);
	// Mon–Fri: start from Friday (upcoming or today). Sat/Sun: start from Saturday.
	const start = (day >= 1 && day <= 5) ? toOsloDateStr(fri) : toOsloDateStr(sat);
	return { start, end: toOsloDateStr(sun) };
}

export function addDays(date: Date, days: number): Date {
	const result = new Date(date.getTime());
	result.setDate(result.getDate() + days);
	return result;
}

export function getEndOfWeekDateStr(now: Date): string {
	const day = now.getDay();
	const daysToSunday = day === 0 ? 0 : 7 - day;
	const endOfWeek = new Date(now.getTime());
	endOfWeek.setDate(now.getDate() + daysToSunday);
	return toOsloDateStr(endOfWeek);
}

export function buildQueryString(search: string, key: string, value: string): string {
	const params = new URLSearchParams(search);
	if (value) {
		params.set(key, value);
	} else {
		params.delete(key);
	}
	if (key !== 'page') params.delete('page');
	return params.toString();
}

/** Format a local Date as YYYY-MM-DD without timezone conversion */
function formatDateStr(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Compute Easter Sunday for a given year (Anonymous Gregorian / Computus algorithm) */
export function getEasterDate(year: number): Date {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return new Date(year, month - 1, day);
}

/** Get Monday–Sunday date range for a given ISO week number */
export function getISOWeekDates(year: number, week: number): { start: string; end: string } {
	const jan4 = new Date(year, 0, 4);
	const dayOfWeek = jan4.getDay() || 7; // Convert Sun=0 to Sun=7
	const week1Monday = new Date(jan4);
	week1Monday.setDate(jan4.getDate() - dayOfWeek + 1);
	const targetMonday = new Date(week1Monday);
	targetMonday.setDate(week1Monday.getDate() + (week - 1) * 7);
	const targetSunday = new Date(targetMonday);
	targetSunday.setDate(targetMonday.getDate() + 6);
	return { start: formatDateStr(targetMonday), end: formatDateStr(targetSunday) };
}

export function matchesTimeOfDay(dateStart: string, times: string[]): boolean {
	// Convert UTC timestamp to Oslo local hour
	const date = new Date(dateStart);
	if (isNaN(date.getTime())) return true; // No valid time, include the event
	const osloHour = Number(
		date
			.toLocaleString('sv-SE', { timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false })
			.slice(0, 2)
	);

	return times.some((t) => {
		switch (t as TimeOfDay) {
			case 'morning':
				return osloHour >= 6 && osloHour < 12;
			case 'daytime':
				return osloHour >= 12 && osloHour < 17;
			case 'evening':
				return osloHour >= 17 && osloHour < 22;
			case 'night':
				return osloHour >= 22 || osloHour < 6;
			default:
				return false;
		}
	});
}
