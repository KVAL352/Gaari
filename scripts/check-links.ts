import { supabase } from './lib/supabase.js';
import { deleteEventByUrl, delay } from './lib/utils.js';
import { writeFileSync } from 'fs';

// --- Constants ---
const REQUEST_TIMEOUT_MS = 15_000;
const DELAY_BETWEEN_REQUESTS_MS = 1500;
const MAX_EVENTS_PER_RUN = 500;
const SOURCE_URL_STRIKE_LIMIT = 3;
const TICKET_URL_STRIKE_LIMIT = 2;
const USER_AGENT = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';

// Domains that block bots / require JS — skip checking, treat as OK
const SKIP_DOMAINS = new Set([
	'www.ticketmaster.no',
	'ticketmaster.no',
	'www.dnt.no',   // Returns errors to automated requests
]);

// Soft 404 patterns — pages that return 200 but the event is gone
const SOFT_404_PATTERNS = [
	// Norwegian
	/arrangementet\s+(er\s+)?(ikke|fjernet|slettet)/i,
	/fant\s+ikke\s+siden/i,
	/denne\s+siden\s+finnes\s+ikke/i,
	/siden\s+ble\s+ikke\s+funnet/i,
	// English
	/event\s+not\s+found/i,
	/no\s+longer\s+available/i,
	/page\s+not\s+found/i,
	/event\s.*expired/i,
	/404\s*[-–—]\s*(not\s+found|page)/i,
	/this\s+page\s+(doesn.t|does\s+not)\s+exist/i,
];

interface EventRow {
	id: string;
	source_url: string | null;
	ticket_url: string | null;
	link_check_failures: number;
	venue_name: string;
	title_no: string;
}

interface CheckResult {
	eventId: string;
	sourceUrl: string | null;
	ticketUrl: string | null;
	sourceOk: boolean | null; // null = no source_url
	ticketOk: boolean | null; // null = no ticket_url
	softDetected: boolean;
	action: 'healthy' | 'strike' | 'delete' | 'clear_ticket';
	newFailures: number;
}

// --- HTTP checking ---

async function checkUrl(url: string, method: 'HEAD' | 'GET' = 'HEAD'): Promise<{ status: number; body?: string }> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const res = await fetch(url, {
			method,
			headers: {
				'User-Agent': USER_AGENT,
				'Accept': 'text/html,application/xhtml+xml',
				'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.5',
			},
			redirect: 'follow',
			signal: controller.signal,
		});
		clearTimeout(timeout);

		if (method === 'GET') {
			const body = await res.text();
			return { status: res.status, body };
		}
		return { status: res.status };
	} catch {
		clearTimeout(timeout);
		return { status: 0 }; // Network error / timeout
	}
}

function isSkippedDomain(url: string): boolean {
	try {
		return SKIP_DOMAINS.has(new URL(url).hostname);
	} catch {
		return false;
	}
}

function isBrokenStatus(status: number): boolean {
	if (status === 0) return true;       // Network error / timeout
	if (status === 429) return false;    // Rate limited — treat as OK
	if (status >= 400) return true;      // Client/server errors
	return false;
}

function isSoft404(body: string): boolean {
	// Only check first 5000 chars (soft 404 text is usually near the top)
	const snippet = body.slice(0, 5000);
	return SOFT_404_PATTERNS.some(pattern => pattern.test(snippet));
}

async function checkSourceUrl(url: string): Promise<{ ok: boolean; soft404: boolean }> {
	// Try HEAD first
	const head = await checkUrl(url, 'HEAD');

	// 405 Method Not Allowed — fall back to GET (with soft 404 check)
	if (head.status === 405) {
		const get = await checkUrl(url, 'GET');
		if (isBrokenStatus(get.status)) return { ok: false, soft404: false };
		if (get.body && isSoft404(get.body)) return { ok: false, soft404: true };
		return { ok: true, soft404: false };
	}

	if (isBrokenStatus(head.status)) return { ok: false, soft404: false };

	// HEAD succeeded with 200 — trust it, skip expensive GET
	// Only do soft 404 GET check on 3xx-chain results (redirected to catch-all page)
	// or when event already has prior strikes (confirm before final deletion)
	return { ok: true, soft404: false };
}

async function checkTicketUrl(url: string): Promise<boolean> {
	const head = await checkUrl(url, 'HEAD');
	if (head.status === 405) {
		const get = await checkUrl(url, 'GET');
		return !isBrokenStatus(get.status);
	}
	return !isBrokenStatus(head.status);
}

// --- Domain grouping & shuffling ---

function groupByDomain(events: EventRow[]): Map<string, EventRow[]> {
	const groups = new Map<string, EventRow[]>();
	for (const event of events) {
		const url = event.source_url || event.ticket_url;
		if (!url) continue;
		try {
			const domain = new URL(url).hostname;
			if (!groups.has(domain)) groups.set(domain, []);
			groups.get(domain)!.push(event);
		} catch {
			// Invalid URL — put in unknown bucket
			if (!groups.has('_unknown')) groups.set('_unknown', []);
			groups.get('_unknown')!.push(event);
		}
	}
	return groups;
}

function shuffleArray<T>(arr: T[]): T[] {
	const shuffled = [...arr];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

// --- Main ---

async function main() {
	const startTime = Date.now();
	console.log('[link-check] Starting broken link checker...\n');

	// 1. Fetch events to check (never-checked first, then oldest)
	const { data: events, error } = await supabase
		.from('events')
		.select('id, source_url, ticket_url, link_check_failures, venue_name, title_no')
		.eq('status', 'approved')
		.order('link_checked_at', { ascending: true, nullsFirst: true })
		.limit(MAX_EVENTS_PER_RUN);

	if (error) {
		console.error('[link-check] Failed to fetch events:', error.message);
		process.exit(1);
	}

	if (!events || events.length === 0) {
		console.log('[link-check] No approved events to check.');
		return;
	}

	console.log(`[link-check] Checking ${events.length} events...\n`);

	// 2. Group by domain, shuffle domain order for polite crawling
	const domainGroups = groupByDomain(events as EventRow[]);
	const domains = shuffleArray([...domainGroups.keys()]);

	// Build a round-robin queue: take one event from each domain in turn
	const domainQueues = new Map<string, EventRow[]>();
	for (const domain of domains) {
		domainQueues.set(domain, [...domainGroups.get(domain)!]);
	}

	const orderedEvents: EventRow[] = [];
	let remaining = true;
	while (remaining) {
		remaining = false;
		for (const domain of domains) {
			const queue = domainQueues.get(domain)!;
			if (queue.length > 0) {
				orderedEvents.push(queue.shift()!);
				remaining = remaining || queue.length > 0;
			}
		}
	}

	// 3. Check each event
	const results: CheckResult[] = [];
	let checked = 0;
	let healthy = 0;
	let strikes = 0;
	let deleted = 0;
	let ticketsCleared = 0;
	let skipped = 0;

	// Track last request time per domain for rate limiting
	const lastRequestTime = new Map<string, number>();

	for (const event of orderedEvents) {
		const sourceUrl = event.source_url;
		const ticketUrl = event.ticket_url;

		// Skip events where all URLs are on bot-hostile domains
		const sourceSkipped = sourceUrl ? isSkippedDomain(sourceUrl) : true;
		const ticketSkipped = ticketUrl ? isSkippedDomain(ticketUrl) : true;
		if (sourceSkipped && ticketSkipped) {
			// Mark as checked so we don't re-queue every run
			await supabase
				.from('events')
				.update({ link_check_failures: 0, link_checked_at: new Date().toISOString() })
				.eq('id', event.id);
			skipped++;
			checked++;
			healthy++;
			continue;
		}

		// Rate limit per domain
		if (sourceUrl || ticketUrl) {
			const url = sourceUrl || ticketUrl!;
			try {
				const domain = new URL(url).hostname;
				const lastTime = lastRequestTime.get(domain) || 0;
				const elapsed = Date.now() - lastTime;
				if (elapsed < DELAY_BETWEEN_REQUESTS_MS) {
					await delay(DELAY_BETWEEN_REQUESTS_MS - elapsed);
				}
			} catch {
				// Invalid URL — no rate limit needed
			}
		}

		let sourceOk: boolean | null = null;
		let ticketOk: boolean | null = null;
		let softDetected = false;

		// Check source_url (skip if domain is bot-hostile)
		if (sourceUrl && !sourceSkipped) {
			const result = await checkSourceUrl(sourceUrl);
			sourceOk = result.ok;
			softDetected = result.soft404;

			try {
				lastRequestTime.set(new URL(sourceUrl).hostname, Date.now());
			} catch { /* ignore */ }
		}

		// Check ticket_url (skip if domain is bot-hostile)
		if (ticketUrl && !ticketSkipped) {
			// Rate limit if different domain from source
			if (sourceUrl) {
				try {
					const sourceDomain = new URL(sourceUrl).hostname;
					const ticketDomain = new URL(ticketUrl).hostname;
					if (sourceDomain !== ticketDomain) {
						const lastTime = lastRequestTime.get(ticketDomain) || 0;
						const elapsed = Date.now() - lastTime;
						if (elapsed < DELAY_BETWEEN_REQUESTS_MS) {
							await delay(DELAY_BETWEEN_REQUESTS_MS - elapsed);
						}
					}
				} catch { /* ignore */ }
			}

			ticketOk = await checkTicketUrl(ticketUrl);

			try {
				lastRequestTime.set(new URL(ticketUrl).hostname, Date.now());
			} catch { /* ignore */ }
		}

		// 4. Determine action based on result + strike count
		let action: CheckResult['action'] = 'healthy';
		let newFailures = 0;

		const sourceBroken = sourceOk === false;
		const ticketBroken = ticketOk === false;

		if (sourceBroken) {
			newFailures = event.link_check_failures + 1;
			if (newFailures >= SOURCE_URL_STRIKE_LIMIT) {
				action = 'delete';
			} else {
				action = 'strike';
			}
		} else if (ticketBroken && !sourceBroken) {
			newFailures = event.link_check_failures + 1;
			if (newFailures >= TICKET_URL_STRIKE_LIMIT) {
				action = 'clear_ticket';
			} else {
				action = 'strike';
			}
		}
		// else: healthy — reset failures

		// Execute action
		checked++;

		if (action === 'delete') {
			const didDelete = await deleteEventByUrl(sourceUrl!);
			if (didDelete) {
				console.log(`  ✗ DELETED [${newFailures} strikes]: ${event.title_no} (${event.venue_name})`);
				console.log(`    ${sourceUrl}${softDetected ? ' [soft 404]' : ''}`);
				deleted++;
			}
		} else if (action === 'clear_ticket') {
			const { error: updateErr } = await supabase
				.from('events')
				.update({
					ticket_url: null,
					link_check_failures: 0,
					link_checked_at: new Date().toISOString(),
				})
				.eq('id', event.id);

			if (updateErr) {
				console.error(`  Failed to clear ticket_url for ${event.id}:`, updateErr.message);
			} else {
				console.log(`  ⚠ CLEARED ticket_url [${newFailures} strikes]: ${event.title_no}`);
				console.log(`    ${ticketUrl}`);
				ticketsCleared++;
			}
		} else if (action === 'strike') {
			const { error: updateErr } = await supabase
				.from('events')
				.update({
					link_check_failures: newFailures,
					link_checked_at: new Date().toISOString(),
				})
				.eq('id', event.id);

			if (updateErr) {
				console.error(`  Failed to update failures for ${event.id}:`, updateErr.message);
			} else {
				const brokenUrl = sourceBroken ? sourceUrl : ticketUrl;
				console.log(`  ⚠ Strike ${newFailures}: ${event.title_no} — ${brokenUrl}${softDetected ? ' [soft 404]' : ''}`);
				strikes++;
			}
		} else {
			// Healthy — reset failures
			const { error: updateErr } = await supabase
				.from('events')
				.update({
					link_check_failures: 0,
					link_checked_at: new Date().toISOString(),
				})
				.eq('id', event.id);

			if (updateErr) {
				console.error(`  Failed to update check time for ${event.id}:`, updateErr.message);
			}
			healthy++;
		}

		results.push({
			eventId: event.id,
			sourceUrl,
			ticketUrl,
			sourceOk,
			ticketOk,
			softDetected,
			action,
			newFailures,
		});
	}

	// 5. Summary
	const durationSeconds = Math.round((Date.now() - startTime) / 1000);

	console.log('\n--- Link Check Summary ---');
	console.log(`  Checked:         ${checked}`);
	console.log(`  Healthy:         ${healthy}`);
	console.log(`  Skipped (bots):  ${skipped}`);
	console.log(`  New strikes:     ${strikes}`);
	console.log(`  Deleted:         ${deleted}`);
	console.log(`  Tickets cleared: ${ticketsCleared}`);
	console.log(`  Duration:        ${durationSeconds}s`);

	const summary = {
		checked,
		healthy,
		skipped,
		strikes,
		deleted,
		ticketsCleared,
		durationSeconds,
	};

	console.log('\n' + JSON.stringify(summary));

	const summaryFile = process.env.SUMMARY_FILE;
	if (summaryFile) {
		writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
		console.log(`Summary written to ${summaryFile}`);
	}
}

main().catch((err) => {
	console.error('[link-check] Fatal error:', err);
	process.exit(1);
});
