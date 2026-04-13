import { error } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { getVenueBySlug } from '$lib/venues';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const venue = getVenueBySlug(params.venue);
	if (!venue) throw error(404, 'Venue not found');

	const today = new Date().toISOString().slice(0, 10);

	// Fetch upcoming events at this venue (case-insensitive match)
	const { data: events } = await supabase
		.from('events')
		.select('*')
		.in('status', ['approved'])
		.ilike('venue_name', `%${venue.name}%`)
		.gte('date_start', today)
		.order('date_start', { ascending: true })
		.limit(50);

	return {
		venue,
		events: events || []
	};
};
