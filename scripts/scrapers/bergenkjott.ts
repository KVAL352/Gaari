import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent } from '../lib/utils.js';

const SOURCE = 'bergenkjott';
const API_URL = 'https://bergenkjott.org/kalendar?format=json';
const BASE_URL = 'https://bergenkjott.org';
const VENUE = 'Bergen Kjøtt';
const ADDRESS = 'Skutevikstorget 1, Bergen';

interface SQEvent {
	id: string;
	title: string;
	startDate: number;
	endDate: number;
	fullUrl: string;
	assetUrl: string;
	excerpt: string;
	categories: string[];
	tags: string[];
}

function guessCategory(title: string): string {
	const t = title.toLowerCase();
	if (t.includes('konsert') || t.includes('release') || t.includes('trio') || t.includes('band') || t.includes('dj')) return 'music';
	if (t.includes('soup') || t.includes('mat') || t.includes('mela') || t.includes('food')) return 'food';
	if (t.includes('festival') || t.includes('swap') || t.includes('marked')) return 'festival';
	if (t.includes('workshop') || t.includes('kurs')) return 'workshop';
	if (t.includes('quiz')) return 'nightlife';
	if (t.includes('wrestling') || t.includes('sport')) return 'sports';
	// Bergen Kjøtt is primarily a music/culture venue
	return 'music';
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Kjøtt events...`);

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

	const data = await res.json();
	// Bergen Kjøtt uses 'items' (collection type 1), not 'upcoming'
	const events: SQEvent[] = data.upcoming || data.items || [];
	const now = Date.now();

	// Filter to future events only
	const futureEvents = events.filter(e => e.startDate > now);
	console.log(`[${SOURCE}] Found ${futureEvents.length} upcoming events (${events.length} total)`);

	let found = futureEvents.length;
	let inserted = 0;

	for (const event of futureEvents) {
		const sourceUrl = `${BASE_URL}${event.fullUrl}`;
		if (await eventExists(sourceUrl)) continue;

		const title = stripHtml(event.title);
		const category = guessCategory(title);
		const bydel = mapBydel(VENUE);
		const dateStart = new Date(event.startDate).toISOString();
		const dateEnd = new Date(event.endDate).toISOString();
		const datePart = dateStart.slice(0, 10);
		const description = event.excerpt ? stripHtml(event.excerpt).slice(0, 500) : title;

		const success = await insertEvent({
			slug: makeSlug(title, datePart),
			title_no: title,
			description_no: description || title,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: VENUE,
			address: ADDRESS,
			bydel,
			price: '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: event.assetUrl || undefined,
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
