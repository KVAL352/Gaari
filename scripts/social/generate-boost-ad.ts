/**
 * Generate a 5-slide carousel boost ad for Facebook.
 *
 * Strategy: evergreen content valid for a 7-day boost period — no date pills,
 * no time-sensitive copy. Hero + three category showcase slides + CTA.
 *
 * Output:
 *   - Five 1080x1080 JPGs uploaded to boost/{startDate}/slide-NN.jpg
 *   - caption.txt with the post copy + UTM-tagged link
 *
 * Usage:
 *   cd scripts && npx tsx social/generate-boost-ad.ts
 *   cd scripts && npx tsx social/generate-boost-ad.ts --start=2026-04-09
 *
 * Env vars: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config';
import { supabase } from '../lib/supabase.js';
import { renderSlide } from './image-gen.js';
import type { GaariEvent, Category } from '../../src/lib/types.js';

const START_ARG = process.argv.find(a => a.startsWith('--start='))?.split('=')[1];
const STORAGE_BUCKET = 'social-media';

const FUNKIS_RED = '#C82D2D';
const WHITE = '#FFFFFF';
const TEXT_PRIMARY = '#141414';

interface CategoryPick {
	label: string;
	categories: Category[];
	/** Venues to prefer when picking — first match wins. Falls back to any venue. */
	preferVenues?: string[];
}

// Curated venues per category — these tend to have the best photos in the
// database AND are unambiguously the right kind of venue for the label.
const CATEGORY_PICKS: CategoryPick[] = [
	{
		// Hulen, Madam Felle, Landmark and Det Akademiske Kvarter sit in the
		// uteliv side of the spectrum — kept out of the "konserter" slide.
		label: 'Konserter',
		categories: ['music'],
		preferVenues: ['USF Verftet', 'Bergen Kjøtt', 'Forum Scene', 'Ole Bull Scene', 'Grieghallen', 'Bergen Filharmoniske Orkester']
	},
	{
		// Only "pure" theatre / visual-art venues — Bergen Kunsthall and
		// Cornerteateret host release parties / concerts under culture tag, so
		// they get cropped out to avoid misleading imagery.
		label: 'Teater & kultur',
		categories: ['theatre', 'culture'],
		preferVenues: ['Den Nationale Scene', 'Det Vestnorske Teateret', 'Bergen Internasjonale Teater', 'Carte Blanche', 'Fyllingsdalen Teater', 'KODE']
	},
	{
		// Don't claim "gratis" — Akvariet etc. are paid. Family/experiences only.
		label: 'Familie & opplevelser',
		categories: ['family'],
		preferVenues: ['Akvariet i Bergen', 'Fløyen', 'Bymuseet i Bergen', 'VilVite', 'KODE']
	}
];

async function fetchCollageEvents(): Promise<GaariEvent[]> {
	// Pull a wide spread of events with images for the hero collage so the
	// background actually looks like "lots of different stuff happening".
	const categories: Category[] = ['music', 'theatre', 'culture', 'family', 'food', 'festival'];
	const picked: GaariEvent[] = [];
	const seenVenues = new Set<string>();

	for (const cat of categories) {
		const { data } = await supabase
			.from('events')
			.select('*')
			.eq('status', 'approved')
			.eq('category', cat)
			.gte('date_start', new Date().toISOString())
			.not('image_url', 'is', null)
			.order('date_start', { ascending: true })
			.limit(10);

		if (!data) continue;
		for (const e of data) {
			if (seenVenues.has(e.venue_name)) continue;
			picked.push(e as GaariEvent);
			seenVenues.add(e.venue_name);
			break;
		}
		if (picked.length >= 4) break;
	}

	return picked.slice(0, 4);
}

async function fetchEventsForCategories(pick: CategoryPick): Promise<GaariEvent | null> {
	// Step 1 — explicitly query for events at curated venues only.
	if (pick.preferVenues && pick.preferVenues.length > 0) {
		const orFilter = pick.preferVenues
			.map(v => `venue_name.ilike.%${v.replace(/'/g, "''")}%`)
			.join(',');
		const { data: curated } = await supabase
			.from('events')
			.select('*')
			.eq('status', 'approved')
			.in('category', pick.categories)
			.or(orFilter)
			.gte('date_start', new Date().toISOString())
			.not('image_url', 'is', null)
			.order('date_start', { ascending: true })
			.limit(50);
		if (curated && curated.length > 0) {
			// Walk preferVenues in priority order and return the first hit.
			for (const preferred of pick.preferVenues) {
				const match = curated.find(e =>
					(e.venue_name || '').toLowerCase().includes(preferred.toLowerCase())
				);
				if (match) return match as GaariEvent;
			}
		}
	}

	// Step 2 — fall back to any event of the matching category.
	const { data: any } = await supabase
		.from('events')
		.select('*')
		.eq('status', 'approved')
		.in('category', pick.categories)
		.gte('date_start', new Date().toISOString())
		.not('image_url', 'is', null)
		.order('date_start', { ascending: true })
		.limit(20);

	if (!any || any.length === 0) return null;
	return any[0] as GaariEvent;
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.length < 4096) return null;
		const sharp = (await import('sharp')).default;
		const normalized = await sharp(buf)
			.resize(1080, 1080, { fit: 'cover', position: 'centre' })
			.jpeg({ quality: 88 })
			.toBuffer();
		return `data:image/jpeg;base64,${normalized.toString('base64')}`;
	} catch {
		return null;
	}
}

function heroSlideMarkup(collageImages: string[]) {
	// Pad with the first image if we have fewer than 4
	const padded = [...collageImages];
	while (padded.length < 4 && padded.length > 0) padded.push(padded[0]);
	const [tl, tr, bl, br] = padded;

	const cell = (img: string | undefined) => ({
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '50%',
				height: '50%',
				backgroundColor: '#1c1c1e',
				backgroundImage: img ? `url(${img})` : 'none',
				backgroundSize: '100% 100%',
				backgroundRepeat: 'no-repeat'
			}
		}
	});

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				position: 'relative'
			},
			children: [
				// Layer 1 — 2x2 image collage as background
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexWrap: 'wrap',
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							height: '100%'
						},
						children: [cell(tl), cell(tr), cell(bl), cell(br)]
					}
				},
				// Layer 2 — full dark overlay so text remains legible against any image
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							background: 'linear-gradient(135deg, rgba(200,45,45,0.78) 0%, rgba(20,20,22,0.82) 100%)'
						}
					}
				},
				// Layer 3 — hero text centered
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							alignItems: 'center',
							justifyContent: 'center',
							padding: '0 80px',
							gap: '20px'
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '160px',
										fontFamily: 'Barlow Condensed',
										fontWeight: 700,
										color: WHITE,
										lineHeight: 1,
										letterSpacing: '-0.02em',
										textShadow: '0 4px 24px rgba(0,0,0,0.85)',
										textAlign: 'center'
									},
									children: 'Hva skjer i'
								}
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '220px',
										fontFamily: 'Barlow Condensed',
										fontWeight: 700,
										color: WHITE,
										lineHeight: 1,
										letterSpacing: '-0.02em',
										textShadow: '0 4px 24px rgba(0,0,0,0.85)',
										textAlign: 'center'
									},
									children: 'Bergen?'
								}
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										marginTop: '50px',
										backgroundColor: WHITE,
										borderRadius: '40px',
										padding: '16px 36px',
										fontSize: '36px',
										fontFamily: 'Inter',
										fontWeight: 600,
										color: TEXT_PRIMARY,
										boxShadow: '0 6px 20px rgba(0,0,0,0.5)'
									},
									children: '1500+ arrangementer · oppdatert daglig'
								}
							}
						]
					}
				}
			]
		}
	};
}

function truncate(s: string, max: number): string {
	return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…';
}

function categoryShowcaseMarkup(label: string, eventTitle: string, venue: string, imageBase64: string) {
	const displayTitle = truncate(eventTitle, 55);
	const displayVenue = truncate(venue, 60);
	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: '#1C1C1E',
				backgroundImage: `url(${imageBase64})`,
				backgroundSize: '100% 100%',
				backgroundRepeat: 'no-repeat',
				position: 'relative'
			},
			children: [
				// Bottom dark gradient — reaches further up to make room for title + venue
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							position: 'absolute',
							left: 0,
							right: 0,
							bottom: 0,
							height: '70%',
							background: 'linear-gradient(to bottom, rgba(20,20,22,0) 0%, rgba(20,20,22,0.55) 30%, rgba(20,20,22,0.95) 100%)'
						}
					}
				},
				// Bottom text block: category label + event title + venue
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							position: 'absolute',
							left: '60px',
							right: '60px',
							bottom: '60px',
							gap: '14px'
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										alignSelf: 'flex-start',
										backgroundColor: FUNKIS_RED,
										borderRadius: '40px',
										padding: '12px 28px',
										fontSize: '34px',
										fontFamily: 'Barlow Condensed',
										fontWeight: 700,
										color: WHITE,
										letterSpacing: '0.02em',
										textTransform: 'uppercase',
										boxShadow: '0 4px 18px rgba(0,0,0,0.55)'
									},
									children: label
								}
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '64px',
										fontFamily: 'Barlow Condensed',
										fontWeight: 700,
										color: WHITE,
										lineHeight: 1.05,
										letterSpacing: '-0.015em',
										textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 4px 24px rgba(0,0,0,0.85)'
									},
									children: displayTitle
								}
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '32px',
										fontFamily: 'Inter',
										fontWeight: 500,
										color: 'rgba(255,255,255,0.92)',
										lineHeight: 1.3,
										textShadow: '0 2px 12px rgba(0,0,0,0.7)'
									},
									children: displayVenue
								}
							}
						]
					}
				},
				// Top-right Gåri brand pill
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							position: 'absolute',
							top: '60px',
							right: '60px',
							backgroundColor: WHITE,
							borderRadius: '40px',
							padding: '14px 32px',
							fontSize: '36px',
							fontFamily: 'Barlow Condensed',
							fontWeight: 700,
							color: FUNKIS_RED,
							boxShadow: '0 4px 18px rgba(0,0,0,0.55)'
						},
						children: 'Gåri.no'
					}
				}
			]
		}
	};
}

function ctaSlideMarkup() {
	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: FUNKIS_RED,
				alignItems: 'center',
				justifyContent: 'center',
				padding: '0 80px'
			},
			children: [
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '40px'
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '64px',
										fontFamily: 'Inter',
										fontWeight: 600,
										color: 'rgba(255,255,255,0.92)',
										textAlign: 'center',
										lineHeight: 1.2
									},
									children: '1500+ arrangementer'
								}
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '48px',
										fontFamily: 'Inter',
										color: 'rgba(255,255,255,0.85)',
										textAlign: 'center'
									},
									children: 'Oppdatert daglig · helt gratis'
								}
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										marginTop: '40px',
										backgroundColor: WHITE,
										borderRadius: '60px',
										padding: '32px 80px',
										fontSize: '88px',
										fontFamily: 'Barlow Condensed',
										fontWeight: 700,
										color: FUNKIS_RED,
										letterSpacing: '0.02em'
									},
									children: 'gaari.no'
								}
							}
						]
					}
				}
			]
		}
	};
}

function todayDateStr(): string {
	return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
}

async function main() {
	const startDate = START_ARG || todayDateStr();
	console.log(`Generating boost ad for ${startDate}\n`);

	// Slide 1: Hero with 2x2 collage of real event images behind the text
	console.log('Fetching collage events for hero...');
	const collageEvents = await fetchCollageEvents();
	console.log(`  ${collageEvents.length} events for hero collage`);
	const collageImages: string[] = [];
	for (const e of collageEvents) {
		if (!e.image_url) continue;
		const img = await fetchImageAsBase64(e.image_url);
		if (img) collageImages.push(img);
	}
	console.log(`  ${collageImages.length} collage images fetched`);
	console.log('Rendering hero slide...');
	const heroBuffer = await renderSlide(heroSlideMarkup(collageImages));

	// Slides 2-4: Category showcases
	const categorySlides: { label: string; buffer: Buffer }[] = [];
	for (const pick of CATEGORY_PICKS) {
		console.log(`Picking event for "${pick.label}" (${pick.categories.join(', ')})...`);
		const event = await fetchEventsForCategories(pick);
		if (!event || !event.image_url) {
			console.warn(`  No event with image for ${pick.label}, skipping`);
			continue;
		}
		console.log(`  Selected: ${event.title_no} (${event.venue_name})`);
		const imageBase64 = await fetchImageAsBase64(event.image_url);
		if (!imageBase64) {
			console.warn(`  Image fetch failed for ${event.title_no}, skipping`);
			continue;
		}
		const slideBuffer = await renderSlide(
			categoryShowcaseMarkup(pick.label, event.title_no, event.venue_name, imageBase64)
		);
		categorySlides.push({ label: pick.label, buffer: slideBuffer });
	}

	// Slide 5: CTA
	console.log('Rendering CTA slide...');
	const ctaBuffer = await renderSlide(ctaSlideMarkup());

	// Convert PNGs to JPEG and upload
	const sharp = (await import('sharp')).default;
	const allSlides: { name: string; buffer: Buffer }[] = [
		{ name: '01-hero.jpg', buffer: heroBuffer },
		...categorySlides.map((s, i) => ({ name: `${String(i + 2).padStart(2, '0')}-${s.label.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-+|-+$/g, '')}.jpg`, buffer: s.buffer })),
		{ name: `${String(categorySlides.length + 2).padStart(2, '0')}-cta.jpg`, buffer: ctaBuffer }
	];

	console.log(`\nUploading ${allSlides.length} slides to boost/${startDate}/...`);
	const uploadedUrls: string[] = [];
	for (const slide of allSlides) {
		const jpegBuffer = await sharp(slide.buffer).jpeg({ quality: 90 }).toBuffer();
		const path = `boost/${startDate}/${slide.name}`;
		const { error } = await supabase.storage
			.from(STORAGE_BUCKET)
			.upload(path, jpegBuffer, { contentType: 'image/jpeg', upsert: true });
		if (error) {
			console.error(`  Upload failed for ${slide.name}: ${error.message}`);
			continue;
		}
		const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
		uploadedUrls.push(data.publicUrl);
		console.log(`  ${slide.name} → ${data.publicUrl}`);
	}

	// Generate caption + UTM-tagged link
	const utmLink = `https://gaari.no?utm_source=facebook&utm_medium=cpc&utm_campaign=boost-${startDate}&utm_content=hero`;
	const caption = `Hva skjer i Bergen denne uka?

Konserter på Hulen, utstilling på KODE, helgens festival eller en stille kveld med teater. Gåri samler over 1500 arrangementer i Bergen på ett sted, oppdatert daglig fra 55 lokale kilder. Helt gratis.

Se hele programmet: ${utmLink}

#bergen #bergenby #hvaskjeribergen #bergenkultur #bergenliv #bergensentrum`;

	// Upload caption file
	const captionPath = `boost/${startDate}/caption.txt`;
	const { error: capErr } = await supabase.storage
		.from(STORAGE_BUCKET)
		.upload(captionPath, Buffer.from(caption, 'utf-8'), {
			contentType: 'text/plain; charset=utf-8',
			upsert: true
		});
	if (capErr) console.warn(`  Caption upload failed: ${capErr.message}`);

	console.log(`\nDone. Boost ad ready at boost/${startDate}/`);
	console.log(`\n--- Caption ---\n${caption}`);
	console.log(`\n--- Link ---\n${utmLink}`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
