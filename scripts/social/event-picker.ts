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
	/** Venue names to exclude entirely (hard-capped B2B prospects) */
	weeklyBlockedVenues?: Set<string>;
	/** Venue names to deprioritise (already posted this week, not blocked) */
	deprioritizedVenues?: Set<string>;
	/** Venue name that gets a guaranteed slot (Partner tier) — picked first */
	guaranteedVenue?: string;
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
	const weeklyBlocked = options?.weeklyBlockedVenues;
	const deprioritizedVenues = options?.deprioritizedVenues;
	const guaranteedVenue = options?.guaranteedVenue;

	// Hard-block: remove capped B2B prospects entirely
	const eligible = weeklyBlocked && weeklyBlocked.size > 0
		? events.filter(e => !weeklyBlocked.has(e.venue_name))
		: events;

	// Pass 1: Reserve a slot for the guaranteed venue (Partner tier)
	const guaranteed: T[] = [];
	let remainingTarget = target;
	if (guaranteedVenue) {
		const candidate = eligible.find(e => e.venue_name === guaranteedVenue && e.image_url);
		if (candidate) {
			guaranteed.push(candidate);
			remainingTarget--;
		}
	}

	// Exclude guaranteed event from the normal pool
	const pool = guaranteed.length > 0
		? eligible.filter(e => e !== guaranteed[0])
		: eligible;

	// Split pool: events from venues not yet posted this week vs already posted.
	// Recently posted event IDs are a separate axis (cross-day event dedup).
	const isVenueDeprioritized = (e: T) =>
		deprioritizedVenues && deprioritizedVenues.size > 0 && deprioritizedVenues.has(e.venue_name);
	const isEventStale = (e: T) =>
		recentlyPosted && recentlyPosted.size > 0 && e.id && recentlyPosted.has(e.id);

	// Priority tiers (picked in order, each fills remaining slots):
	//   1. Fresh venues + fresh events (never posted this week, event not recently seen)
	//   2. Fresh venues + stale events (venue is new this week, but event was in another collection)
	//   3. Deprioritized venues + fresh events (venue already posted, but different event)
	//   4. Deprioritized venues + stale events (last resort)
	const tiers = [
		pool.filter(e => !isVenueDeprioritized(e) && !isEventStale(e)),
		pool.filter(e => !isVenueDeprioritized(e) && isEventStale(e)),
		pool.filter(e => isVenueDeprioritized(e) && !isEventStale(e)),
		pool.filter(e => isVenueDeprioritized(e) && isEventStale(e))
	];

	const handleSeen = new Set(guaranteed.map(e => getVenueInstagram(e.venue_name) || `__noip:${e.venue_name}`));
	const venueSeen = new Set(guaranteed.map(e => e.venue_name));
	const picked: T[] = [];

	for (const tierEvents of tiers) {
		if (picked.length >= remainingTarget) break;
		if (tierEvents.length === 0) continue;
		const batch = pickFromPool(tierEvents, remainingTarget - picked.length, handleSeen, venueSeen);
		for (const e of batch) {
			handleSeen.add(getVenueInstagram(e.venue_name) || `__noip:${e.venue_name}`);
			venueSeen.add(e.venue_name);
		}
		picked.push(...batch);
	}

	return [...guaranteed, ...picked];
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
