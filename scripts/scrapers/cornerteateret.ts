import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent } from '../lib/utils.js';

const SOURCE = 'cornerteateret';
const API_URL = 'https://cornerteateret.no/program?format=json';
const BASE_URL = 'https://cornerteateret.no';
const VENUE = 'Cornerteateret';
const ADDRESS = 'Kong Christian Frederiks Plass 4, Bergen';

interface SQEvent {
	id: string;
	title: string;
	startDate: number;
	endDate: number;
	fullUrl: string;
	assetUrl: string;
	excerpt: string;
	body: string;
	categories: string[];
	tags: string[];
	location?: {
		addressTitle?: string;
		addressLine1?: string;
	};
}

function guessCategory(title: string, tags: string[]): string {
	const t = title.toLowerCase();
	const allTags = tags.map(s => s.toLowerCase()).join(' ');

	if (t.includes('konsert') || t.includes('jazz') || t.includes('bass') || t.includes('feat.') || allTags.includes('music')) return 'music';
	if (t.includes('teater') || t.includes('impro') || t.includes('revy') || t.includes('forestilling')) return 'theatre';
	if (t.includes('standup') || t.includes('stand-up') || t.includes('quiz') || t.includes('pub')) return 'nightlife';
	if (t.includes('barn') || t.includes('kids') || t.includes('children')) return 'family';
	if (t.includes('workshop') || t.includes('kurs')) return 'workshop';
	if (t.includes('film') || t.includes('kino')) return 'culture';
	if (t.includes('kor') || t.includes('choir') || t.includes('pubkor')) return 'music';
	// Cornerteateret is primarily a theater/performance venue
	return 'theatre';
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Cornerteateret events...`);

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
		const category = guessCategory(title, event.tags || []);
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
