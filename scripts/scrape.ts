import { scrape as scrapeBergenLive } from './scrapers/bergenlive.js';
import { scrape as scrapeVisitBergen } from './scrapers/visitbergen.js';
import { scrape as scrapeBergenKommune } from './scrapers/bergenkommune.js';
// BarnasNorge disabled — all its venues are covered by dedicated scrapers with better data quality.
// Issues: AI-generated stock images, address-based venue names, complex URL resolution.
// import { scrape as scrapeBarnasNorge } from './scrapers/barnasnorge.js';
import { scrape as scrapeStudentBergen } from './scrapers/studentbergen.js';
import { scrape as scrapeDNT } from './scrapers/dnt.js';
import { scrape as scrapeEventbrite } from './scrapers/eventbrite.js';
import { scrape as scrapeTicketCo } from './scrapers/ticketco.js';
import { scrape as scrapeHoopla } from './scrapers/hoopla.js';
// Tikkio: waiting for permission — email sent 2026-02-27
// import { scrape as scrapeTikkio } from './scrapers/tikkio.js';
import { scrape as scrapeNordnesSjobad } from './scrapers/nordnessjobad.js';
import { scrape as scrapeRaabrent } from './scrapers/raabrent.js';
import { scrape as scrapeBergenChamber } from './scrapers/bergenchamber.js';
import { scrape as scrapeColonialen } from './scrapers/colonialen.js';
import { scrape as scrapeBergenKjott } from './scrapers/bergenkjott.js';
import { scrape as scrapePaintNSip } from './scrapers/paintnsip.js';
import { scrape as scrapeBergenFilmklubb } from './scrapers/bergenfilmklubb.js';
import { scrape as scrapeCornerteateret } from './scrapers/cornerteateret.js';
import { scrape as scrapeDvrtVest } from './scrapers/dvrtvest.js';
import { scrape as scrapeKunsthall } from './scrapers/kunsthall.js';
import { scrape as scrapeBrettspill } from './scrapers/brettspill.js';
import { scrape as scrapeMediaCity } from './scrapers/mediacity.js';
import { scrape as scrapeForumScene } from './scrapers/forumscene.js';
import { scrape as scrapeUSFVerftet } from './scrapers/usfverftet.js';
import { scrape as scrapeDNS } from './scrapers/dns.js';
import { scrape as scrapeOleBull } from './scrapers/olebull.js';
import { scrape as scrapeGrieghallen } from './scrapers/grieghallen.js';
import { scrape as scrapeKODE } from './scrapers/kode.js';
import { scrape as scrapeLitthus } from './scrapers/litthusbergen.js';
import { scrape as scrapeBergenBibliotek } from './scrapers/bergenbibliotek.js';
import { scrape as scrapeFloyen } from './scrapers/floyen.js';
import { scrape as scrapeBITTeater } from './scrapers/bitteater.js';
import { scrape as scrapeHarmonien } from './scrapers/harmonien.js';
import { scrape as scrapeOseana } from './scrapers/oseana.js';
import { scrape as scrapeCarteBlanche } from './scrapers/carteblanche.js';
import { scrape as scrapeFestspillene } from './scrapers/festspillene.js';
import { scrape as scrapeBergenfest } from './scrapers/bergenfest.js';
import { scrape as scrapeBjorgvinBlues } from './scrapers/bjorgvinblues.js';
import { scrape as scrapeBEK } from './scrapers/bek.js';
import { scrape as scrapeBeyondTheGates } from './scrapers/beyondthegates.js';
import { scrape as scrapeBrann } from './scrapers/brann.js';
import { scrape as scrapeKulturhusetIBergen } from './scrapers/kulturhusetibergen.js';
import { scrape as scrapeVVV } from './scrapers/vvv.js';
import { scrape as scrapeBymuseet } from './scrapers/bymuseet.js';
import { scrape as scrapeMuseumVest } from './scrapers/museumvest.js';
import { scrape as scrapeAkvariet } from './scrapers/akvariet.js';
import { scrape as scrapeKvarteret } from './scrapers/kvarteret.js';
import { scrape as scrapeFyllingsdalenTeater } from './scrapers/fyllingsdalenteater.js';
import { scrape as scrapeGGBergen } from './scrapers/ggbergen.js';
import { scrape as scrapeOConnors } from './scrapers/oconnors.js';
import { writeFileSync } from 'fs';
import { removeExpiredEvents, loadOptOuts, getOptOutDomains } from './lib/utils.js';
import { deduplicate } from './lib/dedup.js';
import { supabase } from './lib/supabase.js';

// Pipeline deadline — stop starting new scrapers after 13 minutes (2 min buffer for dedup + summary)
const PIPELINE_DEADLINE_MS = 13 * 60 * 1000;

const scrapers: Record<string, () => Promise<{ found: number; inserted: number }>> = {
	// --- Dedicated venue scrapers first (highest priority) ---
	bergenlive: scrapeBergenLive,
	bergenkommune: scrapeBergenKommune,
	// barnasnorge: scrapeBarnasNorge, // Disabled — see import comment above
	studentbergen: scrapeStudentBergen,
	dnt: scrapeDNT,
	eventbrite: scrapeEventbrite,
	ticketco: scrapeTicketCo,
	hoopla: scrapeHoopla,
	// tikkio: scrapeTikkio, // Waiting for permission — email sent 2026-02-27
	nordnessjobad: scrapeNordnesSjobad,
	raabrent: scrapeRaabrent,
	bergenchamber: scrapeBergenChamber,
	colonialen: scrapeColonialen,
	bergenkjott: scrapeBergenKjott,
	paintnsip: scrapePaintNSip,
	bergenfilmklubb: scrapeBergenFilmklubb,
	cornerteateret: scrapeCornerteateret,
	dvrtvest: scrapeDvrtVest,
	kunsthall: scrapeKunsthall,
	brettspill: scrapeBrettspill,
	mediacity: scrapeMediaCity,
	forumscene: scrapeForumScene,
	usfverftet: scrapeUSFVerftet,
	dns: scrapeDNS,
	olebull: scrapeOleBull,
	grieghallen: scrapeGrieghallen,
	kode: scrapeKODE,
	litthusbergen: scrapeLitthus,
	bergenbibliotek: scrapeBergenBibliotek,
	floyen: scrapeFloyen,
	bitteater: scrapeBITTeater,
	harmonien: scrapeHarmonien,
	oseana: scrapeOseana,
	carteblanche: scrapeCarteBlanche,
	festspillene: scrapeFestspillene,
	bergenfest: scrapeBergenfest,
	bjorgvinblues: scrapeBjorgvinBlues,
	bek: scrapeBEK,
	beyondthegates: scrapeBeyondTheGates,
	brann: scrapeBrann,
	kulturhusetibergen: scrapeKulturhusetIBergen,
	vvv: scrapeVVV,
	bymuseet: scrapeBymuseet,
	museumvest: scrapeMuseumVest,
	akvariet: scrapeAkvariet,
	kvarteret: scrapeKvarteret,
	fyllingsdalenteater: scrapeFyllingsdalenTeater,
	ggbergen: scrapeGGBergen,
	oconnors: scrapeOConnors,
	// --- Aggregator last (fills gaps, skipped if deadline reached) ---
	visitbergen: scrapeVisitBergen,
};

async function pingIndexNow(since: number): Promise<number> {
	const key = process.env.INDEXNOW_KEY;
	if (!key) return 0;

	try {
		const sinceIso = new Date(since).toISOString();
		const { data, error } = await supabase
			.from('events')
			.select('slug')
			.gte('created_at', sinceIso)
			.eq('status', 'approved');

		if (error || !data || data.length === 0) return 0;

		const urlList = data.map((e: { slug: string }) => `https://gaari.no/no/events/${e.slug}`);

		const res = await fetch('https://api.indexnow.org/indexnow', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
			body: JSON.stringify({
				host: 'gaari.no',
				key,
				keyLocation: `https://gaari.no/${key}.txt`,
				urlList
			})
		});

		console.log(`IndexNow: submitted ${urlList.length} URLs → HTTP ${res.status}`);
		return urlList.length;
	} catch (err: any) {
		console.warn(`IndexNow ping failed: ${err.message}`);
		return 0;
	}
}

async function main() {
	const startTime = Date.now();
	const args = process.argv.slice(2);
	const selected = args.length > 0 ? args : Object.keys(scrapers);

	console.log('=== Gåri Event Scraper ===');
	console.log(`${new Date().toISOString()}\n`);

	// Step 1: Remove expired events
	let expired = 0;
	try {
		console.log('--- Cleaning expired events ---');
		expired = await removeExpiredEvents();
		console.log(`Removed ${expired} expired events\n`);
	} catch (err: any) {
		console.error(`Failed to remove expired events: ${err.message}`);
		console.log('Continuing with scrapers...\n');
	}

	// Step 1b: Load opt-outs and remove existing events from opted-out domains
	let optOutRemoved = 0;
	try {
		console.log('--- Loading opt-outs ---');
		await loadOptOuts();

		// Reuse loaded domains (no duplicate query)
		const domains = getOptOutDomains();
		for (const domain of domains) {
			const escapedDomain = domain.replace(/%/g, '\\%').replace(/_/g, '\\_');
			const { data: matching } = await supabase
				.from('events')
				.select('id, source_url')
				.ilike('source_url', `%${escapedDomain}%`);
			if (matching && matching.length > 0) {
				const ids = matching.map(e => e.id);
				const { error } = await supabase.from('events').delete().in('id', ids);
				if (!error) optOutRemoved += ids.length;
			}
		}
		if (optOutRemoved > 0) console.log(`Removed ${optOutRemoved} events from opted-out domains`);
	} catch (err: any) {
		console.error(`Failed to process opt-outs: ${err.message}`);
		console.log('Continuing with scrapers...\n');
	}
	console.log();

	// Step 2: Run scrapers
	console.log(`--- Running scrapers: ${selected.join(', ')} ---\n`);
	const results: Record<string, { found: number; inserted: number }> = {};

	for (const name of selected) {
		// Check deadline before starting each scraper
		if (Date.now() - startTime > PIPELINE_DEADLINE_MS) {
			console.warn(`\nPipeline deadline reached (${Math.round(PIPELINE_DEADLINE_MS / 60000)}min) — skipping remaining scrapers`);
			break;
		}

		const scraper = scrapers[name];
		if (!scraper) {
			console.error(`Unknown scraper: ${name}`);
			console.error(`Available: ${Object.keys(scrapers).join(', ')}`);
			continue;
		}

		try {
			results[name] = await scraper();
		} catch (err: any) {
			console.error(`\n[${name}] Failed: ${err.message}`);
			results[name] = { found: 0, inserted: 0 };
		}
	}

	// Step 3: Deduplicate across sources
	let dupsRemoved = 0;
	try {
		console.log('\n--- Deduplicating ---');
		dupsRemoved = await deduplicate();
		console.log(`Removed ${dupsRemoved} duplicate events\n`);
	} catch (err: any) {
		console.error(`Deduplication failed: ${err.message}\n`);
	}

	// Step 4: IndexNow ping for newly inserted events
	let indexNowSubmitted = 0;
	const insertedCount = Object.values(results).reduce((sum, r) => sum + r.inserted, 0);
	if (insertedCount > 0) {
		console.log('--- Pinging IndexNow ---');
		indexNowSubmitted = await pingIndexNow(startTime);
	}

	// Step 4b: Ping Google to re-crawl the sitemap
	try {
		const res = await fetch('https://www.google.com/ping?sitemap=https://gaari.no/sitemap.xml');
		console.log(`Google sitemap ping: HTTP ${res.status}`);
	} catch (err: any) {
		console.warn(`Google sitemap ping failed: ${err.message}`);
	}

	// Summary
	console.log('=== Summary ===');
	for (const [name, result] of Object.entries(results)) {
		console.log(`  ${name}: found ${result.found}, inserted ${result.inserted} new`);
	}

	const totalFound = Object.values(results).reduce((sum, r) => sum + r.found, 0);
	const totalInserted = Object.values(results).reduce((sum, r) => sum + r.inserted, 0);
	console.log(`\nTotal new events: ${totalInserted}`);
	console.log(`Expired removed: ${expired}`);
	console.log(`Duplicates removed: ${dupsRemoved}`);
	console.log(`Pipeline time: ${Math.round((Date.now() - startTime) / 1000)}s`);

	// Structured JSON summary for GitHub Actions
	const failedScrapers = Object.entries(results)
		.filter(([, r]) => r.found === 0 && r.inserted === 0)
		.map(([name]) => name);
	const durationSeconds = Math.round((Date.now() - startTime) / 1000);

	const summary = {
		scrapersRun: Object.keys(results).length,
		totalFound,
		totalInserted,
		failedScrapers,
		failedCount: failedScrapers.length,
		expiredRemoved: expired,
		optOutRemoved,
		duplicatesRemoved: dupsRemoved,
		indexNowSubmitted,
		durationSeconds
	};

	console.log('\n' + JSON.stringify(summary));

	const summaryFile = process.env.SUMMARY_FILE;
	if (summaryFile) {
		writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
		console.log(`Summary written to ${summaryFile}`);
	}

	// Health check: if nothing was inserted and many scrapers failed, something is very wrong
	if (totalInserted === 0 && failedScrapers.length > 5) {
		console.error('\nCRITICAL: No events inserted and multiple scrapers failed');
		process.exit(1);
	}
}

main().catch(console.error);
