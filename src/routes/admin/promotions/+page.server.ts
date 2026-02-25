import { supabase } from '$lib/server/supabase';
import { supabaseAdmin } from '$lib/server/supabase-admin';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export interface PlacementRow {
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
	impressions_this_month: number;
}

const TIER_SLOT: Record<string, number> = {
	basis: 15,
	standard: 25,
	partner: 35
};

export const load: PageServerLoad = async () => {
	// First day of current month
	const now = new Date();
	const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

	// Load all placements
	const { data: placements, error: placementsError } = await supabase
		.from('promoted_placements')
		.select('*')
		.order('created_at', { ascending: false });

	if (placementsError) {
		console.error('Failed to load placements:', placementsError);
		return { placements: [] as PlacementRow[] };
	}

	// Load impression totals for this month, grouped by placement_id
	const { data: logs, error: logsError } = await supabase
		.from('placement_log')
		.select('placement_id, impression_count')
		.gte('log_date', monthStart);

	if (logsError) {
		console.error('Failed to load placement logs:', logsError);
	}

	// Aggregate impressions per placement
	const impressionsByPlacement = new Map<string, number>();
	for (const row of logs ?? []) {
		const current = impressionsByPlacement.get(row.placement_id) ?? 0;
		impressionsByPlacement.set(row.placement_id, current + row.impression_count);
	}

	const rows: PlacementRow[] = (placements ?? []).map(p => ({
		...p,
		impressions_this_month: impressionsByPlacement.get(p.id) ?? 0
	}));

	return { placements: rows };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const venue_name = String(form.get('venue_name') ?? '').trim();
		const tier = String(form.get('tier') ?? '') as 'basis' | 'standard' | 'partner';
		const start_date = String(form.get('start_date') ?? '').trim();
		const end_date = String(form.get('end_date') ?? '').trim() || null;
		const contact_email = String(form.get('contact_email') ?? '').trim() || null;
		const notes = String(form.get('notes') ?? '').trim() || null;
		const collection_slugs = form.getAll('collection_slugs').map(String);

		if (!venue_name || !tier || !start_date || collection_slugs.length === 0) {
			return fail(400, { error: 'venue_name, tier, start_date, and at least one collection are required' });
		}

		if (!TIER_SLOT[tier]) {
			return fail(400, { error: 'Invalid tier' });
		}

		const slot_share = TIER_SLOT[tier];

		const { error } = await supabaseAdmin.from('promoted_placements').insert({
			venue_name,
			collection_slugs,
			tier,
			slot_share,
			start_date,
			end_date,
			contact_email,
			notes,
			active: true
		});

		if (error) {
			console.error('Failed to create placement:', error);
			return fail(500, { error: 'Database error: ' + error.message });
		}

		return { success: true };
	},

	toggle: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const active = form.get('active') === 'true';

		if (!id) {
			return fail(400, { error: 'id is required' });
		}

		const { error } = await supabaseAdmin
			.from('promoted_placements')
			.update({ active: !active })
			.eq('id', id);

		if (error) {
			console.error('Failed to toggle placement:', error);
			return fail(500, { error: 'Database error: ' + error.message });
		}

		return { success: true };
	}
};
