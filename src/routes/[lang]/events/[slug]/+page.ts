import { error } from '@sveltejs/kit';
import { seedEvents } from '$lib/data/seed-events';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const event = seedEvents.find(e => e.slug === params.slug);
	if (!event) {
		error(404, 'Event not found');
	}

	// Related events: same category, excluding current
	const related = seedEvents
		.filter(e => e.category === event.category && e.id !== event.id && e.status === 'approved')
		.slice(0, 4);

	return { event, related };
};
