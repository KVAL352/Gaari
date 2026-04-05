/**
 * Generate 12 seed posts for Instagram launch.
 * Uses real event data from Supabase, ignores day-of-week schedule.
 *
 * Usage: cd scripts && npx tsx social/generate-seed-posts.ts
 * Output: scripts/social/seed-posts/{collection}/slide-*.png + caption.txt
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { supabase } from '../lib/supabase.js';
import { getOsloNow, toOsloDateStr } from '../../src/lib/event-filters.js';
import { getCollection } from '../../src/lib/collections.js';
import { formatEventTime, isFreeEvent } from '../../src/lib/utils.js';
import { generateCarousel, type CarouselEvent, type CarouselOptions } from './image-gen.js';
import { generateCaption, type CaptionEvent } from './caption-gen.js';
import type { GaariEvent } from '../../src/lib/types.js';

const OUTPUT_DIR = resolve(import.meta.dirname, 'seed-posts');
const MAX_CAROUSEL_EVENTS = 8;

// 12 diverse collections for a varied seed feed
const SEED_COLLECTIONS = [
	{ slug: 'denne-helgen', lang: 'no' as const, hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#hvaskjeribergen', '#helgibergen', '#bergenliv'] },
	{ slug: 'gratis', lang: 'no' as const, hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#gratisibergen', '#gratis', '#bergenliv'] },
	{ slug: 'konserter', lang: 'no' as const, hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#bergenkonsert', '#livemusikk', '#konsert'] },
	{ slug: 'familiehelg', lang: 'no' as const, hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#barnibergen', '#familiehelg', '#bergenfamilie'] },
	{ slug: 'i-kveld', lang: 'no' as const, hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#kveldibergen', '#bergenliv', '#utibergen'] },
	{ slug: 'teater', lang: 'no' as const, hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#bergenteater', '#teater', '#scenekunst'] },
	{ slug: 'utstillinger', lang: 'no' as const, hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#bergenkunst', '#utstilling', '#samtidskunst'] },
	{ slug: 'mat-og-drikke', lang: 'no' as const, hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#bergenmat', '#matibergen', '#kokekurs'] },
	{ slug: 'studentkveld', lang: 'no' as const, hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#studentbergen', '#studentliv', '#uteliv'] },
	{ slug: 'this-weekend', lang: 'en' as const, hashtags: ['#bergen', '#bergennorway', '#thingstodoinbergen', '#bergenevents', '#weekendinbergen', '#norway'] },
	{ slug: 'today-in-bergen', lang: 'en' as const, hashtags: ['#bergen', '#bergennorway', '#todayinbergen', '#whattodoinbergen', '#bergentoday', '#norway'] },
	{ slug: 'i-dag', lang: 'no' as const, hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#hvaskjeribergen', '#bergenliv', '#idagibergen'] },
];

function formatDateRange(now: Date, slug: string, lang: 'no' | 'en'): string {
	const locale = lang === 'en' ? 'en-GB' : 'nb-NO';

	if (['denne-helgen', 'familiehelg', 'this-weekend'].includes(slug)) {
		const day = now.getDay();
		const daysToFri = day <= 5 ? 5 - day : 5 - day + 7;
		const fri = new Date(now);
		fri.setDate(now.getDate() + daysToFri);
		const sun = new Date(fri);
		sun.setDate(fri.getDate() + 2);
		const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
		return `${fri.toLocaleDateString(locale, dateOpts)} \u2013 ${sun.toLocaleDateString(locale, dateOpts)}`;
	}

	if (['gratis', 'konserter', 'teater', 'utstillinger', 'mat-og-drikke'].includes(slug)) {
		const end = new Date(now);
		end.setDate(now.getDate() + 14);
		const nowStr = now.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
		const endStr = end.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
		return `${nowStr} \u2013 ${endStr}`;
	}

	return now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

async function fetchEvents(): Promise<GaariEvent[]> {
	const todayOslo = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
	const nowOslo = `${todayOslo}T00:00:00`;

	const { data, error } = await supabase
		.from('events')
		.select('id,slug,title_no,title_en,description_no,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,image_url,age_group,language,status')
		.in('status', ['approved', 'cancelled'])
		.gte('date_start', nowOslo)
		.order('date_start', { ascending: true })
		.limit(500);

	if (error) throw new Error(`Supabase query failed: ${error.message}`);
	if (!data || data.length === 0) return [];

	return data.map(e => ({
		...e,
		price: e.price === '' || e.price === null ? '' : isNaN(Number(e.price)) ? e.price : Number(e.price)
	}));
}

async function main() {
	const startTime = Date.now();
	const now = getOsloNow();
	const dateStr = toOsloDateStr(now);

	console.log(`Seed post generation — ${dateStr}\n`);

	const allEvents = await fetchEvents();
	if (allEvents.length === 0) {
		console.log('No events found. Exiting.');
		return;
	}
	console.log(`Fetched ${allEvents.length} events from Supabase\n`);

	const active = allEvents.filter(e => e.status !== 'cancelled');
	let generated = 0;

	for (const seed of SEED_COLLECTIONS) {
		const collection = getCollection(seed.slug);
		if (!collection) {
			console.log(`[skip] ${seed.slug}: collection not found`);
			continue;
		}

		const filtered = collection.filterEvents(active, now);
		if (filtered.length === 0) {
			console.log(`[skip] ${seed.slug}: 0 events`);
			continue;
		}

		// Cap per venue to avoid one source dominating the carousel
		const MAX_PER_VENUE = 1;
		// Only include events with images for seed posts
		const withImages = filtered.filter(e => e.image_url);
		const sorted = withImages.sort((a, b) => a.date_start.localeCompare(b.date_start));
		const venueCounts = new Map<string, number>();
		const topEvents: GaariEvent[] = [];
		for (const e of sorted) {
			if (topEvents.length >= MAX_CAROUSEL_EVENTS) break;
			const count = venueCounts.get(e.venue_name) ?? 0;
			if (count >= MAX_PER_VENUE) continue;
			venueCounts.set(e.venue_name, count + 1);
			topEvents.push(e);
		}

		console.log(`--- ${seed.slug} (${filtered.length} events, using ${topEvents.length}) ---`);

		const title = seed.lang === 'en' ? collection.title.en : collection.title.no;
		const collectionUrl = seed.lang === 'en'
			? `gaari.no/en/${seed.slug}?utm_source=instagram&utm_medium=social&utm_campaign=${seed.slug}`
			: `gaari.no/no/${seed.slug}?utm_source=instagram&utm_medium=social&utm_campaign=${seed.slug}`;

		const carouselEvents: CarouselEvent[] = topEvents.map(e => ({
			title: e.title_no,
			venue: e.venue_name,
			time: formatEventTime(e.date_start, seed.lang),
			category: e.category,
			imageUrl: e.image_url || undefined,
			isFree: isFreeEvent(e.price)
		}));

		// Caption uses same venue-capped selection as carousel
		const captionEvents: CaptionEvent[] = topEvents.map(e => ({
			title: e.title_no,
			venue: e.venue_name,
			date_start: e.date_start,
			category: e.category
		}));

		const dateRange = formatDateRange(now, seed.slug, seed.lang);

		try {
			const slides = await generateCarousel(
				title,
				dateRange,
				carouselEvents,
				collectionUrl,
				filtered.length,
				{ lang: seed.lang }
			);

			const caption = generateCaption(title, captionEvents, collectionUrl, seed.hashtags, seed.lang);

			// Save to disk
			const outDir = resolve(OUTPUT_DIR, seed.slug);
			mkdirSync(outDir, { recursive: true });

			for (let i = 0; i < slides.length; i++) {
				const path = resolve(outDir, `slide-${i + 1}.png`);
				writeFileSync(path, slides[i]);
			}
			writeFileSync(resolve(outDir, 'caption.txt'), caption, 'utf-8');

			console.log(`  ${slides.length} slides + caption saved to seed-posts/${seed.slug}/\n`);
			generated++;
		} catch (err: any) {
			console.error(`  FAILED: ${err.message}\n`);
		}
	}

	const durationSeconds = Math.round((Date.now() - startTime) / 1000);
	console.log(`\n=== Done: ${generated}/${SEED_COLLECTIONS.length} collections generated in ${durationSeconds}s ===`);
	console.log(`Output: scripts/social/seed-posts/`);
}

main().catch(console.error);
