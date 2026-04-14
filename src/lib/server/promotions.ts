import { supabase } from '$lib/server/supabase';
import { MAX_PROMOTED_SLOTS } from '$lib/promotion-config';

export interface PromotedPlacement {
	id: string;
	venue_name: string;
	collection_slugs: string[];
	tier: 'basis' | 'standard' | 'partner';
	slot_share: number;
	active: boolean;
	start_date: string;
	end_date: string | null;
	contact_email: string | null;
	notes: string | null;
	created_at: string;
}

function getOsloToday(): string {
	return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' }).slice(0, 10);
}

function getMonthStart(today: string): string {
	return today.slice(0, 8) + '01';
}

/**
 * Returns all active promoted placements for a given collection slug,
 * filtered to those whose date range covers today.
 */
export async function getActivePromotions(collectionSlug: string): Promise<PromotedPlacement[]> {
	const today = getOsloToday();

	const { data, error } = await supabase
		.from('promoted_placements')
		.select('*')
		.eq('active', true)
		.contains('collection_slugs', [collectionSlug])
		.lte('start_date', today)
		.or(`end_date.is.null,end_date.gte.${today}`);

	if (error) {
		console.error('Failed to load promoted placements:', error);
		return [];
	}

	return (data ?? []) as PromotedPlacement[];
}

/**
 * Pure function: given impression data, pick which placements should be promoted.
 * Exported separately for testing without DB dependencies.
 *
 * Each placement's target is based on impressions since its own start_date,
 * not from the beginning of the month. This ensures venues that join mid-month
 * only compete for their fair share from the day they started.
 *
 * @param impressionsSinceStart - per placement ID, total collection impressions
 *   counted from that placement's start_date (not from month start).
 *   Falls back to totalImpressions when not provided (backward compat).
 */
export function selectPromotedByDeficit(
	placements: PromotedPlacement[],
	totalImpressions: number,
	impressionsByPlacement: Map<string, number>,
	impressionsSinceStart?: Map<string, number>
): PromotedPlacement[] {
	if (placements.length === 0) return [];

	const withDeficit = placements.map(p => {
		const actual = impressionsByPlacement.get(p.id) ?? 0;
		const relevantImpressions = impressionsSinceStart?.get(p.id) ?? totalImpressions;
		const target = relevantImpressions * (p.slot_share / 100);
		return { placement: p, deficit: target - actual };
	});

	const underServed = withDeficit
		.filter(d => d.deficit > 0)
		.sort((a, b) => b.deficit - a.deficit);

	return underServed.slice(0, MAX_PROMOTED_SLOTS).map(d => d.placement);
}

/**
 * Impression-based promoted venue selection.
 *
 * Picks up to MAX_PROMOTED_SLOTS (3) venues whose actual impression share
 * is below their entitled share (slot_share %). Self-balancing: venues that
 * are over-served pause until others catch up.
 *
 * Returns placements sorted by deficit (most under-served first).
 */
export async function pickPromotedVenues(
	placements: PromotedPlacement[],
	collectionSlug: string
): Promise<PromotedPlacement[]> {
	if (placements.length === 0) return [];

	const today = getOsloToday();
	const monthStart = getMonthStart(today);

	// Find the earliest start_date among placements (for the broadest query range)
	const earliestStart = placements.reduce((earliest, p) => {
		const effectiveStart = p.start_date > monthStart ? p.start_date : monthStart;
		return effectiveStart < earliest ? effectiveStart : earliest;
	}, today);

	// Fetch this month's data in parallel
	const [collectionResult, placementResult] = await Promise.all([
		// Collection impressions with daily granularity (needed for per-placement start_date filtering)
		supabase
			.from('collection_impressions')
			.select('log_date, impression_count')
			.eq('collection_slug', collectionSlug)
			.gte('log_date', earliestStart)
			.lte('log_date', today),
		// Per-placement impression counts this month
		supabase
			.from('placement_log')
			.select('placement_id, impression_count')
			.eq('collection_slug', collectionSlug)
			.gte('log_date', monthStart)
			.lte('log_date', today)
	]);

	if (collectionResult.error) {
		console.error('Failed to load collection impressions:', collectionResult.error);
		return [];
	}
	if (placementResult.error) {
		console.error('Failed to load placement impressions:', placementResult.error);
		return [];
	}

	// Build daily impression lookup
	const dailyImpressions = new Map<string, number>();
	for (const row of collectionResult.data ?? []) {
		dailyImpressions.set(row.log_date, (dailyImpressions.get(row.log_date) ?? 0) + row.impression_count);
	}

	// Total impressions from month start (for backward compat)
	let totalImpressions = 0;
	for (const count of dailyImpressions.values()) totalImpressions += count;

	// Per-placement: sum collection impressions only from that placement's effective start
	const impressionsSinceStart = new Map<string, number>();
	for (const p of placements) {
		const effectiveStart = p.start_date > monthStart ? p.start_date : monthStart;
		let sum = 0;
		for (const [date, count] of dailyImpressions) {
			if (date >= effectiveStart) sum += count;
		}
		impressionsSinceStart.set(p.id, sum);
	}

	// Sum per-placement promoted impressions this month
	const impressionsByPlacement = new Map<string, number>();
	for (const row of placementResult.data ?? []) {
		const current = impressionsByPlacement.get(row.placement_id) ?? 0;
		impressionsByPlacement.set(row.placement_id, current + row.impression_count);
	}

	return selectPromotedByDeficit(placements, totalImpressions, impressionsByPlacement, impressionsSinceStart);
}

/**
 * Atomically upserts an impression row for the given placement+collection+day.
 * Uses the log_placement_impression SQL function to handle ON CONFLICT increments.
 */
export async function logImpression(
	placementId: string,
	collectionSlug: string,
	venueName: string
): Promise<void> {
	const today = getOsloToday();

	const { error } = await supabase.rpc('log_placement_impression', {
		p_placement_id: placementId,
		p_collection_slug: collectionSlug,
		p_venue_name: venueName,
		p_log_date: today
	});

	if (error) {
		console.error('Failed to log placement impression:', error);
	}
}

/**
 * Logs a total page view for a collection page.
 * Called on every collection page load — the denominator for impression-share calculations.
 */
export async function logCollectionImpression(collectionSlug: string): Promise<void> {
	const today = getOsloToday();

	const { error } = await supabase.rpc('log_collection_impression', {
		p_collection_slug: collectionSlug,
		p_log_date: today
	});

	if (error) {
		console.error('Failed to log collection impression:', error);
	}
}
