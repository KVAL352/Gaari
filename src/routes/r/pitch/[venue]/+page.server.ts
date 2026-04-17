import { error, redirect } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

const PAGE_LABELS: Record<string, string> = {
	'konserter': 'Konserter denne uken',
	'denne-helgen': 'Denne helgen i Bergen',
	'uteliv': 'Uteliv i Bergen',
	'sentrum': 'Sentrum',
	'teater': 'Teater i Bergen',
	'voksen': 'For voksne',
	'mat-og-drikke': 'Mat og drikke',
	'regndagsguide': 'Regndagsguide',
	'familiehelg': 'Familiehelg',
	'studentkveld': 'Studentkveld',
	'utstillinger': 'Utstillinger i Bergen',
	'gratis': 'Gratis i Bergen',
	'i-kveld': 'I kveld',
	'i-dag': 'I dag i Bergen',
};

const CAT_LABELS: Record<string, string> = {
	music: 'Musikk', culture: 'Kultur', theatre: 'Teater', family: 'Familie',
	food: 'Mat og drikke', festival: 'Festival', sports: 'Sport', nightlife: 'Uteliv',
	workshop: 'Kurs', student: 'Student', tours: 'Turer'
};

function detectPages(categories: string[]): string[] {
	const cats = new Set(categories);
	if (cats.has('music') || cats.has('nightlife')) return ['konserter', 'denne-helgen', 'uteliv', 'sentrum'];
	if (cats.has('theatre')) return ['teater', 'denne-helgen', 'voksen', 'sentrum'];
	if (cats.has('food')) return ['mat-og-drikke', 'denne-helgen', 'sentrum', 'voksen'];
	if (cats.has('culture')) return ['utstillinger', 'regndagsguide', 'familiehelg', 'denne-helgen'];
	if (cats.has('family')) return ['familiehelg', 'denne-helgen', 'regndagsguide', 'gratis'];
	if (cats.has('workshop')) return ['regndagsguide', 'denne-helgen', 'voksen', 'sentrum'];
	if (cats.has('student')) return ['studentkveld', 'uteliv', 'denne-helgen', 'konserter'];
	if (cats.has('sports')) return ['denne-helgen', 'voksen', 'sentrum', 'i-dag'];
	return ['denne-helgen', 'sentrum', 'voksen', 'i-kveld'];
}

interface VenueEvent {
	title_no: string;
	date_start: string;
	category: string;
	image_url: string | null;
}

export const load: PageServerLoad = async ({ params }) => {
	// Temporarily hidden while copyright case is pending
	throw redirect(307, '/no');

	// Decode URL slug to venue name: "grieghallen" → look up in events
	const slug = decodeURIComponent(params.venue).toLowerCase();

	const nowUtc = new Date().toISOString();
	const { data, error: dbError } = await supabase
		.from('events')
		.select('venue_name, title_no, date_start, category, image_url')
		.eq('status', 'approved')
		.or(`date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`)
		.order('date_start', { ascending: true })
		.limit(500);

	if (dbError) throw error(500, 'Database error');

	// Find events matching this venue (case-insensitive slug match)
	// Supports both æøå URLs and ascii-normalized URLs (ø→o, æ→ae, å→a)
	function slugify(s: string): string {
		return s.toLowerCase().replace(/[^a-zæøå0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
	}
	function slugifyAscii(s: string): string {
		return s.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
	}

	const allEvents = (data ?? []) as (VenueEvent & { venue_name: string })[];
	const venueEvents = allEvents.filter(e =>
		slugify(e.venue_name) === slug
		|| slugifyAscii(e.venue_name) === slug
		|| e.venue_name.toLowerCase() === slug
	);

	if (venueEvents.length === 0) {
		throw error(404, 'Venue not found');
	}

	const venueName = venueEvents[0].venue_name;
	const categories = [...new Set(venueEvents.map(e => e.category))];
	const pages = detectPages(categories);

	// Deduplicate events for display (unique titles)
	const seen = new Set<string>();
	const diverse: VenueEvent[] = [];
	for (const e of venueEvents) {
		const key = e.title_no.toLowerCase().replace(/\s*\/\/.*$/, '').trim();
		if (!seen.has(key) && diverse.length < 6) {
			seen.add(key);
			diverse.push(e);
		}
	}

	// Hero images (unique titles)
	const heroSeen = new Set<string>();
	const heroImages = venueEvents.filter(e => {
		if (!e.image_url) return false;
		const key = e.title_no.toLowerCase().replace(/\s*\/\/.*$/, '').trim();
		if (heroSeen.has(key)) return false;
		heroSeen.add(key);
		return true;
	}).slice(0, 3).map(e => e.image_url!);

	return {
		venueName,
		eventCount: venueEvents.length,
		events: diverse,
		categories: categories.map(c => CAT_LABELS[c] ?? c),
		pages: pages.map(slug => ({ slug, label: PAGE_LABELS[slug] ?? slug })),
		heroImages,
		firstPageLabel: PAGE_LABELS[pages[0]] ?? pages[0]
	};
};
