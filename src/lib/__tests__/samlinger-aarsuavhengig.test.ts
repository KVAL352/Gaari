import { describe, it, expect } from 'vitest';
import { getAllCollectionSlugs, getCollection } from '../collections';

/**
 * Samlingstekst skal virke uansett aarstall.
 *
 * HVORFOR DENNE FINNES
 *
 * Samlings-URLene er evigvarende og gjenbrukes hvert aar. Sesongsider faar
 * aarstallet lagt paa dynamisk av getSeasonYear(), saa et aarstall skrevet inn
 * i teksten er alltid feil — enten dobbelt opp, eller fjoraarets.
 *
 * 2. september 2026 sto /no/bergenfest med tittelen «Bergenfest — Program og
 * billetter 2027» og meta-beskrivelsen «10.–13. juni paa Bergenhus Festning.
 * Lewis Capaldi, The Hives, Of Monsters and Men og flere». Datoene og
 * artistene var 2026-utgaven. Google viste altsaa fjoraarets lineup under en
 * 2027-tittel, paa en side med 20 136 visninger i kvartalet og 0,68 % CTR.
 *
 * Samme dag hadde fire festivaler i hub-lista dateHint med dagsdatoer fra
 * 2026 — festspillene, nattjazz, bergenfest og beyond-the-gates — mens tre
 * andre bare oppga maaned. Bare maaneden holder seg over tid.
 *
 * MERK forskjellen: 17. mai, sankthans (23. juni) og nyttaarsaften
 * (31. desember) ER faste datoer, og skal fortsatt kunne staa i teksten.
 * Det er festivaldatoer som flytter seg.
 */
describe('samlinger — tekst som maa virke neste aar ogsaa', () => {
	const slugs = getAllCollectionSlugs();

	it('har ingen aarstall skrevet inn i tittel, beskrivelse eller ogSubtitle', () => {
		// Sesongsider faar aarstallet paa dynamisk. Et statisk aarstall er derfor
		// enten dobbelt opp eller utdatert — aldri riktig.
		const treff: string[] = [];
		for (const slug of slugs) {
			const c = getCollection(slug)!;
			for (const felt of ['title', 'description', 'ogSubtitle'] as const) {
				for (const l of ['no', 'en'] as const) {
					const v = c[felt]?.[l];
					if (typeof v === 'string' && /\b20\d\d\b/.test(v)) treff.push(`${slug}.${felt}.${l} = ${v}`);
				}
			}
		}
		expect(treff).toEqual([]);
	});

	it('oppgir bare maaned i dateHint, aldri dagsdatoer', () => {
		// Hub-lista skal si omtrent naar festivalen er. Dagsdatoer stemmer ett aar
		// og er feil resten.
		const DAGSDATO = /\d/;
		const treff: string[] = [];
		for (const slug of slugs) {
			for (const h of getCollection(slug)!.hubCollections ?? []) {
				for (const l of ['no', 'en'] as const) {
					if (DAGSDATO.test(h.dateHint[l])) treff.push(`${slug}.dateHint(${h.slug}).${l} = ${h.dateHint[l]}`);
				}
			}
		}
		expect(treff).toEqual([]);
	});

	it('navngir ingen artist i beskrivelsen av en festivalsamling', () => {
		// Et lineup gjelder ett aar. Bergenfest-beskrivelsen lovet Lewis Capaldi,
		// The Hives og Of Monsters and Men lenge etter at de hadde spilt.
		const ARTISTER_2026 = /Lewis Capaldi|The Hives|Of Monsters and Men/i;
		const treff: string[] = [];
		for (const slug of slugs) {
			const c = getCollection(slug)!;
			for (const l of ['no', 'en'] as const) {
				if (ARTISTER_2026.test(c.description?.[l] ?? '')) treff.push(`${slug}.description.${l}`);
			}
		}
		expect(treff).toEqual([]);
	});
});
