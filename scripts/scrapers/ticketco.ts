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
	'borealis',
	'nattjazz',
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

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching TicketCo Bergen events...`);

	let found = 0;
	let inserted = 0;

	for (const subdomain of SUBDOMAINS) {
		console.log(`  [${subdomain}] Fetching...`);

		// Paginate through all pages
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
					if (data['@type'] === 'Event') {
						pageEvents.push(data);
					}
				} catch { /* skip malformed JSON-LD */ }
			});

			events.push(...pageEvents);

			// Stop if no events found or no next page link
			if (pageEvents.length === 0) break;
			const hasNextPage = $(`a[href*="page=${page + 1}"]`).length > 0;
			if (!hasNextPage) break;

			await delay(1500);
		}

		console.log(`  [${subdomain}] Found ${events.length} events`);

		for (const event of events) {
			found++;

			if (event.eventStatus === 'EventCancelled') continue;

			const sourceUrl = event.url;
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

		await delay(3000);
	}

	return { found, inserted };
}
