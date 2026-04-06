import satori, { type Font } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Category } from '../../src/lib/types.js';

// ── Image fetching ──

async function fetchImageAsBase64(url: string): Promise<string | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);
		const res = await fetch(url, { signal: controller.signal });
		clearTimeout(timeout);
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		const contentType = res.headers.get('content-type') || 'image/jpeg';
		return `data:${contentType};base64,${buf.toString('base64')}`;
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
	tours: '#A8CCCC'
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

// ── Slide 1: Hook (montage with dimmed event images) ──

function hookSlideMarkup(title: string, eventCount: number, images: string[], lang: 'no' | 'en' = 'no') {
	// Use up to 4 images in a 2x2 grid
	const gridImages = images.slice(0, 4);
	const halfSize = Math.floor(WIDTH / 2);

	const imageChildren = gridImages.map((src, i) => ({
		type: 'img',
		props: {
			src,
			style: {
				position: 'absolute' as const,
				left: `${(i % 2) * halfSize + FRAME}px`,
				top: `${Math.floor(i / 2) * halfSize + FRAME}px`,
				width: `${halfSize}px`,
				height: `${halfSize}px`,
				objectFit: 'cover' as const
			}
		}
	}));

	// If fewer than 4 images, fill remaining slots with dark bg
	while (imageChildren.length < 4) {
		const i = imageChildren.length;
		imageChildren.push({
			type: 'div' as any,
			props: {
				style: {
					position: 'absolute' as const,
					left: `${(i % 2) * halfSize + FRAME}px`,
					top: `${Math.floor(i / 2) * halfSize + FRAME}px`,
					width: `${halfSize}px`,
					height: `${halfSize}px`,
					backgroundColor: '#1C1C1E'
				}
			} as any
		});
	}

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: FUNKIS_RED,
				padding: `${FRAME}px`,
				position: 'relative'
			},
			children: [
				// Inner container
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							width: '100%',
							height: '100%',
							backgroundColor: '#1C1C1E',
							position: 'relative',
							overflow: 'hidden',
							borderRadius: '8px'
						},
						children: [
							// 2x2 image grid
							...imageChildren,
							// Heavy dimming overlay
							{
								type: 'div',
								props: {
									style: {
										position: 'absolute',
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										backgroundColor: 'rgba(0,0,0,0.72)'
									}
								}
							},
							// Text content (centered)
							{
								type: 'div',
								props: {
									style: {
										position: 'absolute',
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										display: 'flex',
										flexDirection: 'column',
										justifyContent: 'center',
										alignItems: 'center',
										padding: '64px',
										gap: '24px'
									},
									children: [
										// Collection title
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '72px',
													fontFamily: 'Barlow Condensed',
													color: WHITE,
													lineHeight: 1.1,
													letterSpacing: '-0.01em',
													textAlign: 'center'
												},
												children: title
											}
										},
										// Event count
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '40px',
													fontFamily: 'Inter',
													color: WHITE,
													lineHeight: 1.3
												},
												children: lang === 'en' ? `${eventCount} events` : `${eventCount} arrangementer`
											}
										},
										// Swipe CTA
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '32px',
													fontFamily: 'Inter',
													color: 'rgba(255,255,255,0.85)',
													marginTop: '24px'
												},
												children: lang === 'en' ? 'Swipe to explore \u2192' : 'Swipe for \u00e5 utforske \u2192'
											}
										},
										// Gåri branding
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '36px',
													fontFamily: 'Barlow Condensed',
													color: FUNKIS_RED,
													marginTop: '36px'
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

// ── Slides 2–N: Event cards ──

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
	const displayTitle = truncate(title, 40);
	const venueTime = time ? `${venue}  \u00b7  kl. ${time}` : venue;

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: FUNKIS_RED,
				padding: `${FRAME}px`,
				position: 'relative'
			},
			children: [
				// Inner container (image + overlay)
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							width: '100%',
							height: '100%',
							backgroundColor: '#1C1C1E',
							position: 'relative',
							overflow: 'hidden',
							borderRadius: '8px'
						},
						children: [
							// Background image
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
							// Dark gradient overlay (stronger for readability)
							{
								type: 'div',
								props: {
									style: {
										position: 'absolute',
										left: 0,
										right: 0,
										bottom: 0,
										height: '70%',
										background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.85))'
									}
								}
							},
							// Subtle top gradient for pill readability
							{
								type: 'div',
								props: {
									style: {
										position: 'absolute',
										left: 0,
										right: 0,
										top: 0,
										height: '30%',
										background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0))'
									}
								}
							},
							// Top bar: category pill (left) + optional collection label (right)
							{
								type: 'div',
								props: {
									style: {
										position: 'absolute',
										top: '36px',
										left: '36px',
										right: '36px',
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
													padding: '14px 36px',
													fontSize: '32px',
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
													padding: '14px 36px',
													fontSize: '32px',
													fontFamily: 'Inter',
													color: WHITE,
													boxShadow: '0 2px 12px rgba(0,0,0,0.35)'
												},
												children: collectionLabel
											}
										}] : [])
									]
								}
							},
							// Text content (bottom)
							{
								type: 'div',
								props: {
									style: {
										position: 'absolute',
										bottom: '48px',
										left: '48px',
										right: '48px',
										display: 'flex',
										flexDirection: 'column',
										gap: '16px'
									},
									children: [
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '72px',
													fontFamily: 'Barlow Condensed',
													color: WHITE,
													lineHeight: 1.1,
													letterSpacing: '-0.01em',
													textShadow: '0 3px 16px rgba(0,0,0,0.7)'
												},
												children: displayTitle
											}
										},
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													alignItems: 'center',
													gap: '16px'
												},
												children: [
													{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																fontSize: '36px',
																fontFamily: 'Inter',
																color: 'rgba(255,255,255,0.92)',
																lineHeight: 1.3,
																textShadow: '0 2px 8px rgba(0,0,0,0.6)'
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
																color: WHITE
															},
															children: 'Trolig gratis'
														}
													}] : [])
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

// ── Last slide: CTA ──

function ctaSlideMarkup(collectionUrl: string, eventCount: number, images: string[], lang: 'no' | 'en' = 'no') {
	const gridImages = images.slice(0, 4);
	const halfSize = Math.floor(WIDTH / 2);

	const imageChildren = gridImages.map((src, i) => ({
		type: 'img',
		props: {
			src,
			style: {
				position: 'absolute' as const,
				left: `${(i % 2) * halfSize}px`,
				top: `${Math.floor(i / 2) * halfSize}px`,
				width: `${halfSize}px`,
				height: `${halfSize}px`,
				objectFit: 'cover' as const
			}
		}
	}));

	while (imageChildren.length < 4) {
		const i = imageChildren.length;
		imageChildren.push({
			type: 'div' as any,
			props: {
				style: {
					position: 'absolute' as const,
					left: `${(i % 2) * halfSize}px`,
					top: `${Math.floor(i / 2) * halfSize}px`,
					width: `${halfSize}px`,
					height: `${halfSize}px`,
					backgroundColor: '#1C1C1E'
				}
			} as any
		});
	}

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: FUNKIS_RED,
				padding: `${FRAME}px`,
				position: 'relative'
			},
			children: [
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							width: '100%',
							height: '100%',
							backgroundColor: '#1C1C1E',
							position: 'relative',
							overflow: 'hidden',
							borderRadius: '8px'
						},
						children: [
							...imageChildren,
							// Heavy dimming
							{
								type: 'div',
								props: {
									style: {
										position: 'absolute',
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										backgroundColor: 'rgba(0,0,0,0.72)'
									}
								}
							},
							// Content
							{
								type: 'div',
								props: {
									style: {
										position: 'absolute',
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										display: 'flex',
										flexDirection: 'column',
										justifyContent: 'center',
										alignItems: 'center',
										padding: '64px',
										gap: '24px'
									},
									children: [
										// Gåri branding
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '96px',
													fontFamily: 'Barlow Condensed',
													color: FUNKIS_RED,
													letterSpacing: '-0.02em',
													lineHeight: 1
												},
												children: 'G\u00e5ri.no'
											}
										},
										// Tagline
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '32px',
													fontFamily: 'Inter',
													color: WHITE,
													lineHeight: 1.4
												},
												children: 'Alt som skjer i Bergen p\u00e5 ett sted'
											}
										},
										// CTA text
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '36px',
													fontFamily: 'Inter',
													color: WHITE,
													marginTop: '20px'
												},
												children: lang === 'en' ? `See all ${eventCount} events` : `Se alle ${eventCount} arrangementer`
											}
										},
										// Share CTA
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '28px',
													fontFamily: 'Inter',
													color: 'rgba(255,255,255,0.85)',
													marginTop: '28px'
												},
												children: lang === 'en' ? 'Share with someone who needs plans!' : 'Send til noen som trenger helgeplaner!'
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
}

export interface CarouselOptions {
	/** Language for hook/CTA slide text */
	lang?: 'no' | 'en';
}

export async function generateCarousel(
	collectionTitle: string,
	dateRange: string,
	events: CarouselEvent[],
	collectionUrl: string,
	totalEventCount: number,
	options?: CarouselOptions
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

	// Slide 1: Montage hook with dimmed event images
	const hookImages = indexed.filter(x => x.image).map(x => x.image as string).slice(0, 4);
	if (hookImages.length > 0) {
		try {
			slides.push(await renderSlide(hookSlideMarkup(collectionTitle, totalEventCount, hookImages, options?.lang ?? 'no')));
		} catch (err: any) {
			console.log(`  [warn] Hook slide failed (${err.message}), skipping montage`);
		}
	}

	// Event slides
	let isFirst = !hookImages.length; // only show collection label if no hook
	for (const { event, image } of indexed) {
		const label = isFirst ? collectionTitle : undefined;
		isFirst = false;
		try {
			if (image) {
				const markup = eventSlideWithImage(event.title, event.venue, event.time, event.category, image, label, event.isFree);
				slides.push(await renderSlide(markup));
			} else {
				console.log(`  [skip] "${event.title}" — no image`);
			}
		} catch (err: any) {
			console.log(`  [skip] "${event.title}" — slide render failed (${err.message})`)
		}
	}

	// Last slide: CTA
	// Use same images as hook for visual consistency
	const ctaImages = indexed.filter(x => x.image).map(x => x.image as string).slice(0, 4);
	try {
		slides.push(await renderSlide(ctaSlideMarkup(collectionUrl, totalEventCount, ctaImages, options?.lang ?? 'no')));
	} catch (err: any) {
		console.log(`  [skip] CTA slide failed (${err.message})`);
	}

	return slides;
}

// ── Story slides (9:16 vertical format) ──

const STORY_FRAME = 16;

function storyEventSlideMarkup(
	title: string,
	venue: string,
	time: string,
	category: Category,
	imageBase64: string,
	collectionTitle: string,
	isFree?: boolean
) {
	const catColor = CATEGORY_COLORS[category] || '#D4D1CA';
	const catLabel = CATEGORY_LABELS[category] || category;
	const displayTitle = truncate(title, 50);
	const venueTime = time ? `${venue}  \u00b7  kl. ${time}` : venue;

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: FUNKIS_RED,
				padding: `${STORY_FRAME}px`,
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
							borderRadius: '12px',
							overflow: 'hidden',
							position: 'relative'
						},
						children: [
							// Top: event image (fills ~60% of height)
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										position: 'relative',
										width: '100%',
										height: '1400px',
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
													height: '300px',
													background: 'linear-gradient(to bottom, rgba(28,28,30,0), rgba(28,28,30,1))'
												}
											}
										},
										// Top pill bar (category + free badge)
										{
											type: 'div',
											props: {
												style: {
													position: 'absolute',
													top: '32px',
													left: '32px',
													right: '32px',
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
													// Empty spacer when not free (keeps layout stable)
													...(isFree ? [{
														type: 'div',
														props: {
															style: {
																display: 'flex'
															}
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
										padding: '0 48px 36px',
										justifyContent: 'flex-end',
										gap: '24px'
									},
									children: [
										// Event details
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													flexDirection: 'column',
													gap: '20px'
												},
												children: [
													{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																fontSize: '64px',
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
																fontSize: '34px',
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
																borderRadius: '28px',
																padding: '10px 28px',
																fontSize: '30px',
																fontFamily: 'Inter',
																color: WHITE,
																marginTop: '4px',
																marginLeft: '-6px',
																alignSelf: 'flex-start'
															},
															children: 'Trolig gratis'
														}
													}] : [])
												]
											}
										},
										// Bottom bar: collection + branding
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
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
																fontSize: '36px',
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

/** Generate 9:16 story images from events (max 3 stories per collection) */
export async function generateStories(
	collectionTitle: string,
	events: CarouselEvent[],
	options?: CarouselOptions
): Promise<Buffer[]> {
	const MAX_STORIES = 3;
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
		if (!image) continue;

		const event = toFetch[i];
		try {
			const markup = storyEventSlideMarkup(
				event.title,
				event.venue,
				event.time,
				event.category,
				image,
				collectionTitle,
				event.isFree
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
		if (!image) continue;

		const event = toFetch[i];
		try {
			const markup = storyEventSlideMarkup(
				event.title,
				event.venue,
				event.time,
				event.category,
				image,
				collectionTitle,
				event.isFree
			);
			frames.push(await renderStorySlide(markup));
		} catch (err: any) {
			console.log(`  [skip] Reels frame "${event.title}" — render failed (${err.message})`);
		}
	}

	console.log(`  Generated ${frames.length} reels frames`);
	return frames;
}
