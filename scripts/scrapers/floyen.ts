import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, makeDescription } from '../lib/utils.js';

const SOURCE = 'floyen';
const BASE_URL = 'https://www.floyen.no/hva-skjer-floyen';

const NORWEGIAN_MONTHS: Record<string, number> = {
	'januar': 1, 'februar': 2, 'mars': 3, 'april': 4, 'mai': 5, 'juni': 6,
	'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12,
};

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

/** Parse "februar 20" → "2026-02-20" */
function parseMonthDay(month: string, dayStr: string): string | null {
	const monthNum = NORWEGIAN_MONTHS[month.toLowerCase()];
	if (!monthNum) return null;
	const day = parseInt(dayStr);
	if (isNaN(day) || day < 1 || day > 31) return null;

	const now = new Date();
	let year = now.getFullYear();
	const candidate = new Date(year, monthNum - 1, day);
	if (candidate.getTime() < now.getTime() - 60 * 86400000) year++;

	return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function guessCategory(title: string, description: string): string {
	const text = `${title} ${description}`.toLowerCase();
	if (text.includes('konsert') || text.includes('musikk')) return 'music';
	if (text.includes('run') || text.includes('løp') || text.includes('fløibanen opp')) return 'sports';
	if (text.includes('sjømat') || text.includes('tea') || text.includes('kveldsmat') || text.includes('restaurant')) return 'food';
	if (text.includes('festival')) return 'festival';
	if (text.includes('barn') || text.includes('camp') || text.includes('naturskole') || text.includes('påskesprell')) return 'family';
	if (text.includes('kurs') || text.includes('workshop')) return 'workshop';
	if (text.includes('bad')) return 'sports';
	if (text.includes('tur') || text.includes('ekspedisjon') || text.includes('vandring')) return 'tours';
	return 'culture';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Fløyen events...`);

	const html = await fetchHTML(BASE_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch listing page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Find event links to detail pages
	const seen = new Set<string>();
	const detailUrls: string[] = [];

	$('a[href*="/hva-skjer-floyen/"]').each((_, el) => {
		const href = $(el).attr('href');
		if (!href || href === '/hva-skjer-floyen' || href === '/hva-skjer-floyen/' || seen.has(href)) return;
		seen.add(href);
		const fullUrl = href.startsWith('http') ? href : `https://www.floyen.no${href}`;
		detailUrls.push(fullUrl);
	});

	console.log(`[${SOURCE}] ${detailUrls.length} event detail pages found`);

	for (let i = 0; i < detailUrls.length; i++) {
		const sourceUrl = detailUrls[i];
		found++;

		if (await eventExists(sourceUrl)) continue;

		const detailHtml = await fetchHTML(sourceUrl);
		if (!detailHtml) {
			console.log(`  [${SOURCE}] Failed to fetch: ${sourceUrl}`);
			continue;
		}

		const d$ = cheerio.load(detailHtml);

		const title = d$('h1').first().text().trim();
		if (!title) { console.log(`  [${SOURCE}] No title for ${sourceUrl}`); continue; }

		// Extract dates from consecutive <strong> tags: "februar" "20" pattern
		const strongTexts = d$('strong').map((_, el) => d$(el).text().trim().toLowerCase()).toArray();
		let dateStart: string | null = null;
		let dateEnd: string | null = null;

		for (let j = 0; j < strongTexts.length - 1; j++) {
			if (NORWEGIAN_MONTHS[strongTexts[j]] && /^\d{1,2}$/.test(strongTexts[j + 1])) {
				const parsed = parseMonthDay(strongTexts[j], strongTexts[j + 1]);
				if (parsed) {
					if (!dateStart) dateStart = parsed;
					else if (!dateEnd && parsed !== dateStart) dateEnd = parsed;
				}
			}
		}

		if (!dateStart) {
			// Fallback: try "DD. monthname" in h1 or body
			const bodyText = d$('body').text();
			for (const [name, num] of Object.entries(NORWEGIAN_MONTHS)) {
				const re = new RegExp(`(\\d{1,2})\\.?\\s*${name}`, 'i');
				const m = bodyText.match(re);
				if (m) {
					dateStart = parseMonthDay(name, m[1]);
					if (dateStart) break;
				}
			}
		}

		if (!dateStart) { console.log(`  [${SOURCE}] No date for "${title}"`); continue; }

		// Skip past events
		const startDate = new Date(dateStart + 'T12:00:00+01:00');
		if (startDate.getTime() < Date.now() - 86400000) {
			console.log(`  [${SOURCE}] Skipping past event: ${dateStart}`);
			continue;
		}

		// Extract time — look for "kl" prefix or HH:MM in paragraph text (skip nav/footer)
		let time = '12:00';
		d$('p, span, div').each((_, el) => {
			const text = d$(el).text();
			const m = text.match(/kl\.?\s*(\d{2}):(\d{2})/i);
			if (m && time === '12:00') {
				const h = parseInt(m[1]);
				if (h >= 8 && h <= 23) time = `${m[1]}:${m[2]}`;
			}
		});

		// Image from CDN
		const img = d$('img[src*="nf.cdn.netflexapp"]').first();
		const imageUrl = img.attr('src') || undefined;

		// Sold out check — only in the title, not the whole page
		// (sidebar/nav may mention sold-out events from other pages)
		if (title.toLowerCase().includes('utsolgt')) continue;

		const offset = bergenOffset(dateStart);
		const dateStartIso = new Date(`${dateStart}T${time}:00${offset}`).toISOString();
		const dateEndIso = dateEnd
			? new Date(`${dateEnd}T22:00:00${bergenOffset(dateEnd)}`).toISOString()
			: undefined;

		const category = guessCategory(title, '');

		const success = await insertEvent({
			slug: makeSlug(title, dateStart),
			title_no: title,
			description_no: makeDescription(title, 'Fløyen', category),
			category,
			date_start: dateStartIso,
			date_end: dateEndIso,
			venue_name: 'Fløyen',
			address: 'Fløyen, Bergen',
			bydel: 'Sentrum',
			price: '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: category === 'family' ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${category})`);
			inserted++;
		}

		if (i < detailUrls.length - 1) await delay(3000);
	}

	return { found, inserted };
}
