/**
 * Shared promotion tier configuration.
 * Imported by admin page, stripe webhook, and promotion logic.
 *
 * slot_share = percentage of impressions the venue is entitled to.
 * E.g. standard = 25 means the venue's events appear in the top 3
 * on ~25% of all page views for each assigned collection page.
 */
export const TIER_SLOT: Record<string, number> = {
	basis: 15,
	standard: 25,
	partner: 35
};

/** Maximum number of promoted placements shown simultaneously in the top positions. */
export const MAX_PROMOTED_SLOTS = 3;
