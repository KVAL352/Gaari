/**
 * One-time fix: update existing BarnasNorge events
 * 1. Delete kindergarten-only events (not accessible to general public)
 * 2. Replace AI-generated images with real images from venue pages
 * 3. Replace ticket_url to link directly to venue page (not BarnasNorge)
 */
import * as cheerio from 'cheerio';
import { supabase } from './lib/supabase.js';

const KINDERGARTEN_KEYWORDS = ['barnehage', 'barnehagebarn'];

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
	} catch {
		return null;
	}
}

function delay(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

interface VenueInfo {
	imageUrl: string | null;
	venueUrl: string | null;
}

// Cache: detailUrl → venue info
const venueCache = new Map<string, VenueInfo>();

async function fetchVenueInfo(sourceUrl: string): Promise<VenueInfo> {
	// Extract the BarnasNorge detail path from source_url (strip #dateTime)
	const detailUrl = sourceUrl.split('#')[0];
	const empty: VenueInfo = { imageUrl: null, venueUrl: null };

	if (venueCache.has(detailUrl)) {
		return venueCache.get(detailUrl)!;
	}

	try {
		const html = await fetchHTML(detailUrl);
		if (!html) { venueCache.set(detailUrl, empty); return empty; }

		const $ = cheerio.load(html);
		const ldScript = $('script[type="application/ld+json"]').first().html();
		if (!ldScript) { venueCache.set(detailUrl, empty); return empty; }

		const ld = JSON.parse(ldScript.replace(/[\x00-\x1F\x7F]/g, ' '));
		const venueUrl = ld.offers?.url;
		if (!venueUrl?.startsWith('http')) { venueCache.set(detailUrl, empty); return empty; }

		await delay(500);
		const venueHtml = await fetchHTML(venueUrl);
		if (!venueHtml) {
			const result: VenueInfo = { imageUrl: null, venueUrl };
			venueCache.set(detailUrl, result);
			return result;
		}

		const $venue = cheerio.load(venueHtml);
		const ogImage = $venue('meta[property="og:image"]').attr('content');
		const imageUrl = ogImage?.startsWith('http') ? ogImage : null;

		const result: VenueInfo = { imageUrl, venueUrl };
		venueCache.set(detailUrl, result);
		return result;
	} catch {
		venueCache.set(detailUrl, empty);
		return empty;
	}
}

async function main() {
	// Get all BarnasNorge events
	const { data: events, error } = await supabase
		.from('events')
		.select('id, title_no, source_url, image_url, ticket_url')
		.eq('source', 'barnasnorge');

	if (error || !events) {
		console.error('Failed to fetch events:', error?.message);
		return;
	}

	console.log(`Found ${events.length} BarnasNorge events in DB\n`);

	// Step 1: Delete kindergarten events
	let deletedCount = 0;
	const remainingEvents = [];
	for (const event of events) {
		const lower = event.title_no.toLowerCase();
		if (KINDERGARTEN_KEYWORDS.some(kw => lower.includes(kw))) {
			const { error: delErr } = await supabase.from('events').delete().eq('id', event.id);
			if (!delErr) {
				console.log(`  [deleted] ${event.title_no} (kindergarten)`);
				deletedCount++;
			}
		} else {
			remainingEvents.push(event);
		}
	}
	console.log(`\nDeleted ${deletedCount} kindergarten events`);
	console.log(`Remaining: ${remainingEvents.length} events to update\n`);

	// Step 2: Update images and ticket_url for remaining events
	let updatedCount = 0;
	let noVenueCount = 0;
	for (const event of remainingEvents) {
		const venueInfo = await fetchVenueInfo(event.source_url);

		const updates: Record<string, string> = {};

		// Update image if we found a real one
		if (venueInfo.imageUrl && venueInfo.imageUrl !== event.image_url) {
			updates.image_url = venueInfo.imageUrl;
		}

		// Update ticket_url to point to venue page instead of BarnasNorge
		if (venueInfo.venueUrl && venueInfo.venueUrl !== event.ticket_url) {
			updates.ticket_url = venueInfo.venueUrl;
		}

		if (Object.keys(updates).length > 0) {
			const { error: upErr } = await supabase
				.from('events')
				.update(updates)
				.eq('id', event.id);

			if (!upErr) {
				const flags = Object.keys(updates).join('+');
				console.log(`  [${flags}] ${event.title_no}`);
				updatedCount++;
			}
		} else if (!venueInfo.venueUrl) {
			noVenueCount++;
		}

		await delay(1500);
	}

	console.log(`\n=== Summary ===`);
	console.log(`  Deleted kindergarten events: ${deletedCount}`);
	console.log(`  Updated (image/link): ${updatedCount}`);
	console.log(`  No venue found (kept as-is): ${noVenueCount}`);
	console.log(`  Already correct: ${remainingEvents.length - updatedCount - noVenueCount}`);
}

main().catch(console.error);
