/**
 * One-off script to generate a 500x500 logo PNG for Google Business Profile.
 * Run: npx tsx scripts/generate-logo.ts
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const FONT_PATH = resolve('../static/fonts/BarlowCondensed-Bold.ttf');
const OUT_PNG = resolve('../static/gaari-logo-500.png');
const SIZE = 1000;

const fontData = readFileSync(FONT_PATH);

const markup = {
	type: 'div',
	props: {
		style: {
			display: 'flex',
			width: '100%',
			height: '100%',
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: '#C82D2D',
			borderRadius: '48px'
		},
		children: [
			{
				type: 'div',
				props: {
					style: {
						display: 'flex',
						fontFamily: 'Barlow Condensed',
						fontSize: '760px',
						fontWeight: 700,
						color: '#FFFFFF',
						lineHeight: 1,
						marginBottom: '160px'
					},
					children: 'G'
				}
			}
		]
	}
};

async function main() {
	const svg = await satori(markup, {
		width: SIZE,
		height: SIZE,
		fonts: [{ name: 'Barlow Condensed', data: fontData, weight: 700, style: 'normal' }]
	});

	const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: SIZE } });
	const png = resvg.render().asPng();
	writeFileSync(OUT_PNG, png);
	console.log(`Wrote ${OUT_PNG} (${png.length} bytes)`);
}

main().catch(console.error);
