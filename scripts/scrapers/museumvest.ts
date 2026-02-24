import * as cheerio from 'cheerio';
import { mapCategory } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, detectFreeFromText } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'museumvest';

// Bergen-relevant Museum Vest museums
const MUSEUMS = [
	{ name: 'Norges Fiskerimuseum', subdomain: 'fiskerimuseum', bydel: 'Bergenhus' },
	{ name: 'Bergens Sjøfartsmuseum', subdomain: 'sjofartsmuseum', bydel: 'Sentrum' },
	{ name: 'Det Hanseatiske Museum', subdomain: 'hanseatiskemuseum', bydel: 'Bergenhus' },
];

// Permanent content paths to skip — these are not time-limited events
const SKIP_PATTERNS = [
	/\/(om-museet|historie|kunnskap|samlingene|utstillinger|kontakt|apningstider)\/?$/,
	/\/(pris-og-billett|museumsbutikk|museumskafe|skoler|leksehjelp|ressurser-til-lans)\/?$/,
	/\/(forside|besok-oss|praktisk-informasjon|tilgjengelighet|nyhetsbrev|personvern)\/?$/,
	/\/(hva-skjer|kalender|opplevelser|nyheter)\/?$/,
	/\/(en|nn)\//,  // English/Nynorsk versions
	/\/sitemap\.xml$/,
];

// Known permanent experience pages (not time-limited events)
const SKIP_SLUGS = [
	'bruksbater', 'dampskip', 'tank-og-linjefart', 'verdenskrigene',
	'kyst-og-fjordabater', 'seilskutetiden', 'skips-og-maskinbygging',
	'vikingetiden', 'sjobodene', 'silja-sild', 'storebla',
	'digitalt-innhold', 'fagartikler', 'filmer', 'publikasjoner',
	'green-kayak', 'fin-city',
];

// Norwegian abbreviated + full month names → month number (1-indexed)
const MONTHS: Record<string, number> = {
	'jan': 1, 'jan.': 1, 'januar': 1,
	'feb': 2, 'feb.': 2, 'februar': 2,
	'mar': 3, 'mar.': 3, 'mars': 3,
	'apr': 4, 'apr.': 4, 'april': 4,
	'mai': 5,
	'jun': 6, 'jun.': 6, 'juni': 6,
	'jul': 7, 'jul.': 7, 'juli': 7,
	'aug': 8, 'aug.': 8, 'august': 8,
	'sep': 9, 'sep.': 9, 'september': 9,
	'okt': 10, 'okt.': 10, 'oktober': 10,
	'nov': 11, 'nov.': 11, 'november': 11,
	'des': 12, 'des.': 12, 'desember': 12,
};

interface ParsedDate {
	dateStart: string;  // ISO string
	dateEnd?: string;   // ISO string (for multi-day events)
	time?: string;      // e.g. "10:00"
}

/**
 * Parse Norwegian dates from page text.
 * Handles: "25. feb. 2026", "19. Jun – 08. Aug 2026", "10.00 – 13.30"
 */
function parseDates(text: string): ParsedDate | null {
	// Match: "DD. mon[th] YYYY" with optional range "– DD. mon[th] YYYY"
	const datePattern = /(\d{1,2})\.\s*(jan\.?|feb\.?|mar\.?|mars|apr\.?|april|mai|jun\.?|juni|jul\.?|juli|aug\.?|august|sep\.?|september|okt\.?|oktober|nov\.?|november|des\.?|desember)\s*(\d{4})?/gi;

	const matches = [...text.matchAll(datePattern)];
	if (matches.length === 0) return null;

	const now = new Date();
	const currentYear = now.getFullYear();

	const first = matches[0];
	const day = parseInt(first[1]);
	const monthKey = first[2].toLowerCase();
	const month = MONTHS[monthKey];
	if (!month) return null;

	const year = first[3] ? parseInt(first[3]) : currentYear;

	// Bergen timezone offset
	const offset = (month >= 4 && month <= 10) ? '+02:00' : '+01:00';

	// Try to find time: "HH.MM" or "HH:MM"
	const timeMatch = text.match(/(\d{1,2})[.:](\d{2})\s*[–-]\s*(\d{1,2})[.:](\d{2})/);
	const time = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '10:00';

	const dd = String(day).padStart(2, '0');
	const mm = String(month).padStart(2, '0');

	try {
		const startDate = new Date(`${year}-${mm}-${dd}T${time}:00${offset}`);
		if (isNaN(startDate.getTime())) return null;
		const dateStart = startDate.toISOString();

		// Check for end date (range)
		let dateEnd: string | undefined;
		if (matches.length >= 2) {
			const last = matches[matches.length - 1];
			const endDay = parseInt(last[1]);
			const endMonthKey = last[2].toLowerCase();
			const endMonth = MONTHS[endMonthKey];
			const endYear = last[3] ? parseInt(last[3]) : year;
			if (endMonth) {
				const endDd = String(endDay).padStart(2, '0');
				const endMm = String(endMonth).padStart(2, '0');
				const endOffset = (endMonth >= 4 && endMonth <= 10) ? '+02:00' : '+01:00';
				const endDate = new Date(`${endYear}-${endMm}-${endDd}T17:00:00${endOffset}`);
				if (!isNaN(endDate.getTime())) dateEnd = endDate.toISOString();
			}
		}

		return { dateStart, dateEnd, time };
	} catch {
		return null;
	}
}

/**
 * Parse sitemap XML to extract URLs.
 */
function parseSitemap(xml: string): string[] {
	const urls: string[] = [];
	const locPattern = /<loc>(.*?)<\/loc>/g;
	let match;
	while ((match = locPattern.exec(xml)) !== null) {
		urls.push(match[1].trim());
	}
	return urls;
}

/**
 * Check if a URL should be skipped (permanent content, not events).
 */
function shouldSkip(url: string): boolean {
	if (SKIP_PATTERNS.some(p => p.test(url))) return true;

	// Check if the last path segment matches a known permanent slug
	const slug = url.split('/').filter(Boolean).pop() || '';
	if (SKIP_SLUGS.includes(slug)) return true;

	// Skip URLs that are just the museum root
	const path = new URL(url).pathname;
	if (path === '/' || path === '') return true;

	return false;
}

/**
 * Extract event data from a detail page.
 */
function extractEventData($: cheerio.CheerioAPI, url: string) {
	// Title: use h1 or h2
	const title = $('h1').first().text().trim() || $('h2').first().text().trim();
	if (!title) return null;

	// Get all page text for date parsing
	const bodyText = $('body').text().replace(/\s+/g, ' ');

	// Parse dates
	const dates = parseDates(bodyText);
	if (!dates) return null;

	// Check if event is in the future
	if (new Date(dates.dateStart) < new Date(Date.now() - 86400000)) return null;

	// Image: Museum Vest uses DigitaltMuseum image hosting
	let imageUrl: string | undefined;
	const dimuImg = $('img[src*="ems.dimu.org"]').first().attr('src');
	if (dimuImg) {
		// Normalize to 600x600 dimension
		imageUrl = dimuImg.replace(/\?dimension=\d+x\d+/, '?dimension=600x600');
		if (!imageUrl.includes('?dimension=')) imageUrl += '?dimension=600x600';
	}

	// Price detection
	let price = '';
	const priceMatch = bodyText.match(/(?:NOK|kr\.?)\s*(\d[\d\s,.]*)/i);
	if (priceMatch) {
		price = `${priceMatch[1].trim()} kr`;
	} else if (/gratis/i.test(title) || /gratis/i.test(bodyText.slice(0, 500))) {
		price = 'Gratis';
	}

	// Ticket/booking URL
	let ticketUrl = url;
	const bookingLink = $('a[href*="museumsbillett.no"]').first().attr('href');
	if (bookingLink) ticketUrl = bookingLink;

	return { title, dates, imageUrl, price, ticketUrl };
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Museum Vest events (sitemap-based)...`);

	let found = 0;
	let inserted = 0;

	for (const museum of MUSEUMS) {
		const sitemapUrl = `https://${museum.subdomain}.museumvest.no/sitemap.xml`;
		console.log(`[${SOURCE}] Fetching sitemap: ${museum.name}`);

		const xml = await fetchHTML(sitemapUrl);
		if (!xml) {
			console.warn(`[${SOURCE}] Failed to fetch sitemap for ${museum.name}`);
			continue;
		}

		const allUrls = parseSitemap(xml);
		const candidateUrls = allUrls.filter(u => !shouldSkip(u));
		console.log(`[${SOURCE}]   ${allUrls.length} URLs in sitemap, ${candidateUrls.length} candidates`);

		for (const url of candidateUrls) {
			// Normalize URL (sitemaps sometimes use protocol-relative)
			const fullUrl = url.startsWith('//') ? `https:${url}` : url;

			if (await eventExists(fullUrl)) continue;

			await delay(1500);

			const html = await fetchHTML(fullUrl);
			if (!html) continue;

			const $ = cheerio.load(html);
			const eventData = extractEventData($, fullUrl);
			if (!eventData) continue;

			found++;

			const { title, dates, imageUrl, price, ticketUrl } = eventData;
			const datePart = dates.dateStart.slice(0, 10);
			const category = mapCategory(title) || 'culture';

			const aiDesc = await generateDescription({
				title,
				venue: museum.name,
				category,
				date: dates.dateStart,
				price,
			});

			const success = await insertEvent({
				slug: makeSlug(title, datePart),
				title_no: title,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				category,
				date_start: dates.dateStart,
				date_end: dates.dateEnd,
				venue_name: museum.name,
				address: '',
				bydel: museum.bydel,
				price,
				ticket_url: ticketUrl,
				source: SOURCE,
				source_url: fullUrl,
				image_url: imageUrl,
				age_group: /barn|familie|junior/i.test(title) ? 'family' : 'all',
				language: 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${title} @ ${museum.name} (${datePart}) [${category}]`);
				inserted++;
			}
		}
	}

	return { found, inserted };
}
