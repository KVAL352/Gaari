import { mapBydel } from '../lib/categories.js';
import { resolveTicketUrl } from '../lib/venues.js';
import { makeSlug, eventExists, insertEvent, delay } from '../lib/utils.js';

const SOURCE = 'hoopla';

// Bergen Hoopla organizations: subdomain → organization_id
const BERGEN_ORGS: Record<string, number> = {
	studentersamfunnetibergen: 893135286,
	naturvinforbundet: 464875067,
	bergenspillfestival: 1321554358,
	biff: 346490413,
	byscenen: 898517496,
	garage: 1113268163,
	nxtlvlbergen: 245921094,
	ungmatfest: 384585821,
};

interface HooplaEvent {
	event_id: number;
	organization_id: number;
	identifier: string | null;
	name: string;
	start: string;
	end: string;
	short_description: string | null;
	is_cancelled: boolean;
	sale_state: string;
	availability: string;
	data: {
		category: string;
		location: {
			name: string;
			street_address: string;
			postal_code: string;
			postal_area: string;
		};
	};
	images: {
		crop16x9?: {
			url: string;
			organization_id: number;
		};
		crop4x3?: {
			url: string;
		};
	};
}

function mapCategory(category: string): string {
	switch (category) {
		case 'CONCERT': return 'music';
		case 'SEMINAR': return 'culture';
		case 'FESTIVAL': return 'festival';
		case 'CONFERENCE': return 'workshop';
		case 'COURSE': return 'workshop';
		case 'EXHIBITION': return 'culture';
		case 'SHOW': return 'theatre';
		case 'GATHERING': return 'culture';
		default: return 'culture';
	}
}

function buildImageUrl(images: HooplaEvent['images']): string | undefined {
	const crop = images?.crop16x9 || images?.crop4x3;
	if (!crop?.url) return undefined;
	return `https://hoopla.twic.pics/production/${crop.url}`;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Hoopla Bergen events...`);

	let found = 0;
	let inserted = 0;

	for (const [subdomain, orgId] of Object.entries(BERGEN_ORGS)) {
		const apiUrl = `https://${subdomain}.hoopla.no/api/public/v3.0/organizations/${orgId}/events`;

		const res = await fetch(apiUrl, {
			headers: {
				'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
				'Accept': 'application/json',
			},
		});

		if (!res.ok) {
			console.error(`  [${subdomain}] HTTP ${res.status}`);
			continue;
		}

		const data = await res.json();
		const events: HooplaEvent[] = data.events || [];

		if (events.length > 0) {
			console.log(`  [${subdomain}] Found ${events.length} events`);
		}

		for (const event of events) {
			found++;

			if (event.is_cancelled) continue;
			if (event.availability === 'SOLD_OUT') continue;

			const sourceUrl = `https://${subdomain}.hoopla.no/event/${event.identifier || event.event_id}`;
			if (await eventExists(sourceUrl)) continue;

			const location = event.data?.location;
			const venueName = location?.name || subdomain;
			const address = [location?.street_address, location?.postal_code, location?.postal_area]
				.filter(Boolean).join(', ') || venueName;
			const category = mapCategory(event.data?.category || 'OTHER');
			const bydel = mapBydel(venueName);
			const datePart = event.start.slice(0, 10);
			const imageUrl = buildImageUrl(event.images);

			const success = await insertEvent({
				slug: makeSlug(event.name, datePart),
				title_no: event.name,
				description_no: event.short_description || event.name,
				category,
				date_start: new Date(event.start).toISOString(),
				date_end: event.end ? new Date(event.end).toISOString() : undefined,
				venue_name: venueName,
				address,
				bydel,
				price: '',
				ticket_url: resolveTicketUrl(venueName, sourceUrl),
				source: SOURCE,
				source_url: sourceUrl,
				image_url: imageUrl,
				age_group: subdomain === 'studentersamfunnetibergen' ? 'students' : 'all',
				language: event.name.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`    + ${event.name} (${venueName}, ${category})`);
				inserted++;
			}
		}

		await delay(1000);
	}

	return { found, inserted };
}
