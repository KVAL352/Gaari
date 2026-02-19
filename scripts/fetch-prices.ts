import { fetchHTML, delay } from './lib/utils.js';
import { supabase } from './lib/supabase.js';
import * as cheerio from 'cheerio';

const DELAY_MS = 1000;

function extractPrice(html: string): string {
	const $ = cheerio.load(html);

	// Best: structured data meta tag with itemprop="price"
	const metaPrice = $('meta[itemprop="price"]').first().attr('content');
	if (metaPrice && !isNaN(Number(metaPrice))) {
		return metaPrice; // e.g. "550"
	}

	// Fallback: look for "Pris" section with NOK amounts
	const bodyText = $('body').text();
	const nokMatch = bodyText.match(/NOK\s*([\d,.]+)/);
	if (nokMatch) {
		return nokMatch[1].replace(',', '.').replace(/\.00$/, '');
	}

	// Check if explicitly free
	const prisSection = $('h2').filter((_, el) => $(el).text().trim() === 'Pris').parent().text();
	if (prisSection.toLowerCase().includes('gratis') || prisSection.includes('0,00')) {
		return '0';
	}

	// Check page-wide for "gratis" near price context
	if (bodyText.toLowerCase().includes('gratis inngang') || bodyText.toLowerCase().includes('gratis adgang')) {
		return '0';
	}

	return ''; // Unknown
}

async function main() {
	// Get all visitbergen events with no price
	const { data: events, error } = await supabase
		.from('events')
		.select('id, title_no, source_url')
		.eq('source', 'visitbergen')
		.eq('price', '')
		.order('date_start', { ascending: true });

	if (error || !events) {
		console.error('Failed to fetch events:', error?.message);
		return;
	}

	console.log(`Found ${events.length} events without prices. Fetching detail pages...\n`);

	let updated = 0;
	let failed = 0;
	let unknown = 0;

	for (let i = 0; i < events.length; i++) {
		const event = events[i];
		if (i > 0) await delay(DELAY_MS);

		if (i % 50 === 0 && i > 0) {
			console.log(`  Progress: ${i}/${events.length} (${updated} prices found)`);
		}

		const html = await fetchHTML(event.source_url);
		if (!html) { failed++; continue; }

		const price = extractPrice(html);
		if (!price) { unknown++; continue; }

		const { error: updateErr } = await supabase
			.from('events')
			.update({ price })
			.eq('id', event.id);

		if (updateErr) {
			console.error(`  Error updating ${event.title_no}:`, updateErr.message);
		} else {
			const label = price === '0' ? 'Gratis' : `${price} kr`;
			console.log(`  ${label} — ${event.title_no}`);
			updated++;
		}
	}

	console.log(`\n=== Done ===`);
	console.log(`  Total: ${events.length}`);
	console.log(`  Prices found: ${updated}`);
	console.log(`  Unknown: ${unknown}`);
	console.log(`  Failed to fetch: ${failed}`);
}

main();
