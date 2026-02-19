import { supabase } from '$lib/supabase';
import { seedEvents } from '$lib/data/seed-events';
import type { GaariEvent } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const now = new Date().toISOString();
		const { data, error } = await supabase
			.from('events')
			.select('id,slug,title_no,title_en,description_no,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,image_url,age_group,language,status')
			.in('status', ['approved', 'cancelled'])
			.gte('date_start', now)
			.order('date_start', { ascending: true })
			.limit(500);

		if (error) throw error;

		if (data && data.length > 0) {
			// Map price from string back to number where possible
			const events: GaariEvent[] = data.map(e => ({
				...e,
				price: e.price === '' || e.price === null ? '' : isNaN(Number(e.price)) ? e.price : Number(e.price)
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
