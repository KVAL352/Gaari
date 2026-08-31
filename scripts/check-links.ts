import { supabase } from './lib/supabase.js';
import { deleteEventByUrl, delay } from './lib/utils.js';
import { writeFileSync } from 'fs';

// --- Constants ---
const REQUEST_TIMEOUT_MS = 15_000;
const DELAY_BETWEEN_REQUESTS_MS = 1500;
const MAX_EVENTS_PER_RUN = 500;
// Tidsfrist for kjoeringen, mot jobbtaket paa 20 minutter i link-check.yml.
//
// Antallstaket over er ikke en tidsgrense. 500 arrangementer med opptil tre
// lenker hver og 1 500 ms mellom forespoerslene kan ta over 35 minutter, og da
// blir jobben drept av GitHub i stedet for aa bli ferdig. Oppsummeringen og
// strike-loggingen kjoerer aldri, og doegnet ser ut som om det ikke skjedde.
//
// Skjedde 31. august kl. 16:44: drept paa 20 m 19 s. To timer tidligere gikk
// den groent, saa den laa rett paa grensa og ville feilet annenhver gang.
// Samme feilklasse som scrape.ts hadde, rettet samme dag.
//
// Uferdige rader beholder sin gamle link_checked_at og ligger derfor foerst i
// koeen neste kjoering — spoerringen sorterer paa nettopp den. Ingenting gaar
// tapt ved aa stoppe tidlig.
const RUN_DEADLINE_MS = 17 * 60 * 1000;
const SOURCE_URL_STRIKE_LIMIT = 3;
const TICKET_URL_STRIKE_LIMIT = 2;
const USER_AGENT = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';

// Domains that block bots / require JS — skip checking, treat as OK
const SKIP_DOMAINS = new Set([
	'www.ticketmaster.no',
	'ticketmaster.no',
	// FEILDIAGNOSE, rettet 26. august 2026. Kommentaren her sa «Returns
	// errors to automated requests». Det stemte ikke: www.dnt.no svarer 500
	// paa arrangementssidene sine ogsaa i vanlig nettleser. Ingen challenge,
	// cf-cache-status DYNAMIC, EpiServer-cookies i svaret, og deres egen
	// feilside «Noe gikk galt» — forespoerselen naadde applikasjonen, og
	// applikasjonen feilet.
	//
	// Antagelsen om botblokkering gjorde at 119 doede lenker fikk staa som
	// friske gjennom maaneder, fordi de var unntatt fra sjekken som skulle
	// fange dem. Et unntak er en beslutning om aa slutte aa se etter.
	//
	// Lenkene peker naa paa aktiviteter.dnt.no i stedet, som virker. Unntaket
	// staar likevel: sjekk om det fortsatt trengs neste gang noen er her.
	'www.dnt.no',

	// Denne derimot er ekte botblokkering, og verifisert som det:
	//   vaar aerlige User-Agent  -> 403
	//   nettleser-UA + Accept    -> 200, 33 kB innhold, Event-JSON-LD
	// Sida virker for brukere. Vi spoofer ikke nettleser for aa komme rundt
	// det — aerlig User-Agent er en regel her — saa vi hopper over den.
	//
	// Uten dette unntaket ville de 30 turene vi nettopp flyttet hit faatt tre
	// strikes paa tre doegn og blitt slettet. Vi ville altsaa flyttet dem fra
	// en oedelagt lenke som var unntatt, til en fungerende lenke som ble
	// straffet.
	'aktiviteter.dnt.no',
]);

// Hoopla uses queue-it anti-bot — URLs work in browsers but fail for bots
function isHooplaDomain(url: string): boolean {
	try {
		return new URL(url).hostname.endsWith('.hoopla.no');
	} catch {
		return false;
	}
}

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
	image_url: string | null;
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
		return SKIP_DOMAINS.has(new URL(url).hostname) || isHooplaDomain(url);
	} catch {
		return false;
	}
}

/**
 * En serverfeil hos arrangoeren betyr ikke at arrangementet er borte.
 *
 * 26. august svarte alle arrangementssidene paa dnt.no HTTP 500 mens forsida
 * deres svarte 200 — deres feil, ikke vaar, og verifisert med vanlig
 * nettleser-UA. Vi lenker 119 arrangementer dit. Med 5xx talt som brutt ville
 * de faatt tre strikes paa tre doegn og blitt slettet, helt stille, fordi
 * noen andres server hadde en daarlig uke.
 *
 * 404 og 410 betyr at sida er borte for godt. 5xx betyr at den er syk naa.
 * De to skal ikke behandles likt naar konsekvensen er sletting.
 *
 * Vedvarende 5xx skal likevel fanges — de rapporteres for seg i sammendraget,
 * saa en kilde som er nede i ukevis ikke bare forsvinner i stillhet.
 */
function isServerError(status: number): boolean {
	return status >= 500 && status < 600;
}

function isBrokenStatus(status: number): boolean {
	if (status === 0) return true;       // Network error / timeout
	if (status === 429) return false;    // Rate limited — treat as OK
	if (isServerError(status)) return false; // Deres server, ikke vaar lenke
	if (status >= 400) return true;      // Client errors — sida er borte
	return false;
}

/**
 * Next.js med `fallback: true` svarer 200 med et tomt skall foerste gang noen
 * spoer etter en sti den ikke har bygd, og bygger siden i bakgrunnen. Er stien
 * ugyldig, blir svaret 404 — men foerst etterpaa. Et enkelt 200 fra en slik
 * side beviser altsaa ingenting, og det var nettopp dette som lot 61 doede
 * KODE-lenker staa som friske gjennom flere kjoeringer i august 2026.
 *
 * Skallet roeper seg selv i __NEXT_DATA__. Ser vi det, spoer vi én gang til.
 */
function isUnbuiltNextPage(body: string): boolean {
	return body.includes('"isFallback":true');
}

function isSoft404(body: string): boolean {
	// Only check first 5000 chars (soft 404 text is usually near the top)
	const snippet = body.slice(0, 5000);
	return SOFT_404_PATTERNS.some(pattern => pattern.test(snippet));
}

async function checkSourceUrl(url: string): Promise<{ ok: boolean; soft404: boolean; serverError?: number }> {
	// GET, ikke HEAD. En HEAD gir bare statuskoden, og statuskoden loey: baade
	// myke 404-er og ubygde Next.js-sider svarer 200 med feil innhold.
	let res = await checkUrl(url, 'GET');

	// Ubygd side: svaret sier ingenting ennaa. Gi den et oeyeblikk paa aa bygge
	// seg ferdig og spoer paa nytt. Er den fortsatt ubygd, lar vi den passere
	// framfor aa gi en strike vi ikke kan staa for.
	if (res.body && isUnbuiltNextPage(res.body)) {
		await delay(4000);
		res = await checkUrl(url, 'GET');
		if (res.body && isUnbuiltNextPage(res.body)) return { ok: true, soft404: false };
	}

	if (isServerError(res.status)) return { ok: true, soft404: false, serverError: res.status };
	if (isBrokenStatus(res.status)) return { ok: false, soft404: false };
	if (res.body && isSoft404(res.body)) return { ok: false, soft404: true };
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
		.select('id, source_url, ticket_url, image_url, link_check_failures, venue_name, title_no')
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
	// Verter som svarer 5xx. Ikke strikes, men skal ikke forsvinne i stillhet.
	const serverfeil = new Map<string, number>();
	let deleted = 0;
	let ticketsCleared = 0;
	let skipped = 0;
	let imagesBroken = 0;

	// Track last request time per domain for rate limiting
	const lastRequestTime = new Map<string, number>();

	let naaddeFrist = false;
	let ikkeRukket = 0;

	for (const event of orderedEvents) {
		if (Date.now() - startTime > RUN_DEADLINE_MS) {
			naaddeFrist = true;
			ikkeRukket = orderedEvents.length - checked;
			console.warn(
				`\n[link-check] Tidsfrist naadd (${Math.round(RUN_DEADLINE_MS / 60000)} min) — ` +
					`${ikkeRukket} arrangementer staar igjen til neste kjoering`
			);
			break;
		}

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

			// Ikke en strike, men skal telles. En vert som staar her dag etter
			// dag er et ekte problem — for brukerne som klikker, og for
			// arrangoeren som kanskje ikke vet om det.
			if (result.serverError) {
				try {
					const vert = new URL(sourceUrl).hostname;
					serverfeil.set(vert, (serverfeil.get(vert) ?? 0) + 1);
				} catch { /* ugyldig URL — telles ikke */ }
			}

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

		// Check image_url (HEAD only, null out immediately if broken — no strikes needed)
		if (event.image_url && !isSkippedDomain(event.image_url)) {
			try {
				const imgDomain = new URL(event.image_url).hostname;
				const lastTime = lastRequestTime.get(imgDomain) || 0;
				const elapsed = Date.now() - lastTime;
				if (elapsed < DELAY_BETWEEN_REQUESTS_MS) {
					await delay(DELAY_BETWEEN_REQUESTS_MS - elapsed);
				}
			} catch { /* ignore */ }

			const imgCheck = await checkUrl(event.image_url, 'HEAD');
			if (isBrokenStatus(imgCheck.status)) {
				await supabase
					.from('events')
					.update({ image_url: null })
					.eq('id', event.id);
				console.log(`  🖼 Cleared broken image: ${event.title_no} — ${event.image_url}`);
				imagesBroken++;
			}

			try {
				lastRequestTime.set(new URL(event.image_url).hostname, Date.now());
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
	if (naaddeFrist) {
		console.log(`  Tidsfrist naadd: ${ikkeRukket} igjen til neste kjoering`);
	}
	console.log(`  Checked:         ${checked}`);
	console.log(`  Healthy:         ${healthy}`);
	console.log(`  Skipped (bots):  ${skipped}`);
	console.log(`  New strikes:     ${strikes}`);
	console.log(`  Deleted:         ${deleted}`);
	console.log(`  Tickets cleared: ${ticketsCleared}`);
	console.log(`  Images cleared:  ${imagesBroken}`);
	console.log(`  Duration:        ${durationSeconds}s`);
	if (serverfeil.size > 0) {
		console.log('\n  Verter med serverfeil (5xx) — ikke strikes, men sjekk dem:');
		for (const [vert, n] of [...serverfeil.entries()].sort((a, b) => b[1] - a[1])) {
			console.log(`    ${vert}: ${n} lenker`);
		}
	}

	const summary = {
		checked,
		healthy,
		skipped,
		strikes,
		deleted,
		serverErrors: Object.fromEntries(serverfeil),
		ticketsCleared,
		imagesBroken,
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
