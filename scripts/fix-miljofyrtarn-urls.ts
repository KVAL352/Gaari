/**
 * One-time fix: Update events with miljofyrtarn.no ticket_url
 * to use their source_url or venue registry URL instead.
 *
 * Run: cd scripts && npx tsx fix-miljofyrtarn-urls.ts
 */
import { supabase } from './lib/supabase.js';
import { getVenueUrl } from './lib/venues.js';

async function main() {
	const { data: events, error } = await supabase
		.from('events')
		.select('id, title_no, venue_name, source_url, ticket_url')
		.ilike('ticket_url', '%miljofyrtarn%');

	if (error) {
		console.error('Query failed:', error.message);
		process.exit(1);
	}

	if (!events || events.length === 0) {
		console.log('No events found with miljofyrtarn ticket_url.');
		return;
	}

	console.log(`Found ${events.length} events with miljofyrtarn ticket_url:\n`);

	let fixed = 0;
	for (const event of events) {
		// Try venue registry first, then fall back to source_url
		const venueUrl = event.venue_name ? getVenueUrl(event.venue_name) : null;
		const newUrl = venueUrl || event.source_url;

		console.log(`  ${event.title_no}`);
		console.log(`    old: ${event.ticket_url}`);
		console.log(`    new: ${newUrl}`);

		const { error: updateError } = await supabase
			.from('events')
			.update({ ticket_url: newUrl })
			.eq('id', event.id);

		if (updateError) {
			console.error(`    FAILED: ${updateError.message}`);
		} else {
			fixed++;
		}
	}

	console.log(`\nFixed ${fixed}/${events.length} events.`);
}

main();
