import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'visningsromusf';
const BASE_URL = 'https://www.visningsrommet-usf.no';
const VENUE = 'Visningsrommet USF';
const ADDRESS = 'Georgernes Verft 12, 5011 Bergen';
const BYDEL = 'Sentrum';

const MONTHS: Record<string, number> = {
	januar: 1, februar: 2, mars: 3, april: 4, mai: 5, juni: 6,
	juli: 7, august: 8, september: 9, oktober: 10, november: 11, desember: 12,
};

function parseDateRange(text: string): { start: string; end: string } | null {
	const t = text.replace(/\s+/g, ' ').trim().toLowerCase();
	// "15. – 23. mai 2026", "15.–23. mai 2026", "15. - 23. mai2026", etc.
	const m = t.match(/(\d{1,2})\.\s*[–-]\s*(\d{1,2})\.\s*([a-zæøå]+)\s*(\d{4})/);
	if (!m) return null;
	const [, sDay, eDay, monthName, year] = m;
	const month = MONTHS[monthName];
	if (!month) return null;
	const start = buildOslo(parseInt(year), month, parseInt(sDay), 18, 0);
	const end = buildOslo(parseInt(year), month, parseInt(eDay), 18, 0);
	return { start, end };
}

function buildOslo(year: number, month: number, day: number, hour: number, minute: number): string {
	const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
	const utcGuess = new Date(iso + 'Z');
	const osloStr = utcGuess.toLocaleString('sv-SE', { timeZone: 'Europe/Oslo' });
	const osloDate = new Date(osloStr.replace(' ', 'T') + 'Z');
	const offsetMs = osloDate.getTime() - utcGuess.getTime();
	return new Date(utcGuess.getTime() - offsetMs).toISOString();
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching ${BASE_URL}/ ...`);
	const html = await fetchHTML(`${BASE_URL}/`);
	if (!html) {
		console.log(`[${SOURCE}] Could not fetch homepage — skipping`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);

	// Homepage pattern: h1.wp-block-heading containing <a href="/slug/">title</a>,
	// followed by h3.wp-block-heading with a date range. Without a date the exhibition
	// is "planned" and should be skipped silently (typical between semesters).
	const exhibitions: Array<{ title: string; url: string; dateText: string }> = [];

	$('h1.wp-block-heading').each((_, el) => {
		const $h1 = $(el);
		const links = $h1
			.find('a')
			.filter((__, a) => {
				const href = $(a).attr('href') || '';
				const text = $(a).text().trim();
				return text.length > 0 && href.startsWith(BASE_URL) && !href.endsWith('/arkiv/');
			});
		if (links.length === 0) return;
		const lastLink = links.last();
		const title = lastLink.text().trim();
		const url = lastLink.attr('href') || '';
		if (!title || !url) return;

		const $h3 = $h1.nextAll('h3.wp-block-heading').first();
		const dateText = $h3.text().trim();
		if (!dateText) return;

		exhibitions.push({ title, url, dateText });
	});

	console.log(`[${SOURCE}] Found ${exhibitions.length} dated exhibition(s)`);
	if (exhibitions.length === 0) return { found: 0, inserted: 0 };

	let found = 0;
	let inserted = 0;

	for (const ex of exhibitions) {
		const parsed = parseDateRange(ex.dateText);
		if (!parsed) {
			console.log(`  ? Skipped "${ex.title}" — unparseable date: "${ex.dateText}"`);
			continue;
		}
		if (new Date(parsed.end) < new Date()) continue;
		found++;

		if (await eventExists(ex.url)) continue;

		await delay(1500);
		let imageUrl: string | undefined;
		const detailHtml = await fetchHTML(ex.url);
		if (detailHtml) {
			const d$ = cheerio.load(detailHtml);
			imageUrl = d$('meta[property="og:image"]').attr('content') || undefined;
		}

		const datePart = parsed.start.slice(0, 10);
		const aiDesc = await generateDescription({
			title: ex.title,
			venue: VENUE,
			category: 'culture',
			date: new Date(parsed.start),
			price: 'Gratis',
		});

		const success = await insertEvent({
			slug: makeSlug(ex.title, datePart),
			title_no: ex.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category: 'culture',
			date_start: parsed.start,
			date_end: parsed.end,
			venue_name: VENUE,
			address: ADDRESS,
			bydel: BYDEL,
			price: 'Gratis',
			ticket_url: ex.url,
			source: SOURCE,
			source_url: ex.url,
			image_url: imageUrl,
			age_group: 'all',
			language: 'both',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${ex.title}`);
			inserted++;
		}
	}

	return { found, inserted };
}
