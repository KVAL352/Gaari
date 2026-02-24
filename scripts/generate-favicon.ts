/**
 * One-off script to generate static/favicon.png (32x32) from BarlowCondensed-Bold.
 * Run: npx tsx scripts/generate-favicon.ts
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const FONT_PATH = resolve('static/fonts/BarlowCondensed-Bold.ttf');
const OUT_PNG = resolve('static/favicon.png');
const OUT_SVG = resolve('static/favicon.svg');
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
			alignItems: 'center',
			backgroundColor: '#C82D2D',
			borderRadius: '4px'
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
						color: '#FFFFFF'
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

	// SVG with text converted to paths (no font dependency)
	writeFileSync(OUT_SVG, svg);
	console.log(`Wrote ${OUT_SVG} (${svg.length} bytes)`);

	// PNG rasterized at 32x32
	const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: SIZE } });
	const png = resvg.render().asPng();
	writeFileSync(OUT_PNG, png);
	console.log(`Wrote ${OUT_PNG} (${png.length} bytes)`);
}

main().catch(console.error);
