import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bergenbibliotek';
const BASE_URL = 'https://bergenbibliotek.no/arrangement';

// Skip events not accessible to the general public
const SKIP_KEYWORDS = [
	'sfo', 'sfo-besøk', 'barnehage', 'barnehagebarn', 'barnehager',
	'skoleklasse', 'skolebesøk', 'klassebesøk', 'kun for'
];

const NORWEGIAN_MONTHS: Record<string, number> = {
	'januar': 1, 'februar': 2, 'mars': 3, 'april': 4, 'mai': 5, 'juni': 6,
	'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12,
};

/** Parse "Lørdag 21. februar 11:00" from flat text → { date, time } */
function parseDateFromText(text: string): { date: string; time: string } | null {
	const m = text.match(/(\d{1,2})\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s+(\d{2}:\d{2})/i);
	if (!m) return null;

	const day = parseInt(m[1]);
	const month = NORWEGIAN_MONTHS[m[2].toLowerCase()];
	if (!month) return null;

	const now = new Date();
	let year = now.getFullYear();
	const candidate = new Date(year, month - 1, day);
	if (candidate.getTime() < now.getTime() - 60 * 86400000) year++;

	const dd = String(day).padStart(2, '0');
	const mm = String(month).padStart(2, '0');
	return { date: `${year}-${mm}-${dd}`, time: m[3] };
}

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

function guessCategory(title: string, tag: string): string {
	const text = `${title} ${tag}`.toLowerCase();
	if (text.includes('konsert') || text.includes('musikk') || text.includes('jazz')) return 'music';
	if (text.includes('barn') || text.includes('familielørdag') || text.includes('barnekino') || text.includes('familie')) return 'family';
	if (text.includes('teater') || text.includes('forestilling') || text.includes('dukketeater')) return 'theatre';
	if (text.includes('film') || text.includes('kino')) return 'culture';
	if (text.includes('kurs') || text.includes('workshop') || text.includes('verksted')) return 'workshop';
	if (text.includes('quiz')) return 'nightlife';
	if (text.includes('spill') || text.includes('brettspill') || text.includes('gaming')) return 'culture';
	if (text.includes('festival')) return 'festival';
	return 'culture';
}

function libraryBydel(location: string): string {
	const lower = location.toLowerCase();
	if (lower.includes('hovedbiblioteket') || lower.includes('strømgaten')) return 'Sentrum';
	if (lower.includes('åsane')) return 'Åsane';
	if (lower.includes('fana')) return 'Fana';
	if (lower.includes('fyllingsdalen')) return 'Fyllingsdalen';
	if (lower.includes('arna') || lower.includes('ytre arna')) return 'Arna';
	if (lower.includes('laksevåg') || lower.includes('loddefjord')) return 'Laksevåg';
	if (lower.includes('landås')) return 'Bergenhus';
	if (lower.includes('nesttun')) return 'Fana';
	return 'Sentrum';
}

/** Fetch detail page and extract price from <div class="exclude"> (e.g. "GRATIS", "150 kr") */
async function fetchPrice(url: string): Promise<string> {
	const html = await fetchHTML(url);
	if (!html) return 'Gratis'; // Default for library events
	const $ = cheerio.load(html);
	const priceText = $('div.exclude').first().text().trim();
	if (!priceText) return 'Gratis';
	if (/gratis|free/i.test(priceText)) return 'Gratis';
	return priceText;
}

/** Extract image URL from the listing link's background-image style */
function extractListingImage($el: cheerio.Cheerio<cheerio.Element>): string | undefined {
	const style = $el.attr('style') || '';
	const m = style.match(/background-image:\s*url\(([^)]+)\)/);
	if (!m) return undefined;
	const url = m[1].trim().replace(/^['"]|['"]$/g, '');
	if (!url || !url.includes('@@images/')) return undefined;
	return url.startsWith('http') ? url : `https://bergenbibliotek.no${url}`;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Bibliotek events...`);

	const html = await fetchHTML(BASE_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch listing page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	// Event links have class "highlightlink"
	const eventLinks = $('a.highlightlink').toArray();
	console.log(`[${SOURCE}] ${eventLinks.length} event links found`);

	const seen = new Set<string>();

	for (const el of eventLinks) {
		const $el = $(el);
		const href = $el.attr('href') || '';
		if (seen.has(href)) continue;
		seen.add(href);

		// Skip filter/category pages — these are branch listings, not events
		if (href.includes('/arrangement/filter/')) {
			continue;
		}

		// Title from h2
		const title = $el.find('h2').first().text().trim();
		if (!title) continue;

		// Flatten text for date parsing
		const flatText = $el.text().replace(/\s+/g, ' ').trim();
		const parsed = parseDateFromText(flatText);
		if (!parsed) continue;

		// Skip past events
		const eventDate = new Date(`${parsed.date}T${parsed.time}:00${bergenOffset(parsed.date)}`);
		if (isNaN(eventDate.getTime()) || eventDate.getTime() < Date.now() - 86400000) continue;

		// Location from span (usually index 2 — after date spans)
		const spans = $el.find('span').toArray();
		let location = '';
		for (const span of spans) {
			const txt = $(span).text().trim();
			if (txt && /bibliotek|auditoriet|salen|hovedbibliotek/i.test(txt)) {
				location = txt;
				break;
			}
		}
		if (!location) location = 'Bergen Bibliotek';

		// Category tag from parent's first span child (sibling before the link)
		const tag = $el.parent().children('span').first().text().trim();

		const sourceUrl = href.startsWith('http') ? href : `https://bergenbibliotek.no${href}`;

		// Skip non-public events (SFO, barnehage, school visits, etc.)
		const titleLower = title.toLowerCase();
		const urlLower = sourceUrl.toLowerCase();
		if (SKIP_KEYWORDS.some(kw => titleLower.includes(kw) || urlLower.includes(kw))) {
			console.log(`  [skip] ${title} (non-public event)`);
			continue;
		}

		found++;

		if (await eventExists(sourceUrl)) continue;

		const category = guessCategory(title, tag);
		const bydel = libraryBydel(location);
		const dateStart = eventDate.toISOString();

		// Extract image from listing link's background-image style
		const imageUrl = extractListingImage($el);

		// Fetch detail page for actual price (most are "GRATIS", but some may cost)
		await delay(1000);
		const price = await fetchPrice(sourceUrl);

		const aiDesc = await generateDescription({ title, venue: location, category, date: dateStart, price });

		const success = await insertEvent({
			slug: makeSlug(title, parsed.date),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			date_end: undefined,
			venue_name: location,
			address: '',
			bydel,
			price,
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: category === 'family' ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} @ ${location} (${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
