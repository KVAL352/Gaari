import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, makeDescription } from '../lib/utils.js';

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

function mapCategory(title: string): string {
	const lower = title.toLowerCase();
	if (lower.includes('konsert') || lower.includes('concert') || lower.includes('live sessions') || lower.includes('fest:') || lower.includes('tribute')) return 'music';
	if (lower.includes('humor') || lower.includes('standup') || lower.includes('stand-up') || lower.includes('comedy')) return 'nightlife';
	if (lower.includes('forestilling') || lower.includes('teater') || lower.includes('musikal') || lower.includes('revy')) return 'theatre';
	if (lower.includes('barn') || lower.includes('kids') || lower.includes('familieforestilling')) return 'family';
	if (lower.includes('workshop') || lower.includes('kurs')) return 'workshop';
	if (lower.includes('podcast') || lower.includes('foredrag')) return 'culture';
	return 'music'; // Ole Bull Scene is primarily a music/performance venue
}

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
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
	let found = events.length;
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

		const success = await insertEvent({
			slug: makeSlug(event.title, datePart),
			title_no: event.title,
			description_no: makeDescription(event.title, 'Ole Bull Scene', category),
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
