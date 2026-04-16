import { redirect } from '@sveltejs/kit';
import { handleContactSubmit } from '../for-arrangorer/contact-action';
import { supabase } from '$lib/server/supabase';
import { getActivePartners } from '$lib/server/promotions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (params.lang === 'no') {
		throw redirect(307, '/no/for-arrangorer');
	}

	const partners = await getActivePartners();

	const { data: events } = await supabase
		.from('events')
		.select('image_url, title_no, venue_name, category')
		.eq('status', 'approved')
		.not('image_url', 'is', null)
		.or(`date_end.gte.${new Date().toISOString()},and(date_end.is.null,date_start.gte.${new Date().toISOString()})`)
		.order('date_start', { ascending: true })
		.limit(100);

	const seen = new Set<string>();
	const heroImages: Array<{ url: string; title: string; venue: string }> = [];
	for (const e of events ?? []) {
		if (heroImages.length >= 12) break;
		if (!e.image_url || seen.has(e.category)) continue;
		seen.add(e.category);
		heroImages.push({ url: e.image_url, title: e.title_no, venue: e.venue_name ?? '' });
	}
	for (const e of events ?? []) {
		if (heroImages.length >= 12) break;
		if (!e.image_url || heroImages.some(h => h.url === e.image_url)) continue;
		heroImages.push({ url: e.image_url, title: e.title_no, venue: e.venue_name ?? '' });
	}

	return { heroImages, partners };
};

export const actions: Actions = {
	contact: handleContactSubmit
};
