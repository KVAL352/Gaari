import * as cheerio from 'cheerio';
import { supabase } from './supabase.js';
import { fetchHTML, delay, extractImageCredit, updateEventCredit } from './utils.js';
import { getSourceDisplayCredit } from './venues.js';

/**
 * Generic credit-backfill for any source.
 *
 * Walks events with `image_url IS NOT NULL AND image_credit IS NULL`, re-fetches
 * each source_url, runs the shared `extractImageCredit` extractor, and writes
 * back any credit found. Image hosts (e.g. Unsplash filenames) are detected
 * without HTML; pages without any credit text are simply left unchanged.
 *
 * This is the universal credit pipeline — individual scrapers don't need to
 * extract credit themselves. New events picked up by tomorrow's pipeline run
 * will get credits backfilled in this step.
 */

export interface BackfillOptions {
	/** Max events to process this run. Default unlimited. */
	limit?: number;
	/** Restrict to a single source (e.g. 'museumvest'). Default all sources. */
	source?: string;
	/** Delay between fetches in ms. Default 1500. */
	delayMs?: number;
	/** When true, prints per-event progress. Default false (only summary). */
	verbose?: boolean;
}

export interface BackfillResult {
	scanned: number;
	updated: number;
	noCreditFound: number;
	fetchFailed: number;
}

export async function backfillImageCredits(opts: BackfillOptions = {}): Promise<BackfillResult> {
	const { limit, source, delayMs = 1500, verbose = false } = opts;

	// Supabase caps each response at 1000 rows. When the filter result exceeds that,
	// paginate with range() so we cover the whole candidate set.
	const PAGE_SIZE = 1000;
	const events: Array<{ id: string; source: string; source_url: string; image_url: string | null; title_no: string }> = [];

	for (let page = 0; ; page++) {
		let query = supabase
			.from('events')
			.select('id, source, source_url, image_url, title_no')
			.not('image_url', 'is', null)
			.is('image_credit', null)
			.gte('date_start', new Date().toISOString())
			.order('date_start', { ascending: true })
			.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

		if (source) query = query.eq('source', source);

		const { data, error } = await query;
		if (error) {
			console.error('[credit-backfill] Query failed:', error.message);
			return { scanned: 0, updated: 0, noCreditFound: 0, fetchFailed: 0 };
		}
		if (!data || data.length === 0) break;
		events.push(...data);
		if (data.length < PAGE_SIZE) break;
		if (limit && events.length >= limit) break;
	}

	if (limit && events.length > limit) events.length = limit;

	if (events.length === 0) {
		console.log('[credit-backfill] No candidates — all events with images have credit (or no images yet).');
		return { scanned: 0, updated: 0, noCreditFound: 0, fetchFailed: 0 };
	}

	console.log(`[credit-backfill] Processing ${events.length} candidate event(s)${source ? ` for source=${source}` : ''}`);

	let updated = 0;
	let noCreditFound = 0;
	let fetchFailed = 0;

	let skippedAnchor = 0;
	for (let i = 0; i < events.length; i++) {
		const ev = events[i];

		// Fast path: Unsplash filenames need no HTTP fetch
		if (/-unsplash\.(jpe?g|png|webp)(?:$|[?#])/i.test(ev.image_url!)) {
			if (await updateEventCredit(ev.source_url, 'Bilde: Unsplash')) {
				updated++;
				if (verbose) console.log(`  ↻ [${ev.source}] ${ev.title_no} — Bilde: Unsplash`);
			}
			continue;
		}

		// Skip events without a usable source_url (NOT NULL in schema but TS doesn't know).
		if (!ev.source_url) {
			noCreditFound++;
			continue;
		}

		// Source-level fallback for approved sources. Computed up-front so
		// fetch-failed / anchor-URL events also get a sensible credit.
		const sourceFallback = getSourceDisplayCredit(ev.source);

		// Anchor URLs (foo.com/page#event-name) point at a shared page so we
		// can't reliably extract per-event credit. Use source-level fallback
		// if available — leaves blank otherwise.
		if (ev.source_url.includes('#')) {
			skippedAnchor++;
			if (sourceFallback && await updateEventCredit(ev.source_url, sourceFallback)) {
				updated++;
				if (verbose) console.log(`  ↻ [${ev.source}] ${ev.title_no} — ${sourceFallback} (anchor fallback)`);
			}
			continue;
		}

		// Rate-limited fetch — only between requests, not before the first
		if (i > 0) await delay(delayMs);

		const html = await fetchHTML(ev.source_url);
		if (!html) {
			fetchFailed++;
			// Fetch failed but we may still have a source-level fallback.
			if (sourceFallback && await updateEventCredit(ev.source_url, sourceFallback)) {
				updated++;
				if (verbose) console.log(`  ↻ [${ev.source}] ${ev.title_no} — ${sourceFallback} (fetch-failed fallback)`);
			}
			continue;
		}

		const $ = cheerio.load(html);
		let credit = extractImageCredit($, ev.image_url || undefined, ev.title_no);
		// Fallback: many approved sources (DNS, USFV, Bergenfest, BIFF…) don't
		// expose a "Foto: X" line in the event HTML. Use the source-level
		// display label so the figcaption isn't blank.
		if (!credit) credit = sourceFallback;
		if (!credit) {
			noCreditFound++;
			continue;
		}

		if (await updateEventCredit(ev.source_url, credit)) {
			updated++;
			if (verbose) console.log(`  ↻ [${ev.source}] ${ev.title_no} — ${credit}`);
		}
	}

	console.log(`[credit-backfill] Done: scanned ${events.length}, updated ${updated}, no credit ${noCreditFound}, fetch failed ${fetchFailed}, skipped anchor URLs ${skippedAnchor}`);
	return { scanned: events.length, updated, noCreditFound, fetchFailed };
}

// Allow running this module directly: `npx tsx scripts/lib/credit-backfill.ts [source]`
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('credit-backfill.ts')) {
	const arg = process.argv[2];
	const opts: BackfillOptions = { verbose: true };
	if (arg && !arg.startsWith('--')) opts.source = arg;
	backfillImageCredits(opts).then(() => process.exit(0)).catch(e => {
		console.error(e);
		process.exit(1);
	});
}
