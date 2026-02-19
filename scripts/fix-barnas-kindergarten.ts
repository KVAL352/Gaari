/**
 * Find and delete BarnasNorge events that are kindergarten-only
 * Checks the actual detail page content for kindergarten keywords
 */
import * as cheerio from 'cheerio';
import { supabase } from './lib/supabase.js';

const KINDERGARTEN_PHRASES = [
	'barnehage',
	'barnehagebarn',
	'barnehagens ansatte',
	'inviterer barnehager',
	'kun ment for',
	'eldste i barnehagen',
	'barnehagene',
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
	} catch {
		return null;
	}
}

function delay(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
	const { data: events, error } = await supabase
		.from('events')
		.select('id, title_no, source_url')
		.eq('source', 'barnasnorge');

	if (error || !events) {
		console.error('Failed to fetch events:', error?.message);
		return;
	}

	console.log(`Checking ${events.length} BarnasNorge events for kindergarten content...\n`);

	// Group by detail URL (strip #dateTime) to avoid re-fetching same page
	const detailGroups = new Map<string, typeof events>();
	for (const event of events) {
		const detailUrl = event.source_url.split('#')[0];
		if (!detailGroups.has(detailUrl)) detailGroups.set(detailUrl, []);
		detailGroups.get(detailUrl)!.push(event);
	}

	console.log(`${detailGroups.size} unique detail pages to check\n`);

	let deletedCount = 0;
	let checkedCount = 0;

	for (const [detailUrl, groupEvents] of detailGroups) {
		checkedCount++;
		const html = await fetchHTML(detailUrl);
		if (!html) {
			console.log(`  [skip] Could not fetch: ${detailUrl.split('/').pop()}`);
			await delay(1000);
			continue;
		}

		const $ = cheerio.load(html);
		// Get all visible text on the page
		const pageText = $('body').text().toLowerCase();

		const matched = KINDERGARTEN_PHRASES.filter(phrase => pageText.includes(phrase));
		if (matched.length > 0) {
			console.log(`  [KINDERGARTEN] ${groupEvents[0].title_no}`);
			console.log(`    Matched: ${matched.join(', ')}`);
			console.log(`    Events to delete: ${groupEvents.length}`);

			for (const event of groupEvents) {
				const { error: delErr } = await supabase.from('events').delete().eq('id', event.id);
				if (!delErr) {
					deletedCount++;
				} else {
					console.log(`    Error deleting ${event.id}: ${delErr.message}`);
				}
			}
		}

		if (checkedCount % 10 === 0) {
			console.log(`  ... checked ${checkedCount}/${detailGroups.size} pages`);
		}

		await delay(1000);
	}

	console.log(`\n=== Summary ===`);
	console.log(`  Pages checked: ${detailGroups.size}`);
	console.log(`  Kindergarten events deleted: ${deletedCount}`);
	console.log(`  Remaining: ${events.length - deletedCount}`);
}

main().catch(console.error);
