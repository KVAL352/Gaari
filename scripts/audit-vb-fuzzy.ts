import { supabase } from './lib/supabase.js';

function normalize(title: string): string {
	return title.toLowerCase().trim()
		.replace(/\s*-\s*\d{1,2}\/\d{1,2}\s*kl\.?\s*\d{1,2}[:.]\d{2}\s*$/i, '')
		.replace(/\s*kl\.?\s*\d{1,2}[:.]\d{2}\s*$/i, '')
		.replace(/\s*\(\d{4}\)\s*$/, '')
		.replace(/\s*utsolgt\s*$/i, '')
		.replace(/["""'']/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function fuzzyMatch(a: string, b: string): boolean {
	if (a === b) return true;
	// Containment: one contains the other with 0.6 length ratio
	if (a.length > 0 && b.length > 0) {
		const shorter = a.length < b.length ? a : b;
		const longer = a.length < b.length ? b : a;
		if (longer.includes(shorter) && shorter.length / longer.length >= 0.5) return true;
	}
	return false;
}

async function main() {
	const { data: vbEvents } = await supabase
		.from('events')
		.select('id, title_no, venue_name, date_start, category')
		.eq('source', 'visitbergen')
		.gte('date_start', new Date().toISOString());

	const { data: otherEvents } = await supabase
		.from('events')
		.select('title_no, date_start, source')
		.neq('source', 'visitbergen')
		.gte('date_start', new Date().toISOString());

	// Build index by date
	const byDate: Record<string, Array<{title: string; source: string}>> = {};
	for (const e of otherEvents || []) {
		const date = (e.date_start || '').slice(0, 10);
		if (!byDate[date]) byDate[date] = [];
		byDate[date].push({ title: normalize(e.title_no || ''), source: e.source });
	}

	const covered: Array<{vb: string; match: string; source: string}> = [];
	const unique: typeof vbEvents = [];

	for (const e of vbEvents || []) {
		const normTitle = normalize(e.title_no || '');
		const date = (e.date_start || '').slice(0, 10);
		const candidates = byDate[date] || [];
		
		let found = false;
		for (const c of candidates) {
			if (fuzzyMatch(normTitle, c.title)) {
				covered.push({ vb: e.title_no, match: c.title, source: c.source });
				found = true;
				break;
			}
		}
		if (!found) unique.push(e);
	}

	console.log(`=== VisitBergen fuzzy gap analysis ===`);
	console.log(`Total VB events: ${(vbEvents || []).length}`);
	console.log(`Covered (fuzzy match): ${covered.length}`);
	console.log(`Truly unique to VB: ${unique.length}\n`);

	// Group unique by venue
	const byVenue: Record<string, typeof unique> = {};
	for (const e of unique) {
		const v = e.venue_name || 'Unknown';
		if (!byVenue[v]) byVenue[v] = [];
		byVenue[v].push(e);
	}

	const sorted = Object.entries(byVenue).sort((a, b) => b[1].length - a[1].length);
	
	console.log('=== Truly unique VB events by venue (5+) ===\n');
	for (const [venue, events] of sorted.filter(([,e]) => e.length >= 5)) {
		console.log(`${venue} (${events.length}):`);
		for (const e of events.slice(0, 3)) {
			console.log(`  - ${e.title_no} (${e.date_start?.slice(0, 10)}) [${e.category}]`);
		}
		if (events.length > 3) console.log(`  ... +${events.length - 3} more`);
		console.log();
	}

	// Covered sources breakdown
	const coveredBySrc: Record<string, number> = {};
	for (const c of covered) {
		coveredBySrc[c.source] = (coveredBySrc[c.source] || 0) + 1;
	}
	console.log('=== Covered by which scraper ===');
	for (const [src, count] of Object.entries(coveredBySrc).sort((a, b) => b[1] - a[1])) {
		console.log(`  ${src}: ${count}`);
	}
}

main();
