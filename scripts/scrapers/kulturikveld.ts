import * as cheerio from 'cheerio';
import { mapCategory, mapBydel } from '../lib/categories.js';
import { resolveTicketUrl } from '../lib/venues.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'kulturikveld';
const BASE_URL = 'https://kulturikveld.no';
const LIST_URL = `${BASE_URL}/arrangementer/bergen`;
const MAX_PAGES = 25;
const DELAY_MS = 3000;

interface KikEvent {
	name: string;
	url: string;
	startDate: string;
	endDate?: string;
	venueName: string;
	address: string;
	imageUrl?: string;
	category: string;
	price: string;
	description: string;
}

interface JsonLdEvent {
	name: string;
	startDate: string;
	endDate?: string;
	url: string;
	location?: {
		name?: string;
		address?: {
			streetAddress?: string;
			addressLocality?: string;
		};
		geo?: {
			latitude?: number;
			longitude?: number;
		};
	};
	image?: string;
	eventStatus?: string;
}

// Extract display ID from either URL format:
// JSON-LD: /bergen/GpEAUc-slug  →  GpEAUc
// HTML:    /bergen/slug/GpEAUc   →  GpEAUc
function extractDisplayId(url: string): string {
	const path = url.replace(/^https?:\/\/[^/]+/, '');
	const parts = path.split('/').filter(Boolean);
	// Last segment for HTML format: /bergen/slug/ID
	const last = parts[parts.length - 1] || '';
	// For JSON-LD format: /bergen/ID-slug — ID is before first hyphen if it's short (6 chars)
	const secondToLast = parts[parts.length - 1] || '';
	const idMatch = secondToLast.match(/^([A-Za-z0-9]{5,7})-/);
	if (idMatch) return idMatch[1];
	// HTML format: last segment is the ID
	if (last.length <= 7 && /^[A-Za-z0-9]+$/.test(last)) return last;
	return last;
}

function parsePage(html: string): { events: KikEvent[]; totalPages: number } {
	const $ = cheerio.load(html);
	const events: KikEvent[] = [];

	// Parse JSON-LD for structured event data
	const jsonLdMap = new Map<string, JsonLdEvent>();
	const jsonLdById = new Map<string, JsonLdEvent>();
	$('script[type="application/ld+json"]').each((_, el) => {
		try {
			const data = JSON.parse($(el).html() || '{}');
			if (data['@type'] === 'ItemList' && data.itemListElement) {
				for (const item of data.itemListElement) {
					const evt = item.item as JsonLdEvent;
					if (evt?.url) {
						jsonLdMap.set(evt.url, evt);
						jsonLdById.set(extractDisplayId(evt.url), evt);
					}
				}
			}
		} catch { /* ignore parse errors */ }
	});

	// Parse HTML event cards for category and price (not in JSON-LD)
	// Key by display ID to match with JSON-LD (URLs differ between formats)
	const cardData = new Map<string, { category: string; price: string; description: string }>();
	$('li.mb-6, li.mb-10').each((_, el) => {
		const $card = $(el);
		const link = $card.find('a[href*="/arrangementer/bergen/"]').attr('href');
		if (!link) return;

		const displayId = extractDisplayId(link.startsWith('http') ? link : `${BASE_URL}${link}`);

		// Category from icon
		let category = '';
		$card.find('.flex.items-center').each((_, meta) => {
			const $meta = $(meta);
			if ($meta.find('svg[data-icon*="category"]').length) {
				category = $meta.find('div').text().trim();
			}
		});

		// Price from icon
		let price = '';
		$card.find('.flex.items-center').each((_, meta) => {
			const $meta = $(meta);
			if ($meta.find('svg[data-icon*="money"]').length) {
				price = $meta.find('div').text().trim();
			}
		});

		// Description excerpt
		const description = $card.find('p.line-clamp-3').text().trim();

		cardData.set(displayId, { category, price, description });
	});

	// Merge JSON-LD + HTML data (matched by display ID)
	for (const [url, ld] of jsonLdMap) {
		if (!ld.name || !ld.startDate) continue;

		// Skip cancelled events
		if (ld.eventStatus?.includes('Cancelled')) continue;

		const displayId = extractDisplayId(url);
		const html = cardData.get(displayId) || { category: '', price: '', description: '' };

		// Parse price string — extract numbers
		let priceStr = '';
		if (html.price) {
			const priceMatch = html.price.match(/(\d[\d\s]*)/);
			if (priceMatch) {
				priceStr = priceMatch[1].replace(/\s/g, '').trim();
			}
			if (html.price.toLowerCase().includes('gratis') || html.price === '0') {
				priceStr = '0';
			}
		}

		events.push({
			name: ld.name.slice(0, 200),
			url,
			startDate: ld.startDate,
			endDate: ld.endDate || undefined,
			venueName: ld.location?.name || 'Bergen',
			address: ld.location?.address?.streetAddress || ld.location?.name || 'Bergen',
			imageUrl: ld.image || undefined,
			category: html.category,
			price: priceStr,
			description: html.description || ld.name,
		});
	}

	// Total pages from pagination
	let totalPages = 1;
	const pageText = $('li[aria-current="page"]').text();
	const pageMatch = pageText.match(/Side \d+ av (\d+)/);
	if (pageMatch) {
		totalPages = parseInt(pageMatch[1]);
	}

	return { events, totalPages };
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Starting scrape of Kultur i Kveld (Bergen)...`);

	let found = 0;
	let inserted = 0;

	const firstHtml = await fetchHTML(LIST_URL);
	if (!firstHtml) return { found: 0, inserted: 0 };

	const firstPage = parsePage(firstHtml);
	const pagesToScrape = Math.min(firstPage.totalPages, MAX_PAGES);
	console.log(`[${SOURCE}] Total pages: ${firstPage.totalPages}, scraping first ${pagesToScrape}`);
	console.log(`[${SOURCE}] Page 1: ${firstPage.events.length} events`);

	const allEvents: KikEvent[] = [...firstPage.events];

	for (let page = 2; page <= pagesToScrape; page++) {
		console.log(`[${SOURCE}] Fetching page ${page}/${pagesToScrape}...`);
		await delay(DELAY_MS);
		const html = await fetchHTML(`${LIST_URL}?side=${page}`);
		if (!html) continue;
		const { events } = parsePage(html);
		console.log(`[${SOURCE}] Page ${page}: ${events.length} events`);
		allEvents.push(...events);
	}

	found = allEvents.length;
	console.log(`[${SOURCE}] Total events found: ${found}`);

	for (const event of allEvents) {
		if (await eventExists(event.url)) continue;

		const category = event.category ? mapCategory(event.category) : 'culture';
		const bydel = mapBydel(event.venueName);

		const aiDesc = await generateDescription({ title: event.name, venue: event.venueName, category, date: new Date(event.startDate), price: event.price });
		const success = await insertEvent({
			slug: makeSlug(event.name, event.startDate),
			title_no: event.name,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: new Date(event.startDate).toISOString(),
			date_end: event.endDate ? new Date(event.endDate).toISOString() : undefined,
			venue_name: event.venueName,
			address: event.address,
			bydel,
			price: event.price,
			ticket_url: resolveTicketUrl(event.venueName, event.url),
			source: SOURCE,
			source_url: event.url,
			image_url: event.imageUrl,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.name} (${event.venueName}, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
