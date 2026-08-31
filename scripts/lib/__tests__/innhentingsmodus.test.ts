import { describe, it, expect, afterEach } from 'vitest';

import { generateDescription, settInnhentingsmodus, erIInnhentingsmodus } from '../ai-descriptions.js';
import { makeDescription, makeDescriptionEn } from '../utils.js';

/**
 * Delingen mellom innhenting og berikelse hviler paa to ting som maa henge
 * sammen, og som ligger i hver sin fil:
 *
 *   1. Innhentingen skriver maltekst uten aa kalle Gemini.
 *   2. Berikelsen plukker opp alt under 170 tegn.
 *
 * Ryker punkt 2 fordi maltekst blir lengre enn 170 tegn, gaar ingenting i
 * stykker med en feilmelding. Radene blir bare staaende med maltekst for
 * alltid, og det ser ut som om alt virker. Derfor er lengdetesten her.
 *
 * Ingen av testene gaar paa nett.
 */

const KORT_NOK_TIL_AA_BYTTES = 170; // speiler backfill-descriptions-from-source.ts

afterEach(() => settInnhentingsmodus(false));

describe('innhentingsmodus', () => {
	it('gir maltekst uten aa kalle modellen', async () => {
		settInnhentingsmodus(true);

		// Ingen GEMINI_API_KEY er satt i testmiljoeet, saa et ekte kall ville
		// uansett falt tilbake. Det testen faktisk fester, er at resultatet er
		// nettopp malteksten, ikke noe annet.
		const d = await generateDescription({
			title: 'Nattflor',
			venue: 'USF Verftet',
			category: 'music',
		} as any);

		expect(d.no).toBe(makeDescription('Nattflor', 'USF Verftet', 'music'));
		expect(d.en).toBe(makeDescriptionEn('Nattflor', 'USF Verftet', 'music'));
	});

	it('gir ikke title_en, som er berikelsens jobb', async () => {
		settInnhentingsmodus(true);

		const d = await generateDescription({
			title: 'Nattflor',
			venue: 'USF Verftet',
			category: 'music',
		} as any);

		expect(d.title_en).toBeUndefined();
	});

	it('maltekst er kort nok til at berikelsen plukker den opp', () => {
		// Den lengste malteksten som kan oppstaa: makeDescription kutter paa
		// 160 tegn, og terskelen i berikelsen er 170. Marginen skal vaere der
		// selv for en absurd lang tittel.
		const langTittel = 'A'.repeat(400);
		const tekst = makeDescription(langTittel, 'B'.repeat(200), 'music');

		expect(tekst.length).toBeLessThan(KORT_NOK_TIL_AA_BYTTES);
		expect(makeDescriptionEn(langTittel, 'B'.repeat(200), 'music').length)
			.toBeLessThan(KORT_NOK_TIL_AA_BYTTES);
	});

	it('er av som standard, saa backfill-jobbene beholder AI-veien', () => {
		// Flagget er prosessomfattende. Blir det klebrig, ville berikelsen ogsaa
		// begynt aa skrive maltekst, og hele delingen falt bort. Leses direkte i
		// stedet for via generateDescription, som ville gaatt paa nett.
		expect(erIInnhentingsmodus()).toBe(false);

		settInnhentingsmodus(true);
		expect(erIInnhentingsmodus()).toBe(true);

		settInnhentingsmodus(false);
		expect(erIInnhentingsmodus()).toBe(false);
	});
});
