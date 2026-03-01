/**
 * Prospect Report Generator — Sales Material for Venues
 *
 * Generates a professional HTML report showing the value of Gåri
 * for a specific venue (or a general platform overview).
 *
 * Usage:
 *   cd scripts
 *   npx tsx generate-prospect-report.ts "Den Nationale Scene"
 *   npx tsx generate-prospect-report.ts "Den Nationale Scene" --email kontakt@dns.no
 *   npx tsx generate-prospect-report.ts "Den Nationale Scene" --lang en
 *   npx tsx generate-prospect-report.ts --overview
 *   npx tsx generate-prospect-report.ts --festival festspillene
 *   npx tsx generate-prospect-report.ts --festival bergenfest --email info@bergenfest.no
 *
 * Env vars:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   PLAUSIBLE_API_KEY (optional), MAILERLITE_API_KEY (optional),
 *   RESEND_API_KEY (for --email)
 */

import * as fs from 'fs';
import * as path from 'path';
import { supabase } from './lib/supabase.js';

const SITE_ID = 'gaari.no';
const SITE_URL = 'https://gaari.no';
const FROM_EMAIL = 'Gåri <noreply@gaari.no>';
const TODAY = new Date().toISOString().slice(0, 10);

// ─── CLI Args ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isOverview = args.includes('--overview');
const emailIdx = args.indexOf('--email');
const emailTo = emailIdx !== -1 ? args[emailIdx + 1] : null;
const langIdx = args.indexOf('--lang');
const lang: 'no' | 'en' = langIdx !== -1 && args[langIdx + 1] === 'en' ? 'en' : 'no';
const festivalIdx = args.indexOf('--festival');
const festivalArg = festivalIdx !== -1 ? args[festivalIdx + 1] : null;
const isFestival = festivalArg !== null;

// Venue name is the first non-flag argument (skip flags and their values)
const flagValues = new Set([emailTo, festivalArg, 'en', 'no'].filter(Boolean));
const venueName = isOverview || isFestival ? null : args.find(a => !a.startsWith('--') && !flagValues.has(a));

if (!isOverview && !venueName && !isFestival) {
	console.error('Usage: npx tsx generate-prospect-report.ts "Venue Name" [--email addr] [--lang en]');
	console.error('       npx tsx generate-prospect-report.ts --overview');
	console.error('       npx tsx generate-prospect-report.ts --festival <name> [--email addr]');
	process.exit(1);
}

// ─── Types ───────────────────────────────────────────────────────────

interface PlatformStats {
	visitors30d: number;
	pageviews30d: number;
	visitorsPrev30d: number;
	topSources: Array<{ source: string; visitors: number }>;
	aiReferrals: Array<{ source: string; visitors: number }>;
	activeEvents: number;
	subscribers: number | null;
	subscriberCategories: Record<string, number> | null; // category → count
	topSearchQueries: Array<{ query: string; impressions: number; clicks: number }>;
}

interface CollectionInfo {
	slug: string;
	title: string;
	description: string;
	visitors30d: number;
	pageviews30d: number;
	relevant: boolean;
}

interface VenueEvent {
	slug: string;
	title_no: string;
	title_en: string | null;
	date_start: string;
	category: string;
	image_url: string | null;
	ticket_url: string | null;
	description_no: string | null;
	venue_name: string;
	source_url?: string;
	price?: string | number | null;
}

interface FestivalData {
	festivalKey: string;
	meta: FestivalMeta;
	currentEvents: VenueEvent[];
	totalEventsLast3Months: number;
	categories: string[];
	collectionTraffic: { no: CollectionInfo | null; en: CollectionInfo | null };
	eventPageViews: Array<{ slug: string; title: string; visitors: number }>;
	newsletterReach: number;
}

interface VenueData {
	name: string;
	upcomingEvents: VenueEvent[];
	totalEventsLast3Months: number;
	categories: string[];
	qualityScore: { withImage: number; withTicket: number; withDescription: number; total: number };
	relevantCollections: CollectionInfo[];
	eventPageViews: Array<{ slug: string; title: string; visitors: number }>;
	newsletterReach: number; // subscribers with matching category preferences
}

// ─── Collection metadata ─────────────────────────────────────────────

const COLLECTION_META: Record<string, { no: string; en: string; desc_no: string; desc_en: string; categories: string[] }> = {
	'denne-helgen': {
		no: 'Denne helgen', en: 'This Weekend',
		desc_no: 'Helgens arrangementer i Bergen', desc_en: 'Weekend events in Bergen',
		categories: ['music', 'culture', 'theatre', 'family', 'food', 'festival', 'sports', 'nightlife', 'workshop', 'student', 'tours']
	},
	'this-weekend': {
		no: 'This Weekend', en: 'This Weekend',
		desc_no: 'Weekend events in Bergen', desc_en: 'Weekend events in Bergen',
		categories: ['music', 'culture', 'theatre', 'family', 'food', 'festival', 'sports', 'nightlife', 'workshop', 'student', 'tours']
	},
	'i-kveld': {
		no: 'I kveld', en: 'Tonight',
		desc_no: 'Kveldens arrangementer', desc_en: 'Tonight\'s events',
		categories: ['music', 'culture', 'theatre', 'nightlife', 'food', 'student']
	},
	'i-dag': {
		no: 'I dag', en: 'Today',
		desc_no: 'Dagens arrangementer', desc_en: 'Today\'s events',
		categories: ['music', 'culture', 'theatre', 'family', 'food', 'festival', 'sports', 'nightlife', 'workshop', 'student', 'tours']
	},
	'today-in-bergen': {
		no: 'Today in Bergen', en: 'Today in Bergen',
		desc_no: 'Today\'s events in Bergen', desc_en: 'Today\'s events in Bergen',
		categories: ['music', 'culture', 'theatre', 'family', 'food', 'festival', 'sports', 'nightlife', 'workshop', 'student', 'tours']
	},
	'gratis': {
		no: 'Gratis', en: 'Free Events',
		desc_no: 'Gratis arrangementer denne uken', desc_en: 'Free events this week',
		categories: ['music', 'culture', 'theatre', 'family', 'festival', 'sports', 'workshop', 'tours']
	},
	'free-things-to-do-bergen': {
		no: 'Free Things to Do', en: 'Free Things to Do in Bergen',
		desc_no: 'Free events in Bergen', desc_en: 'Free events in Bergen',
		categories: ['music', 'culture', 'theatre', 'family', 'festival', 'sports', 'workshop', 'tours']
	},
	'familiehelg': {
		no: 'Familiehelg', en: 'Family Weekend',
		desc_no: 'Familiearrangementer i helgen', desc_en: 'Family events this weekend',
		categories: ['family', 'workshop', 'sports', 'culture', 'festival']
	},
	'konserter': {
		no: 'Konserter', en: 'Concerts',
		desc_no: 'Konserter denne uken', desc_en: 'Concerts this week',
		categories: ['music', 'festival']
	},
	'studentkveld': {
		no: 'Studentkveld', en: 'Student Night',
		desc_no: 'Studentarrangementer i kveld', desc_en: 'Student events tonight',
		categories: ['student', 'nightlife', 'music']
	},
	'regndagsguide': {
		no: 'Regndagsguide', en: 'Rainy Day Guide',
		desc_no: 'Innendørsaktiviteter for regnværsdager', desc_en: 'Indoor activities for rainy days',
		categories: ['culture', 'theatre', 'workshop', 'food', 'music']
	},
	'sentrum': {
		no: 'Sentrum', en: 'City Centre',
		desc_no: 'Arrangementer i Bergen sentrum', desc_en: 'Events in Bergen city centre',
		categories: ['music', 'culture', 'theatre', 'food', 'nightlife', 'workshop', 'tours']
	},
	'voksen': {
		no: 'For voksne', en: 'For Adults',
		desc_no: 'Kultur, musikk og opplevelser for voksne', desc_en: 'Culture, music and experiences for adults',
		categories: ['culture', 'music', 'theatre', 'tours', 'food', 'workshop']
	},
	'for-ungdom': {
		no: 'For ungdom', en: 'For Youth',
		desc_no: 'Arrangementer for ungdom 13-18', desc_en: 'Events for youth 13-18',
		categories: ['music', 'culture', 'sports', 'workshop', 'festival', 'student']
	},
	// Seasonal collections
	'17-mai': {
		no: '17. mai i Bergen', en: '17th of May in Bergen',
		desc_no: 'Arrangementer rundt 17. mai', desc_en: '17th of May celebrations',
		categories: ['music', 'culture', 'family', 'festival', 'tours']
	},
	'17th-of-may-bergen': {
		no: '17th of May', en: '17th of May in Bergen',
		desc_no: '17th of May celebrations', desc_en: '17th of May celebrations',
		categories: ['music', 'culture', 'family', 'festival', 'tours']
	},
	'julemarked': {
		no: 'Julemarked i Bergen', en: 'Christmas Markets',
		desc_no: 'Julemarkeder og julearrangementer', desc_en: 'Christmas markets and holiday events',
		categories: ['family', 'food', 'culture', 'music', 'workshop']
	},
	'christmas-bergen': {
		no: 'Christmas in Bergen', en: 'Christmas in Bergen',
		desc_no: 'Christmas events in Bergen', desc_en: 'Christmas events in Bergen',
		categories: ['family', 'food', 'culture', 'music', 'workshop']
	},
	'paske': {
		no: 'Påske i Bergen', en: 'Easter in Bergen',
		desc_no: 'Påskearrangementer', desc_en: 'Easter events',
		categories: ['family', 'culture', 'music', 'tours', 'workshop']
	},
	'easter-bergen': {
		no: 'Easter in Bergen', en: 'Easter in Bergen',
		desc_no: 'Easter events', desc_en: 'Easter events',
		categories: ['family', 'culture', 'music', 'tours', 'workshop']
	},
	'sankthans': {
		no: 'Sankthans i Bergen', en: 'Midsummer in Bergen',
		desc_no: 'Sankthansarrangementer', desc_en: 'Midsummer celebrations',
		categories: ['family', 'culture', 'music', 'festival']
	},
	'midsummer-bergen': {
		no: 'Midsummer', en: 'Midsummer in Bergen',
		desc_no: 'Midsummer celebrations', desc_en: 'Midsummer celebrations',
		categories: ['family', 'culture', 'music', 'festival']
	},
	'nyttarsaften': {
		no: 'Nyttårsaften i Bergen', en: "New Year's Eve in Bergen",
		desc_no: 'Nyttårsarrangementer', desc_en: "New Year's Eve events",
		categories: ['nightlife', 'music', 'food', 'family', 'festival']
	},
	'new-years-eve-bergen': {
		no: "New Year's Eve", en: "New Year's Eve in Bergen",
		desc_no: "New Year's Eve events", desc_en: "New Year's Eve events",
		categories: ['nightlife', 'music', 'food', 'family', 'festival']
	},
	'vinterferie': {
		no: 'Vinterferie i Bergen', en: 'Winter Break in Bergen',
		desc_no: 'Aktiviteter i vinterferien', desc_en: 'Winter break activities',
		categories: ['family', 'culture', 'sports', 'workshop', 'tours']
	},
	'winter-break-bergen': {
		no: 'Winter Break', en: 'Winter Break in Bergen',
		desc_no: 'Winter break activities', desc_en: 'Winter break activities',
		categories: ['family', 'culture', 'sports', 'workshop', 'tours']
	},
	'hostferie': {
		no: 'Høstferie i Bergen', en: 'Autumn Break',
		desc_no: 'Aktiviteter i høstferien', desc_en: 'Autumn break activities',
		categories: ['family', 'culture', 'sports', 'workshop', 'tours']
	},
	// Festival collections
	'festspillene': {
		no: 'Festspillene i Bergen', en: 'Bergen International Festival',
		desc_no: 'Festspillene i Bergen — Norges største kunstfestival', desc_en: "Norway's largest arts festival",
		categories: ['music', 'culture', 'theatre', 'festival']
	},
	'bergen-international-festival': {
		no: 'Bergen International Festival', en: 'Bergen International Festival',
		desc_no: 'Bergen International Festival', desc_en: "Norway's largest arts festival",
		categories: ['music', 'culture', 'theatre', 'festival']
	},
	'bergenfest': {
		no: 'Bergenfest', en: 'Bergenfest',
		desc_no: 'Bergenfest — musikkfestival i Bergen', desc_en: 'Bergenfest music festival',
		categories: ['music', 'festival']
	},
	'bergenfest-bergen': {
		no: 'Bergenfest', en: 'Bergenfest Bergen',
		desc_no: 'Bergenfest music festival', desc_en: 'Bergenfest music festival',
		categories: ['music', 'festival']
	},
	'beyond-the-gates': {
		no: 'Beyond the Gates', en: 'Beyond the Gates',
		desc_no: 'Beyond the Gates — metalfestival i Bergen', desc_en: 'Beyond the Gates metal festival',
		categories: ['music', 'festival']
	},
	'beyond-the-gates-bergen': {
		no: 'Beyond the Gates', en: 'Beyond the Gates Bergen',
		desc_no: 'Beyond the Gates metal festival', desc_en: 'Beyond the Gates metal festival',
		categories: ['music', 'festival']
	},
	'nattjazz': {
		no: 'Nattjazz', en: 'Nattjazz',
		desc_no: 'Nattjazz — jazzfestival i Bergen', desc_en: 'Nattjazz jazz festival',
		categories: ['music', 'festival']
	},
	'nattjazz-bergen': {
		no: 'Nattjazz', en: 'Nattjazz Bergen',
		desc_no: 'Nattjazz jazz festival', desc_en: 'Nattjazz jazz festival',
		categories: ['music', 'festival']
	},
	'bergen-pride': {
		no: 'Bergen Pride', en: 'Bergen Pride',
		desc_no: 'Bergen Pride — feiring av mangfold', desc_en: 'Bergen Pride festival',
		categories: ['culture', 'music', 'festival', 'family']
	},
	'bergen-pride-festival': {
		no: 'Bergen Pride', en: 'Bergen Pride Festival',
		desc_no: 'Bergen Pride festival', desc_en: 'Bergen Pride festival',
		categories: ['culture', 'music', 'festival', 'family']
	},
	'biff': {
		no: 'BIFF', en: 'BIFF',
		desc_no: 'Bergen Internasjonale Filmfestival', desc_en: 'Bergen International Film Festival',
		categories: ['culture', 'festival']
	},
	'biff-bergen': {
		no: 'BIFF', en: 'BIFF Bergen',
		desc_no: 'Bergen International Film Festival', desc_en: 'Bergen International Film Festival',
		categories: ['culture', 'festival']
	}
};

// ─── Festival metadata ──────────────────────────────────────────────

interface FestivalMeta {
	name: { no: string; en: string };
	domains: string[];
	collectionSlugs: { no: string; en: string };
	season: { no: string; en: string };
	estimatedAudience: string;
	startMonth: number;
}

const FESTIVAL_META: Record<string, FestivalMeta> = {
	festspillene: {
		name: { no: 'Festspillene i Bergen', en: 'Bergen International Festival' },
		domains: ['fib.no'],
		collectionSlugs: { no: 'festspillene', en: 'bergen-international-festival' },
		season: { no: 'Mai–juni', en: 'May–June' },
		estimatedAudience: '~140 000',
		startMonth: 5
	},
	bergenfest: {
		name: { no: 'Bergenfest', en: 'Bergenfest' },
		domains: ['bergenfest.no'],
		collectionSlugs: { no: 'bergenfest', en: 'bergenfest-bergen' },
		season: { no: 'Juni', en: 'June' },
		estimatedAudience: '~30 000',
		startMonth: 6
	},
	nattjazz: {
		name: { no: 'Nattjazz', en: 'Nattjazz' },
		domains: ['nattjazz.ticketco.no'],
		collectionSlugs: { no: 'nattjazz', en: 'nattjazz-bergen' },
		season: { no: 'Mai–juni', en: 'May–June' },
		estimatedAudience: '~30 000',
		startMonth: 5
	},
	'beyond-the-gates': {
		name: { no: 'Beyond the Gates', en: 'Beyond the Gates' },
		domains: ['beyondthegates.no'],
		collectionSlugs: { no: 'beyond-the-gates', en: 'beyond-the-gates-bergen' },
		season: { no: 'August', en: 'August' },
		estimatedAudience: '~5 000',
		startMonth: 8
	},
	'bergen-pride': {
		name: { no: 'Bergen Pride', en: 'Bergen Pride' },
		domains: ['bergenpride.no', 'bergenpride.ticketco.events'],
		collectionSlugs: { no: 'bergen-pride', en: 'bergen-pride-festival' },
		season: { no: 'Juni', en: 'June' },
		estimatedAudience: '~15 000',
		startMonth: 6
	},
	biff: {
		name: { no: 'BIFF — Bergen Internasjonale Filmfestival', en: 'BIFF — Bergen International Film Festival' },
		domains: ['biff.no'],
		collectionSlugs: { no: 'biff', en: 'biff-bergen' },
		season: { no: 'Oktober', en: 'October' },
		estimatedAudience: '~30 000',
		startMonth: 10
	}
};

// Date-based collections that are relevant for all venues
const UNIVERSAL_COLLECTIONS = ['denne-helgen', 'this-weekend', 'i-dag', 'today-in-bergen'];

// Validate festival name (after FESTIVAL_META is defined)
if (isFestival && !FESTIVAL_META[festivalArg!]) {
	console.error(`Ukjent festival: "${festivalArg}"`);
	console.error(`Tilgjengelige: ${Object.keys(FESTIVAL_META).join(', ')}`);
	process.exit(1);
}

// ─── Plausible API ───────────────────────────────────────────────────

async function plausibleAggregate(period: string, metrics: string, date?: string, filters?: string): Promise<Record<string, number> | null> {
	const key = process.env.PLAUSIBLE_API_KEY;
	if (!key) return null;

	const params = new URLSearchParams({ site_id: SITE_ID, period, metrics });
	if (date) params.set('date', date);
	if (filters) params.set('filters', filters);

	try {
		const resp = await fetch(`https://plausible.io/api/v1/stats/aggregate?${params}`, {
			headers: { Authorization: `Bearer ${key}` }
		});
		if (!resp.ok) return null;
		const data = await resp.json() as { results: Record<string, { value: number }> };
		const result: Record<string, number> = {};
		for (const [k, v] of Object.entries(data.results)) {
			result[k] = v.value;
		}
		return result;
	} catch { return null; }
}

async function plausibleBreakdown(property: string, period: string, limit = 15, metrics = 'visitors,pageviews', filters?: string): Promise<Array<Record<string, unknown>>> {
	const key = process.env.PLAUSIBLE_API_KEY;
	if (!key) return [];

	const params = new URLSearchParams({ site_id: SITE_ID, period, property, limit: String(limit), metrics });
	if (filters) params.set('filters', filters);

	try {
		const resp = await fetch(`https://plausible.io/api/v1/stats/breakdown?${params}`, {
			headers: { Authorization: `Bearer ${key}` }
		});
		if (!resp.ok) return [];
		const data = await resp.json() as { results: Array<Record<string, unknown>> };
		return data.results ?? [];
	} catch { return []; }
}

// ─── Data Collectors ─────────────────────────────────────────────────

async function collectPlatformStats(): Promise<PlatformStats> {
	console.log('Henter plattformstatistikk...');

	const prevDate = new Date();
	prevDate.setDate(prevDate.getDate() - 30);
	const prevDateStr = prevDate.toISOString().slice(0, 10);

	// Parallel data collection
	const [current, previous, sourcesRaw, aiRaw, eventCount, subStats] = await Promise.all([
		plausibleAggregate('30d', 'visitors,pageviews'),
		plausibleAggregate('30d', 'visitors,pageviews', prevDateStr),
		plausibleBreakdown('visit:source', '30d', 8, 'visitors'),
		plausibleBreakdown('event:props:source', '30d', 10, 'visitors', 'event:name==ai-referral'),
		supabase
			.from('events')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'approved')
			.gte('date_start', TODAY),
		collectSubscriberStats()
	]);

	const topSources = sourcesRaw.map(r => ({ source: r.source as string, visitors: r.visitors as number }));
	const aiReferrals = aiRaw.map(r => ({ source: (r.source ?? 'unknown') as string, visitors: r.visitors as number }));

	return {
		visitors30d: current?.visitors ?? 0,
		pageviews30d: current?.pageviews ?? 0,
		visitorsPrev30d: previous?.visitors ?? 0,
		topSources,
		aiReferrals,
		activeEvents: eventCount.count ?? 0,
		subscribers: subStats?.total ?? null,
		subscriberCategories: subStats?.categoryBreakdown ?? null,
		topSearchQueries: [] // Filled optionally if GSC is available
	};
}

interface SubscriberStats {
	total: number;
	categoryBreakdown: Record<string, number>; // category → subscriber count
}

async function collectSubscriberStats(): Promise<SubscriberStats | null> {
	const key = process.env.MAILERLITE_API_KEY;
	if (!key) return null;

	try {
		// Fetch all subscribers with their preference fields
		const allSubs: Array<{ fields: Record<string, string> }> = [];
		let cursor: string | null = null;
		for (let page = 0; page < 10; page++) { // max 1000 subscribers
			const url = new URL('https://connect.mailerlite.com/api/subscribers');
			url.searchParams.set('limit', '100');
			if (cursor) url.searchParams.set('cursor', cursor);
			const resp = await fetch(url.toString(), {
				headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
			});
			if (!resp.ok) break;
			const data = await resp.json() as { data: Array<{ fields: Record<string, string> }>; meta: { next_cursor: string | null } };
			allSubs.push(...data.data);
			cursor = data.meta?.next_cursor ?? null;
			if (!cursor) break;
		}

		// Count subscribers per category preference
		const categoryBreakdown: Record<string, number> = {};
		for (const sub of allSubs) {
			const cats = (sub.fields?.preference_categories || '').split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
			for (const cat of cats) {
				categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + 1;
			}
		}

		return { total: allSubs.length, categoryBreakdown };
	} catch { return null; }
}

async function collectVenueData(name: string, subscriberCategories: Record<string, number> | null): Promise<VenueData> {
	console.log(`Henter data for "${name}"...`);

	const threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

	// Fetch upcoming events and historical count in parallel
	const [upcoming, historical] = await Promise.all([
		supabase
			.from('events')
			.select('slug,title_no,title_en,date_start,category,image_url,ticket_url,description_no,venue_name')
			.eq('status', 'approved')
			.gte('date_start', TODAY)
			.ilike('venue_name', `%${name}%`)
			.order('date_start', { ascending: true }),
		supabase
			.from('events')
			.select('id', { count: 'exact', head: true })
			.ilike('venue_name', `%${name}%`)
			.gte('created_at', threeMonthsAgo.toISOString())
	]);

	const events = (upcoming.data ?? []) as VenueEvent[];
	const categories = [...new Set(events.map(e => e.category))];

	// Quality score
	const total = events.length;
	const withImage = events.filter(e => e.image_url).length;
	const withTicket = events.filter(e => e.ticket_url).length;
	const withDescription = events.filter(e => e.description_no && e.description_no.length > 20).length;

	// Find relevant collections: any collection whose categories overlap with the venue's
	const relevantSlugs = new Set<string>(UNIVERSAL_COLLECTIONS);
	for (const [slug, meta] of Object.entries(COLLECTION_META)) {
		if (meta.categories.some(c => categories.includes(c))) {
			relevantSlugs.add(slug);
		}
	}

	// Only include free collections if ≥10% of venue's events are free
	const freeCount = events.filter(e => {
		const p = String(e.price ?? '').trim().toLowerCase();
		return p === '0' || p === 'gratis' || p === 'free' || p === '0 kr' || p === '0,-';
	}).length;
	if (freeCount < events.length * 0.1) {
		relevantSlugs.delete('gratis');
		relevantSlugs.delete('free-things-to-do-bergen');
	}

	// Fetch traffic for all relevant collections from Plausible
	const collectionTraffic = await collectCollectionTraffic([...relevantSlugs]);

	const relevantCollections: CollectionInfo[] = collectionTraffic
		.filter(c => relevantSlugs.has(c.slug))
		.sort((a, b) => b.visitors30d - a.visitors30d);

	// Fetch event detail page views for this venue's events
	const eventPageViews = await collectEventPageViews(events);

	// Use the most common venue_name variant, or the search term
	const venueNameCounts = new Map<string, number>();
	for (const e of events) {
		venueNameCounts.set(e.venue_name, (venueNameCounts.get(e.venue_name) ?? 0) + 1);
	}
	// Pick the shortest name (e.g. "Grieghallen" instead of "Grieghallen, foajé")
	const bestName = events.length > 0
		? [...venueNameCounts.entries()].sort((a, b) => a[0].length - b[0].length)[0][0]
		: name;

	// Newsletter reach: count subscribers who have ANY of the venue's categories in their preferences
	let newsletterReach = 0;
	if (subscriberCategories) {
		for (const cat of categories) {
			newsletterReach += subscriberCategories[cat] ?? 0;
		}
	}

	return {
		name: bestName,
		upcomingEvents: events,
		totalEventsLast3Months: historical.count ?? 0,
		categories,
		qualityScore: { withImage, withTicket, withDescription, total },
		relevantCollections,
		eventPageViews,
		newsletterReach
	};
}

async function collectFestivalData(
	festivalKey: string,
	subscriberCategories: Record<string, number> | null
): Promise<FestivalData> {
	const meta = FESTIVAL_META[festivalKey];
	console.log(`Henter data for festival "${meta.name.no}"...`);

	const threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

	// Build domain filter: .or('source_url.ilike.%domain1%,source_url.ilike.%domain2%')
	const domainFilter = meta.domains
		.map(d => `source_url.ilike.%${d}%`)
		.join(',');

	const [upcoming, historical] = await Promise.all([
		supabase
			.from('events')
			.select('slug,title_no,title_en,date_start,category,image_url,ticket_url,description_no,venue_name,source_url,price')
			.eq('status', 'approved')
			.gte('date_start', TODAY)
			.or(domainFilter)
			.order('date_start', { ascending: true }),
		supabase
			.from('events')
			.select('id', { count: 'exact', head: true })
			.or(domainFilter)
			.gte('created_at', threeMonthsAgo.toISOString())
	]);

	const events = (upcoming.data ?? []) as VenueEvent[];
	const categories = [...new Set(events.map(e => e.category))];

	// Collection traffic for both NO and EN slugs
	const allTraffic = await collectCollectionTraffic([meta.collectionSlugs.no, meta.collectionSlugs.en]);
	const noTraffic = allTraffic.find(c => c.slug === meta.collectionSlugs.no) ?? null;
	const enTraffic = allTraffic.find(c => c.slug === meta.collectionSlugs.en) ?? null;

	const eventPageViews = await collectEventPageViews(events);

	let newsletterReach = 0;
	if (subscriberCategories) {
		for (const cat of categories) {
			newsletterReach += subscriberCategories[cat] ?? 0;
		}
	}

	return {
		festivalKey,
		meta,
		currentEvents: events,
		totalEventsLast3Months: historical.count ?? 0,
		categories,
		collectionTraffic: { no: noTraffic, en: enTraffic },
		eventPageViews,
		newsletterReach
	};
}

async function collectCollectionTraffic(slugs: string[]): Promise<CollectionInfo[]> {
	console.log('Henter samlingstrafikk...');

	// Fetch top pages from Plausible (30d) — covers collection pages
	const topPages = await plausibleBreakdown('event:page', '30d', 200, 'visitors,pageviews');

	const pageMap = new Map<string, { visitors: number; pageviews: number }>();
	for (const p of topPages) {
		pageMap.set(p.page as string, { visitors: p.visitors as number, pageviews: p.pageviews as number });
	}

	const results: CollectionInfo[] = [];
	for (const slug of Object.keys(COLLECTION_META)) {
		const meta = COLLECTION_META[slug];
		const noPath = `/no/${slug}`;
		const enPath = `/en/${slug}`;
		const noTraffic = pageMap.get(noPath) ?? { visitors: 0, pageviews: 0 };
		const enTraffic = pageMap.get(enPath) ?? { visitors: 0, pageviews: 0 };

		results.push({
			slug,
			title: lang === 'en' ? meta.en : meta.no,
			description: lang === 'en' ? meta.desc_en : meta.desc_no,
			visitors30d: noTraffic.visitors + enTraffic.visitors,
			pageviews30d: noTraffic.pageviews + enTraffic.pageviews,
			relevant: slugs.includes(slug)
		});
	}

	return results;
}

async function collectEventPageViews(events: VenueEvent[]): Promise<Array<{ slug: string; title: string; visitors: number }>> {
	if (events.length === 0) return [];

	// Fetch all event page views from Plausible
	const topPages = await plausibleBreakdown('event:page', '30d', 500, 'visitors', 'event:page==/no/events/*');

	const pageMap = new Map<string, number>();
	for (const p of topPages) {
		const pagePath = p.page as string;
		pageMap.set(pagePath, p.visitors as number);
	}

	return events
		.map(e => ({
			slug: e.slug,
			title: (lang === 'en' && e.title_en) ? e.title_en : e.title_no,
			visitors: (pageMap.get(`/no/events/${e.slug}`) ?? 0) + (pageMap.get(`/en/events/${e.slug}`) ?? 0)
		}))
		.filter(e => e.visitors > 0)
		.sort((a, b) => b.visitors - a.visitors);
}

// ─── Recommendation engine ───────────────────────────────────────────

interface Recommendation {
	icon: string;
	title: string;
	body: string;
	priority: 'high' | 'medium' | 'low';
}

function generateRecommendations(platform: PlatformStats, venue: VenueData | null, festival: FestivalData | null = null): Recommendation[] {
	const recs: Recommendation[] = [];
	const isNo = lang === 'no';
	const order: Record<string, number> = { high: 0, medium: 1, low: 2 };

	// ── Platform-level insights ──

	// Traffic growth
	if (platform.visitors30d > 0 && platform.visitorsPrev30d > 0) {
		const growth = ((platform.visitors30d - platform.visitorsPrev30d) / platform.visitorsPrev30d) * 100;
		if (growth > 10) {
			recs.push({
				icon: '📈',
				title: isNo ? 'Økende trafikk' : 'Growing traffic',
				body: isNo
					? `Gåri har ${growth.toFixed(0)}% trafikkvekst siste måned. Tidlig posisjonering gir mest verdi mens plattformen vokser.`
					: `Gåri has ${growth.toFixed(0)}% traffic growth this month. Early positioning gives the most value as the platform grows.`,
				priority: 'high'
			});
		}
	}

	// AI traffic highlight
	const totalAi = platform.aiReferrals.reduce((s, a) => s + a.visitors, 0);
	if (totalAi > 0) {
		const aiNames = platform.aiReferrals.map(a => a.source.replace('.com', '').replace('.ai', '')).join(', ');
		recs.push({
			icon: '🤖',
			title: isNo ? 'AI-oppdagelse' : 'AI discovery',
			body: isNo
				? `${fmt(totalAi)} brukere fant Gåri via AI-søk (${aiNames}) siste 30 dager. Arrangementer på Gåri blir anbefalt av AI-assistenter — en kanal tradisjonell markedsføring ikke når.`
				: `${fmt(totalAi)} users found Gåri via AI search (${aiNames}) in the last 30 days. Events on Gåri get recommended by AI assistants — a channel traditional marketing doesn't reach.`,
			priority: 'medium'
		});
	}

	// ── Festival-specific recommendations ──
	if (festival) {
		const fMeta = festival.meta;
		const eventCount = festival.currentEvents.length;

		// Collection page is live
		recs.push({
			icon: '📄',
			title: isNo ? 'Din festivalside er live' : 'Your festival page is live',
			body: isNo
				? `${fMeta.name.no} har en dedikert samlingside på Gåri (gaari.no/no/${fMeta.collectionSlugs.no}). Alle arrangementer vises her med daglig oppdatering.`
				: `${fMeta.name.en} has a dedicated collection page on Gåri (gaari.no/en/${fMeta.collectionSlugs.en}). All events are shown here with daily updates.`,
			priority: 'medium'
		});

		// Scraping coverage or "not yet published"
		if (eventCount > 0) {
			recs.push({
				icon: '🔄',
				title: isNo ? 'Automatisk dekning' : 'Automatic coverage',
				body: isNo
					? `Gåri henter ${eventCount} arrangementer automatisk fra ${fMeta.domains.join(' og ')}. Programmet oppdateres to ganger daglig.`
					: `Gåri automatically fetches ${eventCount} events from ${fMeta.domains.join(' and ')}. The programme is updated twice daily.`,
				priority: 'medium'
			});
		} else {
			const year = new Date().getFullYear();
			recs.push({
				icon: '⏳',
				title: isNo ? `${year}-programmet er ikke ute ennå` : `${year} programme not yet published`,
				body: isNo
					? `Vi har ikke funnet arrangementer fra ${fMeta.domains.join('/')} ennå. Når programmet publiseres, henter Gåri det automatisk.`
					: `We haven't found events from ${fMeta.domains.join('/')} yet. When the programme is published, Gåri will pick it up automatically.`,
				priority: 'low'
			});
		}

		// Collection traffic if available
		const totalTraffic = (festival.collectionTraffic.no?.visitors30d ?? 0) + (festival.collectionTraffic.en?.visitors30d ?? 0);
		if (totalTraffic > 0) {
			recs.push({
				icon: '👀',
				title: isNo ? 'Samlingside-trafikk' : 'Collection page traffic',
				body: isNo
					? `Festivalsiden din hadde ${fmt(totalTraffic)} besøkende siste 30 dager. Med promotert plassering vises dine høydepunkter øverst.`
					: `Your festival page had ${fmt(totalTraffic)} visitors in the last 30 days. With promoted placement, your highlights appear at the top.`,
				priority: 'high'
			});
		}

		// Festival-specific tier recommendation
		recs.push({
			icon: '💡',
			title: isNo ? 'Anbefalt synlighet' : 'Recommended visibility',
			body: isNo
				? `For festivaler tilbyr vi egne festivalpakker tilpasset korte, intensive perioder. Festival Basis (3 000 kr) gir promotert plassering på festivalsiden. Festival Standard (6 000 kr) inkluderer også nyhetsbrev og relevante samlinger. Kontakt oss for en tilpasset løsning.`
				: `For festivals, we offer dedicated festival packages designed for short, intensive periods. Festival Basis (3,000 kr) gives promoted placement on your festival page. Festival Standard (6,000 kr) also includes newsletter and relevant collections. Contact us for a tailored solution.`,
			priority: 'high'
		});

		return recs.sort((a, b) => order[a.priority] - order[b.priority]);
	}

	if (!venue) return recs;

	// ── Venue-specific recommendations ──

	const q = venue.qualityScore;

	// Missing images
	if (q.total > 0 && q.withImage < q.total) {
		const missing = q.total - q.withImage;
		const pct = Math.round((q.withImage / q.total) * 100);
		recs.push({
			icon: '🖼️',
			title: isNo ? 'Legg til bilder' : 'Add images',
			body: isNo
				? `${missing} av ${q.total} arrangementer mangler bilde (${pct}% har). Arrangementer med bilde får betydelig mer oppmerksomhet i listene og deles oftere.`
				: `${missing} of ${q.total} events are missing images (${pct}% have them). Events with images get significantly more attention in listings and are shared more often.`,
			priority: missing > q.total / 2 ? 'high' : 'medium'
		});
	}

	// Missing ticket URLs
	if (q.total > 0 && q.withTicket < q.total) {
		const missing = q.total - q.withTicket;
		recs.push({
			icon: '🎟️',
			title: isNo ? 'Legg til billettlenker' : 'Add ticket links',
			body: isNo
				? `${missing} arrangementer mangler direktelenke til billettkjøp. Med lenke kan besøkende gå rett til kjøp — det øker konvertering.`
				: `${missing} events are missing direct ticket links. With a link, visitors can go straight to purchase — this increases conversion.`,
			priority: missing > q.total / 2 ? 'high' : 'medium'
		});
	}

	// Collection opportunity — highest traffic relevant collection
	const topRelevant = venue.relevantCollections
		.filter(c => c.relevant && c.visitors30d > 0)
		.sort((a, b) => b.visitors30d - a.visitors30d);

	if (topRelevant.length > 0) {
		const best = topRelevant[0];
		const totalRelevantVisitors = topRelevant.reduce((s, c) => s + c.visitors30d, 0);
		recs.push({
			icon: '🎯',
			title: isNo ? 'Samlingene dine publikum bruker' : 'Collections your audience uses',
			body: isNo
				? `Dine arrangementer er relevante for ${topRelevant.length} samlinger med til sammen ${fmt(totalRelevantVisitors)} besøkende/mnd. "${best.title}" er størst med ${fmt(best.visitors30d)} besøkende. Med promotert plassering vises du først her.`
				: `Your events are relevant to ${topRelevant.length} collections with a combined ${fmt(totalRelevantVisitors)} visitors/mo. "${best.title}" is the largest with ${fmt(best.visitors30d)} visitors. With promoted placement, you appear first here.`,
			priority: 'high'
		});
	}

	// Event page views insight
	if (venue.eventPageViews.length > 0) {
		const totalViews = venue.eventPageViews.reduce((s, e) => s + e.visitors, 0);
		const topEvent = venue.eventPageViews[0];
		recs.push({
			icon: '👀',
			title: isNo ? 'Folk ser på dine arrangementer' : 'People are viewing your events',
			body: isNo
				? `${fmt(totalViews)} besøkende har sett dine arrangementer siste 30 dager. "${topEvent.title}" topper med ${fmt(topEvent.visitors)} visninger. Promotert plassering multipliserer denne synligheten.`
				: `${fmt(totalViews)} visitors have viewed your events in the last 30 days. "${topEvent.title}" leads with ${fmt(topEvent.visitors)} views. Promoted placement multiplies this visibility.`,
			priority: 'medium'
		});
	} else if (venue.upcomingEvents.length > 0) {
		recs.push({
			icon: '📊',
			title: isNo ? 'Bygg synlighet' : 'Build visibility',
			body: isNo
				? `Du har ${venue.upcomingEvents.length} kommende arrangementer på Gåri, men trafikken til detaljsidene er lav. Promotert plassering løfter arrangementene dine til toppen av samlingene der folk leter.`
				: `You have ${venue.upcomingEvents.length} upcoming events on Gåri, but traffic to detail pages is low. Promoted placement lifts your events to the top of the collections where people are looking.`,
			priority: 'medium'
		});
	}

	// Category breadth
	if (venue.categories.length >= 3) {
		const catLabels = venue.categories.slice(0, 4).map(c => CATEGORY_LABELS[c]?.[lang] ?? c).join(', ');
		recs.push({
			icon: '🎭',
			title: isNo ? 'Bred kategoridekning' : 'Broad category coverage',
			body: isNo
				? `Dere dekker ${venue.categories.length} kategorier (${catLabels}). Det betyr at dere er relevante i mange samlinger — Partner-tier gir synlighet i alle.`
				: `You cover ${venue.categories.length} categories (${catLabels}). This means you're relevant in many collections — Partner tier gives visibility in all of them.`,
			priority: 'low'
		});
	} else if (venue.categories.length === 1) {
		const catLabel = CATEGORY_LABELS[venue.categories[0]]?.[lang] ?? venue.categories[0];
		recs.push({
			icon: '🎯',
			title: isNo ? 'Nisje-styrke' : 'Niche strength',
			body: isNo
				? `Alle arrangementene deres er innen ${catLabel}. Basis-tier med fokus på den mest relevante samlingen gir best avkastning.`
				: `All your events are within ${catLabel}. Basis tier focused on the most relevant collection gives the best return.`,
			priority: 'low'
		});
	}

	// High volume venue
	if (venue.upcomingEvents.length >= 20) {
		recs.push({
			icon: '🏢',
			title: isNo ? 'Høyt volum' : 'High volume',
			body: isNo
				? `Med ${venue.upcomingEvents.length} kommende arrangementer er dere en av de mest aktive arenaene i Bergen. Promotert plassering sikrer at dere ikke drukner i mengden.`
				: `With ${venue.upcomingEvents.length} upcoming events, you're one of the most active venues in Bergen. Promoted placement ensures you don't get lost in the crowd.`,
			priority: 'medium'
		});
	}

	// Tier recommendation
	if (topRelevant.length > 0) {
		let tierRec: string;
		let tierRecEn: string;
		if (venue.categories.length >= 4 && venue.upcomingEvents.length >= 15) {
			tierRec = 'Med deres bredde og volum anbefaler vi Partner — full synlighet i alle samlinger, høyest prioritet i nyhetsbrevet.';
			tierRecEn = 'Given your breadth and volume, we recommend Partner — full visibility across all collections, highest newsletter priority.';
		} else if (venue.categories.length >= 2 || venue.upcomingEvents.length >= 8) {
			tierRec = 'Standard gir best verdi for dere — 25% synlighet i opptil 3 samlinger. Dekker de viktigste kategoriene deres.';
			tierRecEn = 'Standard gives the best value for you — 25% visibility in up to 3 collections. Covers your key categories.';
		} else {
			tierRec = 'Basis er et godt startpunkt — 15% synlighet i den viktigste samlingen for dere. Oppgrader når dere ser resultatene.';
			tierRecEn = 'Basis is a great starting point — 15% visibility in your most important collection. Upgrade when you see the results.';
		}
		recs.push({
			icon: '💡',
			title: isNo ? 'Anbefalt tier' : 'Recommended tier',
			body: isNo ? tierRec : tierRecEn,
			priority: 'high'
		});
	}

	// Sort: high → medium → low
	return recs.sort((a, b) => order[a.priority] - order[b.priority]);
}

// ─── Text content (bilingual) ────────────────────────────────────────

const TEXT = {
	no: {
		reportTitle: 'Prospektrapport',
		platformTitle: 'Gåri — Bergens digitale arrangementsoversikt',
		platformSubtitle: 'Hva betyr det for deg at dine arrangementer er på Gåri?',
		visitors: 'Besøkende',
		pageviews: 'Sidevisninger',
		last30d: 'Siste 30 dager',
		growth: 'Vekst',
		trafficSources: 'Hvor kommer besøkende fra',
		aiTraffic: 'AI-trafikk',
		aiExplainer: 'Brukere som finner Gåri via AI-søk som ChatGPT, Perplexity og Copilot — en voksende kilde til oppdagelse.',
		activeEvents: 'Aktive arrangementer',
		sources: 'kilder',
		collections: 'Kuraterte samlinger',
		subscribers: 'Nyhetsbrev-abonnenter',
		venueTitle: 'Dine arrangementer på Gåri',
		upcomingEvents: 'Kommende arrangementer',
		totalLast3mo: 'Totalt siste 3 måneder',
		category: 'Kategori',
		date: 'Dato',
		image: 'Bilde',
		ticket: 'Billett',
		yes: 'Ja',
		no_val: 'Nei',
		qualityTitle: 'Datakvalitet',
		withImage: 'Med bilde',
		withTicket: 'Med billettlenke',
		withDescription: 'Med AI-beskrivelse',
		collectionsTitle: 'Relevante samlinger for deg',
		collectionsExplainer: 'Dine arrangementer kan dukke opp i disse kuraterte samlingene, som brukerne blar gjennom for å finne noe å gjøre.',
		visitorsLabel: 'besøkende/mnd',
		promotedTitle: 'Hva du får med promotert plassering',
		promotedIntro: 'Med en promotert plassering blir dine arrangementer fremhevet i samlingene som er mest relevante for deg.',
		topPlacement: 'Topp-plassering i samlinger',
		topPlacementDesc: 'Ditt arrangement vises først, over alle andre — med et tydelig "Fremhevet"-merke.',
		newsletterInclusion: 'Fremhevet i nyhetsbrevet',
		newsletterDesc: 'abonnenter mottar ukentlig e-post med kuraterte arrangementer. Dine vises øverst.',
		tierBasis: 'Basis',
		tierStandard: 'Standard',
		tierPartner: 'Partner',
		tierAlaCarte: 'Enkelt-arrangement',
		perMonth: '/mnd',
		perEvent: '/arr.',
		basisDesc: '15% synlighet, 1 samling',
		standardDesc: '25% synlighet, opptil 3 samlinger',
		partnerDesc: '35% synlighet, alle samlinger',
		alaCarteDesc: 'Boost ett arrangement i 1 samling',
		estimatedReach: 'Estimert rekkevidde',
		estimatedReachDesc: 'per måned basert på nåværende trafikk',
		eventPageViews: 'Sidevisninger for dine arrangementer',
		eventPageViewsDesc: 'Så mange besøkende har sett detaljsidene til dine arrangementer siste 30 dager.',
		contact: 'Interessert? Ta kontakt',
		contactDesc: 'Svar på denne e-posten eller send en melding til',
		generated: 'Generert',
		noEvents: 'Vi fant ingen kommende arrangementer for denne venuen. Kontakt oss gjerne for å diskutere mulighetene.',
		earlyBird: 'Tidlig-tilgang: 3 måneder gratis',
		earlyBirdDesc: 'Som tidlig partner får du de tre første månedene helt gratis.',
		festivalSeason: 'Sesong',
		festivalAudience: 'Estimert publikum',
		festivalEvents: 'Arrangementer nå',
		festivalCollection: 'Samlingside',
		festivalOnGari: 'på Gåri',
		festivalBasis: 'Festival Basis',
		festivalStandard: 'Festival Standard',
		festivalPartner: 'Festival Partner',
		festivalBasisDesc: 'Promotert på egen festivalside',
		festivalStandardDesc: '+ nyhetsbrev + 2 relevante samlinger',
		festivalPartnerDesc: '+ alle samlinger + dedikert nyhetsbrev-seksjon',
		perFestival: '/festival'
	},
	en: {
		reportTitle: 'Prospect Report',
		platformTitle: 'Gåri — Bergen\'s Digital Event Guide',
		platformSubtitle: 'What does it mean for you that your events are on Gåri?',
		visitors: 'Visitors',
		pageviews: 'Pageviews',
		last30d: 'Last 30 days',
		growth: 'Growth',
		trafficSources: 'Where visitors come from',
		aiTraffic: 'AI Traffic',
		aiExplainer: 'Users discovering Gåri through AI search tools like ChatGPT, Perplexity and Copilot — a growing source of discovery.',
		activeEvents: 'Active events',
		sources: 'sources',
		collections: 'Curated collections',
		subscribers: 'Newsletter subscribers',
		venueTitle: 'Your Events on Gåri',
		upcomingEvents: 'Upcoming events',
		totalLast3mo: 'Total last 3 months',
		category: 'Category',
		date: 'Date',
		image: 'Image',
		ticket: 'Ticket',
		yes: 'Yes',
		no_val: 'No',
		qualityTitle: 'Data Quality',
		withImage: 'With image',
		withTicket: 'With ticket link',
		withDescription: 'With AI description',
		collectionsTitle: 'Relevant Collections for You',
		collectionsExplainer: 'Your events can appear in these curated collections that users browse to find things to do.',
		visitorsLabel: 'visitors/mo',
		promotedTitle: 'What You Get with Promoted Placement',
		promotedIntro: 'With a promoted placement, your events are highlighted in the collections most relevant to you.',
		topPlacement: 'Top placement in collections',
		topPlacementDesc: 'Your event appears first, above all others — with a clear "Featured" badge.',
		newsletterInclusion: 'Featured in the newsletter',
		newsletterDesc: 'subscribers receive a weekly email with curated events. Yours appear at the top.',
		tierBasis: 'Basis',
		tierStandard: 'Standard',
		tierPartner: 'Partner',
		tierAlaCarte: 'Single event',
		perMonth: '/mo',
		perEvent: '/event',
		basisDesc: '15% visibility, 1 collection',
		standardDesc: '25% visibility, up to 3 collections',
		partnerDesc: '35% visibility, all collections',
		alaCarteDesc: 'Boost one event in 1 collection',
		estimatedReach: 'Estimated reach',
		estimatedReachDesc: 'per month based on current traffic',
		eventPageViews: 'Page views for your events',
		eventPageViewsDesc: 'This many visitors have viewed the detail pages of your events in the last 30 days.',
		contact: 'Interested? Get in touch',
		contactDesc: 'Reply to this email or send a message to',
		generated: 'Generated',
		noEvents: 'We found no upcoming events for this venue. Feel free to contact us to discuss opportunities.',
		earlyBird: 'Early access: 3 months free',
		earlyBirdDesc: 'As an early partner, you get the first three months completely free.',
		festivalSeason: 'Season',
		festivalAudience: 'Est. audience',
		festivalEvents: 'Current events',
		festivalCollection: 'Collection page',
		festivalOnGari: 'on Gåri',
		festivalBasis: 'Festival Basis',
		festivalStandard: 'Festival Standard',
		festivalPartner: 'Festival Partner',
		festivalBasisDesc: 'Promoted on festival collection page',
		festivalStandardDesc: '+ newsletter + 2 relevant collections',
		festivalPartnerDesc: '+ all collections + dedicated newsletter section',
		perFestival: '/festival'
	}
};

// ─── Helpers ─────────────────────────────────────────────────────────

function fmt(n: number): string {
	return n.toLocaleString('nb-NO');
}

function growthPct(current: number, previous: number): string {
	if (previous === 0) return current > 0 ? '+100%' : '0%';
	const pct = ((current - previous) / previous) * 100;
	return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`;
}

function growthColor(current: number, previous: number): string {
	if (previous === 0) return '#16a34a';
	const pct = ((current - previous) / previous) * 100;
	if (pct > 5) return '#16a34a';
	if (pct < -5) return '#dc2626';
	return '#666';
}

function slugifyVenue(name: string): string {
	return name
		.toLowerCase()
		.replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 60);
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	if (lang === 'en') {
		return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/Oslo' });
	}
	return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', timeZone: 'Europe/Oslo' });
}

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
	music: { no: 'Musikk', en: 'Music' },
	culture: { no: 'Kultur', en: 'Culture' },
	theatre: { no: 'Teater', en: 'Theatre' },
	family: { no: 'Familie', en: 'Family' },
	food: { no: 'Mat & drikke', en: 'Food & Drink' },
	festival: { no: 'Festival', en: 'Festival' },
	sports: { no: 'Sport', en: 'Sports' },
	nightlife: { no: 'Uteliv', en: 'Nightlife' },
	workshop: { no: 'Workshop', en: 'Workshop' },
	student: { no: 'Student', en: 'Student' },
	tours: { no: 'Omvisning', en: 'Tours' }
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
	music: '#AECDE8', culture: '#C5B8D9', theatre: '#E8B8C2',
	family: '#F5D49A', food: '#E8C4A0', festival: '#F5E0A0',
	sports: '#A8D4B8', nightlife: '#9BAED4', workshop: '#D4B89A',
	student: '#B8D4A8', tours: '#A8CCCC'
};

// ─── HTML Template ───────────────────────────────────────────────────

function buildHtml(platform: PlatformStats, venue: VenueData | null, festival: FestivalData | null = null): string {
	const t = TEXT[lang];
	const reportSubject = festival
		? `${festival.meta.name[lang]} ${t.festivalOnGari}`
		: venue
			? `${venue.name}`
			: '';

	// ── Shared helpers ──
	function buildEventsTable(events: VenueEvent[], maxRows = 15): string {
		if (events.length === 0) return `<p style="color:#6B6862;font-style:italic;margin:16px 0">${t.noEvents}</p>`;
		return `
			<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
				<thead><tr>
					<th style="text-align:left;padding:10px 8px;border-bottom:2px solid #C82D2D;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6B6862">${t.date}</th>
					<th style="text-align:left;padding:10px 8px;border-bottom:2px solid #C82D2D;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6B6862">${lang === 'no' ? 'Tittel' : 'Title'}</th>
					<th style="text-align:left;padding:10px 8px;border-bottom:2px solid #C82D2D;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6B6862">${t.category}</th>
					<th style="text-align:center;padding:10px 8px;border-bottom:2px solid #C82D2D;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6B6862">${t.image}</th>
					<th style="text-align:center;padding:10px 8px;border-bottom:2px solid #C82D2D;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6B6862">${t.ticket}</th>
				</tr></thead>
				<tbody>
					${events.slice(0, maxRows).map((e, i) => {
						const title = (lang === 'en' && e.title_en) ? e.title_en : e.title_no;
						const catLabel = CATEGORY_LABELS[e.category]?.[lang] ?? e.category;
						const badgeBg = CATEGORY_BADGE_COLORS[e.category] ?? '#D8D8D4';
						const rowBg = i % 2 === 0 ? '' : 'background:#F8F8F6;';
						return `
						<tr style="${rowBg}">
							<td style="padding:8px;border-bottom:1px solid #E8E8E4;font-size:13px;white-space:nowrap">${formatDate(e.date_start)}</td>
							<td style="padding:8px;border-bottom:1px solid #E8E8E4;font-size:13px"><a href="${SITE_URL}/${lang}/events/${e.slug}" style="color:#C82D2D;text-decoration:underline">${title.length > 50 ? title.slice(0, 47) + '...' : title}</a></td>
							<td style="padding:8px;border-bottom:1px solid #E8E8E4;font-size:13px"><span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${badgeBg};color:#141414;font-size:11px;font-weight:600">${catLabel}</span></td>
							<td style="text-align:center;padding:8px;border-bottom:1px solid #E8E8E4;font-size:13px;color:${e.image_url ? '#16a34a' : '#dc2626'}">${e.image_url ? t.yes : t.no_val}</td>
							<td style="text-align:center;padding:8px;border-bottom:1px solid #E8E8E4;font-size:13px;color:${e.ticket_url ? '#16a34a' : '#dc2626'}">${e.ticket_url ? t.yes : t.no_val}</td>
						</tr>`;
					}).join('')}
				</tbody>
			</table>
			${events.length > maxRows ? `<p style="color:#6B6862;font-size:12px;font-style:italic">+ ${events.length - maxRows} ${lang === 'no' ? 'flere arrangementer' : 'more events'}</p>` : ''}
		`;
	}

	function buildQualityBars(qScore: { withImage: number; withTicket: number; withDescription: number; total: number }): string {
		if (qScore.total === 0) return '';
		return `
			<div style="margin:16px 0 24px">
				<h3 style="font-size:15px;margin:0 0 12px;border-left:4px solid #C82D2D;padding-left:12px">${t.qualityTitle}</h3>
				${[
					{ label: t.withImage, count: qScore.withImage, color: '#C82D2D' },
					{ label: t.withTicket, count: qScore.withTicket, color: '#2563eb' },
					{ label: t.withDescription, count: qScore.withDescription, color: '#16a34a' }
				].map(q => {
					const pct = Math.round((q.count / qScore.total) * 100);
					return `
						<div style="margin-bottom:8px">
							<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px">
								<span>${q.label}</span>
								<span style="color:#6B6862">${q.count}/${qScore.total} (${pct}%)</span>
							</div>
							<div style="background:#E8E8E4;border-radius:4px;height:12px;overflow:hidden">
								<div style="background:${q.color};height:100%;width:${pct}%;border-radius:4px"></div>
							</div>
						</div>`;
				}).join('')}
			</div>
		`;
	}

	function buildEventViews(pageViews: Array<{ slug: string; title: string; visitors: number }>): string {
		if (pageViews.length === 0) return '';
		return `
			<h3 style="font-size:15px;margin:24px 0 8px;border-left:4px solid #C82D2D;padding-left:12px">${t.eventPageViews}</h3>
			<p style="font-size:13px;color:#6B6862;margin:0 0 12px">${t.eventPageViewsDesc}</p>
			<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
				<tbody>
					${pageViews.slice(0, 10).map(e => `
						<tr>
							<td style="padding:6px 8px;border-bottom:1px solid #E8E8E4;font-size:13px">${e.title.length > 45 ? e.title.slice(0, 42) + '...' : e.title}</td>
							<td style="padding:6px 8px;border-bottom:1px solid #E8E8E4;text-align:right;font-weight:600;font-size:13px">${fmt(e.visitors)} ${t.visitors.toLowerCase()}</td>
						</tr>
					`).join('')}
				</tbody>
			</table>
		`;
	}

	// ── Platform overview section ──
	const growthStr = growthPct(platform.visitors30d, platform.visitorsPrev30d);
	const gColor = growthColor(platform.visitors30d, platform.visitorsPrev30d);

	const sourcesHtml = platform.topSources.length > 0 ? platform.topSources.map(s => {
		const maxVisitors = platform.topSources[0].visitors;
		const barWidth = maxVisitors > 0 ? Math.max(8, Math.round((s.visitors / maxVisitors) * 100)) : 0;
		return `
			<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
				<span style="width:100px;font-size:13px;text-align:right;flex-shrink:0">${s.source}</span>
				<div style="flex:1;background:#E8E8E4;border-radius:4px;height:20px;overflow:hidden">
					<div style="background:#C82D2D;height:100%;width:${barWidth}%;border-radius:4px;min-width:2px"></div>
				</div>
				<span style="font-size:12px;color:#6B6862;width:50px;flex-shrink:0">${fmt(s.visitors)}</span>
			</div>`;
	}).join('') : '';

	const aiHtml = platform.aiReferrals.length > 0 ? `
		<div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0 24px">
			<h3 style="margin:0 0 8px;font-size:15px;color:#1e40af">${t.aiTraffic}</h3>
			<p style="margin:0 0 12px;font-size:13px;color:#334155">${t.aiExplainer}</p>
			<div style="display:flex;flex-wrap:wrap;gap:8px">
				${platform.aiReferrals.map(a => `
					<span style="background:#dbeafe;color:#1e40af;padding:4px 12px;border-radius:9999px;font-size:13px;font-weight:500">${a.source.replace('.com', '').replace('.ai', '')} · ${fmt(a.visitors)}</span>
				`).join('')}
			</div>
		</div>
	` : '';

	const subscriberHtml = platform.subscribers !== null ? `
		<div style="background:#F8F8F6;border-radius:8px;padding:16px;text-align:center;margin-bottom:24px;border-left:4px solid #C82D2D">
			<div style="font-size:36px;font-weight:700;color:#C82D2D">${fmt(platform.subscribers)}</div>
			<div style="font-size:14px;color:#6B6862">${t.subscribers}</div>
		</div>
	` : '';

	// ── Venue section ──
	let venueHtml = '';
	if (venue) {
		const relevantCollections = venue.relevantCollections.filter(c => c.relevant);
		const relevantWithTraffic = relevantCollections.filter(c => c.visitors30d > 0);
		const relevantWithoutTraffic = relevantCollections.filter(c => c.visitors30d === 0);

		venueHtml = `
			<div style="border-top:4px solid #C82D2D;margin-top:32px;padding-top:24px">
				<h2 style="font-size:22px;margin:0 0 4px">${t.venueTitle}</h2>
				<p style="color:#6B6862;font-size:14px;margin:0 0 16px">${venue.name}</p>

				<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
					<div style="background:#F8F8F6;border-radius:8px;padding:12px 20px;text-align:center;border-left:4px solid #C82D2D;flex:1;min-width:100px">
						<div style="font-size:28px;font-weight:700;color:#141414">${venue.upcomingEvents.length}</div>
						<div style="font-size:12px;color:#6B6862">${t.upcomingEvents}</div>
					</div>
					<div style="background:#F8F8F6;border-radius:8px;padding:12px 20px;text-align:center;border-left:4px solid #C82D2D;flex:1;min-width:100px">
						<div style="font-size:28px;font-weight:700;color:#141414">${venue.totalEventsLast3Months}</div>
						<div style="font-size:12px;color:#6B6862">${t.totalLast3mo}</div>
					</div>
					<div style="background:#F8F8F6;border-radius:8px;padding:12px 20px;text-align:center;border-left:4px solid #C82D2D;flex:1;min-width:100px">
						<div style="font-size:28px;font-weight:700;color:#141414">${venue.categories.length}</div>
						<div style="font-size:12px;color:#6B6862">${lang === 'no' ? 'Kategorier' : 'Categories'}</div>
					</div>
					${venue.newsletterReach > 0 ? `
					<div style="background:#F8F8F6;border-radius:8px;padding:12px 20px;text-align:center;border-left:4px solid #C82D2D;flex:1;min-width:100px">
						<div style="font-size:28px;font-weight:700;color:#C82D2D">${venue.newsletterReach}</div>
						<div style="font-size:12px;color:#6B6862">${lang === 'no' ? 'Nyhetsbrev-treff' : 'Newsletter matches'}</div>
					</div>
					` : ''}
				</div>

				${buildEventsTable(venue.upcomingEvents)}
				${buildQualityBars(venue.qualityScore)}
				${buildEventViews(venue.eventPageViews)}

				<h3 style="font-size:15px;margin:24px 0 8px;border-left:4px solid #C82D2D;padding-left:12px">${t.collectionsTitle}</h3>
				<p style="font-size:13px;color:#6B6862;margin:0 0 16px">${t.collectionsExplainer}</p>
				<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
					${relevantWithTraffic.map(c => `
						<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;min-width:140px">
							<div style="font-weight:600;font-size:14px;color:#C82D2D">${c.title}</div>
							<div style="font-size:20px;font-weight:700;margin:4px 0 0">${fmt(c.visitors30d)}</div>
							<div style="font-size:11px;color:#6B6862">${t.visitorsLabel}</div>
						</div>
					`).join('')}
					${relevantWithoutTraffic.map(c => `
						<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;min-width:140px">
							<div style="font-weight:600;font-size:14px;color:#C82D2D">${c.title}</div>
							<div style="font-size:11px;color:#6B6862;margin-top:4px">${lang === 'no' ? 'Inkludert' : 'Included'}</div>
						</div>
					`).join('')}
				</div>
			</div>
		`;
	}

	// ── Festival section ──
	let festivalHtml = '';
	if (festival) {
		const fMeta = festival.meta;
		const noTraffic = festival.collectionTraffic.no;
		const enTraffic = festival.collectionTraffic.en;

		// Compute quality score for festival events
		const fTotal = festival.currentEvents.length;
		const fWithImage = festival.currentEvents.filter(e => e.image_url).length;
		const fWithTicket = festival.currentEvents.filter(e => e.ticket_url).length;
		const fWithDesc = festival.currentEvents.filter(e => e.description_no && e.description_no.length > 20).length;

		festivalHtml = `
			<div style="border-top:4px solid #C82D2D;margin-top:32px;padding-top:24px">
				<h2 style="font-size:22px;margin:0 0 4px">${fMeta.name[lang]} ${t.festivalOnGari}</h2>
				<p style="color:#6B6862;font-size:14px;margin:0 0 20px">${fMeta.domains.join(' + ')}</p>

				<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
					<div style="background:#F8F8F6;border-radius:8px;padding:14px 20px;text-align:center;border-left:4px solid #C82D2D;flex:1;min-width:100px">
						<div style="font-size:16px;font-weight:700;color:#141414">${fMeta.season[lang]}</div>
						<div style="font-size:11px;color:#6B6862">${t.festivalSeason}</div>
					</div>
					<div style="background:#F8F8F6;border-radius:8px;padding:14px 20px;text-align:center;border-left:4px solid #C82D2D;flex:1;min-width:100px">
						<div style="font-size:16px;font-weight:700;color:#141414">${fMeta.estimatedAudience}</div>
						<div style="font-size:11px;color:#6B6862">${t.festivalAudience}</div>
					</div>
					<div style="background:#F8F8F6;border-radius:8px;padding:14px 20px;text-align:center;border-left:4px solid #C82D2D;flex:1;min-width:100px">
						<div style="font-size:28px;font-weight:700;color:#C82D2D">${fTotal}</div>
						<div style="font-size:11px;color:#6B6862">${t.festivalEvents}</div>
					</div>
				</div>

				<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px 16px;margin-bottom:20px">
					<div style="font-size:13px;font-weight:600;margin-bottom:6px">${t.festivalCollection}</div>
					<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px">
						<a href="${SITE_URL}/no/${fMeta.collectionSlugs.no}" style="color:#C82D2D;text-decoration:underline">gaari.no/no/${fMeta.collectionSlugs.no}</a>
						<a href="${SITE_URL}/en/${fMeta.collectionSlugs.en}" style="color:#C82D2D;text-decoration:underline">gaari.no/en/${fMeta.collectionSlugs.en}</a>
					</div>
					${noTraffic || enTraffic ? `
					<div style="display:flex;gap:16px;margin-top:8px;font-size:12px;color:#6B6862">
						${noTraffic ? `<span>${fmt(noTraffic.visitors30d)} ${t.visitorsLabel} (NO)</span>` : ''}
						${enTraffic ? `<span>${fmt(enTraffic.visitors30d)} ${t.visitorsLabel} (EN)</span>` : ''}
					</div>
					` : ''}
				</div>

				${buildEventsTable(festival.currentEvents)}
				${buildQualityBars({ withImage: fWithImage, withTicket: fWithTicket, withDescription: fWithDesc, total: fTotal })}
				${buildEventViews(festival.eventPageViews)}
			</div>
		`;
	}

	// ── Recommendations section ──
	const recommendations = generateRecommendations(platform, venue, festival);
	const recsTitle = lang === 'no' ? 'Analyse og anbefalinger' : 'Analysis & Recommendations';

	const priorityStyles: Record<string, string> = {
		high: 'border-left:4px solid #C82D2D;background:#fef2f2',
		medium: 'border-left:4px solid #f59e0b;background:#fefce8',
		low: 'border-left:4px solid #6b7280;background:#F8F8F6'
	};

	const recommendationsHtml = recommendations.length > 0 ? `
		<div style="border-top:4px solid #C82D2D;margin-top:32px;padding-top:24px">
			<h2 style="font-size:22px;margin:0 0 16px">${recsTitle}</h2>
			${recommendations.map(r => `
				<div style="${priorityStyles[r.priority]};border-radius:8px;padding:14px 16px;margin-bottom:12px">
					<h4 style="margin:0 0 4px;font-size:14px">${r.icon} ${r.title}</h4>
					<p style="margin:0;font-size:13px;color:#334155;line-height:1.5">${r.body}</p>
				</div>
			`).join('')}
		</div>
	` : '';

	// ── Pricing section ──
	const totalCollectionVisitors = venue
		? venue.relevantCollections.filter(c => c.relevant).reduce((s, c) => s + c.visitors30d, 0)
		: festival
			? (festival.collectionTraffic.no?.visitors30d ?? 0) + (festival.collectionTraffic.en?.visitors30d ?? 0)
			: 0;

	// Festival gets festival-specific pricing table; venue/overview gets standard venue pricing
	const pricingTiers = festival
		? [
			{ name: t.festivalBasis, price: `3 000 kr${t.perFestival}`, desc: t.festivalBasisDesc, share: 0.15 },
			{ name: t.festivalStandard, price: `6 000 kr${t.perFestival}`, desc: t.festivalStandardDesc, share: 0.25 },
			{ name: t.festivalPartner, price: `12 000 kr${t.perFestival}`, desc: t.festivalPartnerDesc, share: 0.35 },
			{ name: t.tierAlaCarte, price: `500 kr${t.perEvent}`, desc: t.alaCarteDesc, share: 0 }
		]
		: [
			{ name: t.tierBasis, price: `1 000 kr${t.perMonth}`, desc: t.basisDesc, share: 0.15 },
			{ name: t.tierStandard, price: `3 500 kr${t.perMonth}`, desc: t.standardDesc, share: 0.25 },
			{ name: t.tierPartner, price: `7 000 kr${t.perMonth}`, desc: t.partnerDesc, share: 0.35 },
			{ name: t.tierAlaCarte, price: `500 kr${t.perEvent}`, desc: t.alaCarteDesc, share: 0 }
		];

	const promotedHtml = `
		<div style="border-top:4px solid #C82D2D;margin-top:32px;padding-top:24px">
			<h2 style="font-size:22px;margin:0 0 8px">${t.promotedTitle}</h2>
			<p style="font-size:14px;color:#6B6862;margin:0 0 24px">${t.promotedIntro}</p>

			<div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap">
				<div style="flex:1;min-width:200px;border:1px solid #E8E8E4;border-radius:8px;padding:16px">
					<h4 style="margin:0 0 6px;font-size:14px">${t.topPlacement}</h4>
					<p style="margin:0;font-size:13px;color:#6B6862">${t.topPlacementDesc}</p>
				</div>
				<div style="flex:1;min-width:200px;border:1px solid #E8E8E4;border-radius:8px;padding:16px">
					<h4 style="margin:0 0 6px;font-size:14px">${t.newsletterInclusion}</h4>
					<p style="margin:0;font-size:13px;color:#6B6862">${platform.subscribers ? fmt(platform.subscribers) + ' ' : ''}${t.newsletterDesc}</p>
				</div>
			</div>

			<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
				<thead><tr>
					<th style="text-align:left;padding:12px 10px;border-bottom:2px solid #C82D2D;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6B6862">Tier</th>
					<th style="text-align:right;padding:12px 10px;border-bottom:2px solid #C82D2D;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6B6862">${lang === 'no' ? 'Pris' : 'Price'}</th>
					<th style="text-align:left;padding:12px 10px;border-bottom:2px solid #C82D2D;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6B6862">${lang === 'no' ? 'Inkluderer' : 'Includes'}</th>
					${totalCollectionVisitors > 0 ? `<th style="text-align:right;padding:12px 10px;border-bottom:2px solid #C82D2D;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6B6862">${t.estimatedReach}</th>` : ''}
				</tr></thead>
				<tbody>
					${pricingTiers.map((tier, i) => `
						<tr style="${i % 2 === 1 ? 'background:#F8F8F6;' : ''}">
							<td style="padding:10px;border-bottom:1px solid #E8E8E4;font-size:14px;font-weight:600">${tier.name}</td>
							<td style="text-align:right;padding:10px;border-bottom:1px solid #E8E8E4;font-size:14px;white-space:nowrap">${tier.price}</td>
							<td style="padding:10px;border-bottom:1px solid #E8E8E4;font-size:13px;color:#6B6862">${tier.desc}</td>
							${totalCollectionVisitors > 0 ? `<td style="text-align:right;padding:10px;border-bottom:1px solid #E8E8E4;font-size:14px;font-weight:600;color:#C82D2D">${tier.share > 0 ? '~' + fmt(Math.round(totalCollectionVisitors * tier.share)) : '-'}</td>` : ''}
						</tr>
					`).join('')}
				</tbody>
			</table>
			${totalCollectionVisitors > 0 ? `<p style="font-size:11px;color:#999;font-style:italic;margin:-16px 0 16px">* ${t.estimatedReachDesc}</p>` : ''}

			<div style="background:#fef9ec;border:1px solid #fbbf24;border-radius:8px;padding:16px;margin-bottom:24px">
				<h4 style="margin:0 0 4px;color:#92400e;font-size:14px">${t.earlyBird}</h4>
				<p style="margin:0;font-size:13px;color:#78350f">${t.earlyBirdDesc}</p>
			</div>
		</div>
	`;

	// ── Contact section ──
	const contactHtml = `
		<div style="border-top:2px solid #C82D2D;margin-top:32px;padding-top:20px;text-align:center">
			<h2 style="font-size:18px;margin:0 0 8px">${t.contact}</h2>
			<p style="font-size:14px;color:#6B6862;margin:0">${t.contactDesc} <a href="mailto:post@gaari.no" style="color:#C82D2D;text-decoration:underline">post@gaari.no</a></p>
		</div>
	`;

	// ── Assemble ──
	const titleHtml = festival
		? `${t.reportTitle} — ${festival.meta.name[lang]}`
		: venue
			? `${t.reportTitle} — ${venue.name}`
			: t.reportTitle;

	return `<!DOCTYPE html>
<html lang="${lang === 'en' ? 'en' : 'nb'}">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<title>${titleHtml}</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#141414;line-height:1.5">
	<div style="max-width:640px;margin:0 auto;padding:24px 16px">
		<div style="background:#FFFFFF;border-radius:8px;overflow:hidden">
			<!-- Red accent bar -->
			<div style="height:4px;background:#C82D2D"></div>

			<!-- Header -->
			<div style="padding:28px 32px 0">
				<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:16px">
					<span style="font-size:32px;font-weight:700;letter-spacing:-0.02em;color:#141414">Gåri</span>
					<span style="font-size:13px;color:#6B6862">${t.reportTitle} · ${TODAY}</span>
				</div>
				<h1 style="margin:0 0 4px;font-size:20px;font-weight:600;color:#141414">${t.platformTitle}</h1>
				<p style="margin:0 0 24px;font-size:14px;color:#6B6862">${t.platformSubtitle}</p>
			</div>

			<div style="padding:0 32px 32px">
				<!-- Key metrics -->
				<div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
					<div style="flex:1;min-width:130px;background:#F8F8F6;border-radius:8px;padding:16px;text-align:center;border-left:4px solid #C82D2D">
						<div style="font-size:36px;font-weight:700;color:#C82D2D">${fmt(platform.visitors30d)}</div>
						<div style="font-size:13px;color:#6B6862">${t.visitors} (${t.last30d.toLowerCase()})</div>
						<div style="font-size:12px;font-weight:600;color:${gColor};margin-top:4px">${t.growth}: ${growthStr}</div>
					</div>
					<div style="flex:1;min-width:130px;background:#F8F8F6;border-radius:8px;padding:16px;text-align:center;border-left:4px solid #C82D2D">
						<div style="font-size:36px;font-weight:700;color:#141414">${fmt(platform.activeEvents)}</div>
						<div style="font-size:13px;color:#6B6862">${t.activeEvents}</div>
						<div style="font-size:12px;color:#999;margin-top:4px">52 ${t.sources} · 190+ ${lang === 'no' ? 'arenaer' : 'venues'}</div>
					</div>
				</div>

				${subscriberHtml}

				<!-- Traffic sources -->
				${sourcesHtml ? `
					<h3 style="font-size:15px;margin:24px 0 12px;border-left:4px solid #C82D2D;padding-left:12px">${t.trafficSources}</h3>
					${sourcesHtml}
				` : ''}

				${aiHtml}

				<!-- Venue or Festival section -->
				${venueHtml}
				${festivalHtml}

				<!-- Analysis & Recommendations -->
				${recommendationsHtml}

				<!-- Pricing section -->
				${promotedHtml}

				<!-- Contact -->
				${contactHtml}
			</div>

			<!-- Footer -->
			<div style="padding:16px 32px;background:#F8F8F6;text-align:center;color:#999;font-size:11px;border-top:1px solid #E8E8E4">
				<p style="margin:0">${t.generated} ${TODAY} · <a href="${SITE_URL}" style="color:#C82D2D">gaari.no</a></p>
			</div>
		</div>
	</div>
</body>
</html>`;
}

// ─── Output ──────────────────────────────────────────────────────────

async function writeReport(html: string, slug: string): Promise<string> {
	const outDir = path.join(import.meta.dirname, '..', '.prospect-reports');
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, `${slug}-${TODAY}.html`);
	fs.writeFileSync(outPath, html);
	return outPath;
}

async function sendReport(html: string, email: string, subject: string): Promise<boolean> {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.error('Kan ikke sende e-post: mangler RESEND_API_KEY');
		return false;
	}

	const resp = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${key}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: FROM_EMAIL,
			to: [email],
			reply_to: 'post@gaari.no',
			subject,
			html
		})
	});

	if (resp.ok) {
		const data = await resp.json() as { id: string };
		console.log(`E-post sendt (Resend ID: ${data.id})`);
		return true;
	} else {
		console.error(`E-post feilet: ${resp.status} ${await resp.text()}`);
		return false;
	}
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
	const t = TEXT[lang];
	console.log(`\nGåri ${t.reportTitle}`);
	console.log(`${'─'.repeat(40)}`);

	if (venueName) {
		console.log(`Venue: ${venueName}`);
	} else if (isFestival) {
		console.log(`Festival: ${FESTIVAL_META[festivalArg!].name[lang]}`);
	} else {
		console.log('Modus: Plattformoversikt');
	}
	console.log(`Språk: ${lang}\n`);

	// Collect platform stats (always needed)
	const platform = await collectPlatformStats();

	console.log(`  Besøkende (30d): ${fmt(platform.visitors30d)}`);
	console.log(`  Aktive events:   ${fmt(platform.activeEvents)}`);
	if (platform.subscribers !== null) console.log(`  Abonnenter:      ${fmt(platform.subscribers)}`);
	if (platform.aiReferrals.length > 0) console.log(`  AI-trafikk:      ${platform.aiReferrals.map(a => `${a.source} (${a.visitors})`).join(', ')}`);

	// Collect venue or festival data
	let venue: VenueData | null = null;
	let festival: FestivalData | null = null;

	if (venueName) {
		venue = await collectVenueData(venueName, platform.subscriberCategories);
		console.log(`\n  ${venue.name}:`);
		console.log(`    Kommende events:    ${venue.upcomingEvents.length}`);
		console.log(`    Siste 3 mnd:        ${venue.totalEventsLast3Months}`);
		console.log(`    Kategorier:         ${venue.categories.join(', ')}`);
		console.log(`    Relevante samlinger: ${venue.relevantCollections.filter(c => c.relevant).length}`);
		if (venue.eventPageViews.length > 0) {
			console.log(`    Events med visninger: ${venue.eventPageViews.length}`);
		}
		if (venue.newsletterReach > 0) {
			console.log(`    Nyhetsbrev-treff:    ${venue.newsletterReach}`);
		}
	} else if (isFestival) {
		festival = await collectFestivalData(festivalArg!, platform.subscriberCategories);
		console.log(`\n  ${festival.meta.name[lang]}:`);
		console.log(`    Aktive events:       ${festival.currentEvents.length}`);
		console.log(`    Siste 3 mnd:         ${festival.totalEventsLast3Months}`);
		console.log(`    Kategorier:          ${festival.categories.join(', ')}`);
		const totalTraffic = (festival.collectionTraffic.no?.visitors30d ?? 0) + (festival.collectionTraffic.en?.visitors30d ?? 0);
		if (totalTraffic > 0) {
			console.log(`    Samlingside-trafikk: ${totalTraffic} besøkende/30d`);
		}
		if (festival.eventPageViews.length > 0) {
			console.log(`    Events med visninger: ${festival.eventPageViews.length}`);
		}
		if (festival.newsletterReach > 0) {
			console.log(`    Nyhetsbrev-treff:    ${festival.newsletterReach}`);
		}
	}

	// Build HTML
	const html = buildHtml(platform, venue, festival);
	const slug = venueName
		? slugifyVenue(venueName)
		: isFestival
			? `festival-${festivalArg}`
			: 'plattformoversikt';

	// Write to file
	const filePath = await writeReport(html, slug);
	console.log(`\nRapport lagret: ${filePath}`);

	// Send email if requested
	if (emailTo) {
		const subject = festival
			? `${t.reportTitle}: ${festival.meta.name[lang]} — Gåri`
			: venue
				? `${t.reportTitle}: ${venue.name} — Gåri`
				: `Gåri — ${t.reportTitle}`;
		console.log(`Sender til ${emailTo}...`);
		await sendReport(html, emailTo, subject);
	}

	console.log('\nFerdig.\n');
}

main().catch(err => {
	console.error('Feil:', err);
	process.exit(1);
});
