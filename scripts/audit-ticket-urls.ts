/**
 * Ticket URL Audit Script
 *
 * Fetches all events with ticket_urls from the database,
 * checks HTTP status via HEAD requests, and reports issues:
 * - 404s and other error statuses
 * - Redirects
 * - Generic/non-specific URLs
 *
 * Usage: cd scripts && npx tsx audit-ticket-urls.ts
 * Options:
 *   --source <name>   Only audit a specific source (e.g., --source dns)
 *   --skip-http       Skip HTTP checks, only analyze URL patterns
 */

import { supabase } from './lib/supabase.js';

// Known acceptable generic URLs — don't flag these
const KNOWN_GENERIC: Record<string, string> = {
	'https://www.dnt.no/aktiviteter/?municipality=4601': 'DNT API returns 500 for specific URLs',
	'https://www.brann.no/billetter': 'No per-match ticket page exists',
};

// Patterns that indicate a generic/non-specific URL
const GENERIC_PATTERNS = [
	/^https?:\/\/[^/]+\/?$/, // Just a domain (e.g., https://venue.no/)
	/^https?:\/\/[^/]+\/?(events|arrangementer|program|kalender|billetter|tickets)\/?$/i, // Generic listing pages
	/^https?:\/\/[^/]+\/?(events|arrangementer|program|kalender|billetter|tickets)\/?[?#]?$/i,
];

function isGenericUrl(url: string): boolean {
	return GENERIC_PATTERNS.some((p) => p.test(url));
}

interface EventRow {
	id: string;
	title_no: string;
	ticket_url: string;
	source_url: string;
	venue_name: string | null;
	date_start: string;
}

interface AuditResult {
	source: string;
	total: number;
	uniqueUrls: number;
	issues: {
		url: string;
		status?: number;
		problem: string;
		events: { id: string; title: string }[];
	}[];
}

function extractSource(sourceUrl: string): string {
	try {
		const host = new URL(sourceUrl).hostname.replace('www.', '');
		// Map common hosts to scraper names
		const hostMap: Record<string, string> = {
			'visitbergen.com': 'visitbergen',
			'bergen.kommune.no': 'bergenkommune',
			'billett.bergen.kommune.no': 'bergenkommune',
			'www.eventbrite.com': 'eventbrite',
			'eventbrite.com': 'eventbrite',
			'studentbergen.no': 'studentbergen',
			'bergenlive.no': 'bergenlive',
			'dns.no': 'dns',
			'grieghallen.no': 'grieghallen',
			'olebullhuset.no': 'olebull',
			'usf.no': 'usfverftet',
			'forumscene.no': 'forumscene',
			'cornerteateret.no': 'cornerteateret',
			'dfrtvest.no': 'dvrtvest',
			'bit-teatergarasjen.no': 'bitteater',
			'carteblanche.no': 'carteblanche',
			'harmonien.no': 'harmonien',
			'fyllingsdalenteater.no': 'fyllingsdalenteater',
			'kunsthall.no': 'kunsthall',
			'kfrode.no': 'kode',
			'kode.no': 'kode',
			'litthusbergen.no': 'litthusbergen',
			'mediacitybergen.no': 'mediacity',
			'bfreks.no': 'bek',
			'bek.no': 'bek',
			'bergenfilmklubb.no': 'bergenfilmklubb',
			'akvariet.no': 'akvariet',
			'bergenbibliotek.no': 'bergenbibliotek',
			'bymuseet.no': 'bymuseet',
			'museumvest.no': 'museumvest',
			'flofryen.no': 'floyen',
			'floyen.no': 'floyen',
			'bergenkjott.no': 'bergenkjott',
			'colonialen.no': 'colonialen',
			'raabrent.no': 'raabrent',
			'paintnsipbergen.no': 'paintnsip',
			'brettspillcafe.no': 'brettspill',
			'bjorgvinbluesclub.no': 'bjorgvinblues',
			'nordnessjobad.no': 'nordnessjobad',
			'brann.no': 'brann',
			'dnt.no': 'dnt',
			'fib.no': 'festspillene',
			'bergenfest.no': 'bergenfest',
			'beyondthegates.no': 'beyondthegates',
			'vfryvfestival.no': 'vvv',
			'kvarteret.no': 'kvarteret',
			'kulturhusetibergen.no': 'kulturhusetibergen',
			'bergenchamber.no': 'bergenchamber',
			'oseana.no': 'oseana',
			'madamfelle.no': 'ticketco',
			'hulen.no': 'ticketco',
		};

		// Check for ticketco subdomains
		if (host.endsWith('.ticketco.events')) return 'ticketco';

		return hostMap[host] || host;
	} catch {
		return 'unknown';
	}
}

async function checkUrl(
	url: string,
	retries = 1
): Promise<{ status: number; redirected: boolean; finalUrl?: string }> {
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 10000);

			const res = await fetch(url, {
				method: 'HEAD',
				signal: controller.signal,
				redirect: 'follow',
				headers: {
					'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
				},
			});

			clearTimeout(timeout);

			const redirected = res.url !== url && new URL(res.url).pathname !== new URL(url).pathname;

			return {
				status: res.status,
				redirected,
				finalUrl: redirected ? res.url : undefined,
			};
		} catch (err: any) {
			if (attempt === retries) {
				if (err.name === 'AbortError') {
					return { status: 0, redirected: false };
				}
				return { status: -1, redirected: false };
			}
			// Wait before retry
			await new Promise((r) => setTimeout(r, 1000));
		}
	}
	return { status: -1, redirected: false };
}

async function main() {
	const args = process.argv.slice(2);
	const sourceFilter = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;
	const skipHttp = args.includes('--skip-http');

	console.log('🔍 Ticket URL Audit');
	console.log('='.repeat(60));

	// Fetch all approved events with ticket_urls
	const { data: events, error } = await supabase
		.from('events')
		.select('id, title_no, ticket_url, source_url, venue_name, date_start')
		.eq('status', 'approved')
		.gte('date_start', new Date().toISOString())
		.not('ticket_url', 'is', null)
		.not('ticket_url', 'eq', '')
		.order('date_start');

	if (error) {
		console.error('DB error:', error.message);
		process.exit(1);
	}

	console.log(`Found ${events.length} events with ticket URLs\n`);

	// Group by source
	const bySource = new Map<string, EventRow[]>();
	for (const ev of events as EventRow[]) {
		const source = extractSource(ev.source_url);
		if (sourceFilter && source !== sourceFilter) continue;
		if (!bySource.has(source)) bySource.set(source, []);
		bySource.get(source)!.push(ev);
	}

	const results: AuditResult[] = [];
	const urlCache = new Map<string, { status: number; redirected: boolean; finalUrl?: string }>();

	for (const [source, sourceEvents] of [...bySource.entries()].sort((a, b) =>
		a[0].localeCompare(b[0])
	)) {
		const uniqueUrls = new Map<string, EventRow[]>();
		for (const ev of sourceEvents) {
			if (!uniqueUrls.has(ev.ticket_url)) uniqueUrls.set(ev.ticket_url, []);
			uniqueUrls.get(ev.ticket_url)!.push(ev);
		}

		const result: AuditResult = {
			source,
			total: sourceEvents.length,
			uniqueUrls: uniqueUrls.size,
			issues: [],
		};

		for (const [url, urlEvents] of uniqueUrls) {
			// Check if known generic
			if (KNOWN_GENERIC[url]) {
				continue; // Skip — documented as acceptable
			}

			// Check URL pattern
			if (isGenericUrl(url)) {
				result.issues.push({
					url,
					problem: 'GENERIC URL — points to listing page, not specific event',
					events: urlEvents.map((e) => ({ id: e.id, title: e.title_no })),
				});
				continue;
			}

			// Check if many events share same ticket_url (likely generic)
			if (urlEvents.length > 5) {
				result.issues.push({
					url,
					problem: `SHARED URL — ${urlEvents.length} events use the same ticket_url`,
					events: urlEvents.slice(0, 5).map((e) => ({ id: e.id, title: e.title_no })),
				});
				continue;
			}

			// HTTP check
			if (!skipHttp) {
				if (!urlCache.has(url)) {
					const check = await checkUrl(url);
					urlCache.set(url, check);
					// Rate limit
					await new Promise((r) => setTimeout(r, 300));
				}

				const { status, redirected, finalUrl } = urlCache.get(url)!;

				if (status === 404) {
					result.issues.push({
						url,
						status,
						problem: '404 NOT FOUND',
						events: urlEvents.map((e) => ({ id: e.id, title: e.title_no })),
					});
				} else if (status === 0) {
					result.issues.push({
						url,
						status: 0,
						problem: 'TIMEOUT — no response within 10s',
						events: urlEvents.map((e) => ({ id: e.id, title: e.title_no })),
					});
				} else if (status === -1) {
					result.issues.push({
						url,
						status: -1,
						problem: 'CONNECTION ERROR',
						events: urlEvents.map((e) => ({ id: e.id, title: e.title_no })),
					});
				} else if (status >= 500) {
					result.issues.push({
						url,
						status,
						problem: `SERVER ERROR ${status}`,
						events: urlEvents.map((e) => ({ id: e.id, title: e.title_no })),
					});
				} else if (redirected && finalUrl) {
					// Check if redirect goes to a generic page
					if (isGenericUrl(finalUrl)) {
						result.issues.push({
							url,
							status,
							problem: `REDIRECT TO GENERIC — ${finalUrl}`,
							events: urlEvents.map((e) => ({ id: e.id, title: e.title_no })),
						});
					}
				}
			}
		}

		results.push(result);
	}

	// Print report
	console.log('\n' + '='.repeat(60));
	console.log('AUDIT REPORT');
	console.log('='.repeat(60));

	let totalIssues = 0;

	// Summary table
	console.log('\n## Summary per source\n');
	console.log('| Source | Events | Unique URLs | Issues |');
	console.log('|--------|--------|-------------|--------|');
	for (const r of results) {
		const issueCount = r.issues.length;
		totalIssues += issueCount;
		const marker = issueCount > 0 ? ' ⚠️' : ' ✅';
		console.log(
			`| ${r.source} | ${r.total} | ${r.uniqueUrls} | ${issueCount}${marker} |`
		);
	}

	// Detailed issues
	if (totalIssues > 0) {
		console.log(`\n\n## Issues found: ${totalIssues}\n`);

		for (const r of results) {
			if (r.issues.length === 0) continue;

			console.log(`\n### ${r.source} (${r.issues.length} issues)\n`);
			for (const issue of r.issues) {
				console.log(`  ${issue.problem}`);
				console.log(`  URL: ${issue.url}`);
				if (issue.status) console.log(`  HTTP: ${issue.status}`);
				console.log(`  Events (${issue.events.length}):`);
				for (const ev of issue.events.slice(0, 3)) {
					console.log(`    - ${ev.title} (${ev.id.slice(0, 8)})`);
				}
				if (issue.events.length > 3) {
					console.log(`    ... and ${issue.events.length - 3} more`);
				}
				console.log('');
			}
		}
	} else {
		console.log('\n✅ No issues found!');
	}

	// Also check events WITHOUT ticket_url
	if (!sourceFilter) {
		const { count } = await supabase
			.from('events')
			.select('*', { count: 'exact', head: true })
			.eq('status', 'approved')
			.gte('date_start', new Date().toISOString())
			.or('ticket_url.is.null,ticket_url.eq.');

		console.log(`\n---\nEvents without any ticket_url: ${count}`);
	}

	console.log('\nDone.');
}

main().catch(console.error);
