import { supabase } from '$lib/server/supabase';
import { seedEvents } from '$lib/data/seed-events';
import { computeCanonical } from '$lib/seo';
import type { GaariEvent } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders, url, params }) => {
	setHeaders({ 'cache-control': 's-maxage=300, stale-while-revalidate=600' });

	const lang = params.lang === 'en' ? 'en' : 'no';

	try {
		// Use UTC — date_start is stored as UTC (timestamptz) in Supabase
		const nowUtc = new Date().toISOString();
		const { data, error } = await supabase
			.from('events')
			.select('id,slug,title_no,title_en,description_no,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,image_url,age_group,language,status')
			.in('status', ['approved', 'cancelled'])
			.gte('date_start', nowUtc)
			.order('date_start', { ascending: true })
			.limit(500);

		if (error) throw error;

		if (data && data.length > 0) {
			// Map price from string back to number where possible
			const events: GaariEvent[] = data.map(e => ({
				...e,
				price: e.price === '' || e.price === null ? '' : isNaN(Number(e.price)) ? e.price : Number(e.price)
			}));
			const { canonical, noindex } = computeCanonical(url, lang, countFiltered(events, url));
			return { events, source: 'supabase' as const, canonical, noindex };
		}

		// Empty table — fall back to seed data
		const { canonical, noindex } = computeCanonical(url, lang, seedEvents.length);
		return { events: seedEvents, source: 'seed' as const, canonical, noindex };
	} catch (err) {
		// Supabase unreachable — fall back to seed data
		console.error('Supabase load failed:', err);
		const { canonical, noindex } = computeCanonical(url, lang, seedEvents.length);
		return { events: seedEvents, source: 'seed' as const, canonical, noindex };
	}
};

/**
 * Count events matching the indexable filters (category + bydel) for the
 * canonical/noindex decision. Time/date filters are excluded — they're too
 * volatile for a meaningful thin-content check.
 */
function countFiltered(events: GaariEvent[], url: URL): number {
	const category = url.searchParams.get('category') || '';
	const bydel = url.searchParams.get('bydel') || '';
	let filtered = events.filter(e => e.status !== 'cancelled');
	if (category) {
		const cats = category.split(',');
		filtered = filtered.filter(e => cats.includes(e.category));
	}
	if (bydel) {
		filtered = filtered.filter(e => e.bydel === bydel);
	}
	return filtered.length;
}
