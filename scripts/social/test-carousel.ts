/**
 * Generate a test carousel locally with dummy data.
 * Usage: cd scripts && npx tsx social/test-carousel.ts
 * Output: scripts/social/test-output/
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { generateCarousel, type CarouselEvent } from './image-gen.js';
import { generateCaption, type CaptionEvent } from './caption-gen.js';

const OUTPUT_DIR = resolve(import.meta.dirname, 'test-output');

// Use real event images for testing
const DUMMY_EVENTS: CarouselEvent[] = [
	{
		title: 'Bergen Filharmoniske Orkester',
		venue: 'Grieghallen',
		time: '19:00',
		category: 'music',
		imageUrl: 'https://www.grieghallen.no/media/2375/bfo_dsc8816-photo-oddleiv-apneseth.jpg'
	},
	{
		title: 'Hedda Gabler',
		venue: 'Den Nationale Scene',
		time: '19:30',
		category: 'theatre',
		imageUrl: 'https://www.dns.no/media/4lyfhgqk/hedda-gabler-dns-2024-foto-magnus-skrede-7269.jpg'
	},
	{
		title: 'Familiesøndag på KODE',
		venue: 'KODE 1',
		time: '11:00',
		category: 'family',
		imageUrl: 'https://images.squarespace-cdn.com/content/v1/5e0c6e4b28fb3d29f2ef1083/1580130099058-0X7FRCBCBYGFUJH00NPB/KODE+Bergen.jpg',
		isFree: true
	},
	{
		title: 'Sjømat og naturvin',
		venue: 'Colonialen',
		time: '18:00',
		category: 'food',
		imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
	},
	{
		title: 'Jazz på Nattjazz',
		venue: 'USF Verftet',
		time: '21:00',
		category: 'music',
		imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800'
	},
	{
		title: 'Omvisning i Bergenhus festning',
		venue: 'Bergenhus festning',
		time: '13:00',
		category: 'tours',
		imageUrl: 'https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=800',
		isFree: true
	}
];

const CAPTION_EVENTS: CaptionEvent[] = DUMMY_EVENTS.map(e => ({
	title: e.title,
	venue: e.venue,
	date_start: '2026-04-03T' + e.time + ':00+02:00',
	category: e.category
}));

async function main() {
	mkdirSync(OUTPUT_DIR, { recursive: true });

	console.log('Generating test carousel...');

	const slides = await generateCarousel(
		'Denne helgen i Bergen',
		'fredag 3. apr. \u2013 søndag 5. apr.',
		DUMMY_EVENTS,
		'gaari.no/no/denne-helgen',
		23
	);

	for (let i = 0; i < slides.length; i++) {
		const path = resolve(OUTPUT_DIR, `slide-${i + 1}.png`);
		writeFileSync(path, slides[i]);
		console.log(`  Wrote ${path} (${Math.round(slides[i].length / 1024)} KB)`);
	}

	const caption = generateCaption(
		'Denne helgen i Bergen',
		CAPTION_EVENTS,
		'gaari.no/no/denne-helgen',
		['#bergen', '#bergenby', '#hvaskjer', '#hvaskjeribergen', '#helgibergen'],
		'no'
	);

	const captionPath = resolve(OUTPUT_DIR, 'caption.txt');
	writeFileSync(captionPath, caption, 'utf-8');
	console.log(`  Wrote ${captionPath}`);
	console.log('\nCaption preview:\n');
	console.log(caption);
}

main().catch(console.error);
