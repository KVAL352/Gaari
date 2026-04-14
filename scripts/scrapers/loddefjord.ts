import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';
import { mapCategory } from '../lib/categories.js';

const SOURCE = 'loddefjord';
const BASE_URL = 'https://hvaskjeriloddefjord.no/kalender';

// All sub-areas belong to Laksevåg bydel
const BYDEL = 'Laksevåg';

// Skip non-public events
const SKIP_KEYWORDS = [
	'barnehage', 'barnehagebarn', 'sfo', 'skoleklasse', 'skolebesøk', 'kun for medlemmer'
];

function guessCategory(event: LoddefjordEvent): string {
	const text = `${event.title} ${event.activityNames || ''} ${event.description || ''}`.toLowerCase();

	// Try mapCategory first
	const mapped = mapCategory(text);
	if (mapped !== 'culture') return mapped;

	// Target-group based
	if (event.targetNames?.some((t: string) => /barn|familie/i.test(t))) {
		// Only if the activity also looks family-oriented
		if (/lek|aktivitet|barneteater|eventyr|åpen barnehage|junior/i.test(text)) return 'family';
	}

	// Activity-based
	if (/trening|fottur|tur\b|yoga|dans|seniordans|linedans|utetrening/i.test(text)) return 'sports';
	if (/kurs|workshop|verksted|datahjelp|språktrening|håndarbeid/i.test(text)) return 'workshop';
	if (/konsert|musikk|kor|sang/i.test(text)) return 'music';
	if (/teater|forestilling/i.test(text)) return 'theatre';
	if (/quiz|fest|lansering/i.test(text)) return 'nightlife';
	if (/mat|kafé|kafe|nabolagskafé/i.test(text)) return 'food';
	if (/festival/i.test(text)) return 'festival';
	if (/spill|gaming|brettspill/i.test(text)) return 'culture';

	return 'culture';
}

function guessAgeGroup(event: LoddefjordEvent): string {
	const targets = (event.targetNames || []).map((t: string) => t.toLowerCase());
	if (targets.includes('barn') || targets.includes('familie')) return 'family';
	if (targets.includes('ungdom')) return 'all';
	return 'all';
}

interface LoddefjordEvent {
	id: number;
	title: string;
	startDate: string;        // "2026-04-13"
	endDate: string | null;
	startTime: string;        // "09:00"
	endTime: string;          // "14:30"
	location: string;
	organizer: string;
	organizerId: number;
	organizerTypeId: number;
	organizerUrlText: string;
	regionId: number;
	regionName: string;
	typeId: number;
	typeName: string;         // "Gratis", "Betalt medlemskap", "Billettsalg"
	targetIds: number[];
	targetNames: string[];
	activityId: number;
	activityNames: string;
	imageId: number | null;
	imageMeta: string;
	urlText: string;          // "13042026-olsvik-apen-barnehage"
	url: string;
	description: string;
	details: string;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Hva skjer i Loddefjord events...`);

	const html = await fetchHTML(BASE_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch calendar page`);
		return { found: 0, inserted: 0 };
	}

	// Extract JSON from <script id="calendar-data" type="application/json">
	const $ = cheerio.load(html);
	const jsonStr = $('#calendar-data').text();
	if (!jsonStr) {
		console.error(`[${SOURCE}] Could not find #calendar-data script tag`);
		return { found: 0, inserted: 0 };
	}

	let events: LoddefjordEvent[];
	try {
		events = JSON.parse(jsonStr);
	} catch {
		console.error(`[${SOURCE}] Failed to parse calendar JSON`);
		return { found: 0, inserted: 0 };
	}

	console.log(`[${SOURCE}] ${events.length} events found in JSON`);

	let found = 0;
	let inserted = 0;
	const seen = new Set<string>();

	for (const event of events) {
		if (!event.title || !event.startDate || !event.startTime) continue;

		// Dedupe by event id within this run
		const key = `${event.id}-${event.startDate}`;
		if (seen.has(key)) continue;
		seen.add(key);

		// Skip non-public
		const titleLower = event.title.toLowerCase();
		if (SKIP_KEYWORDS.some(kw => titleLower.includes(kw))) {
			console.log(`  [skip] ${event.title} (non-public)`);
			continue;
		}

		// Skip past events
		const dateStart = new Date(`${event.startDate}T${event.startTime}:00${bergenOffset(event.startDate)}`);
		if (isNaN(dateStart.getTime()) || dateStart.getTime() < Date.now() - 86400000) continue;

		// Build source URL
		const sourceUrl = `https://hvaskjeriloddefjord.no/${event.urlText}`;

		found++;

		if (await eventExists(sourceUrl)) continue;

		const category = guessCategory(event);
		const price = event.typeName === 'Gratis' ? 'Gratis'
			: event.typeName === 'Billettsalg' ? 'Se billettside'
			: event.typeName || '';

		// Build date_end if endTime exists
		let dateEnd: string | undefined;
		if (event.endTime) {
			const endDate = event.endDate || event.startDate;
			dateEnd = new Date(`${endDate}T${event.endTime}:00${bergenOffset(endDate)}`).toISOString();
		}

		// Image URL from imageId
		const imageUrl = event.imageId
			? `https://hvaskjeriloddefjord.no/images/${event.imageId}`
			: undefined;

		const aiDesc = await generateDescription({
			title: event.title,
			venue: event.location,
			category,
			date: dateStart.toISOString(),
			price,
		});

		const success = await insertEvent({
			slug: makeSlug(event.title, event.startDate),
			title_no: event.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: dateStart.toISOString(),
			date_end: dateEnd,
			venue_name: event.location,
			address: event.location,
			bydel: BYDEL,
			price,
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: guessAgeGroup(event),
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.title} @ ${event.location} (${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
