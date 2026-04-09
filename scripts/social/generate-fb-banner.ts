/**
 * Generate Facebook page cover banner — image collage matching the
 * for-arrangører hero (12 diverse upcoming event images, dark Funkis-iron
 * background, white Gåri title overlay).
 *
 * Output: 1702×630 PNG (2× of FB's recommended 851×315 cover size).
 *
 * Usage: cd scripts && npx tsx social/generate-fb-banner.ts
 * Output file: scripts/social/test-output/fb-banner/banner.png
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { supabase } from '../lib/supabase.js';
import { loadFonts } from './image-gen.js';

const OUTPUT_DIR = resolve(import.meta.dirname, 'test-output', 'fb-banner');

// FB page cover: recommended 851×315. We render at 2× for crisp display.
const WIDTH = 1702;
const HEIGHT = 630;

const COLS = 6;
const ROWS = 2;
const CELL_W = Math.floor(WIDTH / COLS); // 283
const CELL_H = Math.floor(HEIGHT / ROWS); // 315

const FUNKIS_IRON = '#1C1C1E';
const FUNKIS_RED = '#C82D2D';

async function fetchImage(url: string): Promise<string | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);
		const res = await fetch(url, { signal: controller.signal });
		clearTimeout(timeout);
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.length < 4096) return null;
		const normalized = await sharp(buf)
			.resize(CELL_W, CELL_H, { fit: 'cover', position: 'centre' })
			.jpeg({ quality: 80 })
			.toBuffer();
		return `data:image/jpeg;base64,${normalized.toString('base64')}`;
	} catch {
		return null;
	}
}

async function main() {
	mkdirSync(OUTPUT_DIR, { recursive: true });

	// Fetch upcoming events with images, spread across categories
	const { data, error } = await supabase
		.from('events')
		.select('image_url, category, venue_name')
		.eq('status', 'approved')
		.not('image_url', 'is', null)
		.gte('date_start', new Date().toISOString())
		.order('date_start', { ascending: true })
		.limit(200);

	if (error) throw new Error(`Supabase: ${error.message}`);
	if (!data || data.length === 0) throw new Error('No events with images found');

	// Pick 12 diverse images (one per category first, then fill)
	const seenCat = new Set<string>();
	const seenVenue = new Set<string>();
	const picks: string[] = [];
	for (const e of data) {
		if (picks.length >= 12) break;
		if (!e.image_url || seenCat.has(e.category) || seenVenue.has(e.venue_name)) continue;
		seenCat.add(e.category);
		seenVenue.add(e.venue_name);
		picks.push(e.image_url);
	}
	for (const e of data) {
		if (picks.length >= 12) break;
		if (!e.image_url || picks.includes(e.image_url) || seenVenue.has(e.venue_name)) continue;
		seenVenue.add(e.venue_name);
		picks.push(e.image_url);
	}

	console.log(`Fetching ${picks.length} images...`);
	const images = await Promise.all(picks.map(fetchImage));
	const validImages = images.filter((i): i is string => i !== null);
	console.log(`${validImages.length} images loaded successfully`);

	if (validImages.length < 8) {
		throw new Error(`Only ${validImages.length} images loaded — need at least 8`);
	}

	// Build 2 rows × 6 cols flex layout
	const cells = [];
	for (let i = 0; i < COLS * ROWS; i++) {
		const img = validImages[i % validImages.length];
		cells.push({
			type: 'div',
			props: {
				style: {
					display: 'flex',
					width: `${CELL_W}px`,
					height: `${CELL_H}px`,
					backgroundImage: `url(${img})`,
					backgroundSize: '100% 100%',
					backgroundRepeat: 'no-repeat'
				}
			}
		});
	}

	const rows = [];
	for (let r = 0; r < ROWS; r++) {
		rows.push({
			type: 'div',
			props: {
				style: {
					display: 'flex',
					flexDirection: 'row',
					width: '100%',
					height: `${CELL_H}px`
				},
				children: cells.slice(r * COLS, (r + 1) * COLS)
			}
		});
	}

	const markup = {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				position: 'relative',
				width: `${WIDTH}px`,
				height: `${HEIGHT}px`,
				backgroundColor: FUNKIS_IRON
			},
			children: [
				// Image grid layer (low opacity, like for-arrangører hero)
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							height: '100%',
							opacity: 0.4
						},
						children: rows
					}
				},
				// Dark vignette overlay for text legibility
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							height: '100%',
							backgroundImage:
								'linear-gradient(90deg, rgba(28,28,30,0.85) 0%, rgba(28,28,30,0.55) 50%, rgba(28,28,30,0.85) 100%)'
						}
					}
				},
				// Centered text block
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							height: '100%'
						},
						children: [
							// Red accent bar
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										width: '80px',
										height: '6px',
										backgroundColor: FUNKIS_RED,
										marginBottom: '24px'
									}
								}
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontFamily: 'Barlow Condensed',
										fontSize: '120px',
										fontWeight: 700,
										color: '#FFFFFF',
										letterSpacing: '-2px',
										lineHeight: 1
									},
									children: 'Hva skjer i Bergen'
								}
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontFamily: 'Inter',
										fontSize: '32px',
										fontWeight: 400,
										color: '#FFFFFF',
										marginTop: '20px',
										letterSpacing: '4px',
										textTransform: 'uppercase'
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

	console.log('Rendering banner...');
	const fonts = loadFonts();
	const svg = await satori(markup, { width: WIDTH, height: HEIGHT, fonts });
	const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();

	const outPath = resolve(OUTPUT_DIR, 'banner.png');
	writeFileSync(outPath, png);
	console.log(`Wrote ${outPath} (${Math.round(png.length / 1024)} KB)`);
	console.log(`Dimensions: ${WIDTH}×${HEIGHT} (2× of FB's 851×315 recommended cover)`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
