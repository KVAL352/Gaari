import { describe, it, expect } from 'vitest';

import { hasAdultAgeLimit } from '../categories.js';

/**
 * En sperre maa testes begge veier. Et for ivrig moenster ville flyttet
 * hundrevis av aapne arrangementer ut av /for-ungdom og familiefiltrene, og
 * ingen ville sett en feilmelding — sidene ville bare blitt tommere.
 * Falske-positive-testene nederst er derfor ikke pynt.
 *
 * Formuleringene under er hentet ordrett fra beskrivelsene i basen 31. august
 * 2026, ikke funnet paa.
 */
describe('hasAdultAgeLimit', () => {
	describe('kjenner igjen en uttrykt aldersgrense', () => {
		const treff = [
			'Arrangementet finner sted fredag 18. september 2026 kl. 21.00, med aldersgrense 18 år.',
			'Perfect Sounds Forever, starter kl. 21.00 og har aldersgrense fra 18 år.',
			'Dette er en humorforestilling med aldersgrense 18 år, som starter kl. 21.00.',
			'har en varighet på to timer og er for publikum over 18 år.',
			'Konserten har aldersgrense på 20 år.',
			'This event has an age limit of 18.',
			'Klubbkveld 20+',
		];

		for (const tekst of treff) {
			it(`treffer: «${tekst.slice(0, 45)}…»`, () => {
				expect(hasAdultAgeLimit(tekst)).toBe(true);
			});
		}
	});

	describe('lar aapne arrangementer vaere i fred', () => {
		const bom = [
			// Datoer er den aapenbare fella: «18. september» er ikke en aldersgrense.
			'Arrangementet finner sted fredag 18. september 2026 kl. 21.00.',
			'Konserten holdes 20. oktober og er gratis for alle.',
			// Alder nevnt av andre grunner.
			'Det er 18 år siden bandet sist spilte i Bergen.',
			'Utstillingen markerer 20 år med samtidskunst i Bergen.',
			// Nedre aldersgrenser for barn skal ikke leses som 18+.
			'Arrangementet har fri aldersgrense.',
			'Passer for barn fra 6 år og oppover.',
			'Verkstedet er for ungdom mellom 13 og 18 år.',
			// Tom og manglende tekst.
			'',
		];

		for (const tekst of bom) {
			it(`treffer ikke: «${tekst.slice(0, 45)}…»`, () => {
				expect(hasAdultAgeLimit(tekst)).toBe(false);
			});
		}

		it('takler null og undefined', () => {
			expect(hasAdultAgeLimit(null, undefined)).toBe(false);
		});
	});

	it('leser flere felter, slik at tittel eller beskrivelse holder', () => {
		expect(hasAdultAgeLimit('Klubbkveld', 'Aldersgrense 18 år.')).toBe(true);
		expect(hasAdultAgeLimit('Klubbkveld 18+', null)).toBe(true);
		expect(hasAdultAgeLimit('Familiedag', 'Gratis for alle.')).toBe(false);
	});
});
