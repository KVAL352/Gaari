import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { resolveTicketUrl } from '../lib/venues.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
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
	'swingnsweetjazzclub',
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

function mapCategory(title: string, description: string, organizer: string): string {
	const text = `${title} ${description} ${organizer}`.toLowerCase();
	if (text.includes('konsert') || text.includes('musikk') || text.includes('jazz') || text.includes('rock') || text.includes('dj')) return 'music';
	if (text.includes('øl') || text.includes('vin') || text.includes('smak') || text.includes('brygg') || text.includes('mat')) return 'food';
	if (text.includes('kurs') || text.includes('workshop')) return 'workshop';
	if (text.includes('teater') || text.includes('show') || text.includes('revy') || text.includes('standup')) return 'theatre';
	if (text.includes('quiz')) return 'nightlife';
	if (text.includes('barn') || text.includes('familie')) return 'family';
	if (text.includes('sport') || text.includes('tur') || text.includes('løp')) return 'sports';
	if (text.includes('festival') || text.includes('marked')) return 'festival';
	// Organizer-based defaults
	if (organizer.includes('7 fjell') || organizer.includes('vinfest')) return 'food';
	if (organizer.includes('kvarteret')) return 'student';
	return 'culture';
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
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

		const aiDesc = await generateDescription({ title: event.name, venue: venueName, category, date: new Date(event.startDate), price: '' });

		const success = await insertEvent({
			slug: makeSlug(event.name, datePart),
			title_no: event.name,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: new Date(event.startDate).toISOString(),
			date_end: event.endDate ? new Date(event.endDate).toISOString() : undefined,
			venue_name: venueName,
			address: venueName,
			bydel,
			price: '',
			ticket_url: resolveTicketUrl(venueName, sourceUrl),
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: subdomain === 'kvarteret' ? 'students' : 'all',
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
