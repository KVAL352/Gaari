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
		const fields = 'id,slug,title_no,title_en,description_no,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,image_url,age_group,language,status,is_sold_out';
		const PAGE = 1000;

		const { data: page1, error } = await supabase
			.from('events')
			.select(fields)
			.in('status', ['approved', 'cancelled'])
			.gte('date_end', nowUtc)
			.order('date_start', { ascending: true })
			.range(0, PAGE - 1);

		if (error) throw error;

		let allData = page1 ?? [];

		// Fetch second page if first was full (>1000 events)
		if (allData.length === PAGE) {
			const { data: page2 } = await supabase
				.from('events')
				.select(fields)
				.in('status', ['approved', 'cancelled'])
				.gte('date_end', nowUtc)
				.order('date_start', { ascending: true })
				.range(PAGE, PAGE * 2 - 1);
			if (page2) allData = allData.concat(page2);
		}

		if (allData.length > 0) {
			// Map price from string back to number where possible
			const mapped: GaariEvent[] = allData.map(e => ({
				...e,
				price: e.price === '' || e.price === null ? '' : isNaN(Number(e.price)) ? e.price : Number(e.price)
			}));

			// Sort: treat past date_start as today so recurring events don't dominate the top
			const todayMidnight = nowUtc.slice(0, 11) + '00:00:00.000Z';
			mapped.sort((a, b) => {
				const aSort = a.date_start < todayMidnight ? todayMidnight : a.date_start;
				const bSort = b.date_start < todayMidnight ? todayMidnight : b.date_start;
				return aSort < bSort ? -1 : aSort > bSort ? 1 : 0;
			});

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
