import { supabase } from '$lib/supabase';
import { seedEvents } from '$lib/data/seed-events';
import type { GaariEvent } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const { data, error } = await supabase
			.from('events')
			.select('*')
			.in('status', ['approved', 'cancelled'])
			.order('date_start', { ascending: true });

		if (error) throw error;

		if (data && data.length > 0) {
			// Map price from string back to number where possible
			const events: GaariEvent[] = data.map(e => ({
				...e,
				price: isNaN(Number(e.price)) ? e.price : Number(e.price)
			}));
			return { events, source: 'supabase' as const };
		}

		// Empty table — fall back to seed data
		return { events: seedEvents, source: 'seed' as const };
	} catch {
		// Supabase unreachable — fall back to seed data
		return { events: seedEvents, source: 'seed' as const };
	}
};
