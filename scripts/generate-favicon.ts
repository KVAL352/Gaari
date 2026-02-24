/**
 * One-off script to generate static/favicon.png (32x32) from BarlowCondensed-Bold.
 * Run: npx tsx scripts/generate-favicon.ts
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const FONT_PATH = resolve('static/fonts/BarlowCondensed-Bold.ttf');
const OUT_PATH = resolve('static/favicon.png');
const SIZE = 32;

const fontData = readFileSync(FONT_PATH);

const markup = {
	type: 'div',
	props: {
		style: {
			display: 'flex',
			width: '100%',
			height: '100%',
			justifyContent: 'center',
			alignItems: 'center'
		},
		children: [
			{
				type: 'div',
				props: {
					style: {
						display: 'flex',
						fontFamily: 'Barlow Condensed',
						fontSize: '28px',
						fontWeight: 700,
						color: '#C82D2D'
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
	writeFileSync(OUT_PATH, png);
	console.log(`Wrote ${OUT_PATH} (${png.length} bytes)`);
}

main().catch(console.error);
