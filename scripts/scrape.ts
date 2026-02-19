import { scrape as scrapeBergenLive } from './scrapers/bergenlive.js';
import { scrape as scrapeVisitBergen } from './scrapers/visitbergen.js';
import { scrape as scrapeBergenKommune } from './scrapers/bergenkommune.js';
import { scrape as scrapeKulturIKveld } from './scrapers/kulturikveld.js';
import { scrape as scrapeBarnasNorge } from './scrapers/barnasnorge.js';

const scrapers: Record<string, () => Promise<{ found: number; inserted: number }>> = {
	bergenlive: scrapeBergenLive,
	visitbergen: scrapeVisitBergen,
	bergenkommune: scrapeBergenKommune,
	kulturikveld: scrapeKulturIKveld,
	barnasnorge: scrapeBarnasNorge,
};

async function main() {
	const args = process.argv.slice(2);
	const selected = args.length > 0 ? args : Object.keys(scrapers);

	console.log('=== Gåri Event Scraper ===');
	console.log(`Running: ${selected.join(', ')}\n`);

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

	// Summary
	console.log('\n=== Summary ===');
	for (const [name, result] of Object.entries(results)) {
		console.log(`  ${name}: found ${result.found}, inserted ${result.inserted} new`);
	}

	const totalInserted = Object.values(results).reduce((sum, r) => sum + r.inserted, 0);
	console.log(`\nTotal new events: ${totalInserted}`);
}

main().catch(console.error);
