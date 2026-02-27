import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'fyllingsdalenteater';
const BASE_URL = 'https://fyllingsdalenteater.no';
const VENUE = 'Fyllingsdalen Teater';
const ADDRESS = 'Folke Bernadottes vei 21, 5147 Fyllingsdalen';
const BYDEL = 'Fyllingsdalen';

function bergenOffset(month: number): string {
	return (month >= 3 && month <= 9) ? '+02:00' : '+01:00';
}

/**
 * Discover show page URLs from the homepage navigation.
 * Show links are under the "Forestillinger" menu.
 */
async function discoverShowPages(): Promise<string[]> {
	const html = await fetchHTML(BASE_URL);
	if (!html) return [];

	const $ = cheerio.load(html);
	const showLinks: string[] = [];

	// Find links that are under the Forestillinger nav section
	// These are internal pages (not teaterskolen, informasjon, etc.)
	$('a[href^="https://fyllingsdalenteater.no/"]').each((_, el) => {
		const href = $(el).attr('href');
		if (!href) return;

		const path = href.replace(BASE_URL, '').replace(/\/$/, '');
		// Skip non-show pages
		const skip = [
			'', '/teaterskolen', '/kontakt-oss', '/finn-fram', '/informasjon',
			'/spleis', '/historie', '/opplev-magien', '/gavekort', '/event',
		];
		if (skip.includes(path)) return;
		if (path.includes('teaterskole') || path.includes('cirkus') || path.includes('plattform')) return;
		if (path.includes('pamelding') || path.includes('merch') || path.includes('medvirkende')) return;
		if (path.includes('wp-') || path.includes('feed') || path.includes('xmlrpc')) return;
		if (path.includes('4285') || path.includes('ane-prisen') || path.includes('nytt-teaterhus')) return;

		showLinks.push(href.replace(/\/$/, '') + '/');
	});

	return [...new Set(showLinks)];
}

/**
 * Parse a show page for performances using the EasyTicket <select> dropdown.
 * Each <option> has value=ticketURL, data-expiry=ISO date, text=Norwegian date + status.
 */
async function scrapeShowPage(url: string): Promise<{ found: number; inserted: number }> {
	const html = await fetchHTML(url);
	if (!html) return { found: 0, inserted: 0 };

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Get show title from <title> or <h1>
	const pageTitle = $('title').text().split('|')[0].trim()
		|| $('h1').first().text().trim();
	if (!pageTitle) return { found: 0, inserted: 0 };

	// Look for the EasyTicket select dropdown
	const options = $('select[name="menu"] option, select#eventMenu option').toArray();

	if (options.length <= 1) {
		// No ticket dropdown — show might not be on sale yet
		console.log(`  [${SOURCE}] ${pageTitle}: no ticket dropdown yet, skipping`);
		return { found: 0, inserted: 0 };
	}

	// Get image from page
	const imageUrl = $('meta[property="og:image"]').attr('content') || undefined;

	for (const opt of options) {
		const $opt = $(opt);
		const ticketUrl = $opt.attr('value');
		const text = $opt.text().trim();

		// Skip placeholder option
		if (!ticketUrl || ticketUrl === '' || text === 'Velg dag og forestilling') continue;

		// Skip sold out
		if (text.includes('UTSOLGT')) continue;

		// Parse date from data-expiry or from text
		const expiry = $opt.attr('data-expiry');
		let startDate: Date | null = null;

		if (expiry) {
			// data-expiry format: "2026-02-28T15:00" or "2026-02-28T15:30"
			const offset = bergenOffset(parseInt(expiry.slice(5, 7)) - 1);
			// Use the time from the text (kl. HH:MM) since data-expiry sometimes has +30min offset
			const timeMatch = text.match(/kl\.?\s*(\d{1,2}):(\d{2})/);
			if (timeMatch) {
				const dateStr = expiry.slice(0, 10);
				startDate = new Date(`${dateStr}T${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:00${offset}`);
			} else {
				startDate = new Date(`${expiry}:00${offset}`);
			}
		}

		if (!startDate || isNaN(startDate.getTime())) continue;

		// Skip past events
		if (startDate.getTime() < Date.now() - 86400000) continue;

		found++;

		const dateStr = startDate.toISOString().slice(0, 10);
		const timeStr = startDate.toISOString().slice(11, 16);
		const sourceUrl = ticketUrl || `${url}#${dateStr}-${timeStr}`;

		if (await eventExists(sourceUrl)) continue;

		const showTitle = `${pageTitle}`;
		const aiDesc = await generateDescription({
			title: showTitle,
			venue: VENUE,
			category: 'theatre',
			date: startDate,
			price: '',
		});

		// Determine venue — some shows play at other venues (e.g. "Hallen USF")
		let venueName = VENUE;
		let address = ADDRESS;
		let bydel = BYDEL;
		const bodyText = $.text().toLowerCase();
		if (bodyText.includes('hallen usf') || bodyText.includes('usf verftet') || bodyText.includes('usf på verftet')) {
			venueName = 'Hallen USF';
			address = 'Georgernes Verft 12, Bergen';
			bydel = 'Bergenhus';
		}

		const success = await insertEvent({
			slug: makeSlug(showTitle, dateStr),
			title_no: showTitle,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category: 'theatre',
			date_start: startDate.toISOString(),
			venue_name: venueName,
			address,
			bydel,
			price: '',
			ticket_url: ticketUrl || url,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: 'family',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${showTitle} (${dateStr} ${timeStr})`);
			inserted++;
		}
	}

	return { found, inserted };
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Starting scrape of Fyllingsdalen Teater...`);

	const showPages = await discoverShowPages();
	console.log(`[${SOURCE}] Found ${showPages.length} show pages`);

	let totalFound = 0;
	let totalInserted = 0;

	for (const url of showPages) {
		console.log(`[${SOURCE}] Scraping: ${url}`);
		const { found, inserted } = await scrapeShowPage(url);
		totalFound += found;
		totalInserted += inserted;
		await delay(1500);
	}

	return { found: totalFound, inserted: totalInserted };
}
