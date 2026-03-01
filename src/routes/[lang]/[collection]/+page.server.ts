import { error } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { getCollection, getHreflangSlugs } from '$lib/collections';
import { getOsloNow } from '$lib/event-filters';
import { seedEvents } from '$lib/data/seed-events';
import { getActivePromotions, pickDailyVenue, logImpression } from '$lib/server/promotions';
import { SKIP_LOG_IPS } from '$env/static/private';
import type { GaariEvent } from '$lib/types';
import type { PageServerLoad } from './$types';

const skipIps = new Set((SKIP_LOG_IPS ?? '').split(',').map(s => s.trim()).filter(Boolean));

export const load: PageServerLoad = async ({ params, setHeaders, getClientAddress }) => {
	const collection = getCollection(params.collection);
	if (!collection) {
		throw error(404, 'Not found');
	}

	setHeaders({ 'cache-control': 's-maxage=300, stale-while-revalidate=600' });

	let events: GaariEvent[];

	try {
		// Use UTC — date_start is stored as UTC (timestamptz) in Supabase
		const nowUtc = new Date().toISOString();
		const { data, error: dbError } = await supabase
			.from('events')
			.select('id,slug,title_no,title_en,description_no,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,source_url,image_url,age_group,language,status')
			.in('status', ['approved', 'cancelled'])
			.gte('date_start', nowUtc)
			.order('date_start', { ascending: true })
			.limit(500);

		if (dbError) throw dbError;

		if (data && data.length > 0) {
			events = data.map(e => ({
				...e,
				price: e.price === '' || e.price === null ? '' : isNaN(Number(e.price)) ? e.price : Number(e.price)
			}));
		} else {
			events = seedEvents;
		}
	} catch (err) {
		console.error('Supabase load failed:', err);
		events = seedEvents;
	}

	// Filter to only active events, then apply collection filter
	const active = events.filter(e => e.status !== 'cancelled' && e.status !== 'expired');
	const now = getOsloNow();
	let filtered = collection.filterEvents(active, now);

	// Promoted placement: bubble featured venue's events to the top
	let promotedEventIds: string[] = [];
	try {
		const promotions = await getActivePromotions(collection.slug);
		if (promotions.length > 0) {
			const featured = pickDailyVenue(promotions, collection.slug, now);
			if (featured) {
				const venueEvents = filtered.filter(e => e.venue_name === featured.venue_name);
				const rest = filtered.filter(e => e.venue_name !== featured.venue_name);
				// Pick one event from the venue, rotating daily
				const osloDateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' }).slice(0, 10);
				const dayNumber = Math.floor(new Date(osloDateStr).getTime() / 86400000);
				const pickedEvent = venueEvents[dayNumber % venueEvents.length];
				const remainingVenueEvents = venueEvents.filter(e => e.id !== pickedEvent.id);
				filtered = [pickedEvent, ...rest, ...remainingVenueEvents];
				promotedEventIds = [pickedEvent.id];
				// Fire-and-forget: skip owner IP to avoid polluting stats
				let clientIp = '';
				try { clientIp = getClientAddress(); } catch { /* prerender */ }
				if (!skipIps.has(clientIp)) {
					logImpression(featured.id, collection.slug, featured.venue_name).catch(err =>
						console.error('logImpression failed:', err)
					);
				}
			}
		}
	} catch (err) {
		console.error('Promotions failed (non-fatal):', err);
	}

	// Cap events per venue to avoid any single venue flooding the collection
	const MAX_PER_VENUE = collection.maxPerVenue ?? 3;
	const venueCounts = new Map<string, number>();
	filtered = filtered.filter(e => {
		const count = venueCounts.get(e.venue_name) ?? 0;
		if (count >= MAX_PER_VENUE) return false;
		venueCounts.set(e.venue_name, count + 1);
		return true;
	});

	return {
		collection: {
			id: collection.id,
			slug: collection.slug,
			title: collection.title,
			description: collection.description,
			ogSubtitle: collection.ogSubtitle,
			editorial: collection.editorial,
			faq: collection.faq,
			relatedSlugs: collection.relatedSlugs,
			quickAnswer: collection.quickAnswer,
			newsletterHeading: collection.newsletterHeading,
			seasonal: collection.seasonal
		},
		events: filtered,
		promotedEventIds,
		lang: params.lang as 'no' | 'en',
		hreflangPaths: (() => {
			const slugs = getHreflangSlugs(collection.slug);
			return { no: `/no/${slugs.no}`, en: `/en/${slugs.en}` };
		})()
	};
};
