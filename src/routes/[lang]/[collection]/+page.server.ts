import { error, redirect } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { getCollection, getHreflangSlugs } from '$lib/collections';
import { getOsloNow } from '$lib/event-filters';
import { seedEvents } from '$lib/data/seed-events';
import { getActivePromotions, pickPromotedVenues, logImpression, logCollectionImpression } from '$lib/server/promotions';
import { SKIP_LOG_IPS } from '$env/static/private';
import type { GaariEvent } from '$lib/types';
import type { PageServerLoad } from './$types';

const skipIps = new Set((SKIP_LOG_IPS ?? '').split(',').map(s => s.trim()).filter(Boolean));

export const load: PageServerLoad = async ({ params, setHeaders, getClientAddress }) => {
	const collection = getCollection(params.collection);
	if (!collection) {
		throw error(404, 'Not found');
	}

	// Redirect to canonical slug if user visits wrong language slug
	// e.g. /en/sankthans → /en/midsummer-bergen, /no/this-weekend → /no/denne-helgen
	const slugs = getHreflangSlugs(params.collection);
	const canonicalSlug = slugs[params.lang as 'no' | 'en'];
	if (canonicalSlug && canonicalSlug !== params.collection) {
		throw redirect(301, `/${params.lang}/${canonicalSlug}`);
	}

	setHeaders({ 'cache-control': 's-maxage=3600, stale-while-revalidate=7200' });

	let events: GaariEvent[];

	try {
		// Use UTC — date_start is stored as UTC (timestamptz) in Supabase
		const nowUtc = new Date().toISOString();
		const collFields = 'id,slug,title_no,title_en,description_no,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,source_url,image_url,age_group,language,status,is_sold_out';
		const PAGE = 1000;

		const { data, error: dbError } = await supabase
			.from('events')
			.select(collFields)
			.in('status', ['approved', 'cancelled'])
			.or(`date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`)
			.order('date_start', { ascending: true })
			.range(0, PAGE - 1);

		if (dbError) throw dbError;

		let allData = data ?? [];
		if (allData.length === PAGE) {
			const { data: p2 } = await supabase
				.from('events')
				.select(collFields)
				.in('status', ['approved', 'cancelled'])
				.or(`date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`)
				.order('date_start', { ascending: true })
				.range(PAGE, PAGE * 2 - 1);
			if (p2) allData = allData.concat(p2);
		}

		if (allData.length > 0) {
			events = allData.map(e => ({
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

	// Log collection page view (denominator for impression-share calculations)
	let clientIp = '';
	try { clientIp = getClientAddress(); } catch { /* prerender */ }
	if (!skipIps.has(clientIp)) {
		logCollectionImpression(collection.slug).catch(err =>
			console.error('logCollectionImpression failed:', err)
		);
	}

	// Promoted placement: bubble featured venues' events into top positions
	let promotedEventIds: string[] = [];
	try {
		const promotions = await getActivePromotions(collection.slug);
		if (promotions.length > 0) {
			const featured = await pickPromotedVenues(promotions, collection.slug);
			if (featured.length > 0) {
				// For each promoted venue, pick one event (rotating daily)
				const osloDateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' }).slice(0, 10);
				const dayNumber = Math.floor(new Date(osloDateStr).getTime() / 86400000);

				const promotedPicks: GaariEvent[] = [];
				const promotedVenueNames = new Set(featured.map(p => p.venue_name));

				for (const placement of featured) {
					const venueEvents = filtered.filter(e => e.venue_name === placement.venue_name);
					if (venueEvents.length === 0) continue;
					const pickedEvent = venueEvents[dayNumber % venueEvents.length];
					promotedPicks.push(pickedEvent);
				}

				if (promotedPicks.length > 0) {
					promotedEventIds = promotedPicks.map(e => e.id);
					const promotedIdSet = new Set(promotedEventIds);
					const rest = filtered.filter(e => !promotedIdSet.has(e.id));
					filtered = [...promotedPicks, ...rest];

					// Fire-and-forget: log impressions for shown placements
					if (!skipIps.has(clientIp)) {
						for (const placement of featured) {
							if (promotedVenueNames.has(placement.venue_name)) {
								logImpression(placement.id, collection.slug, placement.venue_name).catch(err =>
									console.error('logImpression failed:', err)
								);
							}
						}
					}
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

	// Hub layout: resolve sub-collections with event counts
	let hubItems: Array<{ slug: string; title: Record<string, string>; description: Record<string, string>; eventCount: number; month: number; dateHint: Record<string, string>; imageUrl?: string }> | undefined;
	if (collection.hubCollections) {
		const now2 = getOsloNow();
		hubItems = collection.hubCollections.map(entry => {
			const sub = getCollection(entry.slug);
			if (!sub) return null;
			const subFiltered = sub.filterEvents(active, now2);
			// Pick the first event image, fall back to festival logo
			const firstWithImage = subFiltered.find(e => e.image_url);
			return {
				slug: sub.slug,
				title: sub.title,
				description: sub.description,
				eventCount: subFiltered.length,
				month: entry.month,
				dateHint: entry.dateHint,
				imageUrl: firstWithImage?.image_url ?? entry.fallbackImage ?? undefined
			};
		}).filter((x): x is NonNullable<typeof x> => x !== null);
	}

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
			seasonal: collection.seasonal,
			offSeasonHint: collection.offSeasonHint,
			hubCollections: collection.hubCollections
		},
		events: filtered,
		hubItems,
		promotedEventIds,
		lang: params.lang as 'no' | 'en',
		hreflangPaths: (() => {
			const slugs = getHreflangSlugs(collection.slug);
			return { no: `/no/${slugs.no}`, en: `/en/${slugs.en}` };
		})()
	};
};
