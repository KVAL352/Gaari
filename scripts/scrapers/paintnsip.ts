import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'paintnsip';
const GRAPHQL_URL = 'https://booking-hasura.askeladden.co/v1/graphql';
const ORG_ID = 'ed721146-6d68-4afb-85d5-2383a8c5168d';
const BOOKING_BASE = 'https://booking.paintnsip.no';

const QUERY = `
query BergenEvents($now: timestamptz!) {
  bookable_events(
    limit: 100,
    order_by: { start_time: asc },
    where: {
      start_time: { _gte: $now },
      remaining_capacity: { _gt: 0 },
      location: { area: { name: { _eq: "Bergen" } } }
    }
  ) {
    id
    name
    start_time
    end_time
    capacity
    remaining_capacity
    price
    details
    location {
      name
      address
      city
      zip_code
    }
    service {
      name
      display_name
    }
    asset {
      url
      thumbnail_url
    }
  }
}`;

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Paint'n Sip Bergen events...`);

	const res = await fetch(GRAPHQL_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-hasura-organization-id': ORG_ID,
			'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
		},
		body: JSON.stringify({
			query: QUERY,
			variables: { now: new Date().toISOString() },
		}),
	});

	if (!res.ok) {
		console.error(`[${SOURCE}] HTTP ${res.status}`);
		return { found: 0, inserted: 0 };
	}

	const json = await res.json();
	const events = json.data?.bookable_events || [];
	console.log(`[${SOURCE}] Found ${events.length} upcoming Bergen events`);

	let found = events.length;
	let inserted = 0;

	for (const event of events) {
		const sourceUrl = `${BOOKING_BASE}/?eventId=${event.id}`;
		if (await eventExists(sourceUrl)) continue;

		const motif = event.service?.display_name || event.service?.name || '';
		const venueName = event.location?.name || 'Paint\'n Sip Bergen';
		const address = event.location?.address
			? `${event.location.address}, ${event.location.city || 'Bergen'}`
			: 'Bergen';
		const bydel = mapBydel(venueName);

		const dateStart = new Date(event.start_time).toISOString();
		const dateEnd = event.end_time ? new Date(event.end_time).toISOString() : undefined;
		const datePart = dateStart.slice(0, 10);

		// Price is in øre
		const priceNOK = event.price ? Math.round(event.price / 100) : 0;
		const priceStr = priceNOK > 0 ? `${priceNOK} kr` : '';

		// Build title — use motif if it's descriptive, otherwise use venue
		const isGenericMotif = !motif || motif.toLowerCase().includes('eksternt') || motif.toLowerCase().includes('pop-up');
		const title = isGenericMotif
			? `Paint'n Sip @ ${venueName}`
			: `Paint'n Sip: ${motif}`;

		// Description from details field
		const description = event.details
			? stripHtml(event.details).slice(0, 500)
			: `Malekurs med vin hos ${venueName}. ${motif ? `Motiv: ${motif}.` : ''}`;

		// Image from asset
		const imageUrl = event.asset?.url
			? `https://ik.imagekit.io/cthprr3yru/${ORG_ID}/${event.asset.url}`
			: undefined;

		const aiDesc = await generateDescription({ title, venue: venueName, category: 'workshop', date: new Date(event.start_time), price: priceStr });

		const success = await insertEvent({
			slug: makeSlug(title, datePart),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category: 'workshop',
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venueName,
			address,
			bydel,
			price: priceStr,
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: 'all',
			language: 'both',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} @ ${venueName} (${priceStr})`);
			inserted++;
		}
	}

	return { found, inserted };
}
