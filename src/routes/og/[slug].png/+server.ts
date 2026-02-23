import { error, redirect } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { generateOgImage } from '$lib/og/og-image';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const { data: event, error: err } = await supabase
		.from('events')
		.select('title_no, date_start, venue_name, category, image_url')
		.eq('slug', params.slug)
		.eq('status', 'approved')
		.single();

	if (err || !event) {
		throw error(404, 'Event not found');
	}

	try {
		const png = await generateOgImage({
			origin: url.origin,
			title: event.title_no,
			date: event.date_start,
			venue: event.venue_name,
			category: event.category,
			imageUrl: event.image_url || undefined
		});

		return new Response(png as unknown as BodyInit, {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'public, max-age=86400'
			}
		});
	} catch {
		// Fall back to default OG image if Satori/Resvg fails
		throw redirect(302, '/og/default.png');
	}
};
