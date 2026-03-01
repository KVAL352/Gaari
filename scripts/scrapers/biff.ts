import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'biff';
const BASE_URL = 'https://www.biff.no';
const CATALOG_URL = `${BASE_URL}/playing-now/all/all`;
const EVENTS_URL = `${BASE_URL}/events`;
const DELAY_MS = 1500;

interface MovieDetails {
	title: string;
	titleOriginal?: string;
	oneliner?: string;
	onelinerEN?: string;
	runtime?: number;
	ageRating?: number;
	director?: { name: string };
	genres?: string[];
	categories?: string[];
	country?: string;
	poster?: string;
	backdrop?: string;
	hasShowtimes: boolean;
	showtimes?: Array<{
		startTime: string;
		endTime?: string;
		screenName: string;
		showId: number;
		ticketsAvailable?: boolean;
		notes?: string;
	}>;
	url?: string;
	releaseYear?: number;
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

function guessCategory(title: string, genres: string[] = [], categories: string[] = []): string {
	const text = `${title} ${genres.join(' ')} ${categories.join(' ')}`.toLowerCase();
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

	// Step 1: Fetch film catalog from /playing-now/all/all
	const catalogHtml = await fetchHTML(CATALOG_URL);
	if (!catalogHtml) {
		console.error(`[${SOURCE}] Failed to fetch catalog page`);
		return { found: 0, inserted: 0 };
	}

	const catalogBlocks = extractBlocks(catalogHtml);
	const filmCards = catalogBlocks.filter(
		(b): b is PosterCard & Record<string, unknown> =>
			b._blockName === 'PosterCard' && typeof b.link === 'string' && (b.link as string).includes('/f/')
	);

	console.log(`[${SOURCE}] Found ${filmCards.length} films in catalog`);

	// Step 2: Fetch each film detail page for showtimes
	for (const card of filmCards) {
		const filmUrl = (card.link as string).startsWith('http')
			? card.link as string
			: `${BASE_URL}${card.link}`;

		// Check if any event from this film already exists (using film page as base)
		// We'll check per-showtime later, but skip the detail fetch if all are known
		const detailHtml = await fetchHTML(filmUrl);
		if (!detailHtml) {
			await delay(DELAY_MS);
			continue;
		}

		const detailBlocks = extractBlocks(detailHtml);
		const detailBlock = detailBlocks.find(b => b._blockName === 'MovieDetailsPage');
		if (!detailBlock || !detailBlock.movieDetails) {
			await delay(DELAY_MS);
			continue;
		}

		const movie = detailBlock.movieDetails as MovieDetails;
		if (!movie.hasShowtimes || !movie.showtimes || movie.showtimes.length === 0) {
			await delay(DELAY_MS);
			continue;
		}

		const title = movie.title || (card.title as string);
		const imageUrl = movie.poster || movie.backdrop || undefined;
		const genres = movie.genres || [];
		const categories = movie.categories || [];

		// Create one event per showtime
		for (const showtime of movie.showtimes) {
			found++;

			const startDate = new Date(showtime.startTime);
			if (isNaN(startDate.getTime())) continue;

			// Build a unique source URL per showtime
			const sourceUrl = `${filmUrl}#show-${showtime.showId}`;
			if (await eventExists(sourceUrl)) continue;

			const venueName = showtime.screenName
				? `${showtime.screenName}, Bergen kino`
				: 'Bergen kino';
			const dateOnly = startDate.toISOString().slice(0, 10);
			const category = guessCategory(title, genres, categories);
			const bydel = mapBydel(venueName);

			// Runtime → date_end
			let dateEnd: string | undefined;
			if (movie.runtime && movie.runtime > 0) {
				const end = new Date(startDate.getTime() + movie.runtime * 60 * 1000);
				dateEnd = end.toISOString();
			}

			const price = ''; // BIFF ticket prices vary, not reliably available
			const aiDesc = await generateDescription({
				title,
				venue: venueName,
				category,
				date: startDate.toISOString(),
				price,
			});

			const success = await insertEvent({
				slug: makeSlug(title, dateOnly),
				title_no: title,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				category,
				date_start: startDate.toISOString(),
				date_end: dateEnd,
				venue_name: venueName,
				address: 'Neumanns gate 3, Bergen',
				bydel,
				price,
				ticket_url: filmUrl,
				source: SOURCE,
				source_url: sourceUrl,
				image_url: imageUrl,
				age_group: movie.ageRating && movie.ageRating >= 18 ? '18+' : 'all',
				language: 'both',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${title} (${venueName}, ${dateOnly})`);
				inserted++;
			}
		}

		await delay(DELAY_MS);
	}

	// Step 3: Fetch events page (/events) for non-screening events (panels, Q&As, parties)
	const eventsHtml = await fetchHTML(EVENTS_URL);
	if (eventsHtml) {
		const eventsBlocks = extractBlocks(eventsHtml);
		const eventCards = eventsBlocks.filter(
			(b): b is PosterCard & Record<string, unknown> =>
				b._blockName === 'PosterCard' && typeof b.title === 'string' && typeof b.calendarDate === 'string'
		);

		// Filter to future events only
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
			const category = guessCategory(card.title as string, [], []);
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
