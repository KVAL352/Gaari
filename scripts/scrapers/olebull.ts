import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'olebull';
const GRAPHQL_URL = 'https://olebullhuset.no/graphql/default';
const IMAGE_BASE = 'https://statamic-olebullhuset-storage.s3.eu-north-1.amazonaws.com/event_images/';

const QUERY = `{
  entries(collection: "events") {
    data {
      id
      title
      slug
      url
      ... on Entry_Events_Event {
        main_image {
          path
          url
        }
        duration
        eventCategory {
          value
          label
        }
        event_times {
          eventDate
          ticketUrl
          tm_event_id
        }
      }
    }
  }
}`;

interface OBEvent {
	id: string;
	title: string;
	slug: string;
	url: string;
	main_image: { path: string; url: string } | null;
	duration: string | null;
	eventCategory: { value: string; label: string } | null;
	event_times: Array<{
		eventDate: string; // "YYYY-MM-DD HH:MM:SS"
		ticketUrl: string;
		tm_event_id: string;
	}>;
}

/** Word-boundary check — avoids false positives */
function hasWord(text: string, word: string): boolean {
	return new RegExp(`\\b${word}\\b`).test(text);
}

/** Check for Norwegian compound words ending with the keyword */
function hasCompound(text: string, suffix: string): boolean {
	return new RegExp(`\\w${suffix}\\b`).test(text);
}

function mapCategory(title: string): string {
	const lower = title.toLowerCase();
	if (hasWord(lower, 'konsert') || hasWord(lower, 'concert') || lower.includes('live sessions') || lower.includes('fest:') || hasWord(lower, 'tribute') || hasCompound(lower, 'konsert')) return 'music';
	if (hasWord(lower, 'humor') || hasCompound(lower, 'humor') || hasCompound(lower, 'standup') || hasWord(lower, 'stand-up') || hasWord(lower, 'comedy') || hasWord(lower, 'komiker') || lower.includes('fermentert')) return 'nightlife';
	if (hasWord(lower, 'forestilling') || hasWord(lower, 'teater') || hasWord(lower, 'musikal') || hasWord(lower, 'revy') || hasWord(lower, 'show') || hasCompound(lower, 'show')) return 'theatre';
	if (hasWord(lower, 'barn') || hasWord(lower, 'kids') || hasCompound(lower, 'forestilling')) return 'family';
	if (hasWord(lower, 'workshop') || hasWord(lower, 'kurs')) return 'workshop';
	if (hasWord(lower, 'podcast') || hasWord(lower, 'foredrag') || hasWord(lower, 'livepod') || hasWord(lower, 'debatt') || hasWord(lower, 'samtale')) return 'culture';
	if (hasWord(lower, 'quiz') || hasCompound(lower, 'quiz') || hasCompound(lower, 'kviss')) return 'nightlife';
	return 'culture'; // default to culture — Ole Bull hosts diverse events
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Ole Bull Scene events via GraphQL...`);

	const res = await fetch(GRAPHQL_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
		},
		body: JSON.stringify({ query: QUERY }),
	});

	if (!res.ok) {
		console.error(`[${SOURCE}] HTTP ${res.status}`);
		return { found: 0, inserted: 0 };
	}

	const json = await res.json();
	const events: OBEvent[] = json.data?.entries?.data || [];
	console.log(`[${SOURCE}] Found ${events.length} events`);

	const now = new Date();
	const found = events.length;
	let inserted = 0;

	for (const event of events) {
		if (!event.event_times || event.event_times.length === 0) continue;

		// Find the earliest future event time
		const futureTimes = event.event_times
			.filter(t => {
				const offset = bergenOffset(t.eventDate);
				const d = new Date(t.eventDate.replace(' ', 'T') + offset);
				return d > now;
			})
			.sort((a, b) => a.eventDate.localeCompare(b.eventDate));

		if (futureTimes.length === 0) continue;

		const firstTime = futureTimes[0];
		const lastTime = futureTimes[futureTimes.length - 1];

		const sourceUrl = `https://olebullhuset.no${event.url}`;
		if (await eventExists(sourceUrl)) continue;

		const category = mapCategory(event.title);
		const bydel = mapBydel('Ole Bull Scene');
		const offset = bergenOffset(firstTime.eventDate);
		const dateStart = new Date(firstTime.eventDate.replace(' ', 'T') + offset).toISOString();
		const dateEnd = futureTimes.length > 1
			? new Date(lastTime.eventDate.replace(' ', 'T') + bergenOffset(lastTime.eventDate)).toISOString()
			: undefined;

		const imageUrl = event.main_image?.url || undefined;
		const ticketUrl = firstTime.ticketUrl || sourceUrl;
		const datePart = firstTime.eventDate.slice(0, 10);

		const aiDesc = await generateDescription({ title: event.title, venue: 'Ole Bull Scene', category, date: dateStart, price: '' });
		const success = await insertEvent({
			slug: makeSlug(event.title, datePart),
			title_no: event.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: 'Ole Bull Scene',
			address: 'Øvre Ole Bulls plass 6, Bergen',
			bydel,
			price: '',
			ticket_url: ticketUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: 'all',
			language: event.title.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.title} (${futureTimes.length} shows, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
