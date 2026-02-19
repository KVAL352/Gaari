/**
 * Fix Visit Bergen events: replace visitbergen.com ticket_url with actual venue/ticket links
 * Fetches each Visit Bergen detail page and extracts external links.
 */
import * as cheerio from 'cheerio';
import { supabase } from './lib/supabase.js';

// Generic/junk domains to skip — these are footer links, badges, etc.
const SKIP_DOMAINS = [
	'miljofyrtarn.no', 'innovasjonnorge.no', 'visitnorway.com',
	'google.com', 'facebook.com', 'twitter.com', 'instagram.com',
	'tripadvisor', 'schema.org', 'w3.org', 'youtube.com',
	'linkedin.com', 'pinterest.com', 'apple.com/maps',
	'addtoany.com', 'sharethis.com',
];

async function fetchHTML(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
				'Accept': 'text/html',
				'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.5',
			},
		});
		if (!res.ok) return null;
		return await res.text();
	} catch { return null; }
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function isJunkUrl(href: string): boolean {
	const lower = href.toLowerCase();
	return SKIP_DOMAINS.some(d => lower.includes(d));
}

async function findTicketUrl(detailUrl: string): Promise<string | null> {
	const html = await fetchHTML(detailUrl);
	if (!html) return null;

	const $ = cheerio.load(html);

	// Strategy 1: Look for links with ticket-related text (highest confidence)
	let bestTicketLink: string | null = null;

	$('a[href]').each((_, el) => {
		if (bestTicketLink) return; // Already found one

		const href = $(el).attr('href') || '';
		if (!href.startsWith('http') || href.includes('visitbergen.com') || isJunkUrl(href)) return;

		const text = $(el).text().toLowerCase().trim();

		// Only accept links with clear ticket/booking/event text
		if (text.includes('billett') || text.includes('ticket') || text.includes('kjøp') ||
			text.includes('book') || text.includes('bestill') || text.includes('meld deg') ||
			text.includes('les mer') || text.includes('read more') ||
			text.includes('nettside') || text.includes('website') ||
			text.includes('gå til') || text.includes('se program')) {
			bestTicketLink = href;
		}
	});

	if (bestTicketLink) return bestTicketLink;

	// Strategy 2: Look for links to known ticket platforms
	const ticketPlatforms = ['ticketmaster.no', 'ticketco.', 'hoopla.no', 'billettservice.',
		'eventbrite.', 'tikkio.com', 'checkin.no', 'eventim.'];

	let platformLink: string | null = null;
	$('a[href]').each((_, el) => {
		if (platformLink) return;
		const href = $(el).attr('href') || '';
		if (ticketPlatforms.some(p => href.toLowerCase().includes(p))) {
			platformLink = href;
		}
	});

	return platformLink;
}

async function main() {
	// Step 1: Revert any bad updates (miljofyrtarn etc.)
	const { data: badUpdates } = await supabase
		.from('events')
		.select('id, source_url')
		.eq('source', 'visitbergen')
		.ilike('ticket_url', '%miljofyrtarn%');

	if (badUpdates && badUpdates.length > 0) {
		console.log(`Reverting ${badUpdates.length} bad updates (miljofyrtarn)...`);
		for (const e of badUpdates) {
			await supabase.from('events').update({ ticket_url: e.source_url }).eq('id', e.id);
		}
		console.log('Reverted.\n');
	}

	// Step 2: Find all events still pointing to visitbergen
	const { data: events, error } = await supabase
		.from('events')
		.select('id, title_no, ticket_url, source_url')
		.eq('source', 'visitbergen')
		.ilike('ticket_url', '%visitbergen.com%');

	if (error || !events) {
		console.error('Failed:', error?.message);
		return;
	}

	console.log(`Found ${events.length} Visit Bergen events to check\n`);

	let updated = 0;
	let notFound = 0;

	for (let i = 0; i < events.length; i++) {
		const event = events[i];
		const detailUrl = event.source_url || event.ticket_url;

		const ticketUrl = await findTicketUrl(detailUrl);

		if (ticketUrl) {
			const { error: upErr } = await supabase
				.from('events')
				.update({ ticket_url: ticketUrl })
				.eq('id', event.id);

			if (!upErr) {
				console.log(`  [updated] ${event.title_no} → ${ticketUrl.slice(0, 70)}`);
				updated++;
			}
		} else {
			notFound++;
		}

		if ((i + 1) % 20 === 0) console.log(`  ... ${i + 1}/${events.length}`);
		await delay(1000);
	}

	console.log(`\n=== Summary ===`);
	console.log(`  Updated with real ticket link: ${updated}`);
	console.log(`  No ticket link found (kept visitbergen): ${notFound}`);
}

main().catch(console.error);
