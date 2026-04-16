import { redirect } from '@sveltejs/kit';
import { handleContactSubmit } from './contact-action';
import { supabase } from '$lib/server/supabase';
import { getActivePartners } from '$lib/server/promotions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (params.lang === 'en') {
		throw redirect(307, '/en/for-organizers');
	}

	const partners = await getActivePartners();

	const { data: events } = await supabase
		.from('events')
		.select('image_url, title_no, venue_name, category, date_start')
		.eq('status', 'approved')
		.not('image_url', 'is', null)
		.neq('image_url', '')
		.or(`date_end.gte.${new Date().toISOString()},and(date_end.is.null,date_start.gte.${new Date().toISOString()})`)
		.order('date_start', { ascending: true })
		.limit(300);

	const brokenHosts = ['ik.imagekit.io'];
	const validEvents = (events ?? []).filter(e =>
		e.image_url?.startsWith('https://') &&
		!brokenHosts.some(h => e.image_url!.includes(h))
	);

	// Pick 20 diverse hero images (spread across categories)
	const seen = new Set<string>();
	const heroImages: Array<{ url: string; title: string; venue: string }> = [];
	for (const e of validEvents) {
		if (heroImages.length >= 20) break;
		if (seen.has(e.category)) continue;
		seen.add(e.category);
		heroImages.push({ url: e.image_url!, title: e.title_no, venue: e.venue_name ?? '' });
	}
	for (const e of validEvents) {
		if (heroImages.length >= 20) break;
		if (heroImages.some(h => h.url === e.image_url)) continue;
		heroImages.push({ url: e.image_url!, title: e.title_no, venue: e.venue_name ?? '' });
	}

	// Aliases: search term → database venue names that should match
	const VENUE_ALIASES: Record<string, string[]> = {
		'kode': ['kode', 'permanenten', 'lysverket', 'stenersen', 'rasmus meyer'],
		'bergen bibliotek': ['bergen bibliotek', 'hovedbiblioteket'],
		'usf': ['usf verftet', 'sardinen', 'studio usf', 'røkeriet'],
		'dns': ['den nationale scene'],
		'ole bull': ['ole bull scene', 'ole bull huset'],
	};

	// Build venue → events map (max 3 per venue, only keep top 50 venues by event count)
	const tempMap: Record<string, Array<{ url: string; title: string; venue: string }>> = {};
	for (const e of validEvents) {
		const key = (e.venue_name ?? '').toLowerCase();
		if (!key) continue;
		if (!tempMap[key]) tempMap[key] = [];
		if (tempMap[key].length >= 3) continue;
		if (tempMap[key].some(v => v.url === e.image_url)) continue;
		tempMap[key].push({ url: e.image_url!, title: e.title_no, venue: e.venue_name ?? '' });
	}
	// Keep only top 50 venues by number of events
	const sortedVenues = Object.entries(tempMap).sort((a, b) => b[1].length - a[1].length).slice(0, 50);
	const venueEventsMap: Record<string, Array<{ url: string; title: string; venue: string }>> = Object.fromEntries(sortedVenues);

	// Merge aliases into the map so searching "kode" finds Permanenten events
	for (const [alias, dbNames] of Object.entries(VENUE_ALIASES)) {
		if (venueEventsMap[alias]) continue; // already has direct matches
		const merged: Array<{ url: string; title: string; venue: string }> = [];
		for (const name of dbNames) {
			for (const [key, events] of Object.entries(venueEventsMap)) {
				if (key.includes(name) && merged.length < 3) {
					for (const evt of events) {
						if (merged.length >= 3) break;
						if (!merged.some(m => m.url === evt.url)) merged.push(evt);
					}
				}
			}
		}
		if (merged.length > 0) venueEventsMap[alias] = merged;
	}

	return { heroImages, venueEventsMap, partners };
};

export const actions: Actions = {
	contact: handleContactSubmit
};
