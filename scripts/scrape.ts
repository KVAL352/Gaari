import { scrape as scrapeBergenLive } from './scrapers/bergenlive.js';
import { scrape as scrapeVisitBergen } from './scrapers/visitbergen.js';
import { scrape as scrapeBergenKommune } from './scrapers/bergenkommune.js';
import { scrape as scrapeKulturIKveld } from './scrapers/kulturikveld.js';
import { scrape as scrapeBarnasNorge } from './scrapers/barnasnorge.js';
import { scrape as scrapeStudentBergen } from './scrapers/studentbergen.js';
import { scrape as scrapeDNT } from './scrapers/dnt.js';
import { scrape as scrapeEventbrite } from './scrapers/eventbrite.js';
import { scrape as scrapeTicketCo } from './scrapers/ticketco.js';
import { scrape as scrapeHoopla } from './scrapers/hoopla.js';
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
import { removeExpiredEvents } from './lib/utils.js';
import { deduplicate } from './lib/dedup.js';

const scrapers: Record<string, () => Promise<{ found: number; inserted: number }>> = {
	bergenlive: scrapeBergenLive,
	visitbergen: scrapeVisitBergen,
	bergenkommune: scrapeBergenKommune,
	kulturikveld: scrapeKulturIKveld,
	barnasnorge: scrapeBarnasNorge,
	studentbergen: scrapeStudentBergen,
	dnt: scrapeDNT,
	eventbrite: scrapeEventbrite,
	ticketco: scrapeTicketCo,
	hoopla: scrapeHoopla,
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
};

async function main() {
	const args = process.argv.slice(2);
	const selected = args.length > 0 ? args : Object.keys(scrapers);

	console.log('=== Gåri Event Scraper ===');
	console.log(`${new Date().toISOString()}\n`);

	// Step 1: Remove expired events
	console.log('--- Cleaning expired events ---');
	const expired = await removeExpiredEvents();
	console.log(`Removed ${expired} expired events\n`);

	// Step 2: Run scrapers
	console.log(`--- Running scrapers: ${selected.join(', ')} ---\n`);
	const results: Record<string, { found: number; inserted: number }> = {};

	for (const name of selected) {
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
	console.log('\n--- Deduplicating ---');
	const dupsRemoved = await deduplicate();
	console.log(`Removed ${dupsRemoved} duplicate events\n`);

	// Summary
	console.log('=== Summary ===');
	for (const [name, result] of Object.entries(results)) {
		console.log(`  ${name}: found ${result.found}, inserted ${result.inserted} new`);
	}

	const totalInserted = Object.values(results).reduce((sum, r) => sum + r.inserted, 0);
	console.log(`\nTotal new events: ${totalInserted}`);
	console.log(`Expired removed: ${expired}`);
	console.log(`Duplicates removed: ${dupsRemoved}`);
}

main().catch(console.error);
