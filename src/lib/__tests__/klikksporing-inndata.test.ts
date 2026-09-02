import { describe, it, expect } from 'vitest';
import { sanitizeDestination, sanitizeSourcePage } from '../server/klikksporing';

/**
 * `/api/track-click` er et aapent endepunkt. Kroppen kommer fra nettleseren og
 * kan inneholde hva som helst — ogsaa fra noen som ikke er en leser.
 *
 * Begge funksjonene her er portvakter mot en databasekolonne, og de var helt
 * uten dekning foer 2. september 2026. Det som skal ligge fast:
 *
 *  - bare vertsnavnet lagres, aldri sti eller spoerrestreng. En full adresse
 *    kan baere sporingsparametre, og rapporteringen grupperer uansett bare paa
 *    domene.
 *  - alt som ikke er http/https avvises. `javascript:` og `data:` skal aldri
 *    naa en kolonne vi senere viser fram.
 *  - ugyldig inndata gir `null`, aldri et kast. Sporing er «fire and forget»;
 *    et kast her ville tatt med seg selve klikkregistreringen.
 */
describe('track-click: maaldomene fra utgaaende lenke', () => {
	it('tar vertsnavnet og kaster sti og spoerrestreng', () => {
		expect(sanitizeDestination('https://bookibud.com/bergen-street-food/event/x?date=2026-09-03&marketing=gaari'))
			.toBe('bookibud.com');
	});

	it('fjerner www. saa samme aktoer ikke telles to ganger', () => {
		expect(sanitizeDestination('https://www.litthusbergen.no/program')).toBe('litthusbergen.no');
		expect(sanitizeDestination('https://litthusbergen.no/program')).toBe('litthusbergen.no');
	});

	it('normaliserer store bokstaver', () => {
		expect(sanitizeDestination('https://WWW.Grieghallen.NO/konsert')).toBe('grieghallen.no');
	});

	it('avviser alt som ikke er http eller https', () => {
		expect(sanitizeDestination('javascript:alert(1)')).toBeNull();
		expect(sanitizeDestination('data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
		expect(sanitizeDestination('file:///etc/passwd')).toBeNull();
		expect(sanitizeDestination('ftp://example.com/fil')).toBeNull();
	});

	it('avviser noe som ikke er en tekststreng, uten aa kaste', () => {
		expect(sanitizeDestination(undefined)).toBeNull();
		expect(sanitizeDestination(null)).toBeNull();
		expect(sanitizeDestination(42)).toBeNull();
		expect(sanitizeDestination({ url: 'https://example.com' })).toBeNull();
		expect(sanitizeDestination([])).toBeNull();
	});

	it('avviser soeppel og tom streng i stedet for aa kaste', () => {
		expect(sanitizeDestination('')).toBeNull();
		expect(sanitizeDestination('ikke en adresse')).toBeNull();
		expect(sanitizeDestination('https://')).toBeNull();
	});

	it('avviser en adresse som er absurd lang', () => {
		// Taket staar foer URL-parsing, saa en angriper ikke kan bruke
		// endepunktet til aa skrive vilkaarlig mye inn i basen.
		expect(sanitizeDestination('https://example.com/' + 'a'.repeat(2100))).toBeNull();
	});

	it('http er lov, ikke bare https', () => {
		expect(sanitizeDestination('http://example.com/side')).toBe('example.com');
	});
});

describe('track-click: kildeside', () => {
	it('beholder stien og kaster spoerrestreng og anker', () => {
		expect(sanitizeSourcePage('/no/events/konsert?utm_source=fb#billett')).toBe('/no/events/konsert');
	});

	it('krever at stien starter med skraastrek', () => {
		// En full adresse skal ikke inn her — kolonnen er ment for vaare egne
		// stier, og aggregeringen forutsetter det.
		expect(sanitizeSourcePage('https://gaari.no/no/events/konsert')).toBeNull();
		expect(sanitizeSourcePage('no/events/konsert')).toBeNull();
	});

	it('avviser tom, for lang og ikke-tekst', () => {
		expect(sanitizeSourcePage('')).toBeNull();
		expect(sanitizeSourcePage('/' + 'a'.repeat(250))).toBeNull();
		expect(sanitizeSourcePage(null)).toBeNull();
		expect(sanitizeSourcePage(7)).toBeNull();
	});
});
