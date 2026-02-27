import { error, fail } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { notifyCorrection } from '$lib/server/email';
import { seedEvents } from '$lib/data/seed-events';
import type { GaariEvent } from '$lib/types';
import type { PageServerLoad, Actions } from './$types';

const EVENT_COLUMNS = 'id,slug,title_no,title_en,description_no,description_en,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,image_url,age_group,language,status';

function mapPrice(e: Record<string, unknown>): GaariEvent {
	const price = e.price;
	return {
		...e,
		price: price === '' || price === null ? '' : isNaN(Number(price)) ? price : Number(price)
	} as GaariEvent;
}

export const load: PageServerLoad = async ({ params, setHeaders }) => {
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

		setHeaders({
			'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200'
		});

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

export const actions: Actions = {
	correction: async ({ request }) => {
		const data = await request.formData();
		const event_id = data.get('event_id');
		const field = data.get('field');
		const suggested_value = data.get('suggested_value');
		const reason = data.get('reason') || null;
		const email = data.get('email') || null;

		if (!event_id || !field || !suggested_value) {
			return fail(400, { correctionError: true });
		}

		const { error: err } = await supabase.from('edit_suggestions').insert({
			event_id,
			field,
			suggested_value,
			reason,
			email,
			status: 'pending'
		});

		if (err) return fail(500, { correctionError: true });

		const eventTitle = (data.get('event_title') as string) || 'Unknown event';
		const eventSlug = (data.get('event_slug') as string) || '';
		notifyCorrection({
			eventTitle,
			eventSlug,
			field: field as string,
			suggestedValue: suggested_value as string,
			reason: reason as string | null
		}).catch((err) => console.error('Failed to send correction notification:', err));

		return { correctionSuccess: true };
	}
};
