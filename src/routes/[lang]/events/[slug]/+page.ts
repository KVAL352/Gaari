import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';
import { seedEvents } from '$lib/data/seed-events';
import type { GaariEvent } from '$lib/types';
import type { PageLoad } from './$types';

const EVENT_COLUMNS = 'id,slug,title_no,title_en,description_no,description_en,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,image_url,age_group,language,status';

function mapPrice(e: Record<string, unknown>): GaariEvent {
	const price = e.price;
	return {
		...e,
		price: price === '' || price === null ? '' : isNaN(Number(price)) ? price : Number(price)
	} as GaariEvent;
}

export const load: PageLoad = async ({ params }) => {
	try {
		// Fetch event by slug
		const { data: event, error: err } = await supabase
			.from('events')
			.select(EVENT_COLUMNS)
			.eq('slug', params.slug)
			.single();

		if (err) throw err;

		const mapped = mapPrice(event);

		// Fetch related events in parallel (don't await sequentially)
		const relatedPromise = supabase
			.from('events')
			.select(EVENT_COLUMNS)
			.eq('category', mapped.category)
			.eq('status', 'approved')
			.neq('id', mapped.id)
			.order('date_start', { ascending: true })
			.limit(4);

		const { data: relatedData } = await relatedPromise;
		const related: GaariEvent[] = (relatedData || []).map(mapPrice);

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
