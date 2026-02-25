import { supabase } from '$lib/server/supabase';

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

/**
 * Returns all active promoted placements for a given collection slug,
 * filtered to those whose date range covers today.
 */
export async function getActivePromotions(collectionSlug: string): Promise<PromotedPlacement[]> {
	const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' }).slice(0, 10);

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
 * Deterministically picks a venue to feature for the given day.
 * Builds a weighted array (slot_share repetitions per placement),
 * then selects index = (dayNumber + collectionHash) % weighted.length.
 * Returns the same venue for the full calendar day, no randomness.
 */
export function pickDailyVenue(
	placements: PromotedPlacement[],
	collectionSlug: string,
	now: Date
): PromotedPlacement | null {
	if (placements.length === 0) return null;

	// Build weighted array
	const weighted: PromotedPlacement[] = [];
	for (const p of placements) {
		for (let i = 0; i < p.slot_share; i++) {
			weighted.push(p);
		}
	}
	if (weighted.length === 0) return null;

	// Day number: days since Unix epoch (based on Oslo date string)
	const osloDateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' }).slice(0, 10);
	const dayNumber = Math.floor(new Date(osloDateStr).getTime() / 86400000);

	// Simple string hash of collectionSlug for rotation offset between collections
	let collectionHash = 0;
	for (let i = 0; i < collectionSlug.length; i++) {
		collectionHash = (collectionHash * 31 + collectionSlug.charCodeAt(i)) >>> 0;
	}

	const index = (dayNumber + collectionHash) % weighted.length;
	return weighted[index];
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
	const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' }).slice(0, 10);

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
