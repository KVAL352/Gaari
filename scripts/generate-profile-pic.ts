import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const FUNKIS_RED = '#C82D2D';
const WHITE = '#FFFFFF';

const SIZE = 1080;

async function generate() {
	const fontsDir = resolve(import.meta.dirname, '../static/fonts');
	const barlowBold = readFileSync(resolve(fontsDir, 'BarlowCondensed-Bold.ttf'));

	const svg = await satori(
		{
			type: 'div',
			props: {
				style: {
					width: '100%',
					height: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: WHITE,
				},
				children: [
					{
						type: 'div',
						props: {
							style: {
								fontFamily: 'Barlow Condensed',
								fontSize: '420px',
								fontWeight: 700,
								color: FUNKIS_RED,
								lineHeight: 1,
							},
							children: 'Gåri',
						},
					},
				],
			},
		},
		{
			width: SIZE,
			height: SIZE,
			fonts: [
				{ name: 'Barlow Condensed', data: barlowBold, weight: 700, style: 'normal' },
			],
		}
	);

	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: SIZE },
	});
	const png = resvg.render().asPng();

	const outPath = resolve(import.meta.dirname, '../static/profile-pic.png');
	writeFileSync(outPath, png);
	console.log(`Profile pic generated: ${outPath} (${png.length} bytes)`);
}

generate().catch(console.error);
