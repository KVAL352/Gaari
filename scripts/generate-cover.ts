/**
 * One-off script to generate a 1200x675 cover image for Google Business Profile.
 * Run: npx tsx scripts/generate-cover.ts
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const INTER_PATH = resolve('../static/fonts/Inter-Regular.ttf');
const BARLOW_PATH = resolve('../static/fonts/BarlowCondensed-Bold.ttf');
const OUT_PNG = resolve('../static/gaari-cover.png');

const WIDTH = 1200;
const HEIGHT = 675;

const FUNKIS_RED = '#C82D2D';
const WHITE = '#FFFFFF';
const TEXT_PRIMARY = '#141414';
const TEXT_SECONDARY = '#4D4D4D';
const TEXT_MUTED = '#595959';
const BORDER = '#E5E5E5';

const categories = [
	'Konserter', 'Utstillinger', 'Familieaktiviteter',
	'Gratis arrangementer', 'Fjellturer', 'Uteliv', 'Teater', 'Festival'
];

const markup = {
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
						left: 0, top: 0, bottom: 0,
						width: '12px',
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
						justifyContent: 'space-between',
						marginLeft: '12px',
						padding: '48px 60px 0px 52px',
						width: '100%',
						height: '100%'
					},
					children: [
						// Top: Gåri brand
						{
							type: 'div',
							props: {
								style: { display: 'flex', alignItems: 'baseline', gap: '16px' },
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
											children: 'gaari.no'
										}
									}
								]
							}
						},

						// Center: headline + subline
						{
							type: 'div',
							props: {
								style: { display: 'flex', flexDirection: 'column', gap: '16px' },
								children: [
									{
										type: 'div',
										props: {
											style: {
												display: 'flex',
												fontSize: '88px',
												fontFamily: 'Barlow Condensed',
												color: TEXT_PRIMARY,
												lineHeight: 1,
												letterSpacing: '-0.01em'
											},
											children: 'Alt som skjer i Bergen'
										}
									},
									{
										type: 'div',
										props: {
											style: {
												display: 'flex',
												fontSize: '26px',
												fontFamily: 'Inter',
												color: TEXT_SECONDARY,
												lineHeight: 1.4
											},
											children: 'Konserter, utstillinger, familieutflukter, gratis arrangementer, fjellturer og mye mer — samlet på ett sted.'
										}
									}
								]
							}
						},

						// Category pills
						{
							type: 'div',
							props: {
								style: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
								children: categories.map(cat => ({
									type: 'div',
									props: {
										style: {
											display: 'flex',
											border: `1.5px solid ${BORDER}`,
											borderRadius: '100px',
											padding: '7px 20px',
											fontSize: '17px',
											fontFamily: 'Inter',
											color: TEXT_MUTED
										},
										children: cat
									}
								}))
							}
						},

						// Bottom red bar
						{
							type: 'div',
							props: {
								style: {
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									backgroundColor: FUNKIS_RED,
									marginLeft: '-52px',
									marginRight: '-60px',
									padding: '16px 60px'
								},
								children: [
									{
										type: 'div',
										props: {
											style: {
												display: 'flex',
												fontSize: '21px',
												fontFamily: 'Barlow Condensed',
												color: WHITE,
												letterSpacing: '0.04em'
											},
											children: 'GRATIS FOR ARRANGØRER  ·  GRATIS FOR BESØKENDE  ·  GAARI.NO'
										}
									}
								]
							}
						}
					]
				}
			},

			// Bottom accent line (behind the red bar, just in case)
			{
				type: 'div',
				props: {
					style: {
						position: 'absolute',
						left: 0, right: 0, bottom: 0,
						height: '6px',
						backgroundColor: FUNKIS_RED
					}
				}
			}
		]
	}
};

async function main() {
	const interData = readFileSync(INTER_PATH);
	const barlowData = readFileSync(BARLOW_PATH);

	const svg = await satori(markup, {
		width: WIDTH,
		height: HEIGHT,
		fonts: [
			{ name: 'Inter', data: interData, weight: 400, style: 'normal' },
			{ name: 'Barlow Condensed', data: barlowData, weight: 700, style: 'normal' }
		]
	});

	const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } });
	const png = resvg.render().asPng();
	writeFileSync(OUT_PNG, png);
	console.log(`Wrote ${OUT_PNG} (${(png.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
