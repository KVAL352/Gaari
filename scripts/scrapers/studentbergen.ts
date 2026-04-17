import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { resolveTicketUrl } from '../lib/venues.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'studentbergen';
const API_URL = 'https://www.studentbergen.no/api/calendar.json';

interface SBEvent {
	'@type': string;
	title: string;
	location: string;
	start: string;
	end: string;
	url: string;
	image: string;
}

function guessCategory(title: string, location: string): string {
	const text = `${title} ${location}`.toLowerCase();
	const w = (word: string) => new RegExp(`\\b${word}\\b`).test(text);
	if (w('konsert') || w('musikk') || w('jazz') || w('fest')) return 'music';
	if (w('revy') || w('teater') || w('forestilling')) return 'theatre';
	if (w('film') || w('kino') || w('cinema')) return 'culture';
	if (w('quiz')) return 'nightlife';
	if (w('debatt') || w('foredrag') || w('konferanse') || w('seminar')) return 'culture';
	if (w('karriere') || w('workshop') || w('kurs')) return 'workshop';
	if (w('løp') || w('marathon') || w('fjelltur') || w('sport')) return 'sports';
	if (w('festival') || w('marked') || w('loppemarked')) return 'festival';
	if (text.includes('mat og drikke') || new RegExp('\\w' + 'matkurs' + '\\b').test(text) || new RegExp('\\w' + 'smaking' + '\\b').test(text)) return 'food';
	if (w('quiz') || new RegExp('\\w' + 'quiz' + '\\b').test(text) || new RegExp('\\w' + 'kviss' + '\\b').test(text)) return 'nightlife';
	if (w('klubb') || w('party') || text.includes('90-tall')) return 'nightlife';
	return 'student';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching StudentBergen calendar...`);

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

	const events: SBEvent[] = await res.json();
	const found = events.length;
	console.log(`[${SOURCE}] Found ${found} events`);

	let inserted = 0;

	for (const event of events) {
		const sourceUrl = event.url;
		if (await eventExists(sourceUrl)) continue;

		const category = guessCategory(event.title, event.location);
		const bydel = mapBydel(event.location);

		// Fetch the detail page for description, price, and ticket URL
		await delay(1500);
		let description = event.title;
		let price = '';
		let detailTicketUrl = '';
		const detailHtml = await fetchHTML(event.url);
		if (detailHtml) {
			const $ = cheerio.load(detailHtml);
			// Try to get description from meta or page content
			const metaDesc = $('meta[name="description"]').attr('content') || '';
			if (metaDesc && metaDesc.length > 20) {
				description = metaDesc.slice(0, 500);
			}
			// Extract price from fa-ticket-alt icon block
			$('.icon-event-info').each((_, el) => {
				const $el = $(el);
				if ($el.find('i.fa-ticket-alt').length) {
					price = $el.find('p').text().trim();
				}
				if ($el.find('i.fa-globe').length) {
					const link = $el.find('a').attr('href');
					if (link) detailTicketUrl = link;
				}
			});
			// Normalize price: "Gratis" stays, "250 kr" stays, bare number gets "kr"
			if (price && !/gratis|free/i.test(price) && /^\d+\s*$/.test(price.trim())) {
				price = `${price.trim()} kr`;
			}
		}

		const datePart = event.start.slice(0, 10);

		const aiDesc = await generateDescription({ title: event.title, venue: event.location || 'Bergen', category, date: new Date(event.start), price });

		// Use detail page ticket URL only if it points to a specific page (has a path)
		let ticketUrl = detailTicketUrl;
		if (ticketUrl) {
			try {
				const parsed = new URL(ticketUrl);
				const path = parsed.pathname.replace(/\/+$/, '');
				if (!path) ticketUrl = ''; // Generic homepage — discard
			} catch { /* keep as-is */ }
		}

		const success = await insertEvent({
			slug: makeSlug(event.title, datePart),
			title_no: event.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: new Date(event.start).toISOString(),
			date_end: event.end ? new Date(event.end).toISOString() : undefined,
			venue_name: event.location || 'Bergen',
			address: event.location || 'Bergen',
			bydel,
			price,
			ticket_url: ticketUrl || undefined,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: event.image || undefined,
			age_group: 'students',
			language: event.title.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.title} (${event.location}, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
