import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, parseNorwegianDate } from '../lib/utils.js';

const SOURCE = 'bergenchamber';
const LIST_URL = 'https://bergen-chamber.no/arrangementer';
const BASE_URL = 'https://bergen-chamber.no';

function parseDetailPage($: cheerio.CheerioAPI): { time?: string; venue?: string; price?: string; description?: string } {
	const text = $('body').text();
	const result: { time?: string; venue?: string; price?: string; description?: string } = {};

	// Time: "08:30-10:30" or "08:30 - 10:30"
	const timeMatch = text.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
	if (timeMatch) result.time = `${timeMatch[1]}-${timeMatch[2]}`;

	// Venue: look for "Sted:" or common venue patterns
	const stedMatch = text.match(/Sted:\s*([^\n]+)/i);
	if (stedMatch) result.venue = stedMatch[1].trim();

	// Price: "Kr 4 500,-" or "kr 7 400,-"
	const priceMatch = text.match(/[Kk]r\.?\s*([\d\s]+)[,-]/);
	if (priceMatch) result.price = `${priceMatch[1].replace(/\s/g, '')} kr`;

	// Description from og:description meta
	const metaDesc = $('meta[property="og:description"]').attr('content') || '';
	if (metaDesc.length > 20) result.description = metaDesc.slice(0, 500);

	return result;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Næringsråd events...`);

	const html = await fetchHTML(LIST_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch listing page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Collect event links and dates from listing page
	interface ListEvent {
		title: string;
		dateText: string;
		detailUrl: string;
		imageUrl?: string;
	}

	const events: ListEvent[] = [];

	// Find event cards — look for h3 tags with links to /arrangementer/
	$('a[href*="/arrangementer/"]').each((_, el) => {
		const href = $(el).attr('href') || '';
		if (href === '/arrangementer' || href === '/arrangementer/') return;

		const h3 = $(el).find('h3').text().trim() || $(el).text().trim();
		if (!h3 || h3.length < 3) return;

		// Avoid duplicates
		const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
		if (events.some(e => e.detailUrl === fullUrl)) return;

		// Find nearby date text and image
		const parent = $(el).closest('div');
		const dateText = parent.find('*').filter((_, child) => {
			const t = $(child).text().trim();
			return /\d{1,2}\.\s*\w+\s*\d{4}/.test(t) || /\d{1,2}\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)/i.test(t);
		}).first().text().trim();

		const img = parent.find('img').attr('src') || $(el).find('img').attr('src');

		events.push({
			title: h3,
			dateText,
			detailUrl: fullUrl,
			imageUrl: img || undefined,
		});
	});

	console.log(`[${SOURCE}] Found ${events.length} events on listing page`);

	for (const event of events) {
		found++;

		const sourceUrl = event.detailUrl;
		if (await eventExists(sourceUrl)) continue;

		// Fetch detail page for time, venue, price, description
		await delay(1000);
		const detailHtml = await fetchHTML(sourceUrl);
		let detail = { time: undefined as string | undefined, venue: undefined as string | undefined, price: undefined as string | undefined, description: undefined as string | undefined };
		if (detailHtml) {
			const d$ = cheerio.load(detailHtml);
			detail = parseDetailPage(d$);
		}

		// Parse date
		let dateStr = event.dateText;
		if (!dateStr) {
			// Try to extract from detail page
			if (detailHtml) {
				const dateMatch = detailHtml.match(/(\d{1,2}\.\s*(?:januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s*\d{4})/i);
				if (dateMatch) dateStr = dateMatch[1];
			}
		}

		const dateIso = dateStr ? parseNorwegianDate(dateStr) : null;
		if (!dateIso) {
			console.log(`    ? Skipped (no date): ${event.title}`);
			continue;
		}

		const datePart = dateIso.slice(0, 10);
		const timeParts = detail.time?.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
		const dateStart = timeParts
			? new Date(`${datePart}T${timeParts[1]}:00+01:00`).toISOString()
			: new Date(dateIso).toISOString();
		const dateEnd = timeParts
			? new Date(`${datePart}T${timeParts[2]}:00+01:00`).toISOString()
			: undefined;

		const venueName = detail.venue || 'Bergen Næringsråd';
		const bydel = mapBydel(venueName);

		const success = await insertEvent({
			slug: makeSlug(event.title, datePart),
			title_no: event.title,
			description_no: detail.description || event.title,
			category: 'workshop',
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venueName,
			address: venueName,
			bydel,
			price: detail.price || '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: event.imageUrl,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`    + ${event.title} (${venueName}, ${detail.price || 'free'})`);
			inserted++;
		}
	}

	return { found, inserted };
}
