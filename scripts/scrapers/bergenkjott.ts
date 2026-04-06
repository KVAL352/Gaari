import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bergenkjott';
const BASE_URL = 'https://www.bergenkjott.org';
const LIST_URL = `${BASE_URL}/kalendar`;
const VENUE = 'Bergen Kjøtt';
const ADDRESS = 'Skutevikstorget 1, Bergen';
const DELAY_MS = 1500; // 1.5 seconds between detail page fetches

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

/** Word-boundary check — avoids false positives like "format" matching "mat" */
function hasWord(text: string, word: string): boolean {
	return new RegExp(`\\b${word}\\b`).test(text);
}

/** Check for Norwegian compound words ending with the keyword */
function hasCompound(text: string, suffix: string): boolean {
	return new RegExp(`\\w${suffix}\\b`).test(text);
}

function guessCategory(title: string): string {
	const t = title.toLowerCase();
	if (hasWord(t, 'konsert') || hasWord(t, 'release') || hasWord(t, 'trio') || hasWord(t, 'band') || hasWord(t, 'dj') || hasCompound(t, 'konsert')) return 'music';
	if (hasWord(t, 'soup') || t.includes('mat og drikke') || hasWord(t, 'mela') || hasWord(t, 'food')) return 'food';
	if (hasWord(t, 'festival') || hasWord(t, 'swap') || hasWord(t, 'marked')) return 'festival';
	if (hasWord(t, 'workshop') || hasWord(t, 'kurs') || hasWord(t, 'draw')) return 'workshop';
	if (hasWord(t, 'quiz') || hasCompound(t, 'quiz')) return 'nightlife';
	if (t.includes('re-opening') || t.includes('party') || t.includes('afterparty')) return 'nightlife';
	if (hasWord(t, 'wrestling') || hasWord(t, 'sport')) return 'sports';
	if (hasWord(t, 'utstilling') || hasWord(t, 'kunst') || hasWord(t, 'art')) return 'culture';
	return 'culture';
}

function decodeEntities(text: string): string {
	return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function stripHtml(html: string): string {
	return decodeEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function extractPrice(html: string): string {
	const text = stripHtml(html);
	// Match patterns like "200kr", "200 kr", "kr 200", "200,-", "kr. 200"
	const m = text.match(/\b(\d{2,5})\s*kr\b/i) || text.match(/\bkr\.?\s*(\d{2,5})\b/i);
	if (m) return `${m[1]} kr`;
	if (/gratis|fri\s+inngang|free\s+entry/i.test(text)) return 'Gratis';
	return '';
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

		const price = extractPrice(html);
		const aiDesc = await generateDescription({ title, venue: venueName, category, date: startDate, price });

		const success = await insertEvent({
			slug: makeSlug(title, datePart),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venueName,
			address,
			bydel,
			price,
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
