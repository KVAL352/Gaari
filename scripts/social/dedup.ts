import { supabase } from '../lib/supabase.js';

/** How many days back to check for recently posted events */
export const DEDUP_LOOKBACK_DAYS = 5;

/** Slugs that share the same event pool and shouldn't dedup against each other */
export const DEDUP_PAIRS: Record<string, string> = {
	'denne-helgen': 'this-weekend',
	'this-weekend': 'denne-helgen',
	'i-kveld': 'today-in-bergen',
	'today-in-bergen': 'i-kveld'
};

/**
 * Load event IDs posted in the last DEDUP_LOOKBACK_DAYS days across all collections,
 * excluding the current slug and its paired collection (e.g. denne-helgen ↔ this-weekend).
 * Used by pickDiverseEvents to deprioritise events already seen on recent days.
 */
export async function getRecentlyPostedIds(currentSlug: string): Promise<Set<string>> {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - DEDUP_LOOKBACK_DAYS);
	const cutoffStr = cutoff.toISOString().slice(0, 10);

	const pairedSlug = DEDUP_PAIRS[currentSlug];
	const excludeSlugs = [currentSlug, ...(pairedSlug ? [pairedSlug] : [])];

	const { data } = await supabase
		.from('social_posts')
		.select('collection_slug, event_ids')
		.gte('generated_date', cutoffStr)
		.not('event_ids', 'is', null);

	if (!data) return new Set();

	const ids = new Set<string>();
	for (const post of data) {
		if (excludeSlugs.includes(post.collection_slug)) continue;
		if (Array.isArray(post.event_ids)) {
			for (const id of post.event_ids) ids.add(id);
		}
	}
	return ids;
}
