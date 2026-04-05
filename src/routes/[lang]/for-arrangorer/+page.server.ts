import { redirect } from '@sveltejs/kit';
import { handleContactSubmit } from './contact-action';
import { supabase } from '$lib/server/supabase';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (params.lang === 'en') {
		throw redirect(307, '/en/for-organizers');
	}

	const { data: events } = await supabase
		.from('events')
		.select('image_url, title_no, venue_name, category')
		.eq('status', 'approved')
		.not('image_url', 'is', null)
		.gte('date_start', new Date().toISOString())
		.order('date_start', { ascending: true })
		.limit(100);

	// Pick 12 diverse images (spread across categories)
	const seen = new Set<string>();
	const heroImages: Array<{ url: string; title: string; venue: string }> = [];
	for (const e of events ?? []) {
		if (heroImages.length >= 12) break;
		if (!e.image_url || seen.has(e.category)) continue;
		seen.add(e.category);
		heroImages.push({ url: e.image_url, title: e.title_no, venue: e.venue_name ?? '' });
	}
	// Fill remaining slots if fewer than 12 categories
	for (const e of events ?? []) {
		if (heroImages.length >= 12) break;
		if (!e.image_url || heroImages.some(h => h.url === e.image_url)) continue;
		heroImages.push({ url: e.image_url, title: e.title_no, venue: e.venue_name ?? '' });
	}

	return { heroImages };
};

export const actions: Actions = {
	contact: handleContactSubmit
};
