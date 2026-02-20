import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent } from '../lib/utils.js';

const SOURCE = 'colonialen';
const API_URL = 'https://colonialen.no/kalender?format=json';
const BASE_URL = 'https://colonialen.no';

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

function mapCategory(categories: string[]): string {
	const cats = categories.map(c => c.toLowerCase());
	if (cats.includes('kurs')) return 'workshop';
	if (cats.includes('smaking')) return 'food';
	if (cats.includes('event')) return 'food';
	return 'food';
}

function resolveVenue(tags: string[]): { name: string; address: string } {
	const t = tags.map(s => s.toLowerCase());
	if (t.includes('sann')) return { name: 'Colonialen Sann', address: 'Øvre Ole Bulls plass 4, Bergen' };
	if (t.includes('fetevaren')) return { name: 'Colonialen Fetevaren', address: 'Kong Oscars gate 44, Bergen' };
	if (t.includes('litt')) return { name: 'Colonialen Litteraturhuset', address: 'Østre Skostredet 5-7, Bergen' };
	return { name: 'Colonialen', address: 'Bergen' };
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Colonialen events...`);

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
	const events: SQEvent[] = data.upcoming || [];
	console.log(`[${SOURCE}] Found ${events.length} upcoming events`);

	let found = events.length;
	let inserted = 0;

	for (const event of events) {
		const sourceUrl = `${BASE_URL}${event.fullUrl}`;
		if (await eventExists(sourceUrl)) continue;

		const { name: venueName, address } = resolveVenue(event.tags);
		const category = mapCategory(event.categories);
		const bydel = mapBydel(venueName);
		const dateStart = new Date(event.startDate).toISOString();
		const dateEnd = new Date(event.endDate).toISOString();
		const datePart = dateStart.slice(0, 10);
		const title = stripHtml(event.title);
		const description = event.excerpt ? stripHtml(event.excerpt).slice(0, 500) : title;

		const success = await insertEvent({
			slug: makeSlug(title, datePart),
			title_no: title,
			description_no: description || title,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venueName,
			address,
			bydel,
			price: '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: event.assetUrl || undefined,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${venueName}, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
