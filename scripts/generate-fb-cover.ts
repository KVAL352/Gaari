import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const FUNKIS_RED = '#C82D2D';
const WHITE = '#FFFFFF';
const TEXT_PRIMARY = '#141414';

const WIDTH = 1640;
const HEIGHT = 624;

async function generate() {
	const fontsDir = resolve(import.meta.dirname, '../static/fonts');
	const barlowBold = readFileSync(resolve(fontsDir, 'BarlowCondensed-Bold.ttf'));
	const interRegular = readFileSync(resolve(fontsDir, 'Inter-Regular.ttf'));

	const svg = await satori(
		{
			type: 'div',
			props: {
				style: {
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					backgroundColor: WHITE,
					fontFamily: 'Inter',
					position: 'relative',
				},
				children: [
					// Red accent bar left
					{
						type: 'div',
						props: {
							style: {
								position: 'absolute',
								left: 0,
								top: 0,
								bottom: 0,
								width: '16px',
								backgroundColor: FUNKIS_RED,
							},
						},
					},
					// Main content
					{
						type: 'div',
						props: {
							style: {
								display: 'flex',
								flexDirection: 'column',
								paddingLeft: '120px',
								gap: '16px',
							},
							children: [
								{
									type: 'div',
									props: {
										style: {
											fontFamily: 'Barlow Condensed',
											fontSize: '128px',
											fontWeight: 700,
											color: TEXT_PRIMARY,
											lineHeight: 1,
										},
										children: 'Gåri',
									},
								},
								{
									type: 'div',
									props: {
										style: {
											fontSize: '52px',
											color: TEXT_PRIMARY,
											lineHeight: 1.3,
										},
										children: 'Alt som skjer i Bergen,',
									},
								},
								{
									type: 'div',
									props: {
										style: {
											fontSize: '52px',
											color: TEXT_PRIMARY,
											lineHeight: 1.3,
										},
										children: 'samlet på ett sted.',
									},
								},
								{
									type: 'div',
									props: {
										style: {
											fontSize: '36px',
											color: FUNKIS_RED,
											marginTop: '16px',
										},
										children: 'gaari.no',
									},
								},
							],
						},
					},
					// Right side — category pills
					{
						type: 'div',
						props: {
							style: {
								display: 'flex',
								flexDirection: 'column',
								gap: '20px',
								position: 'absolute',
								right: '100px',
								top: '50%',
								transform: 'translateY(-50%)',
							},
							children: [
								['Konserter', '#AECDE8'],
								['Teater', '#E8B8C2'],
								['Familie', '#F5D49A'],
								['Kultur', '#C5B8D9'],
								['Mat & drikke', '#E8C4A0'],
								['Sport', '#A8D4B8'],
							].map(([label, color]) => ({
								type: 'div',
								props: {
									style: {
										backgroundColor: color as string,
										color: TEXT_PRIMARY,
										fontSize: '28px',
										padding: '12px 32px',
										borderRadius: '40px',
										fontWeight: 500,
									},
									children: label,
								},
							})),
						},
					},
				],
			},
		},
		{
			width: WIDTH,
			height: HEIGHT,
			fonts: [
				{ name: 'Barlow Condensed', data: barlowBold, weight: 700, style: 'normal' },
				{ name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
			],
		}
	);

	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: WIDTH },
	});
	const png = resvg.render().asPng();

	const outPath = resolve(import.meta.dirname, '../static/fb-cover.png');
	writeFileSync(outPath, png);
	console.log(`Cover generated: ${outPath} (${png.length} bytes)`);
}

generate().catch(console.error);
