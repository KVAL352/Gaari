import * as cheerio from 'cheerio';
import { mapCategory, mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, parseNorwegianDate, delay } from '../lib/utils.js';

const SOURCE = 'visitbergen';
const BASE_URL = 'https://www.visitbergen.com';
const SEARCH_URL = `${BASE_URL}/hva-skjer/searchresults`;
const MAX_PAGES = 60; // All pages (20 events per page)
const DELAY_MS = 1500; // Be polite

interface ListEvent {
	title: string;
	detailUrl: string;
	dateStart: string | null;
	dateEnd: string | null;
	venue: string;
	category: string;
	imageUrl?: string;
	ticketUrl?: string;
	description: string;
}

function parseListPage(html: string): { events: ListEvent[]; totalPages: number } {
	const $ = cheerio.load(html);
	const events: ListEvent[] = [];

	$('.prodListItemWrapper').each((_, el) => {
		const $w = $(el);

		// Title: second <a> with /hva-skjer/ in href (first is the image link)
		const titleLink = $w.find('a[href*="/hva-skjer/"]').eq(1);
		const title = titleLink.text().trim();
		if (!title || title.length < 3 || title === 'Les mer') return;

		// Detail URL
		const href = $w.find('a[href*="/hva-skjer/"]').first().attr('href');
		if (!href) return;
		const detailUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

		// Category from .type div
		const category = $w.find('.type').find('p').text().trim()
			|| $w.find('.type').text().replace('Type:', '').trim();

		// Dates from span.datefrom and span.dateto
		const dateFromText = $w.find('span.datefrom').first().text().trim();
		const dateToText = $w.find('span.dateto').first().text().trim();
		const dateStart = parseNorwegianDate(dateFromText);
		const dateEnd = dateToText ? parseNorwegianDate(dateToText) : null;

		if (!dateStart) return;

		// Venue from span.openingname
		const venue = $w.find('span.openingname').first().text().trim() || 'Bergen';

		// Image from data-lazy-src attribute
		const imgSrc = $w.find('.leftBlock img[data-lazy-src]').first().attr('data-lazy-src');
		let imageUrl: string | undefined;
		if (imgSrc && !imgSrc.includes('lazyloadplaceholder')) {
			imageUrl = imgSrc.startsWith('http') ? imgSrc : `${BASE_URL}${imgSrc}`;
		}

		// Ticket URL: external link (not visitbergen.com)
		let ticketUrl: string | undefined;
		$w.find('a[href]').each((_, a) => {
			const linkHref = $(a).attr('href') || '';
			if (linkHref.startsWith('http') && !linkHref.includes('visitbergen.com')) {
				ticketUrl = linkHref;
			}
		});

		// Description: get text after the dates/type info from centerBlock
		const centerText = $w.find('.centerBlock').text().trim();
		// The description comes after the dates block — grab text after the venue name
		const venueIdx = centerText.lastIndexOf(venue);
		const descRaw = venueIdx > 0 ? centerText.slice(venueIdx + venue.length).trim() : '';
		const description = descRaw.slice(0, 500) || title;

		events.push({
			title: title.slice(0, 200),
			detailUrl,
			dateStart,
			dateEnd,
			venue,
			category,
			imageUrl,
			ticketUrl,
			description,
		});
	});

	// Parse total pages from pagination
	let totalPages = 1;
	$('a[href*="?p="]').each((_, el) => {
		const text = $(el).text().trim();
		const num = parseInt(text);
		if (!isNaN(num) && num > totalPages) totalPages = num;
	});

	return { events, totalPages };
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Starting scrape of Visit Bergen...`);

	let found = 0;
	let inserted = 0;

	const firstHtml = await fetchHTML(SEARCH_URL);
	if (!firstHtml) return { found: 0, inserted: 0 };

	const firstPage = parseListPage(firstHtml);
	const pagesToScrape = Math.min(firstPage.totalPages, MAX_PAGES);
	console.log(`[${SOURCE}] Total pages: ${firstPage.totalPages}, scraping first ${pagesToScrape}`);
	console.log(`[${SOURCE}] Page 1: ${firstPage.events.length} events`);

	const allEvents: ListEvent[] = [...firstPage.events];

	for (let page = 2; page <= pagesToScrape; page++) {
		console.log(`[${SOURCE}] Fetching page ${page}/${pagesToScrape}...`);
		await delay(DELAY_MS);
		const html = await fetchHTML(`${SEARCH_URL}?p=${page}`);
		if (!html) continue;
		const { events } = parseListPage(html);
		console.log(`[${SOURCE}] Page ${page}: ${events.length} events`);
		allEvents.push(...events);
	}

	found = allEvents.length;
	console.log(`[${SOURCE}] Total events found: ${found}`);

	for (const event of allEvents) {
		if (await eventExists(event.detailUrl)) continue;

		const category = event.category ? mapCategory(event.category) : 'culture';
		const bydel = mapBydel(event.venue);

		const success = await insertEvent({
			slug: makeSlug(event.title, event.dateStart!),
			title_no: event.title,
			description_no: event.description || event.title,
			category,
			date_start: event.dateStart!,
			date_end: event.dateEnd || undefined,
			venue_name: event.venue,
			address: event.venue,
			bydel,
			price: '',
			ticket_url: event.ticketUrl || event.detailUrl,
			source: SOURCE,
			source_url: event.detailUrl,
			image_url: event.imageUrl,
			age_group: 'all',
			language: 'both',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.title} (${event.venue}, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
