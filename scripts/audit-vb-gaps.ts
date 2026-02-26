import { supabase } from './lib/supabase.js';

async function main() {
	// Get all visitbergen events
	const { data: vbEvents } = await supabase
		.from('events')
		.select('id, title_no, venue_name, source_url, date_start, category')
		.eq('source', 'visitbergen')
		.gte('date_start', new Date().toISOString())
		.order('date_start');

	// Get all non-VB events
	const { data: otherEvents } = await supabase
		.from('events')
		.select('title_no, venue_name, date_start, source')
		.neq('source', 'visitbergen')
		.gte('date_start', new Date().toISOString());

	// Build a set of normalized title+date keys from other scrapers
	const otherKeys = new Set<string>();
	for (const e of otherEvents || []) {
		// Normalize: lowercase, trim, remove date suffixes like "- 25/2 KL. 18:00"
		const rawTitle = (e.title_no || '').toLowerCase().trim()
			.replace(/\s*-\s*\d{1,2}\/\d{1,2}\s*kl\.?\s*\d{1,2}[:.]\d{2}\s*$/i, '')
			.replace(/\s*\(\d{4}\)\s*$/, '')
			.replace(/\s+/g, ' ');
		const date = (e.date_start || '').slice(0, 10);
		otherKeys.add(`${rawTitle}|${date}`);
	}

	// Check each VB event
	const unique: typeof vbEvents = [];
	const covered: typeof vbEvents = [];

	for (const e of vbEvents || []) {
		const rawTitle = (e.title_no || '').toLowerCase().trim()
			.replace(/\s*-\s*\d{1,2}\/\d{1,2}\s*kl\.?\s*\d{1,2}[:.]\d{2}\s*$/i, '')
			.replace(/\s*\(\d{4}\)\s*$/, '')
			.replace(/\s+/g, ' ');
		const date = (e.date_start || '').slice(0, 10);

		if (otherKeys.has(`${rawTitle}|${date}`)) {
			covered.push(e);
		} else {
			unique.push(e);
		}
	}

	console.log(`=== VisitBergen gap analysis ===`);
	console.log(`Total VB events: ${(vbEvents || []).length}`);
	console.log(`Covered by other scrapers: ${covered.length}`);
	console.log(`Only from VB: ${unique.length}\n`);

	// Group unique by venue
	const byVenue: Record<string, typeof unique> = {};
	for (const e of unique) {
		const v = e.venue_name || 'Unknown';
		if (!byVenue[v]) byVenue[v] = [];
		byVenue[v].push(e);
	}

	const sorted = Object.entries(byVenue).sort((a, b) => b[1].length - a[1].length);
	
	console.log('=== Unique VB events by venue (top 30) ===\n');
	for (const [venue, events] of sorted.slice(0, 30)) {
		console.log(`${venue} (${events.length}):`);
		for (const e of events.slice(0, 3)) {
			console.log(`  - ${e.title_no} (${e.date_start?.slice(0, 10)})`);
		}
		if (events.length > 3) console.log(`  ... +${events.length - 3} more`);
		console.log();
	}

	// Summary stats
	const venuesWith5Plus = sorted.filter(([, e]) => e.length >= 5);
	const venuesWith1 = sorted.filter(([, e]) => e.length === 1);
	console.log(`\n=== Summary ===`);
	console.log(`Venues with 5+ unique events: ${venuesWith5Plus.length}`);
	console.log(`Venues with only 1 event: ${venuesWith1.length}`);
	console.log(`Total unique events: ${unique.length}`);
}

main();
