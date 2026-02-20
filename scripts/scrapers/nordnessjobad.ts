import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, parseNorwegianDate } from '../lib/utils.js';

const SOURCE = 'nordnessjobad';

// Both sites share the same Wagtail/Django CMS template
const SITES = [
	{ name: 'Nordnes Sjøbad', url: 'https://nordnessjobad.no/arrangementer/', base: 'https://nordnessjobad.no', address: 'Nordnesbakken 30, Bergen' },
	{ name: 'AdO Arena', url: 'https://adoarena.no/arrangementer/', base: 'https://adoarena.no', address: 'Lungegaardskaien 40, Bergen' },
];

interface PendingEvent {
	title: string;
	sourceUrl: string;
	imageUrl: string | undefined;
	timeText: string;
	location: string;
	site: typeof SITES[number];
}

function toDatePart(isoString: string): string {
	// parseNorwegianDate returns full ISO like "2026-03-04T12:00:00.000Z" — extract YYYY-MM-DD
	return isoString.slice(0, 10);
}

function parseEventDateTime(timeText: string): { start: string; end: string | undefined } | null {
	// Multi-day: "Fredag 13. mars 2026 07:00 - Sondag 15. mars 2026 18:00"
	const multiDay = timeText.match(/(\d{1,2}\.\s*\w+\s*\d{4})\s+(\d{2}:\d{2})\s*-\s*\w+\s+(\d{1,2}\.\s*\w+\s*\d{4})\s+(\d{2}:\d{2})/);
	if (multiDay) {
		const startIso = parseNorwegianDate(multiDay[1]);
		const endIso = parseNorwegianDate(multiDay[3]);
		if (startIso && endIso) {
			const start = new Date(`${toDatePart(startIso)}T${multiDay[2]}:00+01:00`).toISOString();
			const end = new Date(`${toDatePart(endIso)}T${multiDay[4]}:00+01:00`).toISOString();
			return { start, end };
		}
	}

	// Single day: "Onsdag 4. mars 2026 19:00 - 21:00"
	const singleDay = timeText.match(/(\d{1,2}\.\s*\w+\s*\d{4})\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
	if (singleDay) {
		const dateIso = parseNorwegianDate(singleDay[1]);
		if (dateIso) {
			const dp = toDatePart(dateIso);
			const start = new Date(`${dp}T${singleDay[2]}:00+01:00`).toISOString();
			const end = new Date(`${dp}T${singleDay[3]}:00+01:00`).toISOString();
			return { start, end };
		}
	}

	// Date only: "4. mars 2026"
	const dateOnly = timeText.match(/(\d{1,2}\.\s*\w+\s*\d{4})/);
	if (dateOnly) {
		const dateIso = parseNorwegianDate(dateOnly[1]);
		if (dateIso) {
			return { start: new Date(`${toDatePart(dateIso)}T00:00:00+01:00`).toISOString(), end: undefined };
		}
	}

	return null;
}

function guessCategory(title: string): string {
	const t = title.toLowerCase();
	if (t.includes('svømm') || t.includes('stup') || t.includes('vannsklie') || t.includes('bading')) return 'sports';
	if (t.includes('seminar') || t.includes('kurs') || t.includes('førstehjelp')) return 'workshop';
	if (t.includes('barn') || t.includes('familie')) return 'family';
	if (t.includes('fest') || t.includes('konsert')) return 'music';
	return 'sports';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Nordnes Sjøbad & AdO Arena events...`);

	let found = 0;
	let inserted = 0;
	const pending: PendingEvent[] = [];

	for (const site of SITES) {
		console.log(`  [${site.name}] Fetching...`);
		const html = await fetchHTML(site.url);

		if (!html) {
			console.error(`  [${site.name}] Failed to fetch`);
			continue;
		}

		const $ = cheerio.load(html);

		// Check for empty state
		const emptyMsg = $('section.vFull p.txt-center').text();
		if (emptyMsg.includes('Ingen kommende')) {
			console.log(`  [${site.name}] No upcoming events`);
			continue;
		}

		const items = $('section.vFull ul.flex-row li.col-1of2');
		console.log(`  [${site.name}] Found ${items.length} events`);

		items.each((_, el) => {
			found++;

			const title = $(el).find('figcaption h3.title').text().trim();
			const detailPath = $(el).find('figure > a').attr('href') || '';
			const sourceUrl = `${site.base}${detailPath}`;
			const imageUrl = $(el).find('picture img').attr('src') || undefined;

			let timeText = '';
			let location = '';
			$(el).find('figcaption ul li').each((_, li) => {
				const text = $(li).text().trim();
				if (text.startsWith('Tid:')) timeText = text.replace('Tid:', '').trim();
				if (text.startsWith('Sted:')) location = text.replace('Sted:', '').trim();
			});

			pending.push({ title, sourceUrl, imageUrl, timeText, location, site });
		});

		await delay(3000);
	}

	for (const e of pending) {
		if (await eventExists(e.sourceUrl)) continue;

		const dateTime = parseEventDateTime(e.timeText);
		if (!dateTime) {
			console.log(`    ? Skipped (no date): ${e.title}`);
			continue;
		}

		const category = guessCategory(e.title);
		const venueName = e.site.name;
		const bydel = mapBydel(venueName);
		const datePart = dateTime.start.slice(0, 10);

		const success = await insertEvent({
			slug: makeSlug(e.title, datePart),
			title_no: e.title,
			description_no: e.title,
			category,
			date_start: dateTime.start,
			date_end: dateTime.end,
			venue_name: venueName,
			address: e.location || e.site.address,
			bydel,
			price: '',
			ticket_url: e.sourceUrl,
			source: SOURCE,
			source_url: e.sourceUrl,
			image_url: e.imageUrl,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`    + ${e.title} (${venueName}, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
