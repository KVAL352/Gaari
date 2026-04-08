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
}

const CATEGORY_PICKS: CategoryPick[] = [
	{ label: 'Konserter', categories: ['music'] },
	{ label: 'Teater & kultur', categories: ['theatre', 'culture'] },
	{ label: 'Familie · uteliv · gratis', categories: ['family', 'nightlife'] }
];

async function fetchEventsForCategories(categories: Category[]): Promise<GaariEvent | null> {
	const { data } = await supabase
		.from('events')
		.select('*')
		.eq('status', 'approved')
		.in('category', categories)
		.gte('date_start', new Date().toISOString())
		.not('image_url', 'is', null)
		.order('date_start', { ascending: true })
		.limit(20);

	if (!data || data.length === 0) return null;
	return data[0] as GaariEvent;
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

function heroSlideMarkup() {
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
							gap: '24px'
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '180px',
										fontFamily: 'Barlow Condensed',
										fontWeight: 700,
										color: WHITE,
										lineHeight: 1,
										letterSpacing: '-0.02em',
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
										fontSize: '36px',
										fontFamily: 'Inter',
										color: 'rgba(255,255,255,0.9)',
										marginTop: '40px',
										textAlign: 'center'
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

function categoryShowcaseMarkup(label: string, imageBase64: string) {
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
				// Bottom dark gradient for text legibility
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							position: 'absolute',
							left: 0,
							right: 0,
							bottom: 0,
							height: '60%',
							background: 'linear-gradient(to bottom, rgba(20,20,22,0) 0%, rgba(20,20,22,0.55) 35%, rgba(20,20,22,0.92) 100%)'
						}
					}
				},
				// Big label at bottom
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							position: 'absolute',
							left: '60px',
							right: '60px',
							bottom: '80px',
							fontSize: '110px',
							fontFamily: 'Barlow Condensed',
							fontWeight: 700,
							color: WHITE,
							lineHeight: 1.05,
							letterSpacing: '-0.015em',
							textShadow: '0 4px 24px rgba(0,0,0,0.7)'
						},
						children: label
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

	// Slide 1: Hero
	console.log('Rendering hero slide...');
	const heroBuffer = await renderSlide(heroSlideMarkup());

	// Slides 2-4: Category showcases
	const categorySlides: { label: string; buffer: Buffer }[] = [];
	for (const pick of CATEGORY_PICKS) {
		console.log(`Picking event for "${pick.label}" (${pick.categories.join(', ')})...`);
		const event = await fetchEventsForCategories(pick.categories);
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
		const slideBuffer = await renderSlide(categoryShowcaseMarkup(pick.label, imageBase64));
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
