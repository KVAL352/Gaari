/**
 * Tidssoekene samles paa forsiden — paa norsk, og bare paa norsk.
 *
 * BESLUTNINGEN (2. september 2026)
 *
 * `/no/i-kveld` laa paa snittposisjon 32,2 og `/no/i-dag` paa 22,8, mens `/no`
 * tok de samme soekene paa plass 5–6. Google valgte forsiden uansett, saa de to
 * sidene delte signalet uten aa vinne noe. De 301-er naa til forsiden.
 *
 * Paa engelsk er bildet motsatt, og det er hele poenget med at dette er per
 * spraak: `/en/i-kveld` er vaar beste samleside — 268 klikk paa 90 dager paa
 * plass 6,2, og 151 av dem de siste 28 dagene mot 58 i perioden foer. Der
 * rangerer ikke forsiden paa de soekene. Fjerner vi sida, gir vi bort
 * trafikken i stedet for aa flytte den.
 *
 * Testen finnes fordi det er lett aa «rydde opp» i dette senere og ta med den
 * engelske sida paa kjoepet.
 */
import { describe, it, expect } from 'vitest';
import {
	getCollection,
	getCollectionSitemapPaths,
	collectionHref,
	isCollectionLang,
	getFooterCollections,
	getGroupedCollections,
} from '../collections';

describe('tidssider — norsk samles paa forsiden, engelsk beholdes', () => {
	const iSitemap = new Set(getCollectionSitemapPaths().map((s) => `${s.lang}/${s.slug}`));

	it('lar /en/i-kveld leve', () => {
		expect(isCollectionLang('i-kveld', 'en')).toBe(true);
		expect(iSitemap.has('en/i-kveld')).toBe(true);
		expect(collectionHref('i-kveld', 'en')).toBe('/en/i-kveld');
	});

	it('lar /en/today-in-bergen leve', () => {
		expect(isCollectionLang('today-in-bergen', 'en')).toBe(true);
		expect(iSitemap.has('en/today-in-bergen')).toBe(true);
	});

	it('sender de norske tidssidene til forsiden', () => {
		for (const slug of ['i-kveld', 'i-dag']) {
			expect(isCollectionLang(slug, 'no'), `${slug} skal ikke leve paa norsk`).toBe(false);
			expect(collectionHref(slug, 'no')).toBe('/no');
		}
	});

	it('holder de norske tidssidene ute av sitemapen', () => {
		// /no/i-dag ble tidligere skrevet inn igjen naar vi itererte over
		// `today-in-bergen`, som deler hreflang-par med den.
		expect(iSitemap.has('no/i-kveld')).toBe(false);
		expect(iSitemap.has('no/i-dag')).toBe(false);
	});

	it('lenker ikke til dem fra den norske footeren', () => {
		const norsk = getFooterCollections('no').map((c) => c.slug);
		expect(norsk).not.toContain('i-kveld');
		expect(norsk).not.toContain('i-dag');
	});

	it('lenker til /en/i-kveld fra den engelske footeren', () => {
		// Sida hadde ingen footerlenke i det hele tatt foer, paa noe spraak der
		// den faktisk lever.
		expect(getFooterCollections('en').map((c) => c.slug)).toContain('i-kveld');
	});

	it('viser dem ikke i «Naar»-gruppa paa den norske forsiden', () => {
		const naar = getGroupedCollections('no').find((g) => g.label.no === 'Når');
		const slugs = (naar?.items ?? []).map((i) => i.slug);
		expect(slugs).not.toContain('i-kveld');
		expect(slugs).not.toContain('i-dag');
	});

	it('beholder dem i «Naar»-gruppa paa engelsk', () => {
		const naar = getGroupedCollections('en').find((g) => g.label.no === 'Når');
		expect((naar?.items ?? []).map((i) => i.slug)).toContain('i-kveld');
	});

	it('lenker ingen relatedSlugs-liste til en side som ikke lever paa spraaket', () => {
		// `i-kveld` staar i tretten lister. Paa norsk ville hver av dem gitt en
		// «utforsk videre»-lenke rett tilbake til forsiden.
		const brudd: string[] = [];
		for (const slug of ['denne-helgen', 'konserter', 'gratis', 'uteliv', 'studentkveld']) {
			const c = getCollection(slug);
			for (const rel of c?.relatedSlugs ?? []) {
				for (const l of ['no', 'en'] as const) {
					if (!isCollectionLang(rel, l) && collectionHref(rel, l) !== `/${l}`) {
						brudd.push(`${slug} → ${rel} (${l})`);
					}
				}
			}
		}
		expect(brudd).toEqual([]);
	});
});
