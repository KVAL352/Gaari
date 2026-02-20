import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent } from '../lib/utils.js';

const SOURCE = 'bergenfilmklubb';
const API_URL = 'https://bergenfilmklubb.no/program?format=json';
const BASE_URL = 'https://bergenfilmklubb.no';
const VENUE = 'Tivoli, Det Akademiske Kvarter';
const ADDRESS = 'Olav Kyrres gate 49, Bergen';

interface SQEvent {
	id: string;
	title: string;
	startDate: number;
	endDate: number;
	fullUrl: string;
	assetUrl: string;
	excerpt: string;
	body: string;
	location?: {
		addressTitle?: string;
		addressLine1?: string;
	};
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Filmklubb events...`);

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

		const title = stripHtml(event.title);
		const venueName = event.location?.addressTitle || VENUE;
		const address = event.location?.addressLine1 || ADDRESS;
		const bydel = mapBydel(venueName);
		const dateStart = new Date(event.startDate).toISOString();
		const dateEnd = new Date(event.endDate).toISOString();
		const datePart = dateStart.slice(0, 10);

		const description = event.excerpt
			? stripHtml(event.excerpt).slice(0, 500)
			: event.body
				? stripHtml(event.body).slice(0, 500)
				: title;

		const success = await insertEvent({
			slug: makeSlug(title, datePart),
			title_no: title,
			description_no: description || title,
			category: 'culture',
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
			language: 'both',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title}`);
			inserted++;
		}
	}

	return { found, inserted };
}
