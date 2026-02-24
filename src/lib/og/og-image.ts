import satori, { type Font } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { Category } from '$lib/types';

// Hex values matching CSS custom properties in app.css
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

const FUNKIS_RED = '#C82D2D';
const WHITE = '#FFFFFF';
const TEXT_PRIMARY = '#141414';
const TEXT_SECONDARY = '#4D4D4D';
const TEXT_MUTED = '#737373';

const WIDTH = 1200;
const HEIGHT = 630;

let fontsCache: Font[] | null = null;

async function loadFonts(origin: string) {
	if (fontsCache) return fontsCache;

	const [interData, barlowData] = await Promise.all([
		fetch(`${origin}/fonts/Inter-Regular.ttf`).then((r) => r.arrayBuffer()),
		fetch(`${origin}/fonts/BarlowCondensed-Bold.ttf`).then((r) => r.arrayBuffer())
	]);

	fontsCache = [
		{ name: 'Inter', data: interData, weight: 400, style: 'normal' },
		{ name: 'Barlow Condensed', data: barlowData, weight: 700, style: 'normal' }
	];

	return fontsCache;
}

function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	// Break at last word boundary
	const trimmed = text.slice(0, maxLen);
	const lastSpace = trimmed.lastIndexOf(' ');
	if (lastSpace > maxLen * 0.5) {
		return trimmed.slice(0, lastSpace) + '\u2026';
	}
	return trimmed.trimEnd() + '\u2026';
}

function formatDate(dateStr: string): string {
	const d = new Date(dateStr);
	return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
		if (!res.ok) return null;
		const contentType = res.headers.get('content-type') || 'image/jpeg';
		const buffer = await res.arrayBuffer();
		const base64 = Buffer.from(buffer).toString('base64');
		return `data:${contentType};base64,${base64}`;
	} catch {
		return null;
	}
}

export interface OgImageOptions {
	origin: string;
	title?: string;
	date?: string;
	venue?: string;
	category?: Category;
	imageUrl?: string;
}

export async function generateOgImage(options: OgImageOptions): Promise<Uint8Array> {
	const fonts = await loadFonts(options.origin);
	const isEvent = options?.title && options?.category;

	let imageDataUrl: string | null = null;
	if (isEvent && options.imageUrl) {
		imageDataUrl = await fetchImageAsDataUrl(options.imageUrl);
	}

	const markup = isEvent
		? eventMarkup(
				options as Required<Pick<OgImageOptions, 'title' | 'category'>> & OgImageOptions,
				imageDataUrl
			)
		: defaultMarkup();

	const svg = await satori(markup, {
		width: WIDTH,
		height: HEIGHT,
		fonts
	});

	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: WIDTH }
	});

	return resvg.render().asPng();
}

function eventMarkup(
	opts: Required<Pick<OgImageOptions, 'title' | 'category'>> & OgImageOptions,
	imageDataUrl: string | null
) {
	if (imageDataUrl) {
		return eventWithPhotoMarkup(opts, imageDataUrl);
	}
	return eventNoPhotoMarkup(opts);
}

// Event WITH photo: photo background + dark gradient overlay + branding
function eventWithPhotoMarkup(
	opts: Required<Pick<OgImageOptions, 'title' | 'category'>> & OgImageOptions,
	imageDataUrl: string
) {
	const catColor = CATEGORY_COLORS[opts.category] || '#D4D1CA';
	const catLabel = CATEGORY_LABELS[opts.category] || opts.category;
	const displayTitle = truncate(opts.title, 45);

	const dateVenueParts: string[] = [];
	if (opts.date) dateVenueParts.push(formatDate(opts.date));
	if (opts.venue) dateVenueParts.push(truncate(opts.venue, 30));
	const dateVenueText = dateVenueParts.join('  \u00b7  ');

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				position: 'relative',
				backgroundColor: '#000'
			},
			children: [
				// Background photo
				{
					type: 'img',
					props: {
						src: imageDataUrl,
						style: {
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							height: '100%',
							objectFit: 'cover',
							opacity: 0.55
						}
					}
				},
				// Gradient overlay (top — for logo readability)
				{
					type: 'div',
					props: {
						style: {
							position: 'absolute',
							left: 0,
							right: 0,
							top: 0,
							height: '35%',
							background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0))'
						}
					}
				},
				// Gradient overlay (bottom — for title readability)
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
				// Content overlay
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'space-between',
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							padding: '40px 48px'
						},
						children: [
							// Top bar: Gåri logo + tagline + category
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center'
									},
									children: [
										// Gåri + tagline
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													alignItems: 'baseline',
													gap: '14px'
												},
												children: [
													{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																fontSize: '44px',
																fontFamily: 'Barlow Condensed',
																color: WHITE,
																letterSpacing: '0.02em'
															},
															children: 'Gåri'
														}
													},
													{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																fontSize: '22px',
																fontFamily: 'Barlow Condensed',
																color: 'rgba(255,255,255,0.75)'
															},
															children: 'Alt som skjer i Bergen p\u00e5 ett sted'
														}
													}
												]
											}
										},
										// Category pill (top right)
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													backgroundColor: catColor,
													borderRadius: '24px',
													padding: '8px 24px',
													fontSize: '20px',
													fontFamily: 'Inter',
													color: TEXT_PRIMARY
												},
												children: catLabel
											}
										}
									]
								}
							},
							// Bottom: title + date/venue
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										flexDirection: 'column',
										gap: '12px'
									},
									children: [
										// Title
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '48px',
													fontFamily: 'Barlow Condensed',
													color: WHITE,
													lineHeight: 1.15,
													letterSpacing: '-0.01em'
												},
												children: displayTitle
											}
										},
										// Date · Venue
										...(dateVenueText
											? [
													{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																fontSize: '22px',
																fontFamily: 'Inter',
																color: 'rgba(255,255,255,0.85)'
															},
															children: dateVenueText
														}
													}
												]
											: []),
										// Red accent bar
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													width: '48px',
													height: '4px',
													backgroundColor: FUNKIS_RED,
													borderRadius: '2px',
													marginTop: '4px'
												}
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

// Event WITHOUT photo: white background + category color bar
function eventNoPhotoMarkup(
	opts: Required<Pick<OgImageOptions, 'title' | 'category'>> & OgImageOptions
) {
	const catColor = CATEGORY_COLORS[opts.category] || '#D4D1CA';
	const catLabel = CATEGORY_LABELS[opts.category] || opts.category;
	const displayTitle = truncate(opts.title, 45);

	const dateVenueParts: string[] = [];
	if (opts.date) dateVenueParts.push(formatDate(opts.date));
	if (opts.venue) dateVenueParts.push(truncate(opts.venue, 30));
	const dateVenueText = dateVenueParts.join('  \u00b7  ');

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
							width: '10px',
							backgroundColor: catColor
						}
					}
				},
				// Main content area
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							padding: '48px 56px 48px 48px',
							marginLeft: '10px',
							width: '100%',
							height: '100%',
							gap: '32px'
						},
						children: [
							// Gåri + tagline
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										alignItems: 'baseline',
										gap: '14px'
									},
									children: [
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '40px',
													fontFamily: 'Barlow Condensed',
													color: FUNKIS_RED,
													letterSpacing: '0.02em'
												},
												children: 'Gåri'
											}
										},
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '22px',
													fontFamily: 'Barlow Condensed',
													color: TEXT_MUTED
												},
												children: 'Alt som skjer i Bergen p\u00e5 ett sted'
											}
										}
									]
								}
							},
							// Title + date/venue
							{
								type: 'div',
								props: {
									style: {
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
													fontSize: '52px',
													fontFamily: 'Barlow Condensed',
													color: TEXT_PRIMARY,
													lineHeight: 1.15,
													letterSpacing: '-0.01em'
												},
												children: displayTitle
											}
										},
										...(dateVenueText
											? [
													{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																fontSize: '22px',
																fontFamily: 'Inter',
																color: TEXT_SECONDARY
															},
															children: dateVenueText
														}
													}
												]
											: [])
									]
								}
							},
							// Category badge
							{
								type: 'div',
								props: {
									style: {
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
													padding: '8px 24px',
													fontSize: '20px',
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
				// Bottom accent line (Funkis red)
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

function defaultMarkup() {
	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				backgroundColor: WHITE,
				position: 'relative',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center'
			},
			children: [
				// Gåri title
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							fontSize: '80px',
							fontFamily: 'Barlow Condensed',
							color: FUNKIS_RED,
							letterSpacing: '-0.02em'
						},
						children: 'Gåri'
					}
				},
				// Tagline
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							fontSize: '32px',
							fontFamily: 'Barlow Condensed',
							color: TEXT_SECONDARY,
							marginTop: '12px'
						},
						children: 'Alt som skjer i Bergen p\u00e5 ett sted'
					}
				},
				// Location
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							fontSize: '20px',
							fontFamily: 'Inter',
							color: TEXT_MUTED,
							marginTop: '24px'
						},
						children: 'Bergen, Norway'
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
