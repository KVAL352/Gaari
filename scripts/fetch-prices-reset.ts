import { fetchHTML, delay } from './lib/utils.js';
import { supabase } from './lib/supabase.js';
import * as cheerio from 'cheerio';

// Fetch prices specifically for the 47 events we reset from "0" to ""
const DELAY_MS = 1000;

function extractPriceFromText(text: string): string | null {
	const nokMatch = text.match(/NOK\s*([\d]+(?:[,.]\d+)?)/);
	if (nokMatch) return nokMatch[1].replace(',00', '').replace('.00', '');
	const krMatch = text.match(/(\d[\d\s]*)\s*kr\b/i);
	if (krMatch) return krMatch[1].replace(/\s/g, '');
	return null;
}

function extractPriceFromHTML(html: string): string | null {
	const $ = cheerio.load(html);
	const metaPrice = $('meta[itemprop="price"]').first().attr('content');
	if (metaPrice && Number(metaPrice) > 0) return metaPrice;
	const bodyText = $('body').text();
	return extractPriceFromText(bodyText);
}

async function main() {
	// Get the recently-reset events (price is '' and were previously '0')
	const { data: events, error } = await supabase
		.from('events')
		.select('id, title_no, source_url, ticket_url')
		.in('source', ['visitbergen', 'bergenlive'])
		.eq('price', '')
		.order('date_start', { ascending: true })
		.limit(100);

	if (error || !events) {
		console.error('Failed:', error?.message);
		return;
	}

	// Only try events that have ticket URLs
	const withTickets = events.filter(e => {
		const url = e.ticket_url || '';
		return url.includes('ticketco') || url.includes('ticketmaster');
	});

	console.log(`${events.length} events with empty price, ${withTickets.length} have ticket URLs\n`);

	let updated = 0;
	for (const event of withTickets) {
		if (updated > 0) await delay(DELAY_MS);

		const html = await fetchHTML(event.ticket_url!);
		if (!html) continue;

		const price = extractPriceFromHTML(html);
		if (!price) continue;

		const { error } = await supabase.from('events').update({ price }).eq('id', event.id);
		if (!error) {
			console.log(`  ${price} kr — ${event.title_no.slice(0, 60)}`);
			updated++;
		}
	}

	console.log(`\nDone: ${updated} prices found for previously-reset events`);
}

main();
