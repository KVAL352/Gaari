import { fetchHTML, delay } from './lib/utils.js';
import { supabase } from './lib/supabase.js';
import * as cheerio from 'cheerio';

const DELAY_MS = 1000;

function extractStartTime(html: string, eventDateStr: string): string | null {
	const $ = cheerio.load(html);

	// Find the first opening time from the Åpningstider table
	// Structure: <span class="from">18:30</span>
	const firstFrom = $('tr.open span.from').first().text().trim();
	if (firstFrom && /^\d{1,2}:\d{2}$/.test(firstFrom)) {
		return firstFrom;
	}

	// Fallback: look for "kl. HH:MM" in page text
	const bodyText = $('body').text();
	const klMatch = bodyText.match(/kl\.?\s*(\d{1,2}[:.]\d{2})/i);
	if (klMatch) {
		return klMatch[1].replace('.', ':');
	}

	return null;
}

async function main() {
	// Get visitbergen events that have the default 12:00 time
	const { data: events, error } = await supabase
		.from('events')
		.select('id, title_no, source_url, date_start')
		.eq('source', 'visitbergen')
		.order('date_start', { ascending: true });

	if (error || !events) {
		console.error('Failed to fetch events:', error?.message);
		return;
	}

	// Filter to only events with 12:00:00 time (our placeholder)
	const needsTime = events.filter(e => {
		const d = new Date(e.date_start);
		return d.getHours() === 12 && d.getMinutes() === 0;
	});

	console.log(`Found ${needsTime.length} events with placeholder time (12:00). Fetching detail pages...\n`);

	let updated = 0;
	let failed = 0;
	let unknown = 0;

	for (let i = 0; i < needsTime.length; i++) {
		const event = needsTime[i];
		if (i > 0) await delay(DELAY_MS);

		if (i % 50 === 0 && i > 0) {
			console.log(`  Progress: ${i}/${needsTime.length} (${updated} times found)`);
		}

		const html = await fetchHTML(event.source_url);
		if (!html) { failed++; continue; }

		const time = extractStartTime(html, event.date_start);
		if (!time) { unknown++; continue; }

		// Update date_start with the real time
		const oldDate = new Date(event.date_start);
		const [hours, minutes] = time.split(':').map(Number);
		const newDate = new Date(oldDate);
		newDate.setHours(hours, minutes, 0, 0);

		const { error: updateErr } = await supabase
			.from('events')
			.update({ date_start: newDate.toISOString() })
			.eq('id', event.id);

		if (updateErr) {
			console.error(`  Error updating ${event.title_no}:`, updateErr.message);
		} else {
			console.log(`  ${time} — ${event.title_no}`);
			updated++;
		}
	}

	console.log(`\n=== Done ===`);
	console.log(`  Total: ${needsTime.length}`);
	console.log(`  Times found: ${updated}`);
	console.log(`  Unknown: ${unknown}`);
	console.log(`  Failed to fetch: ${failed}`);
}

main();
