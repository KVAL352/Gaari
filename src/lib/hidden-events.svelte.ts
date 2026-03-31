import { browser } from '$app/environment';

const STORAGE_KEY = 'gaari-hidden';
const VENUE_CATEGORY_TTL_DAYS = 7;

interface HiddenEntry {
	value: string;
	added: string; // ISO date string
}

interface HiddenState {
	events: string[];
	venues: HiddenEntry[];
	categories: HiddenEntry[];
}

function now(): string {
	return new Date().toISOString().slice(0, 10);
}

function isExpired(entry: HiddenEntry): boolean {
	const added = new Date(entry.added);
	const expiry = new Date(added);
	expiry.setDate(expiry.getDate() + VENUE_CATEGORY_TTL_DAYS);
	return new Date() > expiry;
}

function loadState(): HiddenState {
	if (!browser) return { events: [], venues: [], categories: [] };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { events: [], venues: [], categories: [] };
		const parsed = JSON.parse(raw);

		// Migrate old format (string[]) to new format (HiddenEntry[])
		const migrateEntries = (arr: unknown[]): HiddenEntry[] =>
			arr.map(v => typeof v === 'string' ? { value: v, added: now() } : v as HiddenEntry);

		const s: HiddenState = {
			events: Array.isArray(parsed.events) ? parsed.events : [],
			venues: Array.isArray(parsed.venues) ? migrateEntries(parsed.venues) : [],
			categories: Array.isArray(parsed.categories) ? migrateEntries(parsed.categories) : [],
		};

		// Prune expired venue/category entries
		const venuesBefore = s.venues.length;
		const catsBefore = s.categories.length;
		s.venues = s.venues.filter(e => !isExpired(e));
		s.categories = s.categories.filter(e => !isExpired(e));

		if (s.venues.length !== venuesBefore || s.categories.length !== catsBefore) {
			persist(s);
		}

		return s;
	} catch {
		return { events: [], venues: [], categories: [] };
	}
}

function persist(s: HiddenState) {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

let state = $state(loadState());

export function isHidden(id: string, venue: string, category: string): boolean {
	return (
		state.events.includes(id) ||
		state.venues.some(e => e.value === venue) ||
		state.categories.some(e => e.value === category)
	);
}

export function hideEvent(id: string) {
	if (!state.events.includes(id)) {
		state.events = [...state.events, id];
		persist(state);
	}
}

export function hideVenue(venue: string) {
	if (!state.venues.some(e => e.value === venue)) {
		state.venues = [...state.venues, { value: venue, added: now() }];
		persist(state);
	}
}

export function hideCategory(category: string) {
	if (!state.categories.some(e => e.value === category)) {
		state.categories = [...state.categories, { value: category, added: now() }];
		persist(state);
	}
}

export function unhideAll() {
	state.events = [];
	state.venues = [];
	state.categories = [];
	persist(state);
}

export function hiddenCount(): number {
	return state.events.length + state.venues.length + state.categories.length;
}

export function hiddenSummary(lang: string): string[] {
	const items: string[] = [];
	if (state.venues.length > 0) items.push(...state.venues.map(e => e.value));
	if (state.categories.length > 0) items.push(...state.categories.map(e => e.value));
	if (state.events.length > 0) {
		const n = state.events.length;
		items.push(lang === 'no' ? `${n} arrangement` : `${n} event${n > 1 ? 's' : ''}`);
	}
	return items;
}
