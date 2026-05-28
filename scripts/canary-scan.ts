/**
 * Canary Scanner
 *
 * Fetches a list of target URLs (a competitor's homepage, sitemap or feed)
 * and checks whether any active Gåri canary fingerprints appear on them.
 * A positive hit means the competitor copied data from Gåri.
 *
 * Usage:
 *   cd scripts && npx tsx canary-scan.ts <url> [<url> ...]
 *   cd scripts && npx tsx canary-scan.ts --file targets.txt
 *
 * Output: one line per (target, fingerprint) match, plus a summary.
 *
 * Notes:
 *   - Matching is on title + venue substring (case-insensitive).
 *   - A single match is suggestive; multiple matches across canaries is
 *     conclusive. Save the raw HTML alongside the report for evidence.
 *   - Run on a schedule (cron / GHA) once canaries are planted.
 *
 * Env vars: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { supabase } from './lib/supabase.js';

interface Canary {
	id: string;
	title_no: string;
	title_en: string | null;
	venue_name: string;
	date_start: string;
}

interface Hit {
	target: string;
	canaryId: string;
	matchedOn: 'title_no' | 'title_en' | 'title+venue';
	excerpt: string;
}

const USER_AGENT = 'Gaari-Canary-Scan/1.0 (gaari.bergen@proton.me)';

function normalize(s: string): string {
	return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findMatch(html: string, canary: Canary): Hit | null {
	const haystack = normalize(html);
	const titleNo = normalize(canary.title_no);
	const titleEn = canary.title_en ? normalize(canary.title_en) : null;
	const venue = normalize(canary.venue_name);

	// Strongest signal: both title and venue present
	if (haystack.includes(titleNo) && haystack.includes(venue)) {
		return {
			target: '',
			canaryId: canary.id,
			matchedOn: 'title+venue',
			excerpt: extractContext(haystack, titleNo, 100)
		};
	}
	if (titleEn && haystack.includes(titleEn) && haystack.includes(venue)) {
		return {
			target: '',
			canaryId: canary.id,
			matchedOn: 'title+venue',
			excerpt: extractContext(haystack, titleEn, 100)
		};
	}

	// Weaker but still notable: title alone (artist names can be distinctive)
	if (haystack.includes(titleNo)) {
		return {
			target: '',
			canaryId: canary.id,
			matchedOn: 'title_no',
			excerpt: extractContext(haystack, titleNo, 100)
		};
	}
	if (titleEn && haystack.includes(titleEn)) {
		return {
			target: '',
			canaryId: canary.id,
			matchedOn: 'title_en',
			excerpt: extractContext(haystack, titleEn, 100)
		};
	}

	return null;
}

function extractContext(haystack: string, needle: string, span: number): string {
	const idx = haystack.indexOf(needle);
	if (idx === -1) return '';
	const start = Math.max(0, idx - span);
	const end = Math.min(haystack.length, idx + needle.length + span);
	return haystack.slice(start, end).replace(/\s+/g, ' ');
}

async function fetchTarget(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': USER_AGENT },
			signal: AbortSignal.timeout(20_000)
		});
		if (!res.ok) {
			console.error(`  HTTP ${res.status} — ${url}`);
			return null;
		}
		return await res.text();
	} catch (e) {
		console.error(`  Fetch failed — ${url}: ${e instanceof Error ? e.message : e}`);
		return null;
	}
}

function saveEvidence(target: string, html: string, hits: Hit[]) {
	const safeName = target.replace(/[^a-z0-9]+/gi, '_').slice(0, 80);
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	const dir = `../outputs/canary-evidence/${stamp}`;
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	writeFileSync(`${dir}/${safeName}.html`, html);
	writeFileSync(`${dir}/${safeName}.json`, JSON.stringify({ target, hits, capturedAt: new Date().toISOString() }, null, 2));
	console.log(`  Saved evidence: ${dir}/${safeName}.html`);
}

async function main() {
	const args = process.argv.slice(2);
	let targets: string[] = [];

	const fileFlag = args.indexOf('--file');
	if (fileFlag !== -1 && args[fileFlag + 1]) {
		targets = readFileSync(args[fileFlag + 1], 'utf-8')
			.split('\n')
			.map(l => l.trim())
			.filter(l => l && !l.startsWith('#'));
	} else {
		targets = args.filter(a => a.startsWith('http'));
	}

	if (targets.length === 0) {
		console.error('Usage: canary-scan.ts <url> [<url> ...]');
		console.error('   or: canary-scan.ts --file targets.txt');
		process.exit(1);
	}

	const { data: canaries, error } = await supabase
		.from('events')
		.select('id, title_no, title_en, venue_name, date_start')
		.eq('is_canary', true);

	if (error) {
		console.error('Failed to load canaries:', error.message);
		process.exit(1);
	}
	if (!canaries || canaries.length === 0) {
		console.error('No canaries planted yet — nothing to scan for.');
		process.exit(1);
	}

	console.log(`Scanning ${targets.length} target(s) for ${canaries.length} canary fingerprint(s)...\n`);

	const allHits: Hit[] = [];
	for (const target of targets) {
		console.log(`→ ${target}`);
		const html = await fetchTarget(target);
		if (!html) continue;

		const hits: Hit[] = [];
		for (const canary of canaries as Canary[]) {
			const hit = findMatch(html, canary);
			if (hit) {
				hit.target = target;
				hits.push(hit);
				console.log(`  MATCH [${hit.matchedOn}] canary ${canary.id.slice(0, 8)} — "${canary.title_no}"`);
			}
		}

		if (hits.length > 0) {
			allHits.push(...hits);
			saveEvidence(target, html, hits);
		} else {
			console.log('  no matches');
		}
	}

	console.log(`\n${allHits.length} total match(es) across ${targets.length} target(s).`);
	if (allHits.length > 0) {
		console.log('Review the evidence files in outputs/canary-evidence/ before acting.');
	}
}

main();
