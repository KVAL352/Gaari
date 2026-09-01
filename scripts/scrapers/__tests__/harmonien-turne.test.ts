import { describe, it, expect } from 'vitest';

import { erTurneUtenforBergen } from '../harmonien.js';

/**
 * Harmonien-scraperen setter Grieghallen som sted på alt. 1. september 2026
 * var alle tre kommende oppføringer turnékonserter i Merano, Verona og
 * Besançon, alle presentert som Grieghallen i Bergen. Noen kunne møtt opp i
 * Grieghallen til en konsert som skjer i Frankrike.
 *
 * Testen vektlegger den andre retningen like tungt. Et for bredt mønster ville
 * fjernet ekte Bergen-konserter fra sida, og det er en verre feil enn den vi
 * retter: da forsvinner arrangementer uten at noen ser hvorfor.
 */
describe('erTurneUtenforBergen', () => {
	describe('kjenner igjen turné et annet sted', () => {
		const treff: [string, string][] = [
			['Turnekonsert i Besançon', 'Besançon'],
			['Turnékonsert i Merano', 'Merano'],
			['Turnékonsert i Verona', 'Verona'],
			['Turné i Wien med Edward Gardner', 'Wien med Edward Gardner'],
		];

		for (const [tittel, sted] of treff) {
			it(`«${tittel}» hoeres til i ${sted}`, () => {
				expect(erTurneUtenforBergen(tittel)).toBe(sted);
			});
		}
	});

	describe('lar Bergen-konserter staa', () => {
		const bom = [
			// Bergen nevnt som stedet: skal beholdes.
			'Turnéstart i Bergen',
			'Turnékonsert i Grieghallen',
			// Ingen «i sted» etter ordet: bare en omtale.
			'Sesongåpning med turné til høsten',
			'Turnéjubileum',
			// Vanlige konserter.
			'Beethovens niende',
			'Julekonsert med Edvard Grieg Kor',
			'',
		];

		for (const tittel of bom) {
			it(`«${tittel}» beholdes`, () => {
				expect(erTurneUtenforBergen(tittel)).toBeNull();
			});
		}
	});

	it('kutter stedsnavnet ved skilletegn', () => {
		expect(erTurneUtenforBergen('Turnékonsert i Verona, Italia')).toBe('Verona');
		expect(erTurneUtenforBergen('Turnékonsert i Merano: Mahler 5')).toBe('Merano');
	});
});
