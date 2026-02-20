import { supabase } from './lib/supabase.js';
import { resolveTicketUrl, isAggregatorUrl } from './lib/venues.js';

// One-time fix: replace aggregator ticket_urls with venue websites from the registry.
// Does NOT touch ticket platform URLs (Ticketmaster, TicketCo, etc.) — those are real purchase links.

const { data: events, error } = await supabase
	.from('events')
	.select('id, title_no, venue_name, ticket_url, source');

if (error || !events) {
	console.error('Fetch error:', error?.message);
	process.exit(1);
}

let updated = 0;
let skipped = 0;
const updates: { id: string; title: string; oldUrl: string; newUrl: string }[] = [];

for (const e of events) {
	if (!e.ticket_url || !isAggregatorUrl(e.ticket_url)) {
		skipped++;
		continue;
	}

	const better = resolveTicketUrl(e.venue_name || '', e.ticket_url);
	if (better && better !== e.ticket_url) {
		updates.push({
			id: e.id,
			title: e.title_no,
			oldUrl: e.ticket_url,
			newUrl: better,
		});
	}
}

console.log(`Total events: ${events.length}`);
console.log(`Already good (non-aggregator or no URL): ${skipped}`);
console.log(`Aggregator URLs found: ${events.length - skipped}`);
console.log(`Can fix with venue registry: ${updates.length}`);
console.log(`No match in registry (kept as-is): ${events.length - skipped - updates.length}\n`);

// Apply updates in batches
for (const u of updates) {
	const { error: updateErr } = await supabase
		.from('events')
		.update({ ticket_url: u.newUrl })
		.eq('id', u.id);

	if (updateErr) {
		console.error(`  Failed: ${u.title} — ${updateErr.message}`);
	} else {
		const domain = u.newUrl.replace(/https?:\/\//, '').split('/')[0];
		console.log(`  ${u.title} → ${domain}`);
		updated++;
	}
}

console.log(`\nUpdated: ${updated} events`);
