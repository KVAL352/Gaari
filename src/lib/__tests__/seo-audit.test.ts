/**
 * SEO Audit Tests
 *
 * CI-time validation of:
 * - Source count consistency across codebase
 * - Meta description length for all collections
 * - JSON-LD completeness for all collections
 * - FAQ parity (NO/EN question counts match)
 */

import { describe, it, expect } from 'vitest';
import { getCollection, getAllCollectionSlugs } from '../collections';
import { generateCollectionJsonLd, generateEventJsonLd, generateBreadcrumbJsonLd, generateFaqJsonLdFromItems, getFaqItems } from '../seo';
import * as fs from 'fs';
import * as path from 'path';
import type { GaariEvent } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<GaariEvent> = {}): GaariEvent {
	return {
		id: '1',
		slug: 'test-event-2026-03-01',
		title_no: 'Test Event',
		description_no: 'En test beskrivelse for event',
		category: 'music',
		date_start: '2026-03-01T19:00:00Z',
		venue_name: 'Test Venue',
		address: 'Test Gate 1',
		bydel: 'Sentrum',
		price: 100,
		age_group: 'all',
		language: 'no',
		status: 'approved',
		...overrides
	};
}

/**
 * Count active (uncommented) scrapers in scripts/scrape.ts.
 * Looks for lines between `const scrapers = {` and the closing `};`
 * that contain a function reference (not commented out).
 */
function countActiveScrapers(): number {
	const scrapeFile = path.resolve(import.meta.dirname, '../../../scripts/scrape.ts');
	if (!fs.existsSync(scrapeFile)) return -1;

	const content = fs.readFileSync(scrapeFile, 'utf-8');
	const scraperBlock = content.match(/const scrapers[^{]*\{([\s\S]*?)\n\};/);
	if (!scraperBlock) return -1;

	const lines = scraperBlock[1].split('\n');
	let count = 0;
	for (const line of lines) {
		const trimmed = line.trim();
		// Active scraper line: identifier: scrapeFunctionName (not commented)
		if (trimmed && !trimmed.startsWith('//') && /^\w+:\s*scrape\w+/.test(trimmed)) {
			count++;
		}
	}
	return count;
}

/**
 * Find all numeric source count references in a file.
 * Looks for patterns like "45 kilder", "45 sources", "45 lokale".
 */
function findSourceCounts(filePath: string): number[] {
	if (!fs.existsSync(filePath)) return [];
	const content = fs.readFileSync(filePath, 'utf-8');
	const matches = content.match(/(\d+)\s+(?:kilder|sources|lokale\s+kilder|lokale\s+arrangør|lokale\s+sources|local\s+sources|active\s+scraper)/gi);
	if (!matches) return [];
	return matches.map(m => parseInt(m.match(/\d+/)![0]));
}

// ─── Source Count Consistency ───────────────────────────────────────

describe('source count consistency', () => {
	const activeCount = countActiveScrapers();
	const projectRoot = path.resolve(import.meta.dirname, '../../..');

	it('can read scraper count from scrape.ts', () => {
		expect(activeCount).toBeGreaterThan(0);
	});

	it('seo.ts references match actual scraper count', () => {
		const counts = findSourceCounts(path.join(projectRoot, 'src/lib/seo.ts'));
		for (const count of counts) {
			expect(count, `seo.ts says ${count} but actual active scrapers: ${activeCount}`).toBe(activeCount);
		}
	});

	it('collections.ts references match actual scraper count', () => {
		const counts = findSourceCounts(path.join(projectRoot, 'src/lib/collections.ts'));
		for (const count of counts) {
			expect(count, `collections.ts says ${count} but actual active scrapers: ${activeCount}`).toBe(activeCount);
		}
	});

	it('llms.txt references match actual scraper count', () => {
		const counts = findSourceCounts(path.join(projectRoot, 'static/llms.txt'));
		for (const count of counts) {
			expect(count, `llms.txt says ${count} but actual active scrapers: ${activeCount}`).toBe(activeCount);
		}
	});

	it('all source count references are consistent', () => {
		const files = [
			'src/lib/seo.ts',
			'src/lib/collections.ts',
			'static/llms.txt'
		];
		const allCounts = new Set<number>();
		for (const file of files) {
			const counts = findSourceCounts(path.join(projectRoot, file));
			counts.forEach(c => allCounts.add(c));
		}
		// All references should use the same number
		expect(allCounts.size, `Found inconsistent source counts: ${[...allCounts].join(', ')}`).toBeLessThanOrEqual(1);
	});
});

// ─── Meta Description Validation ────────────────────────────────────

describe('collection meta descriptions', () => {
	const slugs = getAllCollectionSlugs();

	it.each(slugs)('%s — NO description is 50-160 chars', (slug) => {
		const collection = getCollection(slug)!;
		const desc = collection.description.no;
		expect(desc.length, `"${desc}" is ${desc.length} chars`).toBeGreaterThanOrEqual(50);
		expect(desc.length, `"${desc}" is ${desc.length} chars`).toBeLessThanOrEqual(160);
	});

	it.each(slugs)('%s — EN description is 50-160 chars', (slug) => {
		const collection = getCollection(slug)!;
		const desc = collection.description.en;
		expect(desc.length, `"${desc}" is ${desc.length} chars`).toBeGreaterThanOrEqual(50);
		expect(desc.length, `"${desc}" is ${desc.length} chars`).toBeLessThanOrEqual(160);
	});
});

// ─── JSON-LD Completeness ───────────────────────────────────────────

describe('collection JSON-LD', () => {
	const slugs = getAllCollectionSlugs();
	const events = [makeEvent(), makeEvent({ id: '2', slug: 'test-event-2' })];

	it.each(slugs)('%s — produces valid JSON-LD', (slug) => {
		const collection = getCollection(slug)!;
		const jsonLd = generateCollectionJsonLd(collection, 'no', `https://gaari.no/no/${slug}`, events);

		const parsed = JSON.parse(jsonLd);
		expect(parsed['@context']).toBe('https://schema.org');
		expect(parsed['@type']).toBe('CollectionPage');
		expect(parsed.name).toBeTruthy();
		expect(parsed.description).toBeTruthy();
		expect(parsed.url).toContain(slug);
		expect(parsed.mainEntity['@type']).toBe('ItemList');
		expect(parsed.mainEntity.itemListElement.length).toBeGreaterThan(0);
	});

	it.each(slugs)('%s — EN variant also valid', (slug) => {
		const collection = getCollection(slug)!;
		const jsonLd = generateCollectionJsonLd(collection, 'en', `https://gaari.no/en/${slug}`, events);

		const parsed = JSON.parse(jsonLd);
		expect(parsed.name).toBeTruthy();
		expect(parsed.description).toBeTruthy();
	});
});

// ─── FAQ Parity ─────────────────────────────────────────────────────

describe('FAQ parity', () => {
	const slugs = getAllCollectionSlugs();

	it.each(slugs)('%s — NO and EN FAQ have same count', (slug) => {
		const collection = getCollection(slug)!;
		if (!collection.faq) return; // No FAQ is fine

		const noCount = collection.faq.no.length;
		const enCount = collection.faq.en.length;
		expect(noCount, `NO has ${noCount} FAQ items, EN has ${enCount}`).toBe(enCount);
	});

	it.each(slugs)('%s — FAQ items have non-empty Q and A', (slug) => {
		const collection = getCollection(slug)!;
		if (!collection.faq) return;

		for (const lang of ['no', 'en'] as const) {
			for (const item of collection.faq[lang]) {
				expect(item.q.length, `Empty question in ${lang}`).toBeGreaterThan(0);
				expect(item.a.length, `Empty answer in ${lang}`).toBeGreaterThan(0);
			}
		}
	});

	it('site-wide FAQ items have matching NO/EN counts', () => {
		const noItems = getFaqItems('no');
		const enItems = getFaqItems('en');
		expect(noItems.length).toBe(enItems.length);
	});

	it('site-wide FAQ produces valid JSON-LD', () => {
		const items = getFaqItems('no');
		const jsonLd = generateFaqJsonLdFromItems(items);
		const parsed = JSON.parse(jsonLd);

		expect(parsed['@type']).toBe('FAQPage');
		expect(parsed.mainEntity.length).toBe(items.length);
		for (const q of parsed.mainEntity) {
			expect(q['@type']).toBe('Question');
			expect(q.acceptedAnswer['@type']).toBe('Answer');
		}
	});
});

// ─── Event JSON-LD ──────────────────────────────────────────────────

describe('event JSON-LD completeness', () => {
	it('produces valid Event schema with all required fields', () => {
		const event = makeEvent();
		const jsonLd = generateEventJsonLd(event, 'no', 'https://gaari.no/no/events/test');
		const parsed = JSON.parse(jsonLd);

		expect(parsed['@context']).toBe('https://schema.org');
		expect(parsed['@type']).toBe('MusicEvent');
		expect(parsed.name).toBe('Test Event');
		expect(parsed.startDate).toBeTruthy();
		expect(parsed.location['@type']).toBe('Place');
		expect(parsed.offers['@type']).toBe('Offer');
		expect(parsed.eventStatus).toContain('schema.org');
	});

	it('handles free events correctly', () => {
		const event = makeEvent({ price: 0 });
		const jsonLd = generateEventJsonLd(event, 'no', 'https://gaari.no/no/events/test');
		const parsed = JSON.parse(jsonLd);

		expect(parsed.offers.price).toBe('0');
		expect(parsed.offers.priceCurrency).toBe('NOK');
	});

	it('handles cancelled events correctly', () => {
		const event = makeEvent({ status: 'cancelled' });
		const jsonLd = generateEventJsonLd(event, 'no', 'https://gaari.no/no/events/test');
		const parsed = JSON.parse(jsonLd);

		expect(parsed.eventStatus).toContain('EventCancelled');
		expect(parsed.offers.availability).toContain('Discontinued');
	});
});

// ─── Breadcrumb JSON-LD ─────────────────────────────────────────────

describe('breadcrumb JSON-LD', () => {
	it('positions are sequential starting at 1', () => {
		const items = [
			{ name: 'Hjem', url: 'https://gaari.no/no' },
			{ name: 'Events', url: 'https://gaari.no/no/events' },
			{ name: 'Test Event' }
		];
		const jsonLd = generateBreadcrumbJsonLd(items);
		const parsed = JSON.parse(jsonLd);

		expect(parsed.itemListElement).toHaveLength(3);
		expect(parsed.itemListElement[0].position).toBe(1);
		expect(parsed.itemListElement[1].position).toBe(2);
		expect(parsed.itemListElement[2].position).toBe(3);
	});

	it('last item has no URL', () => {
		const items = [
			{ name: 'Hjem', url: 'https://gaari.no/no' },
			{ name: 'Last Item' }
		];
		const jsonLd = generateBreadcrumbJsonLd(items);
		const parsed = JSON.parse(jsonLd);

		expect(parsed.itemListElement[1].item).toBeUndefined();
	});
});

// ─── Collection Metadata Completeness ───────────────────────────────

describe('collection metadata', () => {
	const slugs = getAllCollectionSlugs();

	it.each(slugs)('%s — has bilingual title', (slug) => {
		const c = getCollection(slug)!;
		expect(c.title.no.length).toBeGreaterThan(0);
		expect(c.title.en.length).toBeGreaterThan(0);
	});

	it.each(slugs)('%s — has editorial content', (slug) => {
		const c = getCollection(slug)!;
		if (c.editorial) {
			expect(c.editorial.no.length).toBeGreaterThan(0);
			expect(c.editorial.en.length).toBeGreaterThan(0);
		}
	});

	it.each(slugs)('%s — has ogSubtitle', (slug) => {
		const c = getCollection(slug)!;
		expect(c.ogSubtitle.no.length).toBeGreaterThan(0);
		expect(c.ogSubtitle.en.length).toBeGreaterThan(0);
	});

	it('all collections have relatedSlugs that point to valid collections', () => {
		const allSlugs = new Set(slugs);
		for (const slug of slugs) {
			const c = getCollection(slug)!;
			if (c.relatedSlugs) {
				for (const related of c.relatedSlugs) {
					expect(allSlugs.has(related), `${slug} references unknown slug: ${related}`).toBe(true);
				}
			}
		}
	});
});
