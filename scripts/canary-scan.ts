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

function saveEvidence(target: string, html: string, hits: Hit[], evidenceDir: string) {
	const safeName = target.replace(/[^a-z0-9]+/gi, '_').slice(0, 80);
	writeFileSync(`${evidenceDir}/${safeName}.html`, html);
	writeFileSync(`${evidenceDir}/${safeName}.json`, JSON.stringify({ target, hits, capturedAt: new Date().toISOString() }, null, 2));
	console.log(`  Saved evidence: ${evidenceDir}/${safeName}.html`);
}

async function archiveToWayback(url: string): Promise<string | null> {
	// Trigger an independent third-party archive. This is legal-grade because
	// Wayback Machine timestamps are accepted as evidence in many jurisdictions.
	try {
		const res = await fetch(`https://web.archive.org/save/${encodeURI(url)}`, {
			headers: { 'User-Agent': USER_AGENT },
			signal: AbortSignal.timeout(60_000)
		});
		// Wayback returns 200 + Location header with snapshot URL, or sometimes 302
		const snapshot = res.headers.get('content-location') || res.headers.get('location');
		if (snapshot) return `https://web.archive.org${snapshot.startsWith('http') ? '' : snapshot}`;
		return res.ok ? `https://web.archive.org/web/*/${url}` : null;
	} catch (e) {
		console.error(`  Wayback archive failed for ${url}: ${e instanceof Error ? e.message : e}`);
		return null;
	}
}

function writeActionChecklist(evidenceDir: string, hits: Hit[], waybackUrls: Record<string, string | null>) {
	const lines: string[] = [
		`# CANARY HIT — handlingssjekkliste`,
		``,
		`**Oppdaget:** ${new Date().toISOString()}`,
		`**Antall treff:** ${hits.length}`,
		``,
		`## STOPP — Les dette først`,
		``,
		`Et canary-treff er sterkt bevis, men IKKE send krav om opphør før du har:`,
		``,
		`1. **Verifisert at treffet ikke er en falsk positiv.** Sjekk evidensen i denne mappa. Match tittel + venue + dato eksakt mot vår canary-database (\`cd scripts && npx tsx canary-manage.ts list\`).`,
		`2. **Fått advokat-gjennomgang av bruksvilkår.** Se docs/ip-protection.md § 3. Mitt utkast på /vilkar lener seg på åndsverksloven § 24 og Finn.no v Supersøk — sannsynlig, men ikke testet i rett for *vår* type database. Bruk 1–2 timer rådgivning (~2 000–4 000 kr) hos advokat med IP/tech-erfaring.`,
		`3. **Verifisert Wayback Machine-arkivet.** Lenker nedenfor — sjekk at de fungerer. Hvis ikke: lag manuelt snapshot via https://web.archive.org/save/<url>.`,
		`4. **Skannet bredt.** Hvis én canary er treff, finn alle. Sjekk også om de har kopiert AI-beskrivelser og venue-mapping (ikke bare canaries).`,
		``,
		`## Treff`,
		``,
		...hits.map(h => `- **${h.matchedOn}** på \`${h.target}\` — canary \`${h.canaryId.slice(0, 8)}\``),
		``,
		`## Wayback Machine-arkiver`,
		``,
		...Object.entries(waybackUrls).map(([t, w]) => `- ${t} → ${w ?? 'ARKIVERING FEILET — manuelt: https://web.archive.org/save/' + encodeURI(t)}`),
		``,
		`## Bevis-filer`,
		``,
		`Rå HTML og JSON for hvert treff ligger i samme mappe. Behold denne mappa uendret som primær bevismateriale.`,
		``,
		`## Neste steg`,
		``,
		`1. Konsulter advokat med materialet — se docs/ip-protection.md § 3.`,
		`2. Lagre denne mappa OG GHA-artifact (90 dagers retensjon) på et permanent sted før sletting.`,
		`3. Hvis advokat anbefaler opphørspålegg: skriv brev med henvisning til bruksvilkår, vedlegg bevis, sett 14-dagers frist.`,
	];
	writeFileSync(`${evidenceDir}/README.md`, lines.join('\n'));
}

async function sendHitAlert(hits: Hit[], evidenceDir: string, waybackUrls: Record<string, string | null>) {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.log('  Email alert skipped (no RESEND_API_KEY)');
		return;
	}
	const subject = `🚨 Canary-treff oppdaget — ${hits.length} match${hits.length === 1 ? '' : 'es'}`;
	const targets = [...new Set(hits.map(h => h.target))];
	const text = [
		`Canary-scan oppdaget ${hits.length} treff på ${targets.length} domene${targets.length === 1 ? '' : 'r'}.`,
		``,
		`STOPP. Ikke send krav om opphør før du har:`,
		`  1. Verifisert treffene mot canary-databasen`,
		`  2. Fått advokat-gjennomgang av /vilkar (~2000-4000 kr, 1-2 timer)`,
		`  3. Verifisert Wayback Machine-arkivene`,
		``,
		`Treff:`,
		...hits.map(h => `  - [${h.matchedOn}] ${h.target} → canary ${h.canaryId.slice(0, 8)}`),
		``,
		`Wayback-arkiver:`,
		...Object.entries(waybackUrls).map(([t, w]) => `  - ${t} → ${w ?? 'FEILET'}`),
		``,
		`Bevis lagret i: ${evidenceDir}`,
		`Full handlingssjekkliste: ${evidenceDir}/README.md`,
		``,
		`Se docs/ip-protection.md § 3 for full workflow.`,
	].join('\n');

	const resp = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ from: 'Gåri <noreply@gaari.no>', to: ['post@gaari.no'], subject, text })
	});
	if (resp.ok) {
		console.log('  📧 Hit alert email sent to post@gaari.no');
	} else {
		console.error(`  ❌ Hit alert email failed: ${resp.status}`);
	}
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

	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	const evidenceDir = `../outputs/canary-evidence/${stamp}`;
	const allHits: Hit[] = [];
	const hitTargets: { target: string; html: string; hits: Hit[] }[] = [];

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
			hitTargets.push({ target, html, hits });
		} else {
			console.log('  no matches');
		}
	}

	console.log(`\n${allHits.length} total match(es) across ${targets.length} target(s).`);

	if (allHits.length > 0) {
		if (!existsSync(evidenceDir)) mkdirSync(evidenceDir, { recursive: true });

		// Save raw HTML + JSON per target
		for (const { target, html, hits } of hitTargets) {
			saveEvidence(target, html, hits, evidenceDir);
		}

		// Independent third-party archive via Wayback Machine
		console.log('\nArchiving to Wayback Machine...');
		const waybackUrls: Record<string, string | null> = {};
		for (const { target } of hitTargets) {
			const w = await archiveToWayback(target);
			waybackUrls[target] = w;
			console.log(`  ${target} → ${w ?? 'FAILED'}`);
		}

		// Action checklist with explicit lawyer-review reminder
		writeActionChecklist(evidenceDir, allHits, waybackUrls);

		// Email alert to admin with full context
		await sendHitAlert(allHits, evidenceDir, waybackUrls);

		console.log(`\nEvidence saved to: ${evidenceDir}`);
		console.log('Read README.md in that folder BEFORE acting.');

		// Exit non-zero so CI workflows surface this as a failure and notify.
		process.exit(2);
	}
}

main();
