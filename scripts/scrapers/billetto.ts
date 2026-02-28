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

		// Filter to published Bergen-area events
		const bergenHits = hits.filter(h => {
			if (h.state !== 'published') return false;
			const city = (h.city || '').toLowerCase();
			return city === 'bergen' || city.includes('bergen');
		});

		console.log(`[${SOURCE}] Found ${bergenHits.length} Bergen events (${hits.length} total in radius)`);

		for (const hit of bergenHits) {
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
