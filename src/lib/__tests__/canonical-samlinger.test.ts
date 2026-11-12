/**
 * Canonical på samlingssider skal peke på seg selv, ikke på en omdirigering.
 *
 * FEILEN (funnet 12. november 2026): sida bygde canonical av
 * `collection.slug`, som er den norske sluggen. `/en/nightlife-bergen` hadde
 * dermed canonical `/en/uteliv`, som 301-er tilbake. Seks engelske sider hadde
 * samme feil, og ingenting ble rødt, fordi alle svarer 200.
 *
 * Sida bruker `collectionHref(collection.slug, lang)`. Testen går gjennom hver
 * adresse i sitemapen og sjekker at den gir adressen tilbake.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { getCollection, getCollectionSitemapPaths, collectionHref } from '$lib/collections';

describe('canonical på samlingssider', () => {
	const sider = getCollectionSitemapPaths();

	it('sitemapen har sider å teste', () => {
		expect(sider.length).toBeGreaterThan(50);
	});

	for (const { lang, slug } of sider) {
		it(`/${lang}/${slug} er sin egen canonical`, () => {
			const samling = getCollection(slug);
			expect(samling, `fant ikke samlingen ${slug}`).toBeDefined();
			expect(collectionHref(samling!.slug, lang)).toBe(`/${lang}/${slug}`);
		});
	}

	it('engelsk utelivside: canonical er nightlife-bergen, ikke uteliv', () => {
		expect(collectionHref(getCollection('nightlife-bergen')!.slug, 'en')).toBe('/en/nightlife-bergen');
	});

	it('sida bygger canonical med collectionHref, ikke av collection.slug', () => {
		const kilde = readFileSync('src/routes/[lang]/[collection]/+page.svelte', 'utf-8');
		const linje = kilde.split('\n').find(l => l.includes('let canonicalUrl'));
		expect(linje).toContain('collectionHref(');
		expect(linje).not.toMatch(/\$\{ssrLang\}\/\$\{data\.collection\.slug\}/);
	});
});
