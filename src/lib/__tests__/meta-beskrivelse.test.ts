import { describe, it, expect } from 'vitest';
import { samlingBeskrivelse } from '../meta-beskrivelse';
import { getCollection, getAllCollectionSlugs } from '../collections';

const festspillene = {
	base: 'Komplett program for Festspillene i Bergen — konserter, teater, dans og kunst. Oppdatert daglig.',
	title: 'Festspillene i Bergen 2027',
	seasonal: true,
	year: 2027
};

describe('samlingBeskrivelse', () => {
	it('tom sesong: lover ikke program, sier at det ikke er ute', () => {
		const no = samlingBeskrivelse({ ...festspillene, count: 0, lang: 'no' });
		expect(no).toBe('Festspillene i Bergen 2027: programmet er ikke ute ennå. Arrangementene legges ut her når de blir publisert.');
		const en = samlingBeskrivelse({ ...festspillene, title: 'Bergen International Festival 2027', count: 0, lang: 'en' });
		expect(en).toMatch(/^Bergen International Festival 2027: the programme is not out yet\./);
	});

	it('sesong med arrangementer: beholder beskrivelsen og tallet', () => {
		const s = samlingBeskrivelse({ ...festspillene, base: 'Påske i Bergen: konserter.', title: 'Påske i Bergen 2027', count: 6, lang: 'no' });
		expect(s).toBe('Påske i Bergen: konserter 2027. 6 arrangementer akkurat nå.');
	});

	it('vanlig samling uten treff: bare beskrivelsen, ingen tomsesong-tekst', () => {
		expect(samlingBeskrivelse({ base: 'Konserter i Bergen.', title: 'Konserter', year: 2026, count: 0, lang: 'no' }))
			.toBe('Konserter i Bergen.');
	});

	it('tallet faller bort når det ikke får plass innen 165 tegn', () => {
		const lang = 'x'.repeat(150) + '.';
		expect(samlingBeskrivelse({ base: lang, title: 'T', year: 2026, count: 12, lang: 'no' })).toBe(lang);
		expect(samlingBeskrivelse({ base: 'Kort.', title: 'T', year: 2026, count: 1, lang: 'en' })).toBe('Kort. 1 event right now.');
	});

	it.each(getAllCollectionSlugs().filter(s => getCollection(s)?.seasonal))(
		'%s: tom sesong-tekst holder seg under 160 tegn',
		(slug) => {
			const c = getCollection(slug)!;
			for (const lang of ['no', 'en'] as const) {
				const t = samlingBeskrivelse({ base: c.description[lang], title: `${c.title[lang]} 2027`, seasonal: true, year: 2027, count: 0, lang });
				expect(t.length).toBeLessThanOrEqual(160);
				expect(t).not.toMatch(/komplett|oppdatert daglig|complete|updated daily/i);
			}
		}
	);
});
