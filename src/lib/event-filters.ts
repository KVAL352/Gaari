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

/** Suggest which When filter to highlight based on current time in Oslo */
export function getContextualHighlight(now: Date): string {
	const hour = now.getHours();
	const day = now.getDay(); // 0=Sun, 6=Sat
	if (hour >= 16) return 'today';
	if ((day === 5 && hour >= 12) || day === 6 || day === 0) return 'weekend';
	return '';
}

/** Check if an event (with optional date_end) overlaps a date range [from, to] (YYYY-MM-DD strings).
 *  Long-running events (>7 days) are treated as recurring series and only match if
 *  date_start falls in the range. Weekly clubs with date_end = next instance span ≥7
 *  days and should not match short windows like "this weekend". Genuine multi-day
 *  festivals (3–5 days) fall under the threshold. */
export function eventOverlapsRange(e: { date_start: string; date_end?: string }, from: string, to: string): boolean {
	const start = e.date_start.slice(0, 10);
	const end = e.date_end ? e.date_end.slice(0, 10) : start;
	if (e.date_end) {
		const durationDays = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
		if (durationDays >= 6) {
			return start >= from && start <= to;
		}
	}
	return start <= to && end >= from;
}

/** Check if an event spans a specific day (YYYY-MM-DD string) */
export function eventOnDay(e: { date_start: string; date_end?: string }, day: string): boolean {
	return eventOverlapsRange(e, day, day);
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
			case 'latenight':
				return osloHour >= 20 || osloHour < 6;
			default:
				return false;
		}
	});
}

/**
 * Rekkefølgen i lista på forsiden: det som starter nå eller senere (og det som
 * startet tidligere i dag, Oslo-tid) etter starttid; deretter det som startet
 * en tidligere dag og fortsatt pågår, etter sluttid.
 *
 * Det som startet tidligere i dag skal stå under «I dag». Før 17. nov 2026 gikk
 * det bakerst i en liste på flere hundre, så «I dag» viste 21 mens knappen
 * sa 23: Elvetun 11:30 og Etterskoleklubb 13:30 forsvant midt på dagen.
 *
 * `nowIso` skal være serverens tid (data.now), ikke klientens, ellers stokkes
 * kortene om under hydrering av den ISR-cachede siden.
 */
export function sortForListing<T extends { date_start: string; date_end?: string | null }>(
	events: T[],
	nowIso: string
): T[] {
	const today = toOsloDateStr(new Date(nowIso));
	const isUpcoming = (e: T) =>
		e.date_start >= nowIso || toOsloDateStr(new Date(e.date_start)) === today;
	const upcoming = events.filter(isUpcoming);
	const ongoing = events.filter((e) => !isUpcoming(e));
	upcoming.sort((a, b) => (a.date_start < b.date_start ? -1 : a.date_start > b.date_start ? 1 : 0));
	ongoing.sort((a, b) =>
		(a.date_end ?? '') < (b.date_end ?? '') ? -1 : (a.date_end ?? '') > (b.date_end ?? '') ? 1 : 0
	);
	return [...upcoming, ...ongoing];
}
