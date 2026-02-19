import * as cheerio from 'cheerio';
import { supabase } from './lib/supabase.js';
import { mapCategory } from './lib/categories.js';
import { fetchHTML, delay } from './lib/utils.js';

const BASE_URL = 'https://kulturikveld.no';
const LIST_URL = `${BASE_URL}/arrangementer/bergen`;

function extractDisplayId(url: string): string {
	const path = url.replace(/^https?:\/\/[^\/]+/, '');
	const parts = path.split('/').filter(Boolean);
	const last = parts[parts.length - 1] || '';
	const idMatch = last.match(/^([A-Za-z0-9]{5,7})-/);
	if (idMatch) return idMatch[1];
	if (last.length <= 7 && /^[A-Za-z0-9]+$/.test(last)) return last;
	return last;
}

async function main() {
	// Get all kulturikveld events from DB
	const { data: events, error } = await supabase
		.from('events')
		.select('id, source_url, category, price')
		.eq('source', 'kulturikveld');

	if (error || !events) {
		console.error('Failed to fetch events:', error?.message);
		return;
	}

	console.log(`Found ${events.length} kulturikveld events in DB`);

	// Build a map from display ID -> DB event
	const dbMap = new Map<string, typeof events[0]>();
	for (const e of events) {
		dbMap.set(extractDisplayId(e.source_url), e);
	}

	let updated = 0;

	// Scrape pages and update categories + prices
	for (let page = 1; page <= 21; page++) {
		const url = page === 1 ? LIST_URL : `${LIST_URL}?side=${page}`;
		const html = await fetchHTML(url);
		if (!html) continue;

		const $ = cheerio.load(html);

		$('li.mb-6, li.mb-10').each((_, el) => {
			const $card = $(el);
			const link = $card.find('a[href*="/arrangementer/bergen/"]').attr('href');
			if (!link) return;

			const displayId = extractDisplayId(`${BASE_URL}${link}`);
			const dbEvent = dbMap.get(displayId);
			if (!dbEvent) return;

			let category = '';
			$card.find('.flex.items-center').each((_, meta) => {
				const $meta = $(meta);
				if ($meta.find('svg[data-icon*="category"]').length) {
					category = $meta.find('div').text().trim();
				}
			});

			let price = '';
			$card.find('.flex.items-center').each((_, meta) => {
				const $meta = $(meta);
				if ($meta.find('svg[data-icon*="money"]').length) {
					price = $meta.find('div').text().trim();
				}
			});

			if (category) {
				const mappedCat = mapCategory(category);
				const priceMatch = price.match(/(\d[\d\s]*)/);
				const priceStr = priceMatch ? priceMatch[1].replace(/\s/g, '') : '';

				const updates: Record<string, string> = {};
				if (mappedCat !== dbEvent.category) updates.category = mappedCat;
				if (priceStr && !dbEvent.price) updates.price = priceStr;

				if (Object.keys(updates).length > 0) {
					supabase.from('events').update(updates).eq('id', dbEvent.id).then(({ error }) => {
						if (!error) {
							updated++;
							console.log(`  Updated ${displayId}: ${Object.entries(updates).map(([k,v]) => `${k}=${v}`).join(', ')}`);
						}
					});
				}
			}
		});

		console.log(`Page ${page} processed`);
		await delay(1500);
	}

	// Wait for async updates
	await delay(2000);
	console.log(`\nTotal updated: ${updated}`);
}

main().catch(console.error);
