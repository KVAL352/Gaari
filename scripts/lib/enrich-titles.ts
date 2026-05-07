import { supabase } from './supabase.js';

const NO_DAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const NO_MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const RECURRING_THRESHOLD = 3;

function bergenLocal(dateIso: string): Date {
	return new Date(new Date(dateIso).toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
}

function suffix(dateIso: string, lang: 'no' | 'en'): string {
	const d = bergenLocal(dateIso);
	const day = d.getDay();
	const dom = d.getDate();
	const mon = d.getMonth();
	if (lang === 'no') return ` — ${NO_DAYS[day]} ${dom}. ${NO_MONTHS[mon]}`;
	return ` — ${EN_DAYS[day]} ${dom} ${EN_MONTHS[mon]}`;
}

// True if title already has a date-suffix appended by us. Idempotent guard.
function hasDateSuffix(title: string): boolean {
	if (!title.includes(' — ')) return false;
	const tail = title.split(' — ').pop() || '';
	const tailLower = tail.toLowerCase();
	return NO_DAYS.some(d => tailLower.startsWith(d)) || EN_DAYS.some(d => tailLower.startsWith(d.toLowerCase()));
}

function baseTitle(title: string): string {
	if (!hasDateSuffix(title)) return title.trim();
	return title.split(' — ').slice(0, -1).join(' — ').trim();
}

/**
 * Append day-name + date suffix to titles that recur 3+ times among future events.
 * Idempotent — events that already have a date suffix are skipped.
 * Groups by base title (suffix-stripped), so adding new instances naturally extends the group.
 */
export async function enrichRecurringTitles(): Promise<{ scanned: number; updated: number; groups: number }> {
	const nowUtc = new Date().toISOString();
	let all: Array<{ id: string; title_no: string; title_en: string | null; date_start: string }> = [];
	let from = 0;
	while (true) {
		const { data } = await supabase
			.from('events')
			.select('id, title_no, title_en, date_start')
			.gte('date_start', nowUtc)
			.order('id')
			.range(from, from + 999);
		if (!data || data.length === 0) break;
		all = all.concat(data);
		if (data.length < 1000) break;
		from += 1000;
	}

	const groups = new Map<string, typeof all>();
	for (const e of all) {
		const key = baseTitle(e.title_no).toLowerCase();
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(e);
	}

	const recurring = [...groups.values()].filter(arr => arr.length >= RECURRING_THRESHOLD);
	let updated = 0;

	for (const arr of recurring) {
		for (const e of arr) {
			if (hasDateSuffix(e.title_no)) continue;
			const update: { title_no: string; title_en?: string } = {
				title_no: e.title_no.trim() + suffix(e.date_start, 'no'),
			};
			if (e.title_en) update.title_en = e.title_en.trim() + suffix(e.date_start, 'en');
			const { error } = await supabase.from('events').update(update).eq('id', e.id);
			if (!error) updated++;
		}
	}

	return { scanned: all.length, updated, groups: recurring.length };
}
