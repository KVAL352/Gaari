import { supabase } from '$lib/server/supabase';
import { seedEvents } from '$lib/data/seed-events';
import type { GaariEvent } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders, params }) => {
	setHeaders({ 'cache-control': 's-maxage=300, stale-while-revalidate=600' });

	const lang = params.lang === 'en' ? 'en' : 'no';

	try {
		// Use UTC — date_start is stored as UTC (timestamptz) in Supabase
		const nowUtc = new Date().toISOString();
		const { data, error } = await supabase
			.from('events')
			.select('id,slug,title_no,title_en,description_no,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,image_url,age_group,language,status,is_sold_out')
			.in('status', ['approved', 'cancelled'])
			.gte('date_start', nowUtc)
			.order('date_start', { ascending: true })
			.limit(500);

		if (error) throw error;

		if (data && data.length > 0) {
			// Map price from string back to number where possible
			const mapped: GaariEvent[] = data.map(e => ({
				...e,
				price: e.price === '' || e.price === null ? '' : isNaN(Number(e.price)) ? e.price : Number(e.price)
			}));

			// Cap Akvariet events to avoid flooding the homepage during holidays
			const AKVARIET_MAX = 5;
			let akvarietCount = 0;
			const events = mapped.filter(e => {
				if (e.venue_name === 'Akvariet i Bergen') {
					if (++akvarietCount > AKVARIET_MAX) return false;
				}
				return true;
			});

			return { events, source: 'supabase' as const, lang };
		}

		// Empty table — fall back to seed data
		return { events: seedEvents, source: 'seed' as const, lang };
	} catch (err) {
		// Supabase unreachable — fall back to seed data
		console.error('Supabase load failed:', err);
		return { events: seedEvents, source: 'seed' as const, lang };
	}
};
