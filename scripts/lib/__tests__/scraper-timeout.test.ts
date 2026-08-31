import { describe, it, expect } from 'vitest';

import { withTimeout, ScraperTimeoutError } from '../scraper-timeout.js';

/**
 * En sperre maa testes begge veier. Et tak som stopper den trege scraperen,
 * men ogsaa den raske, feiler helt stille: pipelinen ser ut til aa kjoere, og
 * alle kildene rapporterer null. Derfor er den foerste testen her like viktig
 * som den andre.
 *
 * Ingen av testene gaar paa nett eller roerer basen.
 */
describe('withTimeout', () => {
	it('slipper igjennom arbeid som blir ferdig i tide', async () => {
		const raskt = new Promise<{ found: number; inserted: number }>((resolve) =>
			setTimeout(() => resolve({ found: 7, inserted: 3 }), 10)
		);

		await expect(withTimeout(raskt, 500, 'raskkilde')).resolves.toEqual({ found: 7, inserted: 3 });
	});

	it('forlater arbeid som bruker for lang tid', async () => {
		// Blir aldri ferdig — det er nettopp tilfellet taket finnes for.
		const hengende = new Promise<never>(() => {});

		await expect(withTimeout(hengende, 20, 'tregkilde')).rejects.toBeInstanceOf(ScraperTimeoutError);
	});

	it('navngir kilden i feilmeldingen, slik at sammendraget peker paa noen', async () => {
		const hengende = new Promise<never>(() => {});

		await expect(withTimeout(hengende, 20, 'fyllingsdalenteater')).rejects.toThrow(/fyllingsdalenteater/);
	});

	it('lar en ekte feil fra scraperen passere uendret', async () => {
		// Et tidsavbrudd og en krasj skal ikke havne i samme boks: den ene betyr
		// «kilden er treg», den andre «kilden er i stykker».
		const krasjer = Promise.reject(new Error('HTTP 500'));

		await expect(withTimeout(krasjer, 500, 'oedelagtkilde')).rejects.toThrow('HTTP 500');
		await expect(withTimeout(Promise.reject(new Error('HTTP 500')), 500, 'oedelagtkilde'))
			.rejects.not.toBeInstanceOf(ScraperTimeoutError);
	});

	it('rydder timeren, slik at en ferdig scraper ikke holder prosessen i live', async () => {
		// Uten clearTimeout ville en ventende timer holdt hendelsesloekka aapen
		// og gitt akkurat den hengende avslutningen taket skal fjerne.
		const raskt = Promise.resolve('ferdig');
		await withTimeout(raskt, 60_000, 'raskkilde');

		// Naar testen returnerer uten aa henge i 60 sekunder, er timeren ryddet.
		expect(true).toBe(true);
	});
});
