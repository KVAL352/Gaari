import { supabase } from '$lib/server/supabase';
import { getGroupedCollections } from '$lib/collections';
import { seedEvents } from '$lib/data/seed-events';
import type { GaariEvent } from '$lib/types';
import type { PageServerLoad } from './$types';

export const config = {
	isr: { expiration: 3600 }
};

export const load: PageServerLoad = async ({ setHeaders, params }) => {
	setHeaders({ 'cache-control': 's-maxage=3600, stale-while-revalidate=7200' });

	const lang = params.lang === 'en' ? 'en' : 'no';
	// Date-only (YYYY-MM-DD) — stable across same-day ISR revalidations, prevents
	// non-deterministic ISR Writes triggered by full-ISO timestamps in JSON-LD
	// and article:modified_time meta tags.
	const dateModified = new Date().toISOString().slice(0, 10);

	// Single server-side "now". Returned to the client (as data.now) so the client
	// sort uses the EXACT same split point as this server render. Recomputing now on
	// the client would diverge from the ISR-cached SSR (up to 1h old), reorder the
	// upcoming/ongoing buckets, and mispair images with cards during hydration.
	const nowUtc = new Date().toISOString();

	// Lenkekartet nederst paa forsiden. Settes sammen her fordi $lib/collections
	// er hele katalogen paa 338 kB kildekode: importerte forsiden den selv,
	// fulgte 70 kB komprimert JavaScript med til nettleseren for aa tegne noen
	// og seksti lenker. Bare slug og etikett sendes videre.
	const collectionGroups = getGroupedCollections(lang);

	try {
		// date_start is stored as UTC (timestamptz) in Supabase
		// description_en var ikke med. EventCard leser event.description_en, saa
		// /en viste norsk beskrivelse paa hvert eneste kort — ogsaa etter at 99 %
		// av arrangementene fikk engelsk tekst. Det rammet det segmentet som
		// konverterer best: engelske soek ligger paa 12-17 % CTR mot 4,9 % norske.
		//
		// ticket_url er tatt ut. Kortet bruker den ikke — arrangementssida henter
		// den selv — og den fulgte med til nettleseren for alle 1 967 rader.
		const fields = 'id,slug,title_no,title_en,description_no,description_en,category,date_start,date_end,venue_name,address,bydel,price,image_url,age_group,language,status,is_sold_out';
		const PAGE = 1000;

		// Floor for date_start: reject events that started more than 60 days ago.
		// Long-running series with stale date_start pollute results and sort order.
		const startFloor = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

		const { data: page1, error } = await supabase
			.from('events')
			.select(fields)
			.in('status', ['approved', 'cancelled'])
			.eq('is_canary', false)
			.gte('date_start', startFloor)
			.or(`date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`)
			.order('date_start', { ascending: true })
			.range(0, PAGE - 1);

		if (error) throw error;

		let allData = page1 ?? [];

		// Fetch second page if first was full (>1000 events)
		if (allData.length === PAGE) {
			const { data: page2 } = await supabase
				.from('events')
				.select(fields)
				.in('status', ['approved', 'cancelled'])
				.gte('date_start', startFloor)
				.or(`date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`)
				.order('date_start', { ascending: true })
				.range(PAGE, PAGE * 2 - 1);
			if (page2) allData = allData.concat(page2);
		}

		if (allData.length > 0) {
			// Map price from string back to number where possible
			// Bare tekst i det spraaket sida faktisk er paa.
			//
			// Foer gikk begge titlene til nettleseren, og etter at
			// description_en kom med ville begge beskrivelsene ogsaa gjort det —
			// dobbelt tekst for 1 967 rader i en HTML som alt er 1,7 MB.
			//
			// Trygt fordi spraakbytte er en ekte navigasjon: LanguageSwitch
			// kaller goto('/en'...), som kjoerer denne lasteren paa nytt.
			const erEngelsk = lang === 'en';
			const mapped: GaariEvent[] = allData.map(e => ({
				...e,
				title_en: erEngelsk ? e.title_en : undefined,
				description_en: erEngelsk ? e.description_en : undefined,
				price: e.price === '' || e.price === null ? '' : isNaN(Number(e.price)) ? e.price : Number(e.price)
			}));

			// Sort: upcoming events first by date_start, then ongoing (past start) by date_end
			const upcoming = mapped.filter(e => e.date_start >= nowUtc);
			const ongoing = mapped.filter(e => e.date_start < nowUtc);
			upcoming.sort((a, b) => a.date_start < b.date_start ? -1 : a.date_start > b.date_start ? 1 : 0);
			ongoing.sort((a, b) => (a.date_end ?? '') < (b.date_end ?? '') ? -1 : (a.date_end ?? '') > (b.date_end ?? '') ? 1 : 0);
			mapped.length = 0;
			mapped.push(...upcoming, ...ongoing);

			// Cap Akvariet events to avoid flooding the homepage during holidays
			const AKVARIET_MAX = 5;
			let akvarietCount = 0;
			const events = mapped.filter(e => {
				if (e.venue_name === 'Akvariet i Bergen') {
					if (++akvarietCount > AKVARIET_MAX) return false;
				}
				return true;
			});

			return { events, source: 'supabase' as const, lang, dateModified, now: nowUtc, collectionGroups };
		}

		// Empty table — fall back to seed data
		return { events: seedEvents, source: 'seed' as const, lang, dateModified, now: nowUtc, collectionGroups };
	} catch (err) {
		// Supabase unreachable — fall back to seed data
		console.error('Supabase load failed:', err);
		return { events: seedEvents, source: 'seed' as const, lang, dateModified, now: nowUtc, collectionGroups };
	}
};
