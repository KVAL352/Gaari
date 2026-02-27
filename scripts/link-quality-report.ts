/**
 * Link quality report — surfaces suspect links for manual review.
 *
 * Check 1: Duplicate ticket_urls (DB-only, instant)
 * Check 2: Title mismatch on source pages (HTTP, slow)
 *
 * Usage:
 *   npx tsx scripts/link-quality-report.ts              # Both checks
 *   npx tsx scripts/link-quality-report.ts --skip-http   # Only duplicate check
 *   npx tsx scripts/link-quality-report.ts --limit 100   # Limit HTTP checks
 */

import { supabase } from './lib/supabase.js';
import { delay } from './lib/utils.js';

const USER_AGENT = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';
const REQUEST_TIMEOUT_MS = 15_000;
const DELAY_BETWEEN_REQUESTS_MS = 1500;

const SKIP_DOMAINS = new Set([
	'www.ticketmaster.no',
	'ticketmaster.no',
	'www.dnt.no',
]);

// --- CLI args ---

const args = process.argv.slice(2);
const skipHttp = args.includes('--skip-http');
const limitIdx = args.indexOf('--limit');
const httpLimit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

// --- Helpers ---

function isSkippedDomain(url: string): boolean {
	try {
		return SKIP_DOMAINS.has(new URL(url).hostname);
	} catch {
		return false;
	}
}

function getDomain(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return '_unknown';
	}
}

/** Normalize text for word-level comparison (preserves word boundaries, unlike normalizeTitle). */
function normalizeForComparison(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[æ]/g, 'ae')
		.replace(/[ø]/g, 'o')
		.replace(/[å]/g, 'a')
		.replace(/&\w+;/g, ' ')   // HTML entities → space
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Extract significant words (3+ chars) from a title. */
function extractWords(title: string): string[] {
	return normalizeForComparison(title)
		.split(' ')
		.filter((w) => w.length >= 3);
}

/** Fetch a page and return its <title> and first <h1> text. */
async function fetchPageMeta(url: string): Promise<{ title: string; h1: string } | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const res = await fetch(url, {
			method: 'GET',
			headers: {
				'User-Agent': USER_AGENT,
				'Accept': 'text/html,application/xhtml+xml',
				'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.5',
			},
			redirect: 'follow',
			signal: controller.signal,
		});
		clearTimeout(timeout);

		if (!res.ok) return null;

		const html = await res.text();

		// Extract <title>
		const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
		const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

		// Extract first <h1>
		const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
		const h1 = h1Match
			? h1Match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
			: '';

		return { title, h1 };
	} catch {
		clearTimeout(timeout);
		return null;
	}
}

/** Soft 404 patterns that return HTTP 200. */
const SOFT_404_WORDS = ['404', 'not found', 'finnes ikke', 'fant ikke', 'page not found', 'siden ble ikke funnet'];

function isSoft404(pageTitle: string): boolean {
	const lower = pageTitle.toLowerCase();
	return SOFT_404_WORDS.some((w) => lower.includes(w));
}

// --- Check 1: Duplicate ticket_urls ---

interface DuplicateGroup {
	ticket_url: string;
	titles: string[];
	count: number;
}

async function checkDuplicateTicketUrls(): Promise<DuplicateGroup[]> {
	// Fetch all approved events with a ticket_url
	const { data, error } = await supabase
		.from('events')
		.select('ticket_url, title_no')
		.eq('status', 'approved')
		.not('ticket_url', 'is', null);

	if (error) {
		console.error('Failed to query events:', error.message);
		return [];
	}

	if (!data || data.length === 0) return [];

	// Group by ticket_url
	const groups = new Map<string, string[]>();
	for (const row of data) {
		if (!row.ticket_url) continue;
		const url = row.ticket_url.trim();
		if (!groups.has(url)) groups.set(url, []);
		groups.get(url)!.push(row.title_no);
	}

	// Keep only duplicates
	const duplicates: DuplicateGroup[] = [];
	for (const [ticket_url, titles] of groups) {
		if (titles.length > 1) {
			duplicates.push({ ticket_url, titles, count: titles.length });
		}
	}

	// Sort by count descending
	duplicates.sort((a, b) => b.count - a.count);
	return duplicates;
}

// --- Check 2: Title mismatch ---

interface TitleMismatch {
	source_url: string;
	event_title: string;
	page_title: string;
	overlap: number; // percentage 0-100
	soft404: boolean;
}

async function checkTitleMismatches(limit: number): Promise<TitleMismatch[]> {
	const { data, error } = await supabase
		.from('events')
		.select('source_url, title_no')
		.eq('status', 'approved')
		.not('source_url', 'is', null)
		.limit(Math.min(limit, 2000));

	if (error) {
		console.error('Failed to query events:', error.message);
		return [];
	}

	if (!data || data.length === 0) return [];

	// Filter out skipped domains
	const events = data.filter((e) => e.source_url && !isSkippedDomain(e.source_url));

	// Apply limit
	const toCheck = events.slice(0, limit);

	console.error(`[title-check] Checking ${toCheck.length} events for title mismatches...`);

	const mismatches: TitleMismatch[] = [];
	const lastRequestTime = new Map<string, number>();
	let checked = 0;

	for (const event of toCheck) {
		const url = event.source_url!;
		const domain = getDomain(url);

		// Rate limit per domain
		const lastTime = lastRequestTime.get(domain) || 0;
		const elapsed = Date.now() - lastTime;
		if (elapsed < DELAY_BETWEEN_REQUESTS_MS) {
			await delay(DELAY_BETWEEN_REQUESTS_MS - elapsed);
		}

		const meta = await fetchPageMeta(url);
		lastRequestTime.set(domain, Date.now());
		checked++;

		if (checked % 20 === 0) {
			console.error(`[title-check] Progress: ${checked}/${toCheck.length}`);
		}

		if (!meta) continue; // Network error — skip, check-links.ts handles broken URLs

		// Combine page title + h1 for matching
		const pageText = `${meta.title} ${meta.h1}`;
		const pageTextNormalized = normalizeForComparison(pageText);

		// Check for soft 404
		const soft404 = isSoft404(meta.title);

		// Extract significant words from event title
		const eventWords = extractWords(event.title_no);
		if (eventWords.length === 0) continue;

		// Count how many event title words appear in page text
		const pageWords = new Set(pageTextNormalized.split(' '));
		const matchCount = eventWords.filter((w) => pageWords.has(w)).length;
		const overlap = Math.round((matchCount / eventWords.length) * 100);

		// Flag if overlap < 40% or soft 404
		if (overlap < 40 || soft404) {
			mismatches.push({
				source_url: url,
				event_title: event.title_no,
				page_title: meta.title.slice(0, 80),
				overlap,
				soft404,
			});
		}
	}

	console.error(`[title-check] Done. ${checked} checked, ${mismatches.length} flagged.`);
	return mismatches;
}

// --- Output ---

function truncate(s: string, max: number): string {
	return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

async function main() {
	const now = new Date().toISOString().slice(0, 10);
	console.log(`# Gåri — Link Quality Report (${now})\n`);

	// Check 1: Duplicate ticket_urls
	console.log('## Duplicate ticket_urls\n');
	const duplicates = await checkDuplicateTicketUrls();

	if (duplicates.length === 0) {
		console.log('No duplicate ticket_urls found.\n');
	} else {
		console.log(`Found ${duplicates.length} shared ticket URLs:\n`);
		console.log('| # | ticket_url | Events | Titles |');
		console.log('|---|------------|--------|--------|');
		for (let i = 0; i < duplicates.length; i++) {
			const d = duplicates[i];
			const titlesStr = d.titles.map((t) => truncate(t, 40)).join('; ');
			console.log(`| ${i + 1} | ${truncate(d.ticket_url, 60)} | ${d.count} | ${truncate(titlesStr, 80)} |`);
		}
		console.log('');
	}

	// Check 2: Title mismatches (unless --skip-http)
	if (skipHttp) {
		console.log('## Title mismatches\n');
		console.log('Skipped (--skip-http flag).\n');
	} else {
		console.log('## Title mismatches\n');
		const mismatches = await checkTitleMismatches(httpLimit);

		if (mismatches.length === 0) {
			console.log('No title mismatches found.\n');
		} else {
			console.log(`Found ${mismatches.length} suspect source URLs:\n`);
			console.log('| # | source_url | Event title | Page title | Overlap | Soft 404 |');
			console.log('|---|------------|-------------|------------|---------|----------|');
			for (let i = 0; i < mismatches.length; i++) {
				const m = mismatches[i];
				console.log(
					`| ${i + 1} | ${truncate(m.source_url, 55)} | ${truncate(m.event_title, 35)} | ${truncate(m.page_title, 35)} | ${m.overlap}% | ${m.soft404 ? 'Yes' : '' } |`
				);
			}
			console.log('');
		}
	}
}

main().catch((err) => {
	console.error('[link-quality] Fatal error:', err);
	process.exit(1);
});
