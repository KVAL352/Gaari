import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'brettspill';
const API_URL = 'https://bergenbrettspill.no/api/events';
const VENUE = 'Nordnes Bydelshus';
const ADDRESS = 'Nordnesgaten 44, Bergen';

interface BrettspillEvent {
	id: number;
	name: string;
	time: string; // ISO 8601
	link: string; // Meetup URL
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Brettspillklubb events...`);

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

	const events: BrettspillEvent[] = await res.json();
	const now = new Date();
	const futureEvents = events.filter(e => new Date(e.time) > now);
	console.log(`[${SOURCE}] Found ${futureEvents.length} upcoming events`);

	let found = futureEvents.length;
	let inserted = 0;

	for (const event of futureEvents) {
		const sourceUrl = event.link || `https://bergenbrettspill.no/#event-${event.id}`;
		if (await eventExists(sourceUrl)) continue;

		const dateStart = new Date(event.time).toISOString();
		const datePart = dateStart.slice(0, 10);

		const aiDesc = await generateDescription({ title: event.name, venue: VENUE, category: 'culture', date: dateStart, price: '0' });

		const success = await insertEvent({
			slug: makeSlug(event.name, datePart),
			title_no: event.name,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category: 'culture',
			date_start: dateStart,
			venue_name: VENUE,
			address: ADDRESS,
			bydel: mapBydel(VENUE),
			price: 'Gratis',
			ticket_url: event.link || 'https://bergenbrettspill.no',
			source: SOURCE,
			source_url: sourceUrl,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.name} (${datePart})`);
			inserted++;
		}
	}

	return { found, inserted };
}
