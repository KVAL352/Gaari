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
	const sun = new Date(sat);
	sun.setDate(sat.getDate() + 1);
	return {
		start: day === 5 ? toOsloDateStr(now) : toOsloDateStr(sat), // Include Friday if today is Friday
		end: toOsloDateStr(sun)
	};
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
