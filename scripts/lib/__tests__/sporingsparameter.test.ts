import { describe, it, expect } from 'vitest';

import { utenSporing, sammeUtenSporing } from '../sporingsparameter.js';

/**
 * Feilen dette retter var stille og kostet penger: 43 av 82 bookibud-rader
 * pekte paa lenken uten henvisningskode, saa klikkene ble ikke kreditert oss.
 * Ingenting var roedt, sidene virket, lenkene virket.
 *
 * Testene maa feste begge retninger. Fjernes for lite, kjenner scraperen ikke
 * igjen raden og lager en ny. Fjernes for mye, slaas to ULIKE arrangementer
 * sammen til ett — og da forsvinner et arrangement fra gaari.no uten at noen
 * ser hvorfor. Den andre feilen er verst.
 */
describe('utenSporing', () => {
	it('fjerner henvisningskoden Bookibud legger paa', () => {
		expect(utenSporing('https://bookibud.com/a/event/b?date=2026-09-12&marketing=gaari'))
			.toBe('https://bookibud.com/a/event/b?date=2026-09-12');
	});

	it('fjerner de vanlige utm-parametrene', () => {
		expect(utenSporing('https://x.no/e?utm_source=gaari&utm_medium=web&id=5'))
			.toBe('https://x.no/e?id=5');
	});

	it('BEHOLDER parametre som bestemmer hvilket arrangement det er', () => {
		// Den farlige retningen. `date` skiller to forestillinger av samme show,
		// og strippes den, blir de til én rad.
		expect(utenSporing('https://bookibud.com/a/event/b?date=2026-09-12'))
			.toBe('https://bookibud.com/a/event/b?date=2026-09-12');
		expect(utenSporing('https://x.no/e?id=5&side=2'))
			.toBe('https://x.no/e?id=5&side=2');
	});

	it('lar en lenke uten parametre staa uroert', () => {
		expect(utenSporing('https://bookibud.com/a/event/b'))
			.toBe('https://bookibud.com/a/event/b');
	});

	it('kaster ikke paa noe som ikke er en gyldig lenke', () => {
		// En scraper skal ikke stoppe fordi en kilde sendte soppel.
		expect(utenSporing('ikke en url')).toBe('ikke en url');
		expect(utenSporing('')).toBe('');
	});
});

describe('sammeUtenSporing', () => {
	it('kjenner igjen raden fra foer henvisningskoden kom', () => {
		expect(
			sammeUtenSporing(
				'https://bookibud.com/a/event/b?date=2026-09-12',
				'https://bookibud.com/a/event/b?date=2026-09-12&marketing=gaari'
			)
		).toBe(true);
	});

	it('slaar ikke sammen to ulike datoer av samme forestilling', () => {
		expect(
			sammeUtenSporing(
				'https://bookibud.com/a/event/b?date=2026-09-12&marketing=gaari',
				'https://bookibud.com/a/event/b?date=2026-10-10&marketing=gaari'
			)
		).toBe(false);
	});

	it('slaar ikke sammen to ulike arrangementer', () => {
		expect(
			sammeUtenSporing('https://bookibud.com/a/event/b', 'https://bookibud.com/a/event/c')
		).toBe(false);
	});
});
