/**
 * Generate Easter carousel images for manual posting.
 * Usage: cd scripts && npx tsx social/generate-easter.ts
 * Output: scripts/social/test-output/easter/
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { supabase } from '../lib/supabase.js';
import { getOsloNow } from '../../src/lib/event-filters.js';
import { getCollection } from '../../src/lib/collections.js';
import { formatEventTime, isFreeEvent } from '../../src/lib/utils.js';
import { generateCarousel, type CarouselEvent } from './image-gen.js';
import type { GaariEvent } from '../../src/lib/types.js';

const OUTPUT_DIR = resolve(import.meta.dirname, 'test-output', 'easter');
const MAX_PER_VENUE = 1;
const MAX_EVENTS = 8;

async function main() {
	mkdirSync(OUTPUT_DIR, { recursive: true });

	const now = getOsloNow();
	const collection = getCollection('easter-bergen');
	if (!collection) throw new Error('easter-bergen collection not found');

	// Fetch events
	const todayOslo = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
	const { data, error } = await supabase
		.from('events')
		.select('id,slug,title_no,title_en,description_no,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,image_url,age_group,language,status')
		.in('status', ['approved', 'cancelled'])
		.gte('date_start', `${todayOslo}T00:00:00`)
		.order('date_start', { ascending: true })
		.limit(500);

	if (error) throw new Error(`Supabase: ${error.message}`);
	if (!data || data.length === 0) throw new Error('No events found');

	const events = data.map(e => ({
		...e,
		price: e.price === '' || e.price === null ? '' : isNaN(Number(e.price)) ? e.price : Number(e.price)
	})) as GaariEvent[];

	const filtered = collection.filterEvents(events, now);
	console.log(`${filtered.length} Easter events found`);

	// Pick top events (1 per venue)
	const sorted = filtered.sort((a, b) => a.date_start.localeCompare(b.date_start));
	const venueCounts = new Map<string, number>();
	const topEvents: GaariEvent[] = [];
	for (const e of sorted) {
		if (topEvents.length >= MAX_EVENTS) break;
		const count = venueCounts.get(e.venue_name) ?? 0;
		if (count >= MAX_PER_VENUE) continue;
		venueCounts.set(e.venue_name, count + 1);
		topEvents.push(e);
	}

	console.log(`Using ${topEvents.length} events for carousel:`);
	for (const e of topEvents) {
		console.log(`  ${e.title_no} @ ${e.venue_name} (${e.date_start.slice(0, 10)})`);
	}

	const carouselEvents: CarouselEvent[] = topEvents.map(e => ({
		title: e.title_en || e.title_no,
		venue: e.venue_name,
		time: formatEventTime(e.date_start, 'en'),
		category: e.category,
		imageUrl: e.image_url || undefined,
		isFree: isFreeEvent(e.price)
	}));

	const lang = process.argv.includes('--no') ? 'no' as const : 'en' as const;
	const title = lang === 'no' ? 'Påske i Bergen 2026' : 'Easter in Bergen 2026';
	const outDir = resolve(OUTPUT_DIR, lang === 'no' ? 'no' : '.');

	mkdirSync(outDir, { recursive: true });

	const slides = await generateCarousel(title, carouselEvents);

	for (let i = 0; i < slides.length; i++) {
		const path = resolve(outDir, `slide-${i + 1}.png`);
		writeFileSync(path, slides[i]);
		console.log(`Wrote ${path} (${Math.round(slides[i].length / 1024)} KB)`);
	}

	console.log(`\nDone! ${slides.length} slides in ${outDir}`);
}

main().catch(console.error);
