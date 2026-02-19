import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';
import { seedEvents } from '$lib/data/seed-events';
import type { GaariEvent } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		// Fetch event by slug
		const { data: event, error: err } = await supabase
			.from('events')
			.select('*')
			.eq('slug', params.slug)
			.single();

		if (err) throw err;

		// Map price
		const mapped: GaariEvent = {
			...event,
			price: event.price === '' || event.price === null ? '' : isNaN(Number(event.price)) ? event.price : Number(event.price)
		};

		// Related events: same category, excluding current
		const { data: relatedData } = await supabase
			.from('events')
			.select('*')
			.eq('category', mapped.category)
			.eq('status', 'approved')
			.neq('id', mapped.id)
			.order('date_start', { ascending: true })
			.limit(4);

		const related: GaariEvent[] = (relatedData || []).map(e => ({
			...e,
			price: e.price === '' || e.price === null ? '' : isNaN(Number(e.price)) ? e.price : Number(e.price)
		}));

		return { event: mapped, related };
	} catch {
		// Fallback to seed data
		const event = seedEvents.find(e => e.slug === params.slug);
		if (!event) {
			error(404, 'Event not found');
		}

		const related = seedEvents
			.filter(e => e.category === event.category && e.id !== event.id && e.status === 'approved')
			.slice(0, 4);

		return { event, related };
	}
};
