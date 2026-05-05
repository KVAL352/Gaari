import * as cheerio from 'cheerio';
import { isFamilyTitle } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, updateEventImage, fetchHTML, delay, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'harmonien';
const BASE_URL = 'https://harmonien.no/program/';
const DOMAIN = 'https://harmonien.no';

const NORWEGIAN_MONTHS: Record<string, number> = {
	januar: 1, februar: 2, mars: 3, april: 4, mai: 5, juni: 6,
	juli: 7, august: 8, september: 9, oktober: 10, november: 11, desember: 12,
	jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, des: 12,
};

function guessCategory(title: string): string {
	const lower = title.toLowerCase();
	if (isFamilyTitle(lower) || lower.includes('kids')) return 'family';
	if (lower.includes('opera') || lower.includes('traviata') || lower.includes('carmen')) return 'theatre';
	if (lower.includes('jazz') || lower.includes('pop') || lower.includes('rock')) return 'music';
	return 'music';
}

interface ListingCard {
	title: string;
	detailUrl: string;
	imageUrl?: string;
	ticketUrl?: string;
}

interface Performance {
	dateStr: string; // YYYY-MM-DDTHH:MM:SS
}

function parseListing(html: string): ListingCard[] {
	const $ = cheerio.load(html);
	const cards: ListingCard[] = [];

	$('article.concert-card').each((_, el) => {
		const card = $(el);
		const title = card.find('h2.title').first().text().trim();
		const detailHref = card.find('a.button-secondary--gold[href^="/program/"]').attr('href');
		if (!title || !detailHref) return;

		const detailUrl = `${DOMAIN}${detailHref}`;

		const ticketHref = card.find('a.button-primary--gold[href]').attr('href') || undefined;
		const ticketUrl = ticketHref?.startsWith('http') ? ticketHref : (ticketHref ? `${DOMAIN}${ticketHref}` : undefined);

		// Image: picture > source[srcset]. URLs may contain commas (e.g. ?rxy=0.5,0.5),
		// so split on ", " (comma + whitespace) which is the actual srcset candidate separator.
		const srcset = card.find('picture source').first().attr('srcset');
		let imageUrl: string | undefined;
		if (srcset) {
			const firstCandidate = srcset.split(/,\s+/)[0];
			const firstUrl = firstCandidate.trim().split(/\s+/)[0];
			imageUrl = firstUrl.startsWith('http') ? firstUrl : `${DOMAIN}${firstUrl}`;
		}

		cards.push({ title, detailUrl, imageUrl, ticketUrl });
	});

	return cards;
}

/**
 * Parse all performance datetimes from a detail page.
 * Detail URL pattern: /program/YYYY/MM/<slug>/ — gives us year/month context.
 * Page lists each performance like "onsdag 27. mai, 18:45" or "torsdag 28. mai, 19:30".
 * Single-date concerts may only show "kl. 19:00" in the header — for those, derive date from URL + listing context.
 */
function parsePerformances(html: string, detailUrl: string): Performance[] {
	const urlMatch = detailUrl.match(/\/program\/(\d{4})\/(\d{1,2})\//);
	if (!urlMatch) return [];
	const urlYear = parseInt(urlMatch[1], 10);
	const urlMonth = parseInt(urlMatch[2], 10);

	const $ = cheerio.load(html);
	const text = $.text();

	// Match patterns like: "onsdag 27. mai, 18:45" or "torsdag 28. mai, 19:30"
	const fullPattern = /(?:mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)\s+(\d{1,2})\.\s+([a-zæøå]+)(?:\s+\d{4})?,?\s+(\d{1,2}):(\d{2})/gi;
	const performances: Performance[] = [];
	const seen = new Set<string>();
	let m: RegExpExecArray | null;
	while ((m = fullPattern.exec(text)) !== null) {
		const day = parseInt(m[1], 10);
		const month = NORWEGIAN_MONTHS[m[2].toLowerCase()];
		const hour = parseInt(m[3], 10);
		const min = parseInt(m[4], 10);
		if (!month) continue;
		// Year inference: month from URL is the listing month. If parsed month < urlMonth (e.g. listing Dec, performance Jan)
		// it's next year. Otherwise same year as URL.
		const year = month < urlMonth ? urlYear + 1 : urlYear;
		const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
		if (seen.has(dateStr)) continue;
		seen.add(dateStr);
		performances.push({ dateStr });
	}

	if (performances.length > 0) return performances;

	// Fallback: header has only "kl. HH:MM" (no day-name listing). Derive day from URL slug.
	const slugMatch = detailUrl.match(/\/program\/\d{4}\/\d{1,2}\/([^/]+)\//);
	const slug = slugMatch?.[1] || '';
	// Some slugs encode day (e.g. "festspillenes-aapningskonsert-27") — try last 1-2 digits
	const slugDayMatch = slug.match(/-(\d{1,2})$/);
	const headerTime = $('.event__header__subtitle').first().text().match(/kl\.\s+(\d{1,2}):(\d{2})/);

	if (headerTime && slugDayMatch) {
		const day = parseInt(slugDayMatch[1], 10);
		const hour = parseInt(headerTime[1], 10);
		const min = parseInt(headerTime[2], 10);
		const dateStr = `${urlYear}-${String(urlMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
		performances.push({ dateStr });
	}

	return performances;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Filharmoniske events...`);

	const html = await fetchHTML(BASE_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch program page`);
		return { found: 0, inserted: 0 };
	}

	const cards = parseListing(html);
	console.log(`[${SOURCE}] Found ${cards.length} concert cards on listing`);

	const now = new Date();
	const cutoff = now.getTime() - 86400000;

	let found = 0;
	let inserted = 0;

	for (const card of cards) {
		await delay(1000);

		const detailHtml = await fetchHTML(card.detailUrl);
		if (!detailHtml) {
			console.warn(`[${SOURCE}]   Failed to fetch detail for ${card.title}`);
			continue;
		}

		const performances = parsePerformances(detailHtml, card.detailUrl);
		if (performances.length === 0) {
			console.warn(`[${SOURCE}]   No dates parsed for ${card.title} (${card.detailUrl})`);
			continue;
		}

		// Filter to future
		performances.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
		const future = performances.filter(p => {
			const d = new Date(`${p.dateStr}${bergenOffset(p.dateStr.slice(0, 10))}`);
			return d.getTime() > cutoff;
		});
		if (future.length === 0) continue;

		found++;
		const sourceUrl = card.detailUrl;

		const first = future[0];
		const last = future[future.length - 1];

		const firstOffset = bergenOffset(first.dateStr.slice(0, 10));
		const startDate = new Date(`${first.dateStr}${firstOffset}`);
		if (isNaN(startDate.getTime())) continue;

		let dateEnd: string | undefined;
		if (future.length > 1 && last.dateStr.slice(0, 10) !== first.dateStr.slice(0, 10)) {
			const lastOffset = bergenOffset(last.dateStr.slice(0, 10));
			const endDate = new Date(`${last.dateStr}${lastOffset}`);
			if (!isNaN(endDate.getTime())) dateEnd = endDate.toISOString();
		}

		// Image fallback to og:image on detail page
		let imageUrl = card.imageUrl;
		if (!imageUrl) {
			const $d = cheerio.load(detailHtml);
			imageUrl = $d('meta[property="og:image"]').attr('content') || undefined;
		}

		if (await eventExists(sourceUrl)) {
			if (imageUrl) await updateEventImage(sourceUrl, imageUrl);
			continue;
		}

		const category = guessCategory(card.title);
		const aiDesc = await generateDescription({
			title: card.title,
			venue: 'Grieghallen',
			category,
			date: startDate,
			price: '',
		});

		const success = await insertEvent({
			slug: makeSlug(card.title, first.dateStr.slice(0, 10)),
			title_no: card.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: startDate.toISOString(),
			date_end: dateEnd,
			venue_name: 'Grieghallen',
			address: 'Nordahl Bruns gate 9, Bergen',
			bydel: 'Sentrum',
			price: '',
			ticket_url: card.ticketUrl || sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: category === 'family' ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			const perf = future.length > 1 ? ` (${future.length} performances)` : '';
			console.log(`  + ${card.title}${perf} (${category})`);
			inserted++;
		}
	}

	console.log(`[${SOURCE}] Done: found ${found}, inserted ${inserted}`);
	return { found, inserted };
}
