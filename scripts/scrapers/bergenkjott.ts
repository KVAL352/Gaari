import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bergenkjott';
const BASE_URL = 'https://bergenkjott.org';
const LIST_URL = `${BASE_URL}/kalendar`;
const VENUE = 'Bergen Kjøtt';
const ADDRESS = 'Skutevikstorget 1, Bergen';
const DELAY_MS = 3000; // 3 seconds between detail page fetches

interface JsonLdEvent {
	'@type': string;
	name: string;
	startDate: string;
	endDate?: string;
	location?: {
		name?: string;
		address?: {
			streetAddress?: string;
			addressLocality?: string;
		};
	};
	image?: string | string[];
	description?: string;
	url?: string;
}

function guessCategory(title: string): string {
	const t = title.toLowerCase();
	if (t.includes('konsert') || t.includes('release') || t.includes('trio') || t.includes('band') || t.includes('dj')) return 'music';
	if (t.includes('soup') || t.includes('mat') || t.includes('mela') || t.includes('food')) return 'food';
	if (t.includes('festival') || t.includes('swap') || t.includes('marked')) return 'festival';
	if (t.includes('workshop') || t.includes('kurs')) return 'workshop';
	if (t.includes('quiz')) return 'nightlife';
	if (t.includes('wrestling') || t.includes('sport')) return 'sports';
	return 'music';
}

function decodeEntities(text: string): string {
	return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function stripHtml(html: string): string {
	return decodeEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function parseJsonLd(html: string): JsonLdEvent | null {
	const $ = cheerio.load(html);
	const scripts = $('script[type="application/ld+json"]');

	for (let i = 0; i < scripts.length; i++) {
		try {
			const data = JSON.parse(scripts.eq(i).html() || '');
			const items = Array.isArray(data) ? data : [data];
			for (const item of items) {
				if (item['@type'] === 'Event' || item['@type'] === 'SocialEvent') {
					return item as JsonLdEvent;
				}
			}
		} catch { /* skip malformed JSON-LD */ }
	}

	return null;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Kjøtt events (HTML + JSON-LD)...`);

	// Step 1: Get listing page and extract event URLs from <noscript> fallback
	const listHtml = await fetchHTML(LIST_URL);
	if (!listHtml) return { found: 0, inserted: 0 };

	// The calendar view is JS-rendered; event links are in the <noscript> block
	const noscriptMatch = listHtml.match(/<noscript>([\s\S]*?)<\/noscript>/);
	if (!noscriptMatch) {
		console.error(`[${SOURCE}] No noscript fallback found`);
		return { found: 0, inserted: 0 };
	}

	const $ns = cheerio.load(noscriptMatch[1]);
	const events: Array<{ path: string; title: string; imageUrl?: string }> = [];

	$ns('li').each((_, el) => {
		const link = $ns(el).find('a[href^="/kalendar/"]');
		const path = link.attr('href');
		const title = link.text().trim();
		const img = $ns(el).find('img[data-src]');
		const imageUrl = img.attr('data-src') || undefined;

		if (path && title) {
			events.push({ path, title, imageUrl });
		}
	});

	console.log(`[${SOURCE}] Found ${events.length} events in noscript listing`);

	if (events.length === 0) return { found: 0, inserted: 0 };

	// Step 2: Filter out already-known events
	const newEvents = [];
	for (const event of events) {
		const sourceUrl = `${BASE_URL}${event.path}`;
		if (!(await eventExists(sourceUrl))) {
			newEvents.push({ ...event, sourceUrl });
		}
	}

	console.log(`[${SOURCE}] ${newEvents.length} new events to fetch`);

	// Step 3: Fetch detail pages for new events to get dates from JSON-LD
	const now = new Date();
	let found = 0;
	let inserted = 0;

	for (let i = 0; i < newEvents.length; i++) {
		if (i > 0) await delay(DELAY_MS);

		const { sourceUrl, title: listTitle, imageUrl: listImage } = newEvents[i];

		const html = await fetchHTML(sourceUrl);
		if (!html) continue;

		const jsonLd = parseJsonLd(html);
		if (!jsonLd || !jsonLd.startDate) continue;

		// Skip past events
		const startDate = new Date(jsonLd.startDate);
		if (startDate < now) continue;

		found++;

		const title = decodeEntities(jsonLd.name || listTitle);
		if (!title) continue;

		const dateStart = startDate.toISOString();
		const dateEnd = jsonLd.endDate ? new Date(jsonLd.endDate).toISOString() : undefined;
		const datePart = dateStart.slice(0, 10);
		const category = guessCategory(title);
		const bydel = mapBydel(VENUE);

		// Image — prefer JSON-LD, fall back to noscript listing
		let imageUrl: string | undefined = listImage;
		if (typeof jsonLd.image === 'string') {
			imageUrl = jsonLd.image;
		} else if (Array.isArray(jsonLd.image) && jsonLd.image.length > 0) {
			imageUrl = jsonLd.image[0];
		}

		const venueName = jsonLd.location?.name || VENUE;
		const address = jsonLd.location?.address?.streetAddress
			? `${jsonLd.location.address.streetAddress}, ${jsonLd.location.address.addressLocality || 'Bergen'}`
			: ADDRESS;

		const aiDesc = await generateDescription({ title, venue: venueName, category, date: startDate, price: '' });

		const success = await insertEvent({
			slug: makeSlug(title, datePart),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venueName,
			address,
			bydel,
			price: '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: 'all',
			language: title.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
