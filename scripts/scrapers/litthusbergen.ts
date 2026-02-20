import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, makeDescription } from '../lib/utils.js';

const SOURCE = 'litthusbergen';
const BASE_URL = 'https://www.litthusbergen.no/program';
const PAGE_PARAM = '90422230_page';

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

/** Parse "Feb 20, 2026" → "2026-02-20" */
function parseEnglishDate(str: string): string | null {
	const d = new Date(str);
	if (isNaN(d.getTime())) return null;
	return d.toISOString().slice(0, 10);
}

function guessCategory(title: string, tags: string[]): string {
	const text = `${title} ${tags.join(' ')}`.toLowerCase();
	if (text.includes('konsert') || text.includes('musikk') || text.includes('concert')) return 'music';
	if (text.includes('barn') || text.includes('unge') || text.includes('kids')) return 'family';
	if (text.includes('lesesirkel') || text.includes('bokgruppe')) return 'culture';
	if (text.includes('kurs') || text.includes('workshop') || text.includes('skriv')) return 'workshop';
	if (text.includes('debatt') || text.includes('samtale') || text.includes('foredrag')) return 'culture';
	if (text.includes('quiz')) return 'nightlife';
	if (text.includes('festival')) return 'festival';
	return 'culture';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Litteraturhuset i Bergen events...`);

	let found = 0;
	let inserted = 0;
	let page = 1;
	const maxPages = 5;

	while (page <= maxPages) {
		const url = page === 1 ? BASE_URL : `${BASE_URL}?${PAGE_PARAM}=${page}`;
		const html = await fetchHTML(url);
		if (!html) {
			if (page === 1) console.error(`[${SOURCE}] Failed to fetch page ${page}`);
			break;
		}

		const $ = cheerio.load(html);
		// Scope to #program-list to avoid JetBoost filter checkboxes (also .w-dyn-item)
		const items = $('#program-list .w-dyn-item');

		if (items.length === 0) break;

		if (page === 1) console.log(`[${SOURCE}] Page ${page}: ${items.length} items`);

		const pageEvents: Array<{
			title: string;
			dateStart: string;
			dateEnd: string | undefined;
			time: string;
			room: string;
			tags: string[];
			sourceUrl: string;
			imageUrl: string | undefined;
			isFree: boolean;
		}> = [];

		items.each((_, el) => {
			const item = $(el);

			// Skip items without event links (structural wrappers)
			const link = item.find('a[href*="/arrangement/"]').attr('href');
			if (!link) return;

			// Title from [class*="name"] element
			const title = item.find('[class*="name"]').first().text().trim();
			if (!title) return;

			// Parse hidden date inputs ("Feb 20, 2026" format)
			const startRaw = item.find('input.event-start-date').attr('value') || '';
			const endRaw = item.find('input.event-end-date').attr('value') || '';
			const dateStart = parseEnglishDate(startRaw);
			if (!dateStart) return;
			const dateEnd = parseEnglishDate(endRaw);

			// Extract time from h3 text (e.g. "Fre.20.0219:00–20:15Title")
			// The h3 concatenates day+date+month+time without spaces.
			// Match HH:MM where HH is 00-23 to avoid false matches like "38:30"
			const h3Text = item.find('h3').text();
			const timeMatch = h3Text.match(/(?:^|[^\d])([01]\d|2[0-3]):([0-5]\d)/);
			const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '19:00';

			// Room from .heading-3 element
			const room = item.find('[class*="heading-3"]').first().text().trim() ||
				'Litteraturhuset i Bergen';

			// Tags from category label
			const tags: string[] = [];
			item.find('.info-text-category-tablet, .filter-tag-link-block').each((_, tagEl) => {
				const tag = $(tagEl).text().trim();
				if (tag) tags.push(tag);
			});

			// Free indicator
			const isFree = item.text().includes('Gratis');

			// Image
			const img = item.find('img').first();
			const imageUrl = img.attr('src') || undefined;

			const sourceUrl = `https://www.litthusbergen.no${link}`;

			pageEvents.push({ title, dateStart, dateEnd, time, room, tags, sourceUrl, imageUrl, isFree });
		});

		for (const ev of pageEvents) {
			found++;

			if (await eventExists(ev.sourceUrl)) continue;

			const category = guessCategory(ev.title, ev.tags);
			const bydel = mapBydel('Litteraturhuset');
			const offset = bergenOffset(ev.dateStart);

			// Validate date construction
			const startDate = new Date(`${ev.dateStart}T${ev.time}:00${offset}`);
			if (isNaN(startDate.getTime())) {
				console.error(`  [${SOURCE}] Bad date for "${ev.title}": ${ev.dateStart} ${ev.time}`);
				continue;
			}
			const dateStart = startDate.toISOString();
			let dateEnd: string | undefined;
			if (ev.dateEnd && ev.dateEnd !== ev.dateStart) {
				const end = new Date(`${ev.dateEnd}T22:00:00${bergenOffset(ev.dateEnd)}`);
				dateEnd = isNaN(end.getTime()) ? undefined : end.toISOString();
			}

			const success = await insertEvent({
				slug: makeSlug(ev.title, ev.dateStart),
				title_no: ev.title,
				description_no: makeDescription(ev.title, 'Litteraturhuset i Bergen', category),
				category,
				date_start: dateStart,
				date_end: dateEnd,
				venue_name: ev.room || 'Litteraturhuset i Bergen',
				address: 'Østre Skostredet 5-7, Bergen',
				bydel,
				price: ev.isFree ? 'Gratis' : '',
				ticket_url: ev.sourceUrl,
				source: SOURCE,
				source_url: ev.sourceUrl,
				image_url: ev.imageUrl,
				age_group: ev.tags.some(t => t.toLowerCase().includes('barn')) ? 'family' : 'all',
				language: ev.tags.some(t => t.toLowerCase().includes('english')) ? 'en' : 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${ev.title} (${category}${ev.isFree ? ', gratis' : ''})`);
				inserted++;
			}
		}

		page++;
		if (page <= maxPages) await delay(3000);
	}

	return { found, inserted };
}
