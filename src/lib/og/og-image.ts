import satori from 'satori';
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

let fontsCache: { name: string; data: ArrayBuffer; weight: number; style: string }[] | null = null;

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
	return text.slice(0, maxLen - 1).trimEnd() + '\u2026';
}

function formatDate(dateStr: string): string {
	const d = new Date(dateStr);
	return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export interface OgImageOptions {
	origin: string;
	title?: string;
	date?: string;
	venue?: string;
	category?: Category;
}

export async function generateOgImage(options: OgImageOptions): Promise<Uint8Array> {
	const fonts = await loadFonts(options.origin);
	const isEvent = options?.title && options?.category;

	const markup = isEvent
		? eventMarkup(options as Required<Pick<OgImageOptions, 'title' | 'category'>> & OgImageOptions)
		: defaultMarkup();

	const svg = await satori(markup, {
		width: WIDTH,
		height: HEIGHT,
		fonts: fonts as any
	});

	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: WIDTH }
	});

	return resvg.render().asPng();
}

function eventMarkup(opts: Required<Pick<OgImageOptions, 'title' | 'category'>> & OgImageOptions) {
	const catColor = CATEGORY_COLORS[opts.category] || '#D4D1CA';
	const catLabel = CATEGORY_LABELS[opts.category] || opts.category;
	const displayTitle = truncate(opts.title, 60);

	const dateVenueItems: any[] = [];
	if (opts.date) {
		dateVenueItems.push({
			type: 'span',
			props: {
				children: formatDate(opts.date),
				style: { display: 'flex' }
			}
		});
	}
	if (opts.date && opts.venue) {
		dateVenueItems.push({
			type: 'span',
			props: {
				children: '  \u00b7  ',
				style: { display: 'flex', color: TEXT_MUTED }
			}
		});
	}
	if (opts.venue) {
		dateVenueItems.push({
			type: 'span',
			props: {
				children: truncate(opts.venue, 40),
				style: { display: 'flex' }
			}
		});
	}

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
							justifyContent: 'space-between',
							padding: '48px 56px 48px 48px',
							marginLeft: '10px',
							width: '100%',
							height: '100%'
						},
						children: [
							// Top: Gåri branding
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '28px',
										fontFamily: 'Barlow Condensed',
										color: TEXT_MUTED,
										letterSpacing: '0.02em'
									},
									children: 'Gåri'
								}
							},
							// Middle: Title + date/venue
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
										...(dateVenueItems.length > 0
											? [
													{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																fontSize: '22px',
																fontFamily: 'Inter',
																color: TEXT_SECONDARY,
																alignItems: 'center'
															},
															children: dateVenueItems
														}
													}
												]
											: [])
									]
								}
							},
							// Bottom: Category badge + Bergen label
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'flex-end',
										width: '100%'
									},
									children: [
										// Category pill
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													backgroundColor: catColor,
													borderRadius: '20px',
													padding: '6px 20px',
													fontSize: '18px',
													fontFamily: 'Inter',
													color: TEXT_PRIMARY
												},
												children: catLabel
											}
										},
										// Bergen, NO
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '18px',
													fontFamily: 'Inter',
													color: TEXT_MUTED
												},
												children: 'Bergen, NO'
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
							fontFamily: 'Inter',
							color: TEXT_SECONDARY,
							marginTop: '12px'
						},
						children: "Ke' det g\u00e5r i Bergen?"
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
