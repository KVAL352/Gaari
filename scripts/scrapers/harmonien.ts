import { makeSlug, eventExists, insertEvent, fetchHTML, delay, makeDescription } from '../lib/utils.js';

const SOURCE = 'harmonien';
const BASE_URL = 'https://harmonien.no/program/';

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

function guessCategory(title: string): string {
	const lower = title.toLowerCase();
	if (lower.includes('barn') || lower.includes('familie') || lower.includes('kids')) return 'family';
	if (lower.includes('opera') || lower.includes('traviata') || lower.includes('carmen')) return 'theatre';
	if (lower.includes('jazz') || lower.includes('pop') || lower.includes('rock')) return 'music';
	return 'music'; // Harmonien is primarily classical music
}

interface ConcertEntry {
	url: string;
	date: string;
	name: string;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Filharmoniske events...`);

	const html = await fetchHTML(BASE_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch program page`);
		return { found: 0, inserted: 0 };
	}

	// Extract var concerts = [...]; from the page
	const match = html.match(/var\s+concerts\s*=\s*(\[[\s\S]*?\]);/);
	if (!match) {
		console.error(`[${SOURCE}] Could not find concerts array in page`);
		return { found: 0, inserted: 0 };
	}

	let concerts: ConcertEntry[];
	try {
		concerts = JSON.parse(match[1]);
	} catch {
		console.error(`[${SOURCE}] Failed to parse concerts JSON`);
		return { found: 0, inserted: 0 };
	}

	// Filter to future concerts only
	const now = new Date();
	const cutoff = new Date(now.getTime() - 86400000).toISOString();
	const future = concerts.filter(c => c.date && c.date > cutoff.slice(0, 19));

	// Group by URL — multiple performances of the same production share a URL
	const byUrl = new Map<string, ConcertEntry[]>();
	for (const c of future) {
		const key = c.url;
		if (!byUrl.has(key)) byUrl.set(key, []);
		byUrl.get(key)!.push(c);
	}

	console.log(`[${SOURCE}] ${future.length} future performances across ${byUrl.size} productions`);

	let found = 0;
	let inserted = 0;

	for (const [url, performances] of byUrl) {
		found++;
		const sourceUrl = `https://harmonien.no${url}`;

		if (await eventExists(sourceUrl)) continue;

		// Sort by date to get first and last
		performances.sort((a, b) => a.date.localeCompare(b.date));
		const first = performances[0];
		const last = performances[performances.length - 1];
		const title = first.name;

		// Parse date — format is "2026-02-21T13:00:00" (no timezone)
		const dateStart = `${first.date}${bergenOffset(first.date)}`;
		const startDate = new Date(dateStart);
		if (isNaN(startDate.getTime())) continue;

		let dateEnd: string | undefined;
		if (performances.length > 1 && last.date !== first.date) {
			const endDate = new Date(`${last.date}${bergenOffset(last.date)}`);
			if (!isNaN(endDate.getTime())) dateEnd = endDate.toISOString();
		}

		const category = guessCategory(title);

		const success = await insertEvent({
			slug: makeSlug(title, first.date.slice(0, 10)),
			title_no: title,
			description_no: makeDescription(title, 'Grieghallen', category),
			category,
			date_start: startDate.toISOString(),
			date_end: dateEnd,
			venue_name: 'Grieghallen',
			address: 'Nordahl Bruns gate 9, Bergen',
			bydel: 'Sentrum',
			price: '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: undefined,
			age_group: category === 'family' ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			const perf = performances.length > 1 ? ` (${performances.length} performances)` : '';
			console.log(`  + ${title}${perf} (${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
