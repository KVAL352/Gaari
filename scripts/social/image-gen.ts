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

// ── Slide 1: Hook (collection intro) ──

function hookSlideMarkup(title: string, dateRange: string, eventCount: number) {
	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: WHITE,
				position: 'relative'
			},
			children: [
				// Left red accent bar
				{
					type: 'div',
					props: {
						style: {
							position: 'absolute',
							left: 0,
							top: 0,
							bottom: 0,
							width: '16px',
							backgroundColor: FUNKIS_RED
						}
					}
				},
				// Main content
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							marginLeft: '16px',
							padding: '64px 56px 64px 48px',
							width: '100%',
							height: '100%',
							gap: '32px'
						},
						children: [
							// Collection title
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '64px',
										fontFamily: 'Barlow Condensed',
										color: TEXT_PRIMARY,
										lineHeight: 1.1,
										letterSpacing: '-0.01em'
									},
									children: title
								}
							},
							// Date range
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '28px',
										fontFamily: 'Inter',
										color: TEXT_MUTED,
										lineHeight: 1.4
									},
									children: dateRange
								}
							},
							// Event count
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '32px',
										fontFamily: 'Barlow Condensed',
										color: TEXT_SECONDARY,
										lineHeight: 1.3
									},
									children: `${eventCount} arrangementer`
								}
							},
							// Gåri branding
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										alignItems: 'baseline',
										gap: '12px',
										marginTop: '24px'
									},
									children: [
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '48px',
													fontFamily: 'Barlow Condensed',
													color: FUNKIS_RED,
													letterSpacing: '0.02em'
												},
												children: 'Gaari'
											}
										},
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '20px',
													fontFamily: 'Barlow Condensed',
													color: TEXT_MUTED
												},
												children: 'gaari.no'
											}
										}
									]
								}
							}
						]
					}
				},
				// Bottom accent line
				{
					type: 'div',
					props: {
						style: {
							position: 'absolute',
							left: 0,
							right: 0,
							bottom: 0,
							height: '8px',
							backgroundColor: FUNKIS_RED
						}
					}
				}
			]
		}
	};
}

// ── Slides 2–N: Event cards ──

function eventSlideWithImage(
	title: string,
	venue: string,
	time: string,
	category: Category,
	imageBase64: string
) {
	const catColor = CATEGORY_COLORS[category] || '#D4D1CA';
	const catLabel = CATEGORY_LABELS[category] || category;
	const displayTitle = truncate(title, 55);
	const venueTime = time ? `${venue}  \u00b7  kl. ${time}` : venue;

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: '#1C1C1E',
				position: 'relative',
				overflow: 'hidden'
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
				// Dark gradient overlay
				{
					type: 'div',
					props: {
						style: {
							position: 'absolute',
							left: 0,
							right: 0,
							bottom: 0,
							height: '60%',
							background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.75))'
						}
					}
				},
				// Category pill (top-left)
				{
					type: 'div',
					props: {
						style: {
							position: 'absolute',
							top: '36px',
							left: '36px',
							display: 'flex'
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										backgroundColor: catColor,
										borderRadius: '24px',
										padding: '10px 28px',
										fontSize: '22px',
										fontFamily: 'Inter',
										color: TEXT_PRIMARY
									},
									children: catLabel
								}
							}
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
										fontSize: '48px',
										fontFamily: 'Barlow Condensed',
										color: WHITE,
										lineHeight: 1.15,
										letterSpacing: '-0.01em',
										textShadow: '0 2px 12px rgba(0,0,0,0.5)'
									},
									children: displayTitle
								}
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '26px',
										fontFamily: 'Inter',
										color: 'rgba(255,255,255,0.85)',
										lineHeight: 1.4,
										textShadow: '0 1px 6px rgba(0,0,0,0.5)'
									},
									children: venueTime
								}
							}
						]
					}
				},
				// Bottom accent line
				{
					type: 'div',
					props: {
						style: {
							position: 'absolute',
							left: 0,
							right: 0,
							bottom: 0,
							height: '6px',
							backgroundColor: FUNKIS_RED
						}
					}
				}
			]
		}
	};
}

function eventSlideFallback(
	title: string,
	venue: string,
	time: string,
	category: Category
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
				backgroundColor: WHITE,
				position: 'relative'
			},
			children: [
				// Category color bar (left)
				{
					type: 'div',
					props: {
						style: {
							position: 'absolute',
							left: 0,
							top: 0,
							bottom: 0,
							width: '12px',
							backgroundColor: catColor
						}
					}
				},
				// Main content
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							marginLeft: '12px',
							padding: '64px 56px 64px 48px',
							width: '100%',
							height: '100%',
							gap: '28px'
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '48px',
										fontFamily: 'Barlow Condensed',
										color: TEXT_PRIMARY,
										lineHeight: 1.15,
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
										fontSize: '24px',
										fontFamily: 'Inter',
										color: TEXT_SECONDARY,
										lineHeight: 1.4
									},
									children: venueTime
								}
							},
							{
								type: 'div',
								props: {
									style: { display: 'flex' },
									children: [
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													backgroundColor: catColor,
													borderRadius: '24px',
													padding: '10px 28px',
													fontSize: '22px',
													fontFamily: 'Inter',
													color: TEXT_PRIMARY
												},
												children: catLabel
											}
										}
									]
								}
							}
						]
					}
				},
				// Bottom accent line
				{
					type: 'div',
					props: {
						style: {
							position: 'absolute',
							left: 0,
							right: 0,
							bottom: 0,
							height: '6px',
							backgroundColor: FUNKIS_RED
						}
					}
				}
			]
		}
	};
}

// ── Last slide: CTA ──

function ctaSlideMarkup(collectionUrl: string, eventCount: number) {
	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: WHITE,
				position: 'relative'
			},
			children: [
				// Main content (centered)
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							alignItems: 'center',
							width: '100%',
							height: '100%',
							padding: '64px',
							gap: '36px'
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
									children: 'Gaari'
								}
							},
							// Tagline
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '24px',
										fontFamily: 'Inter',
										color: TEXT_MUTED,
										lineHeight: 1.4
									},
									children: 'Alt som skjer i Bergen pa ett sted'
								}
							},
							// CTA text
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '28px',
										fontFamily: 'Inter',
										color: TEXT_SECONDARY,
										marginTop: '16px'
									},
									children: `Se alle ${eventCount} arrangementer`
								}
							},
							// Collection URL
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '36px',
										fontFamily: 'Barlow Condensed',
										color: FUNKIS_RED
									},
									children: collectionUrl
								}
							}
						]
					}
				},
				// Bottom accent line
				{
					type: 'div',
					props: {
						style: {
							position: 'absolute',
							left: 0,
							right: 0,
							bottom: 0,
							height: '8px',
							backgroundColor: FUNKIS_RED
						}
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
}

export async function generateCarousel(
	collectionTitle: string,
	dateRange: string,
	events: CarouselEvent[],
	collectionUrl: string,
	totalEventCount: number
): Promise<Buffer[]> {
	const slides: Buffer[] = [];

	// Pre-fetch all event images in parallel
	console.log(`  Fetching ${events.filter(e => e.imageUrl).length} event images...`);
	const imageResults = await Promise.all(
		events.map(e => e.imageUrl ? fetchImageAsBase64(e.imageUrl) : Promise.resolve(null))
	);
	const fetched = imageResults.filter(Boolean).length;
	console.log(`  Fetched ${fetched}/${events.length} images`);

	// Slide 1: Hook (shows total event count)
	slides.push(await renderSlide(hookSlideMarkup(collectionTitle, dateRange, totalEventCount)));

	// Slides 2–N: Events
	for (let i = 0; i < events.length; i++) {
		const event = events[i];
		const imageBase64 = imageResults[i];

		try {
			if (imageBase64) {
				const markup = eventSlideWithImage(event.title, event.venue, event.time, event.category, imageBase64);
				slides.push(await renderSlide(markup));
			} else {
				const markup = eventSlideFallback(event.title, event.venue, event.time, event.category);
				slides.push(await renderSlide(markup));
			}
		} catch (err: any) {
			console.log(`  [warn] Slide for "${event.title}" with image failed (${err.message}), retrying without image`);
			const markup = eventSlideFallback(event.title, event.venue, event.time, event.category);
			slides.push(await renderSlide(markup));
		}
	}

	// Last slide: CTA (shows total event count)
	slides.push(await renderSlide(ctaSlideMarkup(collectionUrl, totalEventCount)));

	return slides;
}
