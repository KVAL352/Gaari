/**
 * Sitemapen skal inneholde hver adresse hreflang peker paa.
 *
 * HVORFOR DENNE FINNES
 *
 * 2. september 2026 manglet seks engelske samlesider i sitemap.xml:
 * things-to-do-bergen, rainy-day-bergen, family-bergen, nightlife-bergen,
 * festivals-in-bergen og tomorrow-in-bergen.
 *
 * Sitemapen gikk over `getAllCollectionSlugs()` og skrev bare de spraakene der
 * sluggen var sin egen kanoniske adresse. Motparten kom med bare hvis den selv
 * var en samling. `this-weekend` er det; `rainy-day-bergen` er bare et alias i
 * HREFLANG_PAIRS.
 *
 * Ingenting ble roedt: sidene svarer 200, de er indeksert, og to av dem tjente
 * til og med klikk fordi Google fant dem via hreflang. Feilen var bare synlig
 * for den som sammenlignet to lister for haand.
 */
import { describe, it, expect } from 'vitest';
import { getAllCollectionSlugs, getHreflangSlugs, getCollectionSitemapPaths, getCollection, isCollectionLang } from '../collections';

describe('sitemap — samlesider', () => {
	const stier = getCollectionSitemapPaths();
	const noekler = new Set(stier.map((s) => `${s.lang}/${s.slug}`));

	it('inneholder begge sidene av hvert hreflang-par som lever', () => {
		// «Som lever»: fra 2. september 2026 er /no/i-kveld og /no/i-dag lagt ned
		// og 301-er til forsiden, mens de engelske utgavene staar. En sitemap som
		// listet dem ville pekt paa en omdirigering. Se
		// `tidssider-paa-forsiden.test.ts` for selve beslutningen.
		const mangler: string[] = [];
		for (const slug of getAllCollectionSlugs()) {
			const h = getHreflangSlugs(slug);
			for (const lang of ['no', 'en'] as const) {
				if (!isCollectionLang(h[lang], lang)) continue;
				if (!noekler.has(`${lang}/${h[lang]}`)) mangler.push(`${lang}/${h[lang]} (fra ${slug})`);
			}
		}
		expect(mangler).toEqual([]);
	});

	it('lister ingen adresse som er lagt ned paa det spraaket', () => {
		const doede = stier.filter((s) => !isCollectionLang(s.slug, s.lang)).map((s) => `${s.lang}/${s.slug}`);
		expect(doede).toEqual([]);
	});

	it('tar med de seks engelske aliassidene som falt ut', () => {
		// Navngitt med vilje: det var disse som manglet, og en regresjon skal
		// peke rett paa dem i stedet for bare aa si «antallet endret seg».
		for (const slug of [
			'things-to-do-bergen',
			'rainy-day-bergen',
			'family-bergen',
			'nightlife-bergen',
			'festivals-in-bergen',
			'tomorrow-in-bergen',
		]) {
			expect(noekler.has(`en/${slug}`), `en/${slug} mangler i sitemapen`).toBe(true);
		}
	});

	it('lister ingen adresse to ganger', () => {
		expect(noekler.size).toBe(stier.length);
	});

	it('lister bare adresser som faktisk svarer', () => {
		// getCollection() slaar opp bade kanoniske slugger og aliaser. Svarer den
		// ikke, ville sida gitt 404 — og en sitemap med doede lenker er verre enn
		// en som mangler noen.
		for (const { lang, slug } of stier) {
			expect(getCollection(slug), `${lang}/${slug} finnes ikke som samling`).toBeTruthy();
		}
	});

	it('peker hver adresse paa seg selv i sitt eget spraak', () => {
		// Ellers ville sitemapen listet en adresse som redirecter: rutene
		// 301-er /en/regndagsguide → /en/rainy-day-bergen.
		for (const { lang, slug } of stier) {
			expect(getHreflangSlugs(slug)[lang], `${lang}/${slug} redirecter`).toBe(slug);
		}
	});
});
