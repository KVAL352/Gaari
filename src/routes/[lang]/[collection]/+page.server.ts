import { error } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { getCollection } from '$lib/collections';
import { getOsloNow } from '$lib/event-filters';
import { seedEvents } from '$lib/data/seed-events';
import type { GaariEvent } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const collection = getCollection(params.collection);
	if (!collection) {
		throw error(404, 'Not found');
	}

	setHeaders({ 'cache-control': 's-maxage=300, stale-while-revalidate=600' });

	let events: GaariEvent[];

	try {
		const nowOslo = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Oslo' }).replace(' ', 'T');
		const { data, error: dbError } = await supabase
			.from('events')
			.select('id,slug,title_no,title_en,description_no,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,image_url,age_group,language,status')
			.in('status', ['approved', 'cancelled'])
			.gte('date_start', nowOslo)
			.order('date_start', { ascending: true })
			.limit(500);

		if (dbError) throw dbError;

		if (data && data.length > 0) {
			events = data.map(e => ({
				...e,
				price: e.price === '' || e.price === null ? '' : isNaN(Number(e.price)) ? e.price : Number(e.price)
			}));
		} else {
			events = seedEvents;
		}
	} catch (err) {
		console.error('Supabase load failed:', err);
		events = seedEvents;
	}

	// Filter to only active events, then apply collection filter
	const active = events.filter(e => e.status !== 'cancelled' && e.status !== 'expired');
	const now = getOsloNow();
	const filtered = collection.filterEvents(active, now);

	return {
		collection: {
			id: collection.id,
			slug: collection.slug,
			title: collection.title,
			description: collection.description,
			ogSubtitle: collection.ogSubtitle,
			editorial: collection.editorial,
			faq: collection.faq
		},
		events: filtered,
		lang: params.lang as 'no' | 'en'
	};
};
