import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, deleteEventByUrl } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'grieghallen';
const LISTING_URL = 'https://www.grieghallen.no/arrangementer';
const CDN_BASE = 'https://st-3e7unmpj5a.nf.cdn.netflexapp.com/media/rc/800x400/';

interface GHEvent {
	id: number;
	name: string;
	subheading: string;
	url: string;
	image: string;
	eventDates: string[];
	eventDatesList: Array<{ dateTime: string; ticketUrl: string }>;
	category: number[];
	ticketStatus: { type: string; label: string } | null;
	ticketUrl: string;
	eventPeriodText: string;
	firstEventDate: string;
	lastEventDate: string;
}

interface GHCategory {
	id: number;
	name: string;
}

function extractJsonArray(html: string, key: string): any[] | null {
	const marker = `${key}: [`;
	const idx = html.indexOf(marker);
	if (idx < 0) return null;

	const arrStart = idx + marker.length - 1;
	let depth = 0;
	let arrEnd = arrStart;
	for (let i = arrStart; i < html.length; i++) {
		if (html[i] === '[') depth++;
		else if (html[i] === ']') depth--;
		if (depth === 0) { arrEnd = i + 1; break; }
	}

	try {
		return JSON.parse(html.slice(arrStart, arrEnd));
	} catch {
		return null;
	}
}

function mapCategory(catIds: number[], categories: GHCategory[], title: string): string {
	const names = catIds.map(id => categories.find(c => c.id === id)?.name?.toLowerCase() || '');

	for (const name of names) {
		if (name.includes('pop') || name.includes('rock') || name.includes('show')) return 'music';
		if (name.includes('klassisk') || name.includes('opera') || name.includes('ballett')) return 'music';
		if (name.includes('korps') || name.includes('kor')) return 'music';
		if (name.includes('familie')) return 'family';
		if (name.includes('konferanse') || name.includes('messe')) return 'workshop';
	}

	const lower = title.toLowerCase();
	if (lower.includes('konsert') || lower.includes('concert')) return 'music';
	if (lower.includes('revy') || lower.includes('teater') || lower.includes('humor')) return 'nightlife';
	if (lower.includes('barn') || lower.includes('kids')) return 'family';
	return 'music';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Grieghallen events...`);

	const html = await fetchHTML(LISTING_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch listing page`);
		return { found: 0, inserted: 0 };
	}

	// Extract events and categories arrays directly from the JS object
	const events: GHEvent[] = extractJsonArray(html, 'events') || [];
	const categories: GHCategory[] = extractJsonArray(html, 'categories') || [];

	if (events.length === 0) {
		console.error(`[${SOURCE}] Could not extract events from page`);
		return { found: 0, inserted: 0 };
	}

	console.log(`[${SOURCE}] Found ${events.length} events (${categories.length} categories)`);

	const now = new Date();
	let found = events.length;
	let inserted = 0;

	for (const event of events) {
		// Skip past events
		const firstDate = new Date(event.firstEventDate);
		const lastDate = event.lastEventDate ? new Date(event.lastEventDate) : firstDate;
		if (lastDate < now) continue;

		const sourceUrl = `https://www.grieghallen.no${event.url}`;

		// Delete sold-out events from DB
		if (event.ticketStatus?.label === 'Utsolgt') {
			if (await deleteEventByUrl(sourceUrl)) console.log(`  - Removed sold-out: ${event.name}`);
			continue;
		}
		if (await eventExists(sourceUrl)) continue;

		const category = mapCategory(event.category, categories, event.name);
		const bydel = mapBydel('Grieghallen');
		const datePart = event.firstEventDate.slice(0, 10);
		const imageUrl = event.image ? `${CDN_BASE}${event.image}` : undefined;

		const aiDesc = await generateDescription({ title: event.name, venue: 'Grieghallen', category, date: firstDate, price: '' });
		const success = await insertEvent({
			slug: makeSlug(event.name, datePart),
			title_no: event.name,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: firstDate.toISOString(),
			date_end: event.lastEventDate && event.lastEventDate !== event.firstEventDate
				? lastDate.toISOString()
				: undefined,
			venue_name: 'Grieghallen',
			address: 'Edvard Griegs plass 1, Bergen',
			bydel,
			price: '',
			ticket_url: event.ticketUrl || sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: event.category.some(id => categories.find(c => c.id === id)?.name?.toLowerCase().includes('familie')) ? 'family' : 'all',
			language: event.name.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.name} (${category}, ${event.eventPeriodText})`);
			inserted++;
		}
	}

	return { found, inserted };
}
