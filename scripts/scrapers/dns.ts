import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, deleteEventByUrl } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'dns';
const API_URL = 'https://dns.no/wp-content/plugins/mrk-dns/dns_events.php';

interface DNSEvent {
	id: string;
	productionId: string;
	title: string;
	theater: string;
	status: string; // "0" = sold out, "1" = low availability, "2" = available
	dateISO: string; // YYYY-MM-DD
	date: string; // DD.MM.YYYY
	startTime: string; // HH:MM
	freeSeats: number;
}

interface DNSResponse {
	theaters: string[];
	matrix: Record<string, string>;
	events: DNSEvent[];
}

function mapCategory(title: string): string {
	const lower = title.toLowerCase();
	if (lower.includes('konsert') || lower.includes('musikal')) return 'music';
	if (lower.includes('barn') || lower.includes('brødrene')) return 'family';
	return 'theatre';
}

function bergenOffset(dateISO: string): string {
	const month = parseInt(dateISO.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching DNS (Den Nationale Scene) events...`);

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

	const data: DNSResponse = await res.json();
	const events = data.events || [];
	console.log(`[${SOURCE}] Found ${events.length} performances across ${new Set(events.map(e => e.productionId)).size} productions`);

	// Group performances by production — we create one event per production (earliest upcoming performance)
	const productions = new Map<string, DNSEvent[]>();
	const soldOutProductions = new Set<string>();
	const now = new Date();

	for (const event of events) {
		// Skip past dates
		const eventDate = new Date(`${event.dateISO}T${event.startTime}:00${bergenOffset(event.dateISO)}`);
		if (eventDate < now) continue;

		if (event.status === '0') {
			// Track sold-out performances for deletion
			soldOutProductions.add(event.productionId);
			continue;
		}

		// Available performance — remove from sold-out set (at least one show available)
		soldOutProductions.delete(event.productionId);

		if (!productions.has(event.productionId)) {
			productions.set(event.productionId, []);
		}
		productions.get(event.productionId)!.push(event);
	}

	// Delete fully sold-out productions from DB
	for (const prodId of soldOutProductions) {
		if (productions.has(prodId)) continue; // Has available shows
		const eventUrl = `https://www.dns.no/forestillinger/?production=${prodId}`;
		if (await deleteEventByUrl(eventUrl)) console.log(`  - Removed sold-out production: ${prodId}`);
	}

	let found = productions.size;
	let inserted = 0;

	for (const [, perfs] of productions) {
		// Sort by date, use earliest as the main event
		perfs.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
		const first = perfs[0];
		const last = perfs[perfs.length - 1];

		const sourceUrl = `https://www.dns.no/forestillinger/`;
		const eventUrl = `https://www.dns.no/forestillinger/?production=${first.productionId}`;
		if (await eventExists(eventUrl)) continue;

		const category = mapCategory(first.title);
		const bydel = mapBydel(first.theater);
		const offset = bergenOffset(first.dateISO);
		const dateStart = new Date(`${first.dateISO}T${first.startTime}:00${offset}`).toISOString();
		const dateEnd = perfs.length > 1
			? new Date(`${last.dateISO}T${last.startTime}:00${bergenOffset(last.dateISO)}`).toISOString()
			: undefined;

		const aiDesc = await generateDescription({ title: first.title, venue: first.theater, category, date: dateStart, price: '' });
		const success = await insertEvent({
			slug: makeSlug(first.title, first.dateISO),
			title_no: first.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: first.theater,
			address: first.theater,
			bydel,
			price: '',
			ticket_url: `https://dennationalescene.eventim-billetter.no/`,
			source: SOURCE,
			source_url: eventUrl,
			image_url: undefined,
			age_group: first.title.toLowerCase().includes('barn') || first.title.toLowerCase().includes('brødrene') ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${first.title} @ ${first.theater} (${perfs.length} shows, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
