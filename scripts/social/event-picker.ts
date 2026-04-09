/**
 * Diverse event picker shared between generate-reels.ts and generate-posts.ts
 * so reels, stories AND carousel use the same selection logic.
 *
 * Goals:
 *   1. IG-handle cap (1 per batch) — Bibliotek branches share @bergenbibliotek
 *      and Akvariet has many daily activities. They get one slot each so the
 *      batch shows breadth instead of being dominated by them.
 *   2. Time-bucket spread — round-robin across morning/midday/afternoon/
 *      evening so we don't bunch the batch in one window.
 *   3. Day-bucket spread — for multi-day collections (denne-helgen) we still
 *      want fri/lør/søn coverage.
 */
import { getVenueInstagram } from '../lib/venues.js';

interface MinimalEvent {
	id?: string;
	venue_name: string;
	date_start: string;
	image_url?: string | null;
}

interface PickerOptions {
	/** Event IDs to deprioritise (posted recently in other collections) */
	recentlyPosted?: Set<string>;
}

type Bucket = 'morning' | 'midday' | 'afternoon' | 'evening';

function timeBucket(dateStart: string): Bucket {
	const oslo = new Date(dateStart).toLocaleString('en-GB', {
		timeZone: 'Europe/Oslo',
		hour: '2-digit',
		hour12: false
	});
	const hour = parseInt(oslo, 10);
	if (hour < 11) return 'morning';
	if (hour < 15) return 'midday';
	if (hour < 19) return 'afternoon';
	return 'evening';
}

const BUCKET_ORDER: readonly Bucket[] = ['morning', 'midday', 'afternoon', 'evening'];

export function pickDiverseEvents<T extends MinimalEvent>(events: T[], target: number, options?: PickerOptions): T[] {
	const recentlyPosted = options?.recentlyPosted;

	// Two-pass strategy: first pick from fresh events, then fill from recently posted
	if (recentlyPosted && recentlyPosted.size > 0) {
		const fresh = events.filter(e => !e.id || !recentlyPosted.has(e.id));
		const stale = events.filter(e => e.id && recentlyPosted.has(e.id));
		const picked = pickFromPool(fresh, target);
		if (picked.length < target && stale.length > 0) {
			const remaining = target - picked.length;
			const handleSeen = new Set(picked.map(e => getVenueInstagram(e.venue_name) || `__noip:${e.venue_name}`));
			const venueSeen = new Set(picked.map(e => e.venue_name));
			const backfill = pickFromPool(stale, remaining, handleSeen, venueSeen);
			picked.push(...backfill);
		}
		return picked;
	}

	return pickFromPool(events, target);
}

function pickFromPool<T extends MinimalEvent>(
	events: T[], target: number,
	existingHandles?: Set<string>, existingVenues?: Set<string>
): T[] {
	type Cell = { day: string; bucket: Bucket; events: T[]; idx: number };
	const cellMap = new Map<string, Cell>();
	for (const e of events) {
		if (!e.image_url) continue;
		const day = new Date(e.date_start).toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
		const bucket = timeBucket(e.date_start);
		const key = `${day}|${bucket}`;
		if (!cellMap.has(key)) cellMap.set(key, { day, bucket, events: [], idx: 0 });
		cellMap.get(key)!.events.push(e);
	}
	for (const cell of cellMap.values()) {
		cell.events.sort((a, b) => a.date_start.localeCompare(b.date_start));
	}

	const cells = [...cellMap.values()].sort((a, b) => {
		if (a.day !== b.day) return a.day.localeCompare(b.day);
		return BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket);
	});

	const handleSeen = new Set<string>(existingHandles);
	const venueSeen = new Set<string>(existingVenues);
	const picked: T[] = [];
	let progress = true;
	while (picked.length < target && progress) {
		progress = false;
		for (const cell of cells) {
			if (picked.length >= target) break;
			while (cell.idx < cell.events.length) {
				const candidate = cell.events[cell.idx];
				cell.idx++;
				const handle = getVenueInstagram(candidate.venue_name);
				const handleKey = handle || `__noip:${candidate.venue_name}`;
				if (handleSeen.has(handleKey)) continue;
				if (venueSeen.has(candidate.venue_name)) continue;
				picked.push(candidate);
				handleSeen.add(handleKey);
				venueSeen.add(candidate.venue_name);
				progress = true;
				break;
			}
		}
	}
	return picked;
}
