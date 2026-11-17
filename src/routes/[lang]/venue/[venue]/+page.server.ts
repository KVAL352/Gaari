import { error } from '@sveltejs/kit';
import { supabase } from '#lib/server/supabase';
import { PUBLIC_EVENT_COLUMNS } from '#lib/server/event-columns';
import { getVenueBySlug, venueMatchNames } from '#lib/venues';
import type { GaariEvent } from '#lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const venue = getVenueBySlug(params.venue);
	if (!venue) throw error(404, 'Venue not found');

	const today = new Date().toISOString().slice(0, 10);

	// Fetch upcoming events at this venue (case-insensitive match on any of its names)
	const nameFilter = venueMatchNames(venue)
		.map((n) => `venue_name.ilike.%${n}%`)
		.join(',');
	const { data: events } = await supabase
		.from('events')
		.select(PUBLIC_EVENT_COLUMNS)
		.in('status', ['approved'])
		.or(nameFilter)
		.gte('date_start', today)
		.order('date_start', { ascending: true })
		.limit(50)
		// PUBLIC_EVENT_COLUMNS is a runtime string, so the client cannot infer
		// the row shape from it the way it does for a literal.
		.returns<GaariEvent[]>();

	return {
		venue,
		events: events || []
	};
};
