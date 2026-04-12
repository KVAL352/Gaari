import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { resolveTicketUrl } from '../lib/venues.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'ticketco';

// Bergen TicketCo subdomains to scrape
const SUBDOMAINS = [
	'7fjell',
	'bergenvinfest',
	'kulturhusetibergen',
	'kvarteret',
	'cinemateketbergen',
	'hulen',
	'litthus',
	'madamefell',
	'kirkemusikkibergen',
	'bergendansesenter',
	'vic',
	'vestnorsk',
	// 'borealis', // Now handled by dedicated scraper (borealis.ts)
	'nattjazz',
	'landmark',
	'sl',
	// 'ekko', // Now handled by dedicated scraper (ostre.ts)
	// 'swingnsweetjazzclub', // Now handled by dedicated scraper (swingnsweetjazzclub.ts)
	'mandelhuset',
	'bergenpride',
	'kodebergen',
	'varmerevaterevillere',
	'colonialenfetevare',
	'colonialen-sundt',
	'stiftelsenbergenkjott',
	'bitteater',
	'columbiegg',
	'perfectsounds',
	'villvillvest',
	'bmof',
];

interface TCEvent {
	'@type': string;
	name: string;
	description: string;
	url: string;
	eventStatus: string;
	startDate: string;
	endDate: string;
	image: string;
	landing_image: string | null;
	location: {
		name: string;
	};
	organizer: {
		name: string;
		url: string;
	};
}

/** Word-boundary check — avoids false positives like "format" matching "mat" */
function hasWord(text: string, word: string): boolean {
	return new RegExp(`\\b${word}\\b`).test(text);
}

/** Check for Norwegian compound words ending with the keyword (e.g. "musikkquiz" → quiz, "vinsmaking" → smaking) */
function hasCompound(text: string, suffix: string): boolean {
	return new RegExp(`\\w${suffix}\\b`).test(text);
}

function mapCategory(title: string, description: string, organizer: string): string {
	const text = `${title} ${description} ${organizer}`.toLowerCase();
	const org = organizer.toLowerCase();
	// Organizer-based overrides first (most reliable signal)
	if (org.includes('7 fjell') || org.includes('vinfest') || org.includes('colonialen') || org.includes('fetevare')) return 'food';
	if (org.includes('kvarteret')) return 'student';
	// Keyword matching with word boundaries + compound words
	if (hasWord(text, 'konsert') || hasWord(text, 'musikk') || hasWord(text, 'jazz') || hasWord(text, 'rock') || hasWord(text, 'dj') || hasCompound(text, 'konsert')) return 'music';
	if (hasWord(text, 'øl') || hasWord(text, 'vin') || hasCompound(text, 'smaking') || hasWord(text, 'brygg') || text.includes('mat og drikke') || hasCompound(text, 'matkurs') || hasCompound(text, 'matopplevelse')) return 'food';
	if (hasWord(text, 'kurs') || hasWord(text, 'workshop')) return 'workshop';
	if (hasWord(text, 'teater') || hasWord(text, 'show') || hasWord(text, 'revy') || hasCompound(text, 'standup') || hasWord(text, 'stand-up')) return 'theatre';
	if (hasWord(text, 'quiz') || hasCompound(text, 'quiz') || hasCompound(text, 'kviss') || hasWord(text, 'bingo') || hasCompound(text, 'bingo')) return 'nightlife';
	if (hasWord(text, 'barn') || hasWord(text, 'familie') || hasCompound(text, 'barneforestilling')) return 'family';
	if (hasWord(text, 'sport') || hasWord(text, 'fotball') || hasWord(text, 'løp')) return 'sports';
	if (hasWord(text, 'festival') || hasWord(text, 'marked')) return 'festival';
	return 'culture';
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Fetch event detail page and extract lowest ticket price in NOK. Returns '' if unavailable. */
async function fetchTicketCoPrice(eventUrl: string): Promise<string> {
	const html = await fetchHTML(eventUrl);
	if (!html) return '';
	const prices: number[] = [];
	const priceRegex = /class='price'>NOK\s+([\d.,]+)/g;
	let m;
	while ((m = priceRegex.exec(html)) !== null) {
		// Norwegian format: 1.200,00 → remove thousand-sep dots, replace decimal comma
		const val = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
		if (!isNaN(val)) prices.push(Math.round(val));
	}
	if (prices.length === 0) return '';
	return String(Math.min(...prices));
}

/**
 * TicketCo JSON-LD marks dates with 'Z' (UTC) but they are actually local Norwegian time.
 * Strip the Z, apply the correct Bergen offset, then convert to proper UTC ISO string.
 */
function fixTicketCoDate(dateStr: string): string {
	const local = dateStr.replace('Z', '');
	const datePart = local.slice(0, 10);
	const timePart = local.slice(11);
	const offset = bergenOffset(datePart);
	return new Date(`${datePart}T${timePart}${offset}`).toISOString();
}

async function scrapeSubdomain(subdomain: string): Promise<{ found: number; inserted: number }> {
	// Paginate through all pages for this subdomain
	const events: TCEvent[] = [];
	for (let page = 1; page <= 10; page++) {
		const listUrl = `https://${subdomain}.ticketco.events/no/nb?filter_type=all${page > 1 ? `&page=${page}` : ''}`;

		const html = await fetchHTML(listUrl);
		if (!html) {
			if (page === 1) console.error(`  [${subdomain}] Failed to fetch`);
			break;
		}

		const $ = cheerio.load(html);
		const pageEvents: TCEvent[] = [];

		$('script[type="application/ld+json"]').each((_, el) => {
			try {
				const data = JSON.parse($(el).text());
				if (data['@type'] === 'Event') pageEvents.push(data);
			} catch { /* skip malformed JSON-LD */ }
		});

		events.push(...pageEvents);

		if (pageEvents.length === 0) break;
		const hasNextPage = $(`a[href*="page=${page + 1}"]`).length > 0;
		if (!hasNextPage) break;

		await delay(800);
	}

	console.log(`  [${subdomain}] Found ${events.length} events`);

	let found = 0;
	let inserted = 0;

	for (const event of events) {
		found++;

		// Note: TicketCo JSON-LD has no sold-out indicator (only EventScheduled/EventCancelled).
		// Sold-out status is loaded client-side via Angular. TicketCo may remove sold-out events
		// from listings entirely, which means they naturally expire from our DB.
		if (event.eventStatus === 'EventCancelled') continue;

		const sourceUrl = event.url;

		// TicketCo cross-lists events from other venues/cities on each subdomain page.
		// Only keep events that belong to the subdomain we're scraping from.
		if (!sourceUrl.includes(`${subdomain}.ticketco`)) {
			console.log(`    ~ Skipping cross-listed event (not from ${subdomain}): ${event.name}`);
			continue;
		}

		if (await eventExists(sourceUrl)) continue;

		const venueName = event.location?.name || event.organizer?.name || subdomain;
		const description = stripHtml(event.description || '').slice(0, 500);
		const category = mapCategory(event.name, description, event.organizer?.name || '');
		const bydel = mapBydel(venueName);
		const datePart = event.startDate.slice(0, 10);
		const imageUrl = event.landing_image || event.image || undefined;

		await delay(500);
		const price = await fetchTicketCoPrice(sourceUrl);

		const aiDesc = await generateDescription({ title: event.name, venue: venueName, category, date: new Date(event.startDate), price });

		const success = await insertEvent({
			slug: makeSlug(event.name, datePart),
			title_no: event.name,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: fixTicketCoDate(event.startDate),
			date_end: event.endDate ? fixTicketCoDate(event.endDate) : undefined,
			venue_name: venueName,
			address: venueName,
			bydel,
			price,
			ticket_url: resolveTicketUrl(venueName, sourceUrl),
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: (subdomain === 'kvarteret' || subdomain === 'hulen') ? 'students' : 'all',
			language: event.name.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`    + ${event.name} (${venueName}, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching TicketCo Bergen events (${SUBDOMAINS.length} subdomains, 3 concurrent)...`);

	let found = 0;
	let inserted = 0;

	// Worker pool: up to 3 subdomains in-flight simultaneously.
	// 1500ms minimum between subdomain starts to avoid hammering the shared *.ticketco.events infrastructure.
	const queue = [...SUBDOMAINS];
	let lastStartMs = 0;

	async function worker(): Promise<void> {
		while (true) {
			const subdomain = queue.shift();
			if (!subdomain) break;

			// Enforce 1500ms minimum between any two subdomain starts
			const wait = Math.max(0, lastStartMs + 1500 - Date.now());
			if (wait > 0) await delay(wait);
			lastStartMs = Date.now();

			console.log(`  [${subdomain}] Fetching...`);
			try {
				const result = await scrapeSubdomain(subdomain);
				found += result.found;
				inserted += result.inserted;
			} catch (err: any) {
				console.error(`  [${subdomain}] Failed: ${err.message}`);
			}
		}
	}

	// Launch 3 workers — Promise.allSettled so one failure doesn't abort the rest
	await Promise.allSettled([worker(), worker(), worker()]);

	return { found, inserted };
}
