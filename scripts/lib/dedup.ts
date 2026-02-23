import { supabase } from './supabase.js';
import { normalizeTitle } from './utils.js';
import { isAggregatorUrl } from './venues.js';

// Source quality ranking — higher = prefer to keep
const SOURCE_RANK: Record<string, number> = {
	bergenlive: 5,
	studentbergen: 4,
	dnt: 4,
	eventbrite: 3,
	ticketco: 4,
	hoopla: 3,
	nordnessjobad: 4,
	raabrent: 4,
	bergenchamber: 3,
	colonialen: 4,
	bergenkjott: 4,
	paintnsip: 4,
	bergenfilmklubb: 4,
	cornerteateret: 4,
	dvrtvest: 5,
	kunsthall: 4,
	brettspill: 3,
	mediacity: 3,
	forumscene: 5,
	usfverftet: 5,
	dns: 5,
	olebull: 5,
	grieghallen: 5,
	kode: 5,
	litthusbergen: 4,
	bergenbibliotek: 4,
	floyen: 4,
	bitteater: 5,
	harmonien: 5,
	oseana: 4,
	carteblanche: 5,
	festspillene: 5,
	bergenfest: 5,
	bjorgvinblues: 3,
	bek: 4,
	beyondthegates: 5,
	brann: 5,
	kulturhusetibergen: 5,
	vvv: 4,
	bymuseet: 4,
	bergenkommune: 3,
	kulturikveld: 3,
	barnasnorge: 2,
	visitbergen: 1,
};

interface EventRow {
	id: string;
	title_no: string;
	date_start: string;
	source: string;
	image_url: string | null;
	ticket_url: string | null;
	description_no: string | null;
}

function scoreEvent(e: EventRow): number {
	let score = SOURCE_RANK[e.source] || 0;
	if (e.image_url) score += 2;
	if (e.ticket_url && !isAggregatorUrl(e.ticket_url)) score += 2;
	if (e.description_no && e.description_no.length > 50) score += 1;
	return score;
}

function titlesMatch(a: string, b: string): boolean {
	if (a === b) return true;
	if (a.length < 5 || b.length < 5) return false;

	// Check if one contains the other — with length ratio guard
	// Prevents short generic titles (e.g. "konsert") matching inside longer specific ones
	if (a.includes(b) || b.includes(a)) {
		const shorter = a.length < b.length ? a : b;
		const longer = a.length < b.length ? b : a;
		if (shorter.length >= longer.length * 0.6) return true;
	}

	// Check 90% prefix overlap with similar length requirement
	if (a.length >= 8 && b.length >= 8) {
		const shorter = a.length < b.length ? a : b;
		const longer = a.length < b.length ? b : a;
		// Require similar length (no more than 30% difference)
		if (longer.length <= shorter.length * 1.3) {
			if (longer.includes(shorter.slice(0, Math.floor(shorter.length * 0.9)))) {
				return true;
			}
		}
	}

	return false;
}

export async function deduplicate(): Promise<number> {
	// Fetch all events
	const { data: events, error } = await supabase
		.from('events')
		.select('id, title_no, date_start, source, image_url, ticket_url, description_no')
		.order('date_start', { ascending: true });

	if (error || !events) {
		console.error('  Dedup fetch error:', error?.message);
		return 0;
	}

	// Group by date (YYYY-MM-DD)
	const byDate = new Map<string, EventRow[]>();
	for (const e of events) {
		const day = e.date_start.slice(0, 10);
		if (!byDate.has(day)) byDate.set(day, []);
		byDate.get(day)!.push(e);
	}

	const idsToDelete: string[] = [];

	for (const [, dayEvents] of byDate) {
		if (dayEvents.length < 2) continue;

		// Normalize all titles for this day
		const normalized = dayEvents.map(e => ({
			...e,
			norm: normalizeTitle(e.title_no),
		}));

		// Find duplicate groups
		const used = new Set<number>();

		for (let i = 0; i < normalized.length; i++) {
			if (used.has(i)) continue;

			const group = [normalized[i]];
			used.add(i);

			for (let j = i + 1; j < normalized.length; j++) {
				if (used.has(j)) continue;
				if (titlesMatch(normalized[i].norm, normalized[j].norm)) {
					group.push(normalized[j]);
					used.add(j);
				}
			}

			if (group.length < 2) continue;

			// Keep the best-scored event, delete the rest
			group.sort((a, b) => scoreEvent(b) - scoreEvent(a));
			const keeper = group[0];
			for (let k = 1; k < group.length; k++) {
				console.log(`  Dup: "${group[k].title_no}" (${group[k].source}) → keeping "${keeper.title_no}" (${keeper.source})`);
				idsToDelete.push(group[k].id);
			}
		}
	}

	if (idsToDelete.length === 0) return 0;

	// Delete in batches
	let deleted = 0;
	for (let i = 0; i < idsToDelete.length; i += 100) {
		const batch = idsToDelete.slice(i, i + 100);
		const { error: delErr } = await supabase
			.from('events')
			.delete()
			.in('id', batch);
		if (!delErr) deleted += batch.length;
	}

	return deleted;
}
