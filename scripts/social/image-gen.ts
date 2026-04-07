import satori, { type Font } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Category } from '../../src/lib/types.js';

// ── Image fetching ──

/** Image content-types Satori can reliably decode. */
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

/** Verify image format from magic bytes — protects against mislabeled / corrupt files. */
function detectImageType(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | null {
	if (buf.length < 12) return null;
	// JPEG: FF D8 FF
	if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
	// PNG: 89 50 4E 47 0D 0A 1A 0A
	if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
	// GIF: 47 49 46 38 (37|39) 61
	if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
	// WebP: "RIFF" .... "WEBP"
	if (
		buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
		buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
	) return 'image/webp';
	return null;
}

/**
 * Target dimensions for normalized event images on 9:16 story/reel slides.
 * Story canvas is 1080×1920 with a 24px category-color frame on every side,
 * giving an inner full-bleed image area of 1032×1872.
 */
const TARGET_IMAGE_W = 1032;
const TARGET_IMAGE_H = 1872;

async function fetchImageAsBase64(url: string): Promise<string | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);
		const res = await fetch(url, { signal: controller.signal });
		clearTimeout(timeout);
		if (!res.ok) return null;
		const headerType = (res.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
		// Early reject formats Satori can't decode (SVG, AVIF, etc.) when header is honest
		if (headerType && !ACCEPTED_IMAGE_TYPES.includes(headerType)) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		// Reject tiny/empty payloads (placeholders, broken images)
		if (buf.length < 4096) return null;
		// Verify actual format from magic bytes — header may lie
		const realType = detectImageType(buf);
		if (!realType) return null;
		// Normalize to exact target dimensions via smart-crop so Satori never has to scale.
		// This eliminates aspect-ratio surprises (panoramic/portrait crops, off-center subjects).
		try {
			const sharp = (await import('sharp')).default;
			const normalized = await sharp(buf)
				.resize(TARGET_IMAGE_W, TARGET_IMAGE_H, {
					fit: 'cover',
					position: 'centre'
				})
				.jpeg({ quality: 85 })
				.toBuffer();
			return `data:image/jpeg;base64,${normalized.toString('base64')}`;
		} catch {
			// If sharp fails (corrupt input, etc.), drop the image rather than risk a bad slide.
			return null;
		}
	} catch {
		return null;
	}
}

// ── Design tokens (matching og-image.ts + app.css) ──

const FUNKIS_RED = '#C82D2D';
const FREE_GREEN = '#1A6B35';
const WHITE = '#FFFFFF';
const TEXT_PRIMARY = '#141414';
const TEXT_SECONDARY = '#4D4D4D';
const TEXT_MUTED = '#737373';

const CATEGORY_COLORS: Record<Category, string> = {
	music: '#AECDE8',
	culture: '#C5B8D9',
	theatre: '#E8B8C2',
	family: '#F5D49A',
	food: '#E8C4A0',
	festival: '#F5E0A0',
	sports: '#A8D4B8',
	nightlife: '#9BAED4',
	workshop: '#D4B89A',
	student: '#B8D4A8',
	tours: '#7FB8B8'
};

const CATEGORY_LABELS: Record<Category, string> = {
	music: 'Musikk',
	culture: 'Kultur',
	theatre: 'Teater',
	family: 'Familie',
	food: 'Mat & Drikke',
	festival: 'Festival',
	sports: 'Sport',
	nightlife: 'Uteliv',
	workshop: 'Workshop',
	student: 'Student',
	tours: 'Turer'
};

const WIDTH = 1080;
const HEIGHT = 1080;

// Story dimensions (9:16 vertical)
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

// ── Font loading ──

let fontsCache: Font[] | null = null;

export function loadFonts(): Font[] {
	if (fontsCache) return fontsCache;

	const fontsDir = resolve(import.meta.dirname, '../../static/fonts');
	const interData = readFileSync(resolve(fontsDir, 'Inter-Regular.ttf'));
	const barlowData = readFileSync(resolve(fontsDir, 'BarlowCondensed-Bold.ttf'));

	fontsCache = [
		{ name: 'Inter', data: interData, weight: 400, style: 'normal' as const },
		{ name: 'Barlow Condensed', data: barlowData, weight: 700, style: 'normal' as const }
	];

	return fontsCache;
}

// ── Rendering ──

async function renderSlide(markup: Record<string, unknown>): Promise<Buffer> {
	const fonts = loadFonts();

	const svg = await satori(markup, {
		width: WIDTH,
		height: HEIGHT,
		fonts
	});

	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: WIDTH }
	});

	return Buffer.from(resvg.render().asPng());
}

async function renderStorySlide(markup: Record<string, unknown>): Promise<Buffer> {
	const fonts = loadFonts();

	const svg = await satori(markup, {
		width: STORY_WIDTH,
		height: STORY_HEIGHT,
		fonts
	});

	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: STORY_WIDTH }
	});

	return Buffer.from(resvg.render().asPng());
}

// ── Helper ──

function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	const trimmed = text.slice(0, maxLen);
	const lastSpace = trimmed.lastIndexOf(' ');
	if (lastSpace > maxLen * 0.5) {
		return trimmed.slice(0, lastSpace) + '\u2026';
	}
	return trimmed.trimEnd() + '\u2026';
}

// ── Slides 1–N: Event cards ──

const FRAME = 12; // Red frame thickness in px

function eventSlideWithImage(
	title: string,
	venue: string,
	time: string,
	category: Category,
	imageBase64: string,
	collectionLabel?: string,
	isFree?: boolean
) {
	const catColor = CATEGORY_COLORS[category] || '#D4D1CA';
	const catLabel = CATEGORY_LABELS[category] || category;
	const displayTitle = truncate(title, 45);
	const venueTime = time ? `${venue}  \u00b7  kl. ${time}` : venue;

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: catColor,
				padding: `${FRAME}px`,
				position: 'relative'
			},
			children: [
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							width: '100%',
							height: '100%',
							backgroundColor: '#1C1C1E',
							borderRadius: '8px',
							overflow: 'hidden',
							position: 'relative'
						},
						children: [
							// Top: event image (~62% of height)
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										position: 'relative',
										width: '100%',
										height: '650px',
										overflow: 'hidden'
									},
									children: [
										{
											type: 'img',
											props: {
												src: imageBase64,
												style: {
													position: 'absolute',
													top: 0,
													left: 0,
													width: '100%',
													height: '100%',
													objectFit: 'cover'
												}
											}
										},
										// Gradient fade at bottom of image
										{
											type: 'div',
											props: {
												style: {
													position: 'absolute',
													left: 0,
													right: 0,
													bottom: 0,
													height: '200px',
													background: 'linear-gradient(to bottom, rgba(28,28,30,0), rgba(28,28,30,1))'
												}
											}
										},
										// Category pill (top-left) + optional collection label (top-right)
										{
											type: 'div',
											props: {
												style: {
													position: 'absolute',
													top: '28px',
													left: '28px',
													right: '28px',
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'flex-start'
												},
												children: [
													{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																backgroundColor: catColor,
																borderRadius: '32px',
																padding: '12px 32px',
																fontSize: '30px',
																fontFamily: 'Inter',
																color: TEXT_PRIMARY,
																boxShadow: '0 2px 12px rgba(0,0,0,0.35)'
															},
															children: catLabel
														}
													},
													...(collectionLabel ? [{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																backgroundColor: 'rgba(0,0,0,0.6)',
																borderRadius: '32px',
																padding: '12px 32px',
																fontSize: '30px',
																fontFamily: 'Inter',
																color: WHITE,
																boxShadow: '0 2px 12px rgba(0,0,0,0.35)'
															},
															children: collectionLabel
														}
													}] : [])
												]
											}
										}
									]
								}
							},
							// Bottom: event info
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										flexDirection: 'column',
										flex: 1,
										padding: '0 40px 32px',
										justifyContent: 'flex-end',
										gap: '16px'
									},
									children: [
										// Event details
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													flexDirection: 'column',
													gap: '12px'
												},
												children: [
													{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																fontSize: '56px',
																fontFamily: 'Barlow Condensed',
																color: WHITE,
																lineHeight: 1.1,
																letterSpacing: '-0.01em'
															},
															children: displayTitle
														}
													},
													{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																fontSize: '30px',
																fontFamily: 'Inter',
																color: 'rgba(255,255,255,0.85)',
																lineHeight: 1.3
															},
															children: venueTime
														}
													},
													...(isFree ? [{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																backgroundColor: FREE_GREEN,
																borderRadius: '24px',
																padding: '8px 24px',
																fontSize: '26px',
																fontFamily: 'Inter',
																color: WHITE,
																marginLeft: '-4px',
																alignSelf: 'flex-start'
															},
															children: 'Trolig gratis'
														}
													}] : [])
												]
											}
										},
										// Branding
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													justifyContent: 'flex-end'
												},
												children: [
													{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																fontSize: '28px',
																fontFamily: 'Barlow Condensed',
																color: FUNKIS_RED
															},
															children: 'G\u00e5ri.no'
														}
													}
												]
											}
										}
									]
								}
							}
						]
					}
				}
			]
		}
	};
}

// ── Public API ──

export interface CarouselEvent {
	title: string;
	venue: string;
	time: string;
	category: Category;
	imageUrl?: string;
	isFree?: boolean;
	/** Prominent date label shown on story/reel slides (e.g. "I DAG · lør 11. apr"). */
	dateLabel?: string;
}

export interface CarouselOptions {
	/** Language for slide text (used by stories/reels). */
	lang?: 'no' | 'en';
}

export async function generateCarousel(
	collectionTitle: string,
	events: CarouselEvent[]
): Promise<Buffer[]> {
	const slides: Buffer[] = [];

	// Pre-fetch all event images in parallel
	console.log(`  Fetching ${events.filter(e => e.imageUrl).length} event images...`);
	const imageResults = await Promise.all(
		events.map(e => e.imageUrl ? fetchImageAsBase64(e.imageUrl) : Promise.resolve(null))
	);
	const fetched = imageResults.filter(Boolean).length;
	console.log(`  Fetched ${fetched}/${events.length} images`);

	// Sort: events with images first for visual impact
	const indexed = events.map((e, i) => ({ event: e, image: imageResults[i] }));
	indexed.sort((a, b) => {
		if (a.image && !b.image) return -1;
		if (!a.image && b.image) return 1;
		return 0;
	});

	// Carousel = only real event slides. The collection label appears on the
	// first slide so viewers know what they're looking at; the caption above the
	// post does the rest of the framing — no separate hook or CTA filler slides.
	let isFirst = true;
	for (const { event, image } of indexed) {
		const label = isFirst ? collectionTitle : undefined;
		try {
			if (image) {
				const markup = eventSlideWithImage(event.title, event.venue, event.time, event.category, image, label, event.isFree);
				slides.push(await renderSlide(markup));
				isFirst = false;
			} else {
				console.log(`  [skip] "${event.title}" — no image`);
			}
		} catch (err: any) {
			console.log(`  [skip] "${event.title}" — slide render failed (${err.message})`)
		}
	}

	return slides;
}

// ── Story slides (9:16 vertical format) ──
//
// Layout architecture (1080×1920 canvas):
//   ┌─────────────────────┐ 0
//   │ catColor frame 24px │
//   │ ┌─────────────────┐ │ 24
//   │ │  IG safe top    │ │ 220 (top 220px hidden by IG handle/nav)
//   │ │ [CAT]    [DATE] │ │ ~250  ← pills row, just below IG safe
//   │ │                 │ │
//   │ │   (image)       │ │
//   │ │                 │ │
//   │ │   gradient      │ │
//   │ │   ───── fade    │ │
//   │ │   GRATIS        │ │ ~1200
//   │ │   TITLE         │ │ ~1250  ← critical content stays above
//   │ │   venue · time  │ │ ~1380     TikTok 480px bottom safe (=1440)
//   │ │                 │ │
//   │ │ collection · Gn │ │ ~1820  ← visible on IG (~280 bottom safe),
//   │ └─────────────────┘ │            hidden on TikTok (acceptable)
//   └─────────────────────┘ 1920
const STORY_FRAME = 24;

function storyEventSlideMarkup(
	title: string,
	venue: string,
	time: string,
	category: Category,
	imageBase64: string,
	collectionTitle: string,
	isFree?: boolean,
	dateLabel?: string
) {
	const catColor = CATEGORY_COLORS[category] || '#D4D1CA';
	const catLabel = CATEGORY_LABELS[category] || category;
	// Truncate aggressively so the huge 84px title fits 2-3 lines comfortably.
	const displayTitle = truncate(title, 42);
	const venueTime = time ? `${venue}  \u00b7  kl. ${time}` : venue;
	const isUrgentDate = /^(I DAG|I MORGEN|TODAY|TOMORROW)$/i.test(dateLabel || '');

	// Coordinates relative to the inner (post-frame) area of 1032×1872.
	// Convert canvas safe-zones to inner-relative offsets:
	//   IG top safe ~220px → inner top: 220 - 24 = 196px
	//   TikTok bottom safe ~480px → inner bottom: 480 - 24 = 456px
	const INNER_PAD_X = 48;
	const PILLS_TOP = 196;
	const TEXT_BOTTOM = 470;     // critical content above TikTok UI
	const BRANDING_BOTTOM = 36;  // IG-only zone

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: catColor,
				padding: `${STORY_FRAME}px`
			},
			children: [
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							position: 'relative',
							width: '100%',
							height: '100%',
							backgroundColor: '#1C1C1E',
							borderRadius: '12px',
							overflow: 'hidden',
							backgroundImage: `url(${imageBase64})`,
							backgroundSize: '100% 100%',
							backgroundRepeat: 'no-repeat'
						},
						children: [
							// Layer 1 — bottom-half dark gradient for text legibility over any image
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
										background: 'linear-gradient(to bottom, rgba(20,20,22,0), rgba(20,20,22,0.55) 35%, rgba(20,20,22,0.92) 100%)'
									}
								}
							},
							// Layer 2 — pills row (category + date) just below IG handle safe zone
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										position: 'absolute',
										top: `${PILLS_TOP}px`,
										left: `${INNER_PAD_X}px`,
										right: `${INNER_PAD_X}px`,
										justifyContent: 'space-between',
										alignItems: 'flex-start'
									},
									children: [
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													backgroundColor: catColor,
													borderRadius: '40px',
													padding: '18px 40px',
													fontSize: '44px',
													fontFamily: 'Barlow Condensed',
													fontWeight: 700,
													color: TEXT_PRIMARY,
													letterSpacing: '0.02em',
													boxShadow: '0 4px 18px rgba(0,0,0,0.55)',
													textTransform: 'uppercase'
												},
												children: catLabel
											}
										},
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													backgroundColor: isUrgentDate ? FUNKIS_RED : WHITE,
													borderRadius: '40px',
													padding: '18px 40px',
													fontSize: '44px',
													fontFamily: 'Barlow Condensed',
													fontWeight: 700,
													color: isUrgentDate ? WHITE : TEXT_PRIMARY,
													letterSpacing: '0.02em',
													boxShadow: '0 4px 18px rgba(0,0,0,0.55)',
													textTransform: 'uppercase'
												},
												children: dateLabel || ''
											}
										}
									]
								}
							},
							// Layer 3 — title + venue/time + free pill, anchored above TikTok UI
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										flexDirection: 'column',
										position: 'absolute',
										left: `${INNER_PAD_X}px`,
										right: `${INNER_PAD_X}px`,
										bottom: `${TEXT_BOTTOM}px`,
										gap: '18px'
									},
									children: [
										{
											type: 'div',
											props: {
												style: {
													display: isFree ? 'flex' : 'none',
													backgroundColor: FREE_GREEN,
													borderRadius: '32px',
													padding: '12px 32px',
													fontSize: '32px',
													fontFamily: 'Inter',
													fontWeight: 600,
													color: WHITE,
													alignSelf: 'flex-start',
													boxShadow: '0 4px 14px rgba(0,0,0,0.45)'
												},
												children: 'Trolig gratis'
											}
										},
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '88px',
													fontFamily: 'Barlow Condensed',
													fontWeight: 700,
													color: WHITE,
													lineHeight: 1.02,
													letterSpacing: '-0.015em',
													textShadow: '0 4px 24px rgba(0,0,0,0.6)'
												},
												children: displayTitle
											}
										},
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '38px',
													fontFamily: 'Inter',
													fontWeight: 500,
													color: 'rgba(255,255,255,0.92)',
													lineHeight: 1.3,
													textShadow: '0 2px 12px rgba(0,0,0,0.6)'
												},
												children: venueTime
											}
										}
									]
								}
							},
							// Layer 4 — branding (visible on IG only, hidden by TikTok UI). Acceptable: outro slide repeats this.
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										position: 'absolute',
										left: `${INNER_PAD_X}px`,
										right: `${INNER_PAD_X}px`,
										bottom: `${BRANDING_BOTTOM}px`,
										justifyContent: 'space-between',
										alignItems: 'flex-end'
									},
									children: [
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '28px',
													fontFamily: 'Inter',
													color: 'rgba(255,255,255,0.6)'
												},
												children: collectionTitle
											}
										},
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '40px',
													fontFamily: 'Barlow Condensed',
													fontWeight: 700,
													color: WHITE
												},
												children: 'G\u00e5ri.no'
											}
										}
									]
								}
							}
						]
					}
				}
			]
		}
	};
}

/** Generate 9:16 story images from events (max 4 stories per collection) */
export async function generateStories(
	collectionTitle: string,
	events: CarouselEvent[],
	options?: CarouselOptions
): Promise<Buffer[]> {
	const MAX_STORIES = 4;
	const stories: Buffer[] = [];

	// Only events with images
	const withImages = events.filter(e => e.imageUrl);
	if (withImages.length === 0) return stories;

	// Pre-fetch images
	const toFetch = withImages.slice(0, MAX_STORIES);
	console.log(`  Fetching ${toFetch.length} story images...`);
	const imageResults = await Promise.all(
		toFetch.map(e => fetchImageAsBase64(e.imageUrl!))
	);

	for (let i = 0; i < toFetch.length; i++) {
		const image = imageResults[i];
		const event = toFetch[i];
		if (!image) {
			console.log(`  [skip] Story "${event.title}" — image fetch failed or too small`);
			continue;
		}

		try {
			const markup = storyEventSlideMarkup(
				event.title,
				event.venue,
				event.time,
				event.category,
				image,
				collectionTitle,
				event.isFree,
				event.dateLabel
			);
			stories.push(await renderStorySlide(markup));
		} catch (err: any) {
			console.log(`  [skip] Story "${event.title}" — render failed (${err.message})`);
		}
	}

	console.log(`  Generated ${stories.length} story slides`);
	return stories;
}

// ── Reels frames (9:16, for FFmpeg video encoding) ──

/** Generate individual PNG frames for a Reels video. Each event gets one frame. */
export async function generateReelsFrames(
	collectionTitle: string,
	events: CarouselEvent[],
	options?: CarouselOptions
): Promise<Buffer[]> {
	const MAX_FRAMES = 8;
	const frames: Buffer[] = [];

	const withImages = events.filter(e => e.imageUrl);
	if (withImages.length === 0) return frames;

	const toFetch = withImages.slice(0, MAX_FRAMES);
	console.log(`  Fetching ${toFetch.length} reels frame images...`);
	const imageResults = await Promise.all(
		toFetch.map(e => fetchImageAsBase64(e.imageUrl!))
	);

	for (let i = 0; i < toFetch.length; i++) {
		const image = imageResults[i];
		const event = toFetch[i];
		if (!image) {
			console.log(`  [skip] Reels frame "${event.title}" — image fetch failed or too small`);
			continue;
		}

		try {
			const markup = storyEventSlideMarkup(
				event.title,
				event.venue,
				event.time,
				event.category,
				image,
				collectionTitle,
				event.isFree,
				event.dateLabel
			);
			frames.push(await renderStorySlide(markup));
		} catch (err: any) {
			console.log(`  [skip] Reels frame "${event.title}" — render failed (${err.message})`);
		}
	}

	console.log(`  Generated ${frames.length} reels frames`);
	return frames;
}

/** Render a closing/outro slide for a Reel: "More on gaari.no" with collection context. */
export async function generateReelsOutro(
	collectionTitle: string,
	lang: 'no' | 'en' = 'no'
): Promise<Buffer | null> {
	const headline = lang === 'en' ? 'See it all' : 'Se alt sammen';
	const sub = lang === 'en'
		? `Plus everything else happening in Bergen`
		: `Pluss alt annet som skjer i Bergen`;
	const url = 'gaari.no';

	const markup = {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: FUNKIS_RED,
				padding: `${STORY_FRAME}px`
			},
			children: [
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							width: '100%',
							height: '100%',
							backgroundColor: '#1C1C1E',
							borderRadius: '12px',
							justifyContent: 'center',
							alignItems: 'center',
							padding: '0 80px',
							gap: '32px'
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '52px',
										fontFamily: 'Inter',
										color: 'rgba(255,255,255,0.7)',
										textAlign: 'center'
									},
									children: collectionTitle
								}
							},
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
									children: headline
								}
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '40px',
										fontFamily: 'Inter',
										color: 'rgba(255,255,255,0.75)',
										textAlign: 'center',
										marginTop: '12px',
										maxWidth: '820px'
									},
									children: sub
								}
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										marginTop: '60px',
										backgroundColor: WHITE,
										borderRadius: '48px',
										padding: '28px 64px',
										fontSize: '64px',
										fontFamily: 'Barlow Condensed',
										fontWeight: 700,
										color: FUNKIS_RED,
										letterSpacing: '0.02em'
									},
									children: url
								}
							}
						]
					}
				}
			]
		}
	};

	try {
		return await renderStorySlide(markup);
	} catch (err: any) {
		console.log(`  [skip] Reels outro — render failed (${err.message})`);
		return null;
	}
}
