/**
 * Genererer ikonsettet som manglet paa gaari.no.
 *
 * favicon.svg er fasit for formen: roed avrundet firkant (#C82D2D) med hvit G.
 * G-en beholder noeyaktig samme geometri som den som alt ligger ute, saa
 * merket ser likt ut overalt.
 *
 * To varianter:
 *  - AVRUNDET, med gjennomsiktige hjoerner. Brukes der ikonet vises som det er.
 *  - FLAT, roed helt ut i kanten og uten gjennomsiktighet. Brukes der
 *    plattformen legger sin EGEN maske oppaa: iOS klipper hjoernene selv, og
 *    Android klipper maskerbare ikoner til sirkel. Et avrundet ikon inni en
 *    slik maske blir avrundet to ganger, og det som er gjennomsiktig blir
 *    svart paa iOS.
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const ROED = '#C82D2D';
const UT = 'c:/Users/kjers/Projects/Gaari/static';

// G-en, hentet ordrett fra static/favicon.svg. viewBox er 0 0 32 32.
const G =
	'M15.5 27.2Q13.0 27.2 11.5 25.8Q10.0 24.3 10.0 21.9L10.0 21.9L10.0 12.5Q10.0 10.1 11.5 8.6Q13.0 7.2 15.5 7.2L15.5 7.2Q18.0 7.2 19.6 8.6Q21.1 10.1 21.1 12.5L21.1 12.5L21.1 13.6Q21.1 13.7 21.0 13.8Q20.9 13.9 20.8 13.9L20.8 13.9L17.5 13.9Q17.4 13.9 17.3 13.8Q17.2 13.7 17.2 13.6L17.2 13.6L17.2 12.4Q17.2 11.6 16.7 11.1Q16.3 10.6 15.5 10.6L15.5 10.6Q14.8 10.6 14.3 11.1Q13.9 11.6 13.9 12.4L13.9 12.4L13.9 22.0Q13.9 22.8 14.3 23.3Q14.8 23.8 15.5 23.8L15.5 23.8Q16.3 23.8 16.7 23.3Q17.2 22.8 17.2 22.0L17.2 22.0L17.2 19.7Q17.2 19.6 17.0 19.6L17.0 19.6L15.8 19.6Q15.7 19.6 15.6 19.5Q15.5 19.4 15.5 19.2L15.5 19.2L15.5 16.8Q15.5 16.6 15.6 16.5Q15.7 16.4 15.8 16.4L15.8 16.4L20.8 16.4Q20.9 16.4 21.0 16.5Q21.1 16.6 21.1 16.8L21.1 16.8L21.1 21.9Q21.1 24.3 19.6 25.8Q18.0 27.2 15.5 27.2L15.5 27.2Z';

const avrundet = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="${ROED}" d="M4,0 h24 a4,4 0 0 1 4,4 v24 a4,4 0 0 1 -4,4 h-24 a4,4 0 0 1 -4,-4 v-24 a4,4 0 0 1 4,-4"/><path fill="#FFFFFF" d="${G}"/></svg>`;
const flat = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" fill="${ROED}"/><path fill="#FFFFFF" d="${G}"/></svg>`;

const png = (svg, storrelse, flate) => {
	let p = sharp(Buffer.from(svg), { density: 384 }).resize(storrelse, storrelse);
	// Flate ikoner skal ikke ha alfakanal i det hele tatt: iOS komponerer
	// gjennomsiktighet mot svart.
	if (flate) p = p.flatten({ background: ROED });
	return p.png({ compressionLevel: 9 }).toBuffer();
};

const filer = [
	['apple-touch-icon.png', 180, flat, true],
	['icon-maskable-512.png', 512, flat, true],
	['icon-192.png', 192, avrundet, false],
];

for (const [navn, storrelse, svg, erFlat] of filer) {
	writeFileSync(`${UT}/${navn}`, await png(svg, storrelse, erFlat));
	console.log(`${navn.padEnd(24)} ${storrelse}x${storrelse}  ${erFlat ? 'flat, uten alfa' : 'avrundet'}`);
}

// Mellomfiler til favicon.ico. ImageMagick setter dem sammen etterpaa —
// sharp kan ikke skrive .ico.
for (const s of [16, 32, 48]) {
	writeFileSync(`${UT}/.ico-${s}.png`, await png(avrundet, s, false));
	console.log(`.ico-${s}.png (mellomfil)`);
}
