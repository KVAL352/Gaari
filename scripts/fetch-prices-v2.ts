import { fetchHTML, delay } from './lib/utils.js';
import { supabase } from './lib/supabase.js';
import * as cheerio from 'cheerio';

const DELAY_MS = 1000;

function extractPriceFromText(text: string): string | null {
	// Look for NOK amounts: "NOK 280,00" or "NOK 550"
	const nokMatch = text.match(/NOK\s*([\d]+(?:[,.][\d]+)?)/);
	if (nokMatch) return nokMatch[1].replace(',00', '').replace('.00', '');

	// Look for kr amounts: "280 kr" or "550kr"
	const krMatch = text.match(/(\d[\d\s]*)\s*kr\b/i);
	if (krMatch) return krMatch[1].replace(/\s/g, '');

	return null;
}

function extractPriceFromHTML(html: string): string | null {
	const $ = cheerio.load(html);

	// 1. Structured metadata (best)
	const metaPrice = $('meta[itemprop="price"]').first().attr('content');
	if (metaPrice && Number(metaPrice) > 0) return metaPrice;
	if (metaPrice === '0') return '0';

	// 2. Look for NOK/kr in the page body text
	const bodyText = $('body').text();
	const price = extractPriceFromText(bodyText);
	if (price) return price;

	// 3. Check if explicitly free
	const prisSection = $('h2').filter((_, el) => $(el).text().trim() === 'Pris').parent().text();
	if (prisSection && (prisSection.toLowerCase().includes('gratis') || prisSection.includes('0,00'))) {
		return '0';
	}

	return null;
}

async function main() {
	// Get events with no price
	const { data: events, error } = await supabase
		.from('events')
		.select('id, title_no, source_url, ticket_url')
		.in('source', ['visitbergen', 'bergenlive'])
		.eq('price', '')
		.order('date_start', { ascending: true });

	if (error || !events) {
		console.error('Failed:', error?.message);
		return;
	}

	console.log(`Found ${events.length} events without prices.\n`);

	// Split into: events with external ticket URLs, and events without
	const withTicketUrl = events.filter(e => {
		const url = e.ticket_url || '';
		return url.includes('ticketco') || url.includes('ticketmaster');
	});
	const withoutTicketUrl = events.filter(e => {
		const url = e.ticket_url || '';
		return !url.includes('ticketco') && !url.includes('ticketmaster');
	});

	console.log(`  ${withTicketUrl.length} have TicketCo/Ticketmaster links`);
	console.log(`  ${withoutTicketUrl.length} only have Visit Bergen pages\n`);

	let updated = 0;
	let total = 0;

	// Pass 1: Fetch Visit Bergen detail pages for events WITHOUT ticket URLs
	console.log('--- Pass 1: Visit Bergen detail pages ---');
	for (const event of withoutTicketUrl) {
		total++;
		if (total > 1) await delay(DELAY_MS);
		if (total % 50 === 0) console.log(`  Progress: ${total}/${withoutTicketUrl.length} (${updated} prices)`);

		const html = await fetchHTML(event.source_url);
		if (!html) continue;

		const price = extractPriceFromHTML(html);
		if (!price) continue;

		const { error } = await supabase.from('events').update({ price }).eq('id', event.id);
		if (!error) {
			const label = price === '0' ? 'Gratis' : `${price} kr`;
			console.log(`  ${label} — ${event.title_no.slice(0, 60)}`);
			updated++;
		}
	}

	console.log(`\nPass 1 done: ${updated} prices from Visit Bergen pages\n`);
	const pass1 = updated;

	// Pass 2: Fetch ticket URLs (TicketCo/Ticketmaster) for remaining events
	console.log('--- Pass 2: Ticket URLs (TicketCo/Ticketmaster) ---');
	total = 0;
	for (const event of withTicketUrl) {
		total++;
		if (total > 1) await delay(DELAY_MS);
		if (total % 50 === 0) console.log(`  Progress: ${total}/${withTicketUrl.length} (${updated - pass1} prices)`);

		const html = await fetchHTML(event.ticket_url!);
		if (!html) continue;

		const price = extractPriceFromHTML(html);
		if (!price) continue;

		const { error } = await supabase.from('events').update({ price }).eq('id', event.id);
		if (!error) {
			const label = price === '0' ? 'Gratis' : `${price} kr`;
			console.log(`  ${label} — ${event.title_no.slice(0, 60)}`);
			updated++;
		}
	}

	console.log(`\n=== Done ===`);
	console.log(`  Pass 1 (Visit Bergen): ${pass1} prices`);
	console.log(`  Pass 2 (Ticket URLs): ${updated - pass1} prices`);
	console.log(`  Total new prices: ${updated}`);
}

main();
