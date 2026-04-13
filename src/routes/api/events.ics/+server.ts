import { supabase } from '$lib/server/supabase';
import type { RequestHandler } from '@sveltejs/kit';
import type { Category } from '$lib/types';
import { CATEGORIES } from '$lib/types';

const VALID_FILTERS = [...CATEGORIES, 'free', 'all'] as const;
type FeedFilter = (typeof VALID_FILTERS)[number];

const FEED_NAMES: Record<FeedFilter, string> = {
	all: 'Hva skjer i Bergen',
	music: 'Konserter i Bergen',
	culture: 'Kultur i Bergen',
	theatre: 'Teater i Bergen',
	family: 'Familieaktiviteter i Bergen',
	food: 'Mat & drikke i Bergen',
	festival: 'Festivaler i Bergen',
	sports: 'Sport i Bergen',
	nightlife: 'Uteliv i Bergen',
	workshop: 'Kurs & workshops i Bergen',
	student: 'Studentarrangementer i Bergen',
	tours: 'Turer i Bergen',
	free: 'Gratis arrangementer i Bergen'
};

/** RFC 5545 line folding: max 75 octets per line, fold with CRLF + space */
function fold(line: string): string {
	if (line.length <= 75) return line;
	const chunks: string[] = [];
	let pos = 0;
	while (pos < line.length) {
		if (pos === 0) {
			chunks.push(line.slice(0, 75));
			pos = 75;
		} else {
			chunks.push(' ' + line.slice(pos, pos + 74));
			pos += 74;
		}
	}
	return chunks.join('\r\n');
}

function escapeICS(text: string): string {
	return text
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\n/g, '\\n');
}

function toICSDatetime(isoStr: string): string {
	// Convert to UTC format: 20260315T190000Z
	const d = new Date(isoStr);
	if (isNaN(d.getTime())) return '';
	return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function makeUID(id: string): string {
	return `${id}@gaari.no`;
}

export const GET: RequestHandler = async ({ url }) => {
	const filterParam = url.searchParams.get('filter') ?? 'all';
	const filter = VALID_FILTERS.includes(filterParam as FeedFilter)
		? (filterParam as FeedFilter)
		: 'all';

	const now = new Date().toISOString();
	const lookahead = new Date();
	lookahead.setDate(lookahead.getDate() + 30);

	let query = supabase
		.from('events')
		.select('id, slug, title_no, title_en, description_no, venue_name, address, date_start, date_end, category, price, ticket_url, image_url')
		.eq('status', 'approved')
		.gte('date_end', now)
		.lte('date_start', lookahead.toISOString())
		.order('date_start', { ascending: true })
		.limit(1000);

	if (filter === 'free') {
		query = query.or('price.eq.0,price.ilike.%gratis%,price.ilike.%free%,price.ilike.0 kr,price.ilike.0,-');
	} else if (filter !== 'all') {
		query = query.eq('category', filter as Category);
	}

	const { data: events, error } = await query;

	if (error) {
		return new Response('Feed unavailable', { status: 500 });
	}

	const dtstamp = toICSDatetime(new Date().toISOString());
	const calName = FEED_NAMES[filter] ?? FEED_NAMES.all;

	const vevents = (events ?? []).map((event) => {
		const title = event.title_en ? event.title_en : event.title_no;
		const summary = escapeICS(title);
		const description = event.description_no ? escapeICS(event.description_no) : '';
		const location = escapeICS(`${event.venue_name}, Bergen`);
		const dtstart = toICSDatetime(event.date_start);
		const dtend = event.date_end ? toICSDatetime(event.date_end) : '';
		const eventUrl = `https://gaari.no/no/events/${event.slug}`;

		const ticketLine = event.ticket_url
			? escapeICS(`\nBillett: ${event.ticket_url}`)
			: '';
		const fullDescription = description
			? fold(`DESCRIPTION:${description}${ticketLine}`)
			: event.ticket_url ? fold(`DESCRIPTION:Billett: ${escapeICS(event.ticket_url)}`) : null;

		const lines = [
			'BEGIN:VEVENT',
			`UID:${makeUID(event.id)}`,
			`DTSTAMP:${dtstamp}`,
			`DTSTART:${dtstart}`,
			...(dtend ? [`DTEND:${dtend}`] : []),
			fold(`SUMMARY:${summary}`),
			...(fullDescription ? [fullDescription] : []),
			fold(`LOCATION:${location}`),
			`URL:${eventUrl}`,
			'END:VEVENT'
		];

		return lines.join('\r\n');
	});

	const calendar = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Gaari//Bergen Events//NO',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		fold(`X-WR-CALNAME:${calName}`),
		'X-WR-TIMEZONE:Europe/Oslo',
		'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
		'X-PUBLISHED-TTL:PT1H',
		'',
		vevents.join('\r\n'),
		'',
		'END:VCALENDAR'
	].join('\r\n');

	return new Response(calendar, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': `inline; filename="gaari-bergen-${filter}.ics"`,
			'Cache-Control': 'public, max-age=3600',
			'Access-Control-Allow-Origin': '*'
		}
	});
};
