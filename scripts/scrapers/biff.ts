import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'biff';
const BASE_URL = 'https://www.biff.no';
const CATALOG_URL = `${BASE_URL}/playing-now/all/all`;
const PROGRAM_URL = `${BASE_URL}/program/today/all/all/all`;
const EVENTS_URL = `${BASE_URL}/events`;
const DELAY_MS = 1500;

interface Showtime {
	movieId: number;
	startTimeTransformed: string; // Film title
	startTime: string;            // ISO datetime
	showId: string;
	screenName: string;           // Time display (e.g. "20:30")
	screenName1: string;          // Actual screen (e.g. "KP 6")
	movieLink: string;            // e.g. "/f/slug/id"
	ticketsAvailable: number;
	isInPast: boolean;
}

interface PosterCard {
	_blockName: string;
	title: string;
	link: string;
	date?: string;
	calendarDate?: string;
	location?: string;
	image?: string;
}

/**
 * Extract embedded JSON blocks from Mars/Filmgrail HTML.
 * The platform embeds data as: JSON.parse(decodeURIComponent("..."))
 */
function extractBlocks(html: string): Array<Record<string, unknown>> {
	const blocks: Array<Record<string, unknown>> = [];
	const regex = /decodeURIComponent\("([^"]*)"\)/g;
	let match;
	while ((match = regex.exec(html)) !== null) {
		try {
			const decoded = decodeURIComponent(match[1]);
			const parsed = JSON.parse(decoded);
			if (parsed && typeof parsed === 'object' && parsed._blockName) {
				blocks.push(parsed);
			}
		} catch { /* skip malformed blocks */ }
	}
	return blocks;
}

function guessCategory(title: string): string {
	const text = title.toLowerCase();
	if (text.includes('barn') || text.includes('ung') || text.includes('kids') || text.includes('family')) return 'family';
	if (text.includes('fest') || text.includes('party') || text.includes('prisutdeling')) return 'festival';
	if (text.includes('samtale') || text.includes('debatt') || text.includes('panel') || text.includes('foredrag')) return 'culture';
	if (text.includes('workshop') || text.includes('kurs') || text.includes('masterclass')) return 'workshop';
	return 'culture'; // Films default to culture
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching BIFF film festival events...`);

	let found = 0;
	let inserted = 0;

	// Step 1: Build film image lookup from catalog (single request)
	const filmImages = new Map<string, string>(); // movieLink → image URL
	const catalogHtml = await fetchHTML(CATALOG_URL);
	if (catalogHtml) {
		const catalogBlocks = extractBlocks(catalogHtml);
		for (const b of catalogBlocks) {
			if (b._blockName === 'PosterCard' && typeof b.link === 'string' && (b.link as string).includes('/f/') && b.image) {
				filmImages.set(b.link as string, b.image as string);
			}
		}
		console.log(`[${SOURCE}] Built image lookup for ${filmImages.size} films`);
	}

	await delay(DELAY_MS);

	// Step 2: Fetch today's programme — only shows with active tickets
	const programHtml = await fetchHTML(PROGRAM_URL);
	if (programHtml) {
		const programBlocks = extractBlocks(programHtml);
		const showtimeBlock = programBlocks.find(b => b._blockName === 'MovieShowtimesWithLink');

		if (showtimeBlock && Array.isArray(showtimeBlock.showtimes)) {
			const showtimes = (showtimeBlock.showtimes as Showtime[]).filter(s => !s.isInPast);
			console.log(`[${SOURCE}] Found ${showtimes.length} active showtimes today`);

			for (const showtime of showtimes) {
				found++;

				const title = showtime.startTimeTransformed;
				if (!title) continue;

				const startDate = new Date(showtime.startTime);
				if (isNaN(startDate.getTime())) continue;

				const filmUrl = showtime.movieLink?.startsWith('http')
					? showtime.movieLink
					: `${BASE_URL}${showtime.movieLink}`;
				const sourceUrl = `${filmUrl}#show-${showtime.showId}`;

				if (await eventExists(sourceUrl)) continue;

				const screenLabel = showtime.screenName1 || showtime.screenName || '';
				const venueName = screenLabel ? `${screenLabel}, Bergen kino` : 'Bergen kino';
				const dateOnly = startDate.toISOString().slice(0, 10);
				const category = guessCategory(title);
				const bydel = mapBydel('Bergen kino');
				const imageUrl = filmImages.get(showtime.movieLink) || undefined;

				const aiDesc = await generateDescription({
					title,
					venue: venueName,
					category,
					date: startDate.toISOString(),
				});

				const success = await insertEvent({
					slug: makeSlug(title, dateOnly),
					title_no: title,
					description_no: aiDesc.no,
					description_en: aiDesc.en,
					category,
					date_start: startDate.toISOString(),
					venue_name: venueName,
					address: 'Neumanns gate 3, Bergen',
					bydel,
					price: '',
					ticket_url: filmUrl,
					source: SOURCE,
					source_url: sourceUrl,
					image_url: imageUrl,
					age_group: 'all',
					language: 'both',
					status: 'approved',
				});

				if (success) {
					console.log(`  + ${title} (${venueName}, ${dateOnly})`);
					inserted++;
				}
			}
		} else {
			console.log(`[${SOURCE}] No showtimes found on program page`);
		}
	}

	await delay(DELAY_MS);

	// Step 3: Fetch events page for non-screening events (panels, Q&As, parties)
	const eventsHtml = await fetchHTML(EVENTS_URL);
	if (eventsHtml) {
		const eventsBlocks = extractBlocks(eventsHtml);
		const eventCards = eventsBlocks.filter(
			(b): b is PosterCard & Record<string, unknown> =>
				b._blockName === 'PosterCard' && typeof b.title === 'string' && typeof b.calendarDate === 'string'
		);

		const now = new Date();
		const futureEvents = eventCards.filter(card => {
			const d = new Date(card.calendarDate as string);
			return !isNaN(d.getTime()) && d.getTime() > now.getTime();
		});

		console.log(`[${SOURCE}] Found ${futureEvents.length} future events on /events`);

		for (const card of futureEvents) {
			found++;

			const link = (card.link as string).startsWith('http')
				? card.link as string
				: `${BASE_URL}${card.link}`;
			const sourceUrl = link;

			if (await eventExists(sourceUrl)) continue;

			const startDate = new Date(card.calendarDate as string);
			const dateOnly = startDate.toISOString().slice(0, 10);
			const venueName = (card.location as string) || 'Bergen kino';
			const category = guessCategory(card.title as string);
			const bydel = mapBydel(venueName);

			const aiDesc = await generateDescription({
				title: card.title as string,
				venue: venueName,
				category,
				date: startDate.toISOString(),
			});

			const success = await insertEvent({
				slug: makeSlug(card.title as string, dateOnly),
				title_no: card.title as string,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				category,
				date_start: startDate.toISOString(),
				venue_name: venueName,
				address: 'Bergen',
				bydel,
				price: '',
				ticket_url: link,
				source: SOURCE,
				source_url: sourceUrl,
				image_url: card.image as string | undefined,
				age_group: 'all',
				language: 'both',
				status: 'approved',
			});

			if (success) {
				console.log(`  + [event] ${card.title} (${venueName}, ${dateOnly})`);
				inserted++;
			}
		}
	}

	return { found, inserted };
}
