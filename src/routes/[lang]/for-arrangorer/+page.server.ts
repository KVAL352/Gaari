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
		.neq('image_url', '')
		.gte('date_start', new Date().toISOString())
		.order('date_start', { ascending: true })
		.limit(100);

	// Pick 20 diverse images (spread across categories, HTTPS only, skip known broken hosts)
	const brokenHosts = ['ik.imagekit.io'];
	const validEvents = (events ?? []).filter(e =>
		e.image_url?.startsWith('https://') &&
		!brokenHosts.some(h => e.image_url!.includes(h))
	);
	const seen = new Set<string>();
	const heroImages: Array<{ url: string; title: string; venue: string }> = [];
	for (const e of validEvents) {
		if (heroImages.length >= 20) break;
		if (seen.has(e.category)) continue;
		seen.add(e.category);
		heroImages.push({ url: e.image_url!, title: e.title_no, venue: e.venue_name ?? '' });
	}
	// Fill remaining slots if fewer than 20 categories
	for (const e of validEvents) {
		if (heroImages.length >= 20) break;
		if (heroImages.some(h => h.url === e.image_url)) continue;
		heroImages.push({ url: e.image_url!, title: e.title_no, venue: e.venue_name ?? '' });
	}

	return { heroImages };
};

export const actions: Actions = {
	contact: handleContactSubmit
};
