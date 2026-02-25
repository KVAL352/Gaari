import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, bergenOffset, deleteEventByUrl } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'raabrent';
const BASE_URL = 'https://www.raabrent.no';
const LIST_URL = `${BASE_URL}/products`;
const VENUE = 'Råbrent Keramikkverksted';
const ADDRESS = 'Lille Øvregaten 18, Bergen';

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

	const now = new Date();
	let year = now.getFullYear();
	const testDate = new Date(`${year}-${month}-${day}`);
	if (testDate < now && (now.getTime() - testDate.getTime()) > 30 * 24 * 60 * 60 * 1000) {
		year++;
	}

	return `${year}-${month}-${day}`;
}

function parseTimeFromTitle(title: string): { start: string; end: string } | null {
	// "LYNKURS pa OY 14. mars 12:00-13:00"
	const match = title.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
	if (!match) return null;
	return { start: match[1], end: match[2] };
}

interface ProductInfo {
	title: string;
	sourceUrl: string;
	price: string;
	imageUrl?: string;
	datePart: string;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Råbrent Keramikk courses (storefront HTML)...`);

	const html = await fetchHTML(LIST_URL);
	if (!html) return { found: 0, inserted: 0 };

	const $ = cheerio.load(html);
	const products: ProductInfo[] = [];
	const soldOutUrls: string[] = [];

	$('div.product-list-thumb.product').each((_, el) => {
		const card = $(el);

		// Track sold-out products for DB deletion
		if (card.hasClass('sold')) {
			const href = card.find('a.product-list-link').attr('href');
			if (href) soldOutUrls.push(`${BASE_URL}${href}`);
			return;
		}
		if (card.hasClass('soon')) return;

		const link = card.find('a.product-list-link');
		const href = link.attr('href');
		if (!href) return;

		const title = card.find('div.product-list-thumb-name').text().trim();
		if (!title) return;

		// Only process products with dates (skip gift cards, etc.)
		const datePart = parseDateFromTitle(title);
		if (!datePart) return;

		// Price
		const priceEl = card.find('span[data-currency-amount]');
		const priceAmount = priceEl.attr('data-currency-amount');
		const price = priceAmount ? `${Math.round(parseFloat(priceAmount))} kr` : '';

		// Image — replace w=20 placeholder with w=800
		const imgEl = card.find('img.product-list-image');
		const imgSrc = imgEl.attr('src') || '';
		const imageUrl = imgSrc ? imgSrc.replace(/w=\d+/, 'w=800') : undefined;

		products.push({
			title,
			sourceUrl: `${BASE_URL}${href}`,
			price,
			imageUrl,
			datePart,
		});
	});

	// Delete sold-out products from DB
	for (const url of soldOutUrls) {
		if (await deleteEventByUrl(url)) console.log(`  - Removed sold-out: ${url}`);
	}

	console.log(`[${SOURCE}] Found ${products.length} upcoming courses`);

	let found = products.length;
	let inserted = 0;

	for (const product of products) {
		if (await eventExists(product.sourceUrl)) continue;

		const time = parseTimeFromTitle(product.title);
		const offset = bergenOffset(product.datePart);
		const dateStart = time
			? new Date(`${product.datePart}T${time.start}:00${offset}`).toISOString()
			: new Date(`${product.datePart}T18:00:00${offset}`).toISOString();
		const dateEnd = time
			? new Date(`${product.datePart}T${time.end}:00${offset}`).toISOString()
			: undefined;

		const aiDesc = await generateDescription({ title: product.title, venue: VENUE, category: 'workshop', date: dateStart, price: product.price });

		const success = await insertEvent({
			slug: makeSlug(product.title, product.datePart),
			title_no: product.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category: 'workshop',
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: VENUE,
			address: ADDRESS,
			bydel: mapBydel(VENUE),
			price: product.price,
			ticket_url: product.sourceUrl,
			source: SOURCE,
			source_url: product.sourceUrl,
			image_url: product.imageUrl,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${product.title} (${product.price})`);
			inserted++;
		}
	}

	return { found, inserted };
}
