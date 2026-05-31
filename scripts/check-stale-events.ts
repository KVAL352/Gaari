/**
 * Stale Event Detector
 *
 * Periodically verifies that each upcoming event still matches its source.
 * Sources occasionally update events — date moved, title changed, event
 * cancelled — but the scraper's `eventExists()` short-circuit means our
 * DB drifts. This script detects that drift.
 *
 * Strategy: fetch each upcoming event's source_url and check whether
 *  - the title (or a close variant) still appears in the page
 *  - the DB date_start matches any date string on the page
 *
 * Flagged events are reported; nothing is auto-mutated. A human reviews
 * and decides to delete (rescraper picks it up next run) or edit via
 * admin.
 *
 * Usage:
 *   cd scripts && npx tsx check-stale-events.ts [--days 30] [--source <name>]
 *
 * Flags:
 *   --days N      — only check events with date_start within N days (default 30)
 *   --source name — restrict to one scraper source (debug)
 *   --json        — output flagged events as JSON (for digest integration)
 *
 * Env: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { supabase } from './lib/supabase.js';

interface Event {
	id: string;
	slug: string;
	title_no: string;
	date_start: string;
	source: string | null;
	source_url: string;
	image_url: string | null;
}

interface StaleFlag {
	id: string;
	slug: string;
	title: string;
	source: string | null;
	dbDate: string;
	sourceUrl: string;
	reason: 'title-missing' | 'date-mismatch' | 'fetch-failed' | 'source-likely-changed' | 'image-broken';
	detail: string;
}

const USER_AGENT = 'Gaari-Stale-Check/1.0 (gaari.bergen@proton.me)';
const REQUEST_TIMEOUT_MS = 15_000;
const DELAY_BETWEEN_REQUESTS_MS = 1500;
// Hosts that block automated fetches against our User-Agent — skip rather
// than spam them with failing requests. Matches the same anti-bot pattern
// we documented in canary-targets.txt.
const SKIP_HOSTS = new Set([
	'10times.com',
	'www.bandsintown.com',
	'calendar.google.com',
	'meetup.com',
	'www.meetup.com',
]);

const NB_MONTHS: Record<number, string[]> = {
	0: ['januar', 'jan'],
	1: ['februar', 'feb'],
	2: ['mars', 'mar'],
	3: ['april', 'apr'],
	4: ['mai'],
	5: ['juni', 'jun'],
	6: ['juli', 'jul'],
	7: ['august', 'aug'],
	8: ['september', 'sep'],
	9: ['oktober', 'okt'],
	10: ['november', 'nov'],
	11: ['desember', 'des'],
};
const EN_MONTHS: Record<number, string[]> = {
	0: ['january', 'jan'],
	1: ['february', 'feb'],
	2: ['march', 'mar'],
	3: ['april', 'apr'],
	4: ['may'],
	5: ['june', 'jun'],
	6: ['july', 'jul'],
	7: ['august', 'aug'],
	8: ['september', 'sep'],
	9: ['october', 'oct'],
	10: ['november', 'nov'],
	11: ['december', 'dec'],
};

function delay(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeText(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#(?:x27|39);/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

// Generic Norwegian/English words too common to be distinctive on their own —
// matching just "med" or "the" gives false positives everywhere.
const STOP_WORDS = new Set([
	'med', 'og', 'av', 'med', 'på', 'til', 'fra', 'for', 'kveld', 'kveldskonsert',
	'the', 'and', 'with', 'event', 'concert', 'show',
	'jazz', 'nattjazz', 'festspillene', 'bergen', 'usf', 'hallen', 'sardinen', 'røkeriet',
	'sikte', // "Jazz i sikte" appears scoped under artist name
	'2026', '2027',
]);

/**
 * Strip scraper-specific prefixes like "Nattjazz: ", "Bergenfest: ",
 * "Festspillene i Bergen: " — the source page won't repeat these.
 */
function coreTitle(title: string): string {
	return title
		.replace(/^(Nattjazz|Bergenfest|Festspillene i Bergen|Borealis|Beyond the Gates|Bjørgvin Blues):\s*/i, '')
		.replace(/\s*—\s*(?:mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)\s+\d{1,2}\.?\s*\w+.*$/i, '')
		.trim();
}

function findTitle(html: string, title: string): boolean {
	const norm = normalizeText(html);
	const core = normalizeText(coreTitle(title));
	if (core.length < 4) return true; // too short to be a useful check

	// 1. Full-title match (most common case)
	if (norm.includes(core)) return true;

	// 2. Prefix match (source has appended subtitle/badge, e.g. extra punctuation)
	if (core.length >= 14) {
		const minLen = Math.max(10, Math.floor(core.length * 0.6));
		for (let end = core.length - 4; end >= minLen; end -= 4) {
			const probe = core.slice(0, end).trim();
			if (norm.includes(probe)) return true;
		}
	}

	// 3. Distinctive-word match — at least one ≥4-char non-stopword from the
	// title appears on the page. Handles transformations like Nattjazz's
	// "Shuma — Jazz i sikte" (DB) vs "SHUMA" (source page).
	const words = core.split(/[\s—\-:,/&!.()]+/).filter(w => w.length >= 4 && !STOP_WORDS.has(w));
	if (words.length === 0) return false;
	return words.some(w => norm.includes(w));
}

/**
 * Check whether the DB date appears in the source HTML. We try many common
 * date formats (ISO, DD.MM, DD. month, DD month YYYY). A "hit" means at
 * least one representation of the date is present somewhere on the page.
 *
 * False positives are possible (e.g. recurring series), but false negatives
 * are what we care about for flagging — if NO representation matches, the
 * source has very likely moved the event.
 */
function findDate(html: string, dbDate: string): boolean {
	const norm = normalizeText(html);
	const d = new Date(dbDate);
	if (isNaN(d.getTime())) return true;
	const y = d.getUTCFullYear();
	const m = d.getUTCMonth();
	const day = d.getUTCDate();

	const candidates = [
		`${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,           // 2026-06-12
		`${day}.${String(m + 1).padStart(2, '0')}.${y}`,                                    // 12.06.2026
		`${day}/${String(m + 1).padStart(2, '0')}/${y}`,                                    // 12/06/2026
		`${String(day).padStart(2, '0')}${String(m + 1).padStart(2, '0')}${y}`,             // 12062026
		`${y}${String(m + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`,             // 20260612
	];
	for (const monthName of NB_MONTHS[m] || []) {
		candidates.push(`${day}. ${monthName}`);
		candidates.push(`${day}.${monthName}`);
		candidates.push(`${day} ${monthName}`);
		candidates.push(`${day}.${monthName} ${y}`);
	}
	for (const monthName of EN_MONTHS[m] || []) {
		candidates.push(`${monthName} ${day}`);
		candidates.push(`${monthName} ${String(day).padStart(2, '0')}, ${y}`);
		candidates.push(`${monthName} ${day}, ${y}`);
	}

	return candidates.some(c => norm.includes(c.toLowerCase()));
}

async function fetchHtml(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': USER_AGENT },
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			redirect: 'follow',
		});
		if (!res.ok) return null;
		return await res.text();
	} catch {
		return null;
	}
}

/**
 * Probe an image URL with HEAD. Returns status code, or null on network failure.
 * Some CDNs reject HEAD — for those we fall back to a tiny Range GET.
 */
async function probeImage(url: string): Promise<number | null> {
	try {
		const head = await fetch(url, {
			method: 'HEAD',
			headers: { 'User-Agent': USER_AGENT },
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			redirect: 'follow',
		});
		// 405 Method Not Allowed → try Range GET
		if (head.status === 405) {
			const get = await fetch(url, {
				method: 'GET',
				headers: { 'User-Agent': USER_AGENT, 'Range': 'bytes=0-0' },
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
				redirect: 'follow',
			});
			return get.status;
		}
		return head.status;
	} catch {
		return null;
	}
}

async function checkEvent(event: Event): Promise<StaleFlag | null> {
	let host = '';
	try {
		host = new URL(event.source_url).hostname;
	} catch {
		return {
			id: event.id, slug: event.slug, title: event.title_no, source: event.source,
			dbDate: event.date_start, sourceUrl: event.source_url,
			reason: 'fetch-failed', detail: 'invalid source_url',
		};
	}

	if (SKIP_HOSTS.has(host)) return null;

	const html = await fetchHtml(event.source_url);
	if (html === null) {
		return {
			id: event.id, slug: event.slug, title: event.title_no, source: event.source,
			dbDate: event.date_start, sourceUrl: event.source_url,
			reason: 'fetch-failed', detail: `could not fetch ${host}`,
		};
	}

	const titleOk = findTitle(html, event.title_no);
	const dateOk = findDate(html, event.date_start);

	// Image-URL probe runs in parallel with the title/date verdict so the
	// throttle stays at 1.5s/event total. We only flag if status is a hard
	// 4xx — transient 5xx errors and timeouts are common for hot-linked
	// images and would create noise.
	if (event.image_url) {
		const imgStatus = await probeImage(event.image_url);
		if (imgStatus !== null && imgStatus >= 400 && imgStatus < 500) {
			return {
				id: event.id, slug: event.slug, title: event.title_no, source: event.source,
				dbDate: event.date_start, sourceUrl: event.source_url,
				reason: 'image-broken', detail: `image_url returned HTTP ${imgStatus} — ${event.image_url}`,
			};
		}
	}

	if (!titleOk && !dateOk) {
		return {
			id: event.id, slug: event.slug, title: event.title_no, source: event.source,
			dbDate: event.date_start, sourceUrl: event.source_url,
			reason: 'source-likely-changed', detail: 'neither title nor date found on source',
		};
	}
	if (!titleOk) {
		return {
			id: event.id, slug: event.slug, title: event.title_no, source: event.source,
			dbDate: event.date_start, sourceUrl: event.source_url,
			reason: 'title-missing', detail: 'event title not found on source — may be removed/renamed',
		};
	}
	if (!dateOk) {
		return {
			id: event.id, slug: event.slug, title: event.title_no, source: event.source,
			dbDate: event.date_start, sourceUrl: event.source_url,
			reason: 'date-mismatch', detail: `DB date ${event.date_start.slice(0, 10)} not found on source — likely moved`,
		};
	}
	return null;
}

async function sendAlertEmail(flags: StaleFlag[]) {
	const key = process.env.RESEND_API_KEY;
	if (!key) return;

	const byReason: Record<string, StaleFlag[]> = {};
	for (const f of flags) (byReason[f.reason] ??= []).push(f);

	const lines: string[] = [
		`Stale-event-skanning fant ${flags.length} mistenkelig event${flags.length === 1 ? '' : 'er'} der DB ikke matcher kilden.`,
		``,
		`Disse er IKKE automatisk endret. Sjekk hver enkelt og slett rad i Supabase hvis kilden faktisk har endret seg — neste scrape vil re-opprette med riktige data.`,
		``,
	];
	for (const [reason, items] of Object.entries(byReason)) {
		lines.push(`=== ${reason} (${items.length}) ===`);
		for (const f of items) {
			lines.push(`  ${f.dbDate.slice(0, 10)}  ${f.title}`);
			lines.push(`    src: ${f.sourceUrl}`);
			lines.push(`    → ${f.detail}`);
		}
		lines.push('');
	}

	const resp = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			from: 'Gåri <noreply@gaari.no>',
			to: ['post@gaari.no'],
			subject: `⚠️ ${flags.length} mulig stale event${flags.length === 1 ? '' : 's'} oppdaget`,
			text: lines.join('\n'),
		}),
	});
	if (!resp.ok) {
		console.error(`Alert email failed: ${resp.status}`);
	}
}

async function main() {
	const args = process.argv.slice(2);
	const daysFlag = args.indexOf('--days');
	const sourceFlag = args.indexOf('--source');
	const jsonOutput = args.includes('--json');
	const days = daysFlag !== -1 ? parseInt(args[daysFlag + 1], 10) || 30 : 30;
	const sourceFilter = sourceFlag !== -1 ? args[sourceFlag + 1] : null;

	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() + days);

	let query = supabase
		.from('events')
		.select('id, slug, title_no, date_start, source, source_url, image_url')
		.eq('status', 'approved')
		.eq('is_canary', false)
		.gte('date_start', new Date().toISOString())
		.lte('date_start', cutoff.toISOString())
		.order('date_start', { ascending: true });

	if (sourceFilter) query = query.eq('source', sourceFilter);

	const { data: events, error } = await query;
	if (error) {
		console.error('Failed to load events:', error.message);
		process.exit(1);
	}
	if (!events) {
		console.error('No events returned');
		process.exit(1);
	}

	if (!jsonOutput) {
		console.log(`Checking ${events.length} events with date_start within ${days} days...`);
	}

	const flags: StaleFlag[] = [];
	let checked = 0;
	let skipped = 0;
	for (const event of events as Event[]) {
		const flag = await checkEvent(event);
		if (flag) flags.push(flag);
		checked++;
		if (event.source_url) {
			try {
				const host = new URL(event.source_url).hostname;
				if (SKIP_HOSTS.has(host)) skipped++;
			} catch { /* ignore */ }
		}
		if (!jsonOutput && checked % 50 === 0) {
			console.log(`  ${checked}/${events.length} checked (${flags.length} flagged)`);
		}
		await delay(DELAY_BETWEEN_REQUESTS_MS);
	}

	if (jsonOutput) {
		console.log(JSON.stringify({ checked, skipped, flagged: flags.length, flags }, null, 2));
		if (flags.length > 0) {
			// stderr so it doesn't pollute the JSON stdout payload but is still
			// visible in workflow logs. Email goes out from the same call.
			console.error(`⚠️ ${flags.length} stale event(s) flagged`);
			await sendAlertEmail(flags);
		}
		return;
	}

	console.log(`\nResults: ${checked} checked, ${skipped} skipped (anti-bot hosts), ${flags.length} flagged.\n`);
	if (flags.length === 0) {
		console.log('No stale events detected.');
		return;
	}

	const byReason: Record<string, StaleFlag[]> = {};
	for (const f of flags) {
		(byReason[f.reason] ??= []).push(f);
	}
	for (const [reason, items] of Object.entries(byReason)) {
		console.log(`\n=== ${reason} (${items.length}) ===`);
		for (const f of items) {
			console.log(`  ${(f.source || '?').padEnd(20).slice(0, 20)} ${f.dbDate.slice(0, 10)}  ${f.title.slice(0, 50)}`);
			console.log(`    ${f.sourceUrl}`);
			console.log(`    → ${f.detail}`);
		}
	}
	console.log('\nReview each flag manually. To resolve: delete the row and re-run the scraper.');
}

main().catch(e => {
	console.error('Error:', e);
	process.exit(1);
});
