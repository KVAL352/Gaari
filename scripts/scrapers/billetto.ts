import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'billetto';

// Public Algolia credentials (embedded in Billetto's frontend JS)
const ALGOLIA_APP_ID = 'YNEUY03Z8Q';
const ALGOLIA_API_KEY = '8de1d74c7c7de20e35c1f7215e7c699a';
const ALGOLIA_URL = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/events/query`;

// Bergen city center coordinates, 25km radius
const BERGEN_LAT = 60.3943;
const BERGEN_LNG = 5.3259;
const RADIUS_M = 25000;

interface BillettoHit {
	id: number;
	name: string;
	url: string;
	image: string | null;
	start_time: number; // Unix timestamp
	end_time: number | null;
	category: string;
	subcategory: string | null;
	price: number | null;
	price_range: string | null;
	currency: string | null;
	venue_name: string | null;
	city: string | null;
	location: string | null;
	age_rating: string | null;
	state: string;
	kind: string; // 'scheduled' or 'regular'
	on_sale: boolean;
}

function mapCategory(category: string, subcategory: string | null): string {
	const cat = (category || '').toLowerCase();
	const sub = (subcategory || '').toLowerCase();

	if (cat === 'music' || cat === 'musik') return 'music';
	if (cat === 'performing_arts') return 'theatre';
	if (cat === 'food_drink') return 'food';
	if (cat === 'sports' || cat === 'sport') return 'sports';
	if (cat === 'nightlife' || sub === 'party' || sub === 'club') return 'nightlife';
	if (cat === 'festivals') return 'festival';
	if (cat === 'family' || cat === 'kids') return 'family';
	if (cat === 'workshops' || cat === 'classes' || sub === 'workshop' || sub === 'class') return 'workshop';
	if (cat === 'tours') return 'tours';
	return 'culture';
}

function formatPrice(price: number | null, priceRange: string | null): string {
	if (price === 0) return '0';
	if (price && price > 0) return `${price} NOK`;
	if (priceRange) return priceRange;
	return '';
}

/**
 * Group events that are time-slots of the same parent event.
 * Strips trailing date/time patterns from the title to find the base name,
 * then keeps one event per base-name + calendar-date with the earliest start
 * and latest end time.
 */
function deduplicateTimeSlots(hits: BillettoHit[]): BillettoHit[] {
	// Match trailing patterns like "24.03.26 14:40-15:00" or "24.03.2026 14:40-15:00"
	const TIME_SLOT_RE = /\s+\d{1,2}\.\d{1,2}\.\d{2,4}\s+\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}\s*$/;

	const groups = new Map<string, BillettoHit[]>();

	for (const hit of hits) {
		const baseName = hit.name.replace(TIME_SLOT_RE, '').trim();
		const dateKey = new Date(hit.start_time * 1000).toISOString().slice(0, 10);
		const key = `${baseName.toLowerCase()}|${dateKey}`;

		const group = groups.get(key);
		if (group) {
			group.push(hit);
		} else {
			groups.set(key, [hit]);
		}
	}

	const result: BillettoHit[] = [];
	for (const group of groups.values()) {
		if (group.length === 1) {
			result.push(group[0]);
			continue;
		}

		// Pick the one with earliest start, merge end time from latest slot
		group.sort((a, b) => a.start_time - b.start_time);
		const merged = { ...group[0] };
		merged.name = merged.name.replace(TIME_SLOT_RE, '').trim();
		const lastSlot = group[group.length - 1];
		if (lastSlot.end_time) {
			merged.end_time = lastSlot.end_time;
		}
		if (group.length > 1) {
			console.log(`  [dedup] Merged ${group.length} time-slots for "${merged.name}"`);
		}
		result.push(merged);
	}

	return result;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Billetto Bergen events...`);

	let found = 0;
	let inserted = 0;

	try {
		const res = await fetch(ALGOLIA_URL, {
			method: 'POST',
			headers: {
				'X-Algolia-Application-Id': ALGOLIA_APP_ID,
				'X-Algolia-API-Key': ALGOLIA_API_KEY,
				'Content-Type': 'application/json',
				'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
			},
			body: JSON.stringify({
				query: '',
				hitsPerPage: 100,
				aroundLatLng: `${BERGEN_LAT},${BERGEN_LNG}`,
				aroundRadius: RADIUS_M,
			}),
		});

		if (!res.ok) {
			console.error(`[${SOURCE}] Algolia API returned ${res.status}`);
			return { found, inserted };
		}

		const data = await res.json();
		const hits: BillettoHit[] = data.hits || [];

		// Bergen municipality includes several city areas not named "Bergen"
		const BERGEN_CITIES = new Set([
			'bergen', 'laksevåg', 'laksevag', 'damsgård', 'damsgard',
			'nesttun', 'åsane', 'asane', 'arna', 'fana', 'fyllingsdalen',
		]);

		// Filter to published Bergen-area events
		const bergenHits = hits.filter(h => {
			if (h.state !== 'published') return false;
			const city = (h.city || '').toLowerCase();
			return city.includes('bergen') || BERGEN_CITIES.has(city);
		});

		// Deduplicate time-slot events (e.g. "BRGN Vareprøvesalg 24.03.26 14:40-15:00")
		// Group by base title (strip trailing date/time patterns) + same calendar date
		const deduped = deduplicateTimeSlots(bergenHits);

		console.log(`[${SOURCE}] Found ${bergenHits.length} Bergen events, ${deduped.length} after time-slot dedup (${hits.length} total in radius)`);

		for (const hit of deduped) {
			found++;

			if (!hit.on_sale) continue;

			const sourceUrl = hit.url;
			if (!sourceUrl) continue;
			if (await eventExists(sourceUrl)) continue;

			const startDate = new Date(hit.start_time * 1000);
			const now = new Date();
			if (startDate < now) continue;

			const venueName = hit.venue_name || hit.location?.split(',')[0] || 'Bergen';
			const category = mapCategory(hit.category, hit.subcategory);
			const bydel = mapBydel(venueName);
			const datePart = startDate.toISOString().slice(0, 10);
			const price = formatPrice(hit.price, hit.price_range);
			const imageUrl = hit.image || undefined;
			const endDate = hit.end_time ? new Date(hit.end_time * 1000) : undefined;

			const aiDesc = await generateDescription({
				title: hit.name,
				venue: venueName,
				category,
				date: startDate,
				price,
			});

			const success = await insertEvent({
				slug: makeSlug(hit.name, datePart),
				title_no: hit.name,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				category,
				date_start: startDate.toISOString(),
				date_end: endDate?.toISOString(),
				venue_name: venueName,
				address: venueName,
				bydel,
				price,
				ticket_url: sourceUrl,
				source: SOURCE,
				source_url: sourceUrl,
				image_url: imageUrl,
				age_group: hit.age_rating === '18+' ? '18+' : 'all',
				language: hit.name.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${hit.name} (${venueName}, ${category})`);
				inserted++;
			}

			await delay(200);
		}
	} catch (err: any) {
		console.error(`[${SOURCE}] Error: ${err.message}`);
	}

	return { found, inserted };
}
