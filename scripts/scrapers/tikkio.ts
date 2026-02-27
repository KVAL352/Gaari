import * as cheerio from 'cheerio';
import { mapBydel, isKnownBergenVenue } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'tikkio';
const LIST_URL = 'https://tikkio.com/in/bergen-norway';

interface TikkioOffer {
	'@type': string;
	price: string;
	priceCurrency: string;
	url?: string;
}

interface TikkioEvent {
	'@type': string;
	name: string;
	description?: string;
	startDate: string;
	endDate?: string;
	location?: {
		'@type': string;
		name: string;
		address?: {
			'@type': string;
			streetAddress?: string;
			addressCountry?: string;
		};
	};
	organizer?: {
		'@type': string;
		name: string;
		url?: string;
	};
	image?: string;
	offers?: TikkioOffer;
}

interface TikkioListItem {
	'@type': string;
	position: number;
	item: TikkioEvent;
}

function isBergen(event: TikkioEvent): boolean {
	const street = event.location?.address?.streetAddress || '';
	const name = event.location?.name || '';
	const text = `${street} ${name}`.toLowerCase();
	if (text.includes('bergen')) return true;
	// Fallback: accept if venue is in our known Bergen venue list
	const venueName = name.replace(/,\s*Bergen$/i, '').trim();
	if (venueName && isKnownBergenVenue(venueName)) return true;
	return false;
}

function formatPrice(price: string | undefined, currency: string | undefined): string {
	if (!price) return '';
	const num = parseFloat(price);
	if (isNaN(num)) return '';
	if (num === 0) return 'Gratis';
	// Strip trailing decimals if .00
	const formatted = Number.isInteger(num) ? num.toString() : num.toFixed(0);
	return `fra ${formatted} kr`;
}

function guessCategory(title: string, venueName: string): string {
	const text = `${title} ${venueName}`.toLowerCase();
	if (text.includes('konsert') || text.includes('concert') || text.includes('musikk') || text.includes('jazz') || text.includes('blues') || text.includes('band')) return 'music';
	if (text.includes('revy') || text.includes('teater') || text.includes('forestilling') || text.includes('theater')) return 'theatre';
	if (text.includes('film') || text.includes('kino') || text.includes('cinema')) return 'culture';
	if (text.includes('quiz')) return 'nightlife';
	if (text.includes('debatt') || text.includes('foredrag') || text.includes('konferanse') || text.includes('seminar')) return 'culture';
	if (text.includes('karriere') || text.includes('workshop') || text.includes('kurs')) return 'workshop';
	if (text.includes('løp') || text.includes('marathon') || text.includes('sport') || text.includes('fotball')) return 'sports';
	if (text.includes('festival') || text.includes('marked') || text.includes('loppemarked')) return 'festival';
	if (text.includes('mat') || text.includes('smak') || text.includes('food')) return 'food';
	if (text.includes('bar') || text.includes('klubb') || text.includes('party') || text.includes('dj')) return 'nightlife';
	if (text.includes('standup') || text.includes('stand-up') || text.includes('humor') || text.includes('comedy')) return 'nightlife';
	if (text.includes('omvisning') || text.includes('guidet') || text.includes('tour')) return 'tours';
	if (text.includes('barn') || text.includes('familie') || text.includes('kids')) return 'family';
	// Default — most Tikkio Bergen events are concerts/music
	return 'music';
}

function extractVenueName(event: TikkioEvent): string {
	const locationName = event.location?.name || '';
	// Remove trailing ", Bergen" from venue names like "Pappa, Bergen"
	return locationName.replace(/,\s*Bergen$/i, '').trim() || 'Bergen';
}

function extractAddress(event: TikkioEvent): string {
	return event.location?.address?.streetAddress || extractVenueName(event);
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Tikkio Bergen events...`);

	const res = await fetch(LIST_URL, {
		headers: {
			'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
			'Accept': 'text/html',
		},
	});

	if (!res.ok) {
		console.error(`[${SOURCE}] HTTP ${res.status}`);
		return { found: 0, inserted: 0 };
	}

	const html = await res.text();
	const $ = cheerio.load(html);

	// Extract JSON-LD ItemList from script tag
	let events: TikkioEvent[] = [];
	$('script[type="application/ld+json"]').each((_, el) => {
		try {
			const json = JSON.parse($(el).html() || '');
			if (json['@type'] === 'ItemList' && Array.isArray(json.itemListElement)) {
				events = json.itemListElement.map((item: TikkioListItem) => item.item);
			}
		} catch {
			// Skip malformed JSON-LD
		}
	});

	if (events.length === 0) {
		console.warn(`[${SOURCE}] No events found in JSON-LD`);
		return { found: 0, inserted: 0 };
	}

	// Filter to Bergen events only
	const bergenEvents = events.filter(isBergen);
	console.log(`[${SOURCE}] Found ${events.length} total, ${bergenEvents.length} in Bergen`);

	let inserted = 0;

	for (const event of bergenEvents) {
		const ticketUrl = event.offers?.url || '';
		const sourceUrl = ticketUrl; // Tikkio event URL is both source and ticket URL

		if (!sourceUrl) continue;
		if (await eventExists(sourceUrl)) continue;

		const venueName = extractVenueName(event);
		const category = guessCategory(event.name, venueName);
		const bydel = mapBydel(venueName);
		const price = formatPrice(event.offers?.price, event.offers?.priceCurrency);
		const address = extractAddress(event);
		const datePart = event.startDate.slice(0, 10);

		const aiDesc = await generateDescription({
			title: event.name,
			venue: venueName,
			category,
			date: new Date(event.startDate),
			price,
		});

		const success = await insertEvent({
			slug: makeSlug(event.name, datePart),
			title_no: event.name,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: new Date(event.startDate).toISOString(),
			date_end: event.endDate ? new Date(event.endDate).toISOString() : undefined,
			venue_name: venueName,
			address,
			bydel,
			price,
			ticket_url: ticketUrl || undefined,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: event.image || undefined,
			age_group: 'all',
			language: event.name.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.name} (${venueName}, ${category}, ${price || 'no price'})`);
			inserted++;
		}
	}

	return { found: bergenEvents.length, inserted };
}
