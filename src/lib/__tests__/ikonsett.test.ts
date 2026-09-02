import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * `apple-touch-icon.png`, `favicon.ico` og `site.webmanifest` svarte 404 paa
 * gaari.no i maanedsvis. Ingenting lyste roedt, fordi et ikon som mangler ikke
 * feiler noe — nettleseren gir bare opp og viser standardikonet sitt.
 *
 * Jf. [[pattern_ingenting_ser_ut_som_suksess]]: fravaer av daarlige nyheter er
 * ikke gode nyheter. Testen kobler markupen til filene som faktisk ligger der,
 * saa en omdoeping eller sletting blir roed her i stedet for stille ute.
 */
const ROT = path.resolve(__dirname, '../../..');
const STATIC = path.join(ROT, 'static');

const les = (p: string) => fs.readFileSync(p, 'utf-8');

describe('ikonsettet finnes paa disk', () => {
	const appHtml = les(path.join(ROT, 'src/app.html'));

	// Hver href/src i app.html som peker paa en fil under static/.
	const referert = [...appHtml.matchAll(/(?:href|content)="%sveltekit\.assets%\/([^"]+)"/g)].map(
		(m) => m[1]
	);

	it('app.html refererer ikonene vi tror den refererer', () => {
		// Feiler noen fjerner en lenke, ikke bare naar en fil forsvinner.
		expect(referert).toEqual(
			expect.arrayContaining([
				'favicon.svg',
				'favicon.png',
				'favicon.ico',
				'apple-touch-icon.png',
				'site.webmanifest',
			])
		);
	});

	it.each(
		[...new Set(referert)].map((f) => [f])
	)('%s finnes i static/', (fil) => {
		expect(fs.existsSync(path.join(STATIC, fil)), `mangler static/${fil}`).toBe(true);
	});
});

describe('site.webmanifest', () => {
	const manifest = JSON.parse(les(path.join(STATIC, 'site.webmanifest')));

	it('har feltene en installasjon trenger', () => {
		expect(manifest.name).toBeTruthy();
		// Hjemskjermen kutter lange navn; short_name er det som faktisk vises.
		expect(manifest.short_name.length).toBeLessThanOrEqual(12);
		expect(manifest.start_url).toBe('/');
		expect(manifest.display).toBe('standalone');
	});

	it('bruker merkefargen og bakgrunnen fra app.css', () => {
		// Fasit staar i src/app.css. Manifestet er JSON og kan ikke lese en
		// CSS-variabel, saa fargen MAA dupliseres — da skal den i det minste
		// vaere laast til originalen. Tolerant for mellomrom, saa en
		// omformatering av app.css ikke gir en falsk roed test.
		const css = les(path.join(ROT, 'src/app.css'));
		const verdi = (navn: string) =>
			css.match(new RegExp(`${navn}:\\s*([^;]+);`))?.[1].trim();
		expect(verdi('--funkis-red')).toBe(manifest.theme_color);
		expect(verdi('--color-bg')).toBe(manifest.background_color);
	});

	it('hvert ikon i manifestet finnes', () => {
		for (const ikon of manifest.icons) {
			const fil = path.join(STATIC, ikon.src.replace(/^\//, ''));
			expect(fs.existsSync(fil), `mangler ${ikon.src}`).toBe(true);
		}
	});

	it('har et maskerbart ikon, ellers avrunder Android to ganger', () => {
		const maskerbare = manifest.icons.filter((i: { purpose?: string }) =>
			i.purpose?.split(' ').includes('maskable')
		);
		expect(maskerbare.length).toBeGreaterThan(0);
	});
});
