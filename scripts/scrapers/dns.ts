import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, deleteEventByUrl, fetchHTML } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'dns';
const API_URL = 'https://dns.no/wp-content/plugins/mrk-dns/dns_events.php';

interface DNSEvent {
	id: string;
	productionId: string;
	title: string;
	theater: string;
	status: string; // "0" = sold out, "1" = low availability, "2" = available
	dateISO: string; // YYYY-MM-DD
	date: string; // DD.MM.YYYY
	startTime: string; // HH:MM
	freeSeats: number;
}

interface DNSResponse {
	theaters: string[];
	matrix: Record<string, string>;
	events: DNSEvent[];
}

function mapCategory(title: string): string {
	const lower = title.toLowerCase();
	if (lower.includes('konsert') || lower.includes('musikal')) return 'music';
	if (lower.includes('barn') || lower.includes('brødrene')) return 'family';
	return 'theatre';
}

function bergenOffset(dateISO: string): string {
	const month = parseInt(dateISO.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

interface ProductionInfo {
	url: string;
	imageUrl?: string;
}

/** Fetch production listing page to map titles → slug URLs */
async function fetchProductionUrls(): Promise<Map<string, ProductionInfo>> {
	const map = new Map<string, ProductionInfo>();
	const html = await fetchHTML('https://dns.no/forestillinger/');
	if (!html) return map;

	const $ = cheerio.load(html);
	$('a[href*="/forestillinger/"]').each((_, el) => {
		const href = $(el).attr('href');
		if (!href || href === '/forestillinger/' || href === 'https://dns.no/forestillinger/') return;

		// Find the title text within the link (heading preferred, fall back to link text)
		const title = $(el).find('h2, h3, h4').first().text().trim()
			|| $(el).text().trim();
		if (!title || title.length > 100) return;

		// Skip button labels like "Kjøp billetter", "Les mer"
		const lower = title.toLowerCase();
		if (lower === 'kjøp billetter' || lower === 'les mer' || lower === 'se alle') return;

		const fullUrl = href.startsWith('http') ? href : `https://dns.no${href}`;
		map.set(lower.normalize('NFC'), { url: fullUrl });
	});

	return map;
}

/** Fetch og:image from a production detail page */
async function fetchProductionImage(url: string): Promise<string | undefined> {
	const html = await fetchHTML(url);
	if (!html) return undefined;
	const $ = cheerio.load(html);
	const ogImage = $('meta[property="og:image"]').attr('content');
	return ogImage || undefined;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching DNS (Den Nationale Scene) events...`);

	const res = await fetch(API_URL, {
		headers: {
			'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
			'Accept': 'application/json',
		},
	});

	if (!res.ok) {
		console.error(`[${SOURCE}] HTTP ${res.status}`);
		return { found: 0, inserted: 0 };
	}

	const data: DNSResponse = await res.json();
	const events = data.events || [];
	console.log(`[${SOURCE}] Found ${events.length} performances across ${new Set(events.map(e => e.productionId)).size} productions`);

	// Group performances by production — we create one event per production (earliest upcoming performance)
	const productions = new Map<string, DNSEvent[]>();
	const soldOutProductions = new Set<string>();
	const now = new Date();

	for (const event of events) {
		// Skip past dates
		const eventDate = new Date(`${event.dateISO}T${event.startTime}:00${bergenOffset(event.dateISO)}`);
		if (eventDate < now) continue;

		if (event.status === '0') {
			// Track sold-out performances for deletion
			soldOutProductions.add(event.productionId);
			continue;
		}

		// Available performance — remove from sold-out set (at least one show available)
		soldOutProductions.delete(event.productionId);

		if (!productions.has(event.productionId)) {
			productions.set(event.productionId, []);
		}
		productions.get(event.productionId)!.push(event);
	}

	// Delete fully sold-out productions from DB
	for (const prodId of soldOutProductions) {
		if (productions.has(prodId)) continue; // Has available shows
		const eventUrl = `https://www.dns.no/forestillinger/?production=${prodId}`;
		if (await deleteEventByUrl(eventUrl)) console.log(`  - Removed sold-out production: ${prodId}`);
	}

	// Fetch production listing page to get proper slug URLs
	const productionUrls = await fetchProductionUrls();
	console.log(`[${SOURCE}] Mapped ${productionUrls.size} production URLs from listing page`);

	const found = productions.size;
	let inserted = 0;

	for (const [, perfs] of productions) {
		// Sort by date, use earliest as the main event
		perfs.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
		const first = perfs[0];
		const last = perfs[perfs.length - 1];

		const eventUrl = `https://www.dns.no/forestillinger/?production=${first.productionId}`;
		if (await eventExists(eventUrl)) continue;

		const category = mapCategory(first.title);
		const bydel = mapBydel(first.theater);
		const offset = bergenOffset(first.dateISO);
		const dateStart = new Date(`${first.dateISO}T${first.startTime}:00${offset}`).toISOString();
		const dateEnd = perfs.length > 1
			? new Date(`${last.dateISO}T${last.startTime}:00${bergenOffset(last.dateISO)}`).toISOString()
			: undefined;

		// Use slug URL from listing page if available, otherwise fall back to production query URL
		const production = productionUrls.get(first.title.toLowerCase().normalize('NFC'));
		const ticketUrl = production?.url || eventUrl;

		// Fetch og:image from production page
		let imageUrl: string | undefined;
		if (production?.url) {
			imageUrl = await fetchProductionImage(production.url);
		}

		const aiDesc = await generateDescription({ title: first.title, venue: first.theater, category, date: dateStart, price: '' });
		const success = await insertEvent({
			slug: makeSlug(first.title, first.dateISO),
			title_no: first.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: first.theater,
			address: first.theater,
			bydel,
			price: '',
			ticket_url: ticketUrl,
			source: SOURCE,
			source_url: eventUrl,
			image_url: imageUrl,
			age_group: first.title.toLowerCase().includes('barn') || first.title.toLowerCase().includes('brødrene') ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${first.title} @ ${first.theater} (${perfs.length} shows, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
