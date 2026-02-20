import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, parseNorwegianDate } from '../lib/utils.js';

const SOURCE = 'raabrent';
const API_URL = 'https://api.bigcartel.com/raabrent/products.json';
const VENUE = 'Råbrent Keramikkverksted';
const ADDRESS = 'Lille Øvregaten 18, Bergen';

interface BCProduct {
	id: number;
	name: string;
	price: number;
	status: string;
	permalink: string;
	url: string;
	description: string;
	images: Array<{ secure_url: string }>;
	categories: Array<{ name: string }>;
	options: Array<{ name: string; sold_out: boolean }>;
	on_sale: boolean;
}

// Norwegian months for parsing from title
const MONTHS: Record<string, string> = {
	januar: '01', februar: '02', mars: '03', april: '04',
	mai: '05', juni: '06', juli: '07', august: '08',
	september: '09', oktober: '10', november: '11', desember: '12',
};

function parseDateFromTitle(title: string): string | null {
	// "CLAY PLAY 12. MARS" or "LYNKURS 28. FEBRUAR"
	const match = title.match(/(\d{1,2})\.\s*(\w+)/i);
	if (!match) return null;

	const day = match[1].padStart(2, '0');
	const monthName = match[2].toLowerCase();
	const month = MONTHS[monthName];
	if (!month) return null;

	// Assume current year, or next year if month is in the past
	const now = new Date();
	let year = now.getFullYear();
	const testDate = new Date(`${year}-${month}-${day}`);
	if (testDate < now && (now.getTime() - testDate.getTime()) > 30 * 24 * 60 * 60 * 1000) {
		year++;
	}

	return `${year}-${month}-${day}`;
}

function parseTimeFromDescription(html: string): { start: string; end: string } | null {
	const text = html.replace(/<[^>]+>/g, ' ');
	const match = text.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
	if (!match) return null;
	return { start: match[1], end: match[2] };
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Råbrent Keramikk courses...`);

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

	const products: BCProduct[] = await res.json();
	let found = 0;
	let inserted = 0;

	for (const product of products) {
		// Only process active, on-sale products with a date in the name
		if (product.status !== 'active') continue;

		const datePart = parseDateFromTitle(product.name);
		if (!datePart) continue; // Skip products without dates (gift cards, private events, etc.)

		found++;

		// Check if all options are sold out
		const allSoldOut = product.options.length > 0 && product.options.every(o => o.sold_out);
		if (allSoldOut) continue;

		const sourceUrl = product.url;
		if (await eventExists(sourceUrl)) continue;

		const time = parseTimeFromDescription(product.description);
		const dateStart = time
			? new Date(`${datePart}T${time.start}:00+01:00`).toISOString()
			: new Date(`${datePart}T18:00:00+01:00`).toISOString();
		const dateEnd = time
			? new Date(`${datePart}T${time.end}:00+01:00`).toISOString()
			: undefined;

		const description = stripHtml(product.description) || product.name;
		const imageUrl = product.images[0]?.secure_url || undefined;
		const price = product.price ? `${product.price} kr` : '';

		const success = await insertEvent({
			slug: makeSlug(product.name, datePart),
			title_no: product.name,
			description_no: description,
			category: 'workshop',
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: VENUE,
			address: ADDRESS,
			bydel: mapBydel(VENUE),
			price,
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${product.name} (${price})`);
			inserted++;
		}
	}

	return { found, inserted };
}
