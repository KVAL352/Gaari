/**
 * Backfill missing event images.
 *
 * Finds future events with image_url IS NULL, re-fetches each source_url,
 * extracts og:image (Plone-aware for bergenbibliotek), and updates the DB.
 *
 * Usage: cd scripts && npx tsx backfill-missing-images.ts
 * Options:
 *   --source <name>  Only process a given scraper source (e.g. bergenbibliotek)
 *   --dry-run        Log changes without writing
 *   --limit N        Stop after N events (default: no cap)
 */

import * as cheerio from 'cheerio';
import { supabase } from './lib/supabase.js';
import { fetchHTML, delay } from './lib/utils.js';

interface EventRow {
	id: string;
	title_no: string;
	source: string | null;
	source_url: string;
}

// Mirrors the logic in scripts/scrapers/bergenbibliotek.ts:77-80 (Plone twitter:image is stable).
function extractBergenBibliotekImage($: cheerio.CheerioAPI): string | undefined {
	const twitterImage = $('meta[name="twitter:image"]').attr('content');
	const ogImages = $('meta[property="og:image"]').toArray().map(el => $(el).attr('content') || '');
	const stableOg = ogImages.find(u => u.includes('@@download/'));
	return twitterImage || stableOg || ogImages.find(u => u.includes('@@images/')) || undefined;
}

function extractGenericImage($: cheerio.CheerioAPI, sourceUrl: string): string | undefined {
	const candidates = [
		$('meta[property="og:image"]').attr('content'),
		$('meta[name="twitter:image"]').attr('content'),
		$('meta[property="og:image:secure_url"]').attr('content'),
	].filter(Boolean) as string[];
	if (candidates.length === 0) return undefined;
	const raw = candidates[0].trim();
	if (!raw) return undefined;
	if (raw.startsWith('http')) return raw;
	try {
		return new URL(raw, sourceUrl).toString();
	} catch {
		return undefined;
	}
}

function extractImage(html: string, source: string | null, sourceUrl: string): string | undefined {
	const $ = cheerio.load(html);
	if (source === 'bergenbibliotek') {
		return extractBergenBibliotekImage($) || extractGenericImage($, sourceUrl);
	}
	return extractGenericImage($, sourceUrl);
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run');
	const sourceFilter = args.find(a => a.startsWith('--source='))?.slice('--source='.length)
		?? (args.indexOf('--source') !== -1 ? args[args.indexOf('--source') + 1] : undefined);
	const limitArg = args.find(a => a.startsWith('--limit='))?.slice('--limit='.length)
		?? (args.indexOf('--limit') !== -1 ? args[args.indexOf('--limit') + 1] : undefined);
	const limit = limitArg ? parseInt(limitArg, 10) : undefined;

	const nowIso = new Date().toISOString();
	let query = supabase
		.from('events')
		.select('id, title_no, source, source_url')
		.is('image_url', null)
		.gte('date_start', nowIso)
		.not('source_url', 'is', null)
		.order('date_start', { ascending: true });

	if (sourceFilter) query = query.eq('source', sourceFilter);
	if (limit) query = query.limit(limit);

	const { data, error } = await query;
	if (error) {
		console.error('Query failed:', error.message);
		process.exit(1);
	}
	if (!data || data.length === 0) {
		console.log('No upcoming events with missing images.');
		return;
	}

	console.log(`Found ${data.length} events to backfill${sourceFilter ? ` (source=${sourceFilter})` : ''}${dryRun ? ' [dry-run]' : ''}\n`);

	const perHostDelay: Record<string, number> = { bergenbibliotek: 3000 };
	let updated = 0, noImage = 0, failed = 0;

	for (const row of data as EventRow[]) {
		const source = row.source ?? '';
		const pause = perHostDelay[source] ?? 1500;

		const html = await fetchHTML(row.source_url);
		if (!html) {
			console.log(`  ✗ ${row.title_no}: fetch failed`);
			failed++;
			await delay(pause);
			continue;
		}

		const imageUrl = extractImage(html, row.source, row.source_url);
		if (!imageUrl) {
			console.log(`  – ${row.title_no}: no og:image in source`);
			noImage++;
			await delay(pause);
			continue;
		}

		if (dryRun) {
			console.log(`  [dry] ${row.title_no} → ${imageUrl}`);
			updated++;
		} else {
			const { error: upErr } = await supabase
				.from('events')
				.update({ image_url: imageUrl })
				.eq('id', row.id)
				.is('image_url', null);
			if (upErr) {
				console.log(`  ✗ ${row.title_no}: update failed — ${upErr.message}`);
				failed++;
			} else {
				console.log(`  ✓ ${row.title_no}`);
				updated++;
			}
		}
		await delay(pause);
	}

	console.log(`\nDone — ${updated} updated, ${noImage} had no image in source, ${failed} failed`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
