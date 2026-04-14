import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'generasjonsfestivalen';
const BASE_URL = 'https://generasjonsfestivalen.no';
const PROGRAM_URL = `${BASE_URL}/program`;

function guessCategory(title: string, category: string): string {
	const cat = category.toLowerCase();
	const t = title.toLowerCase();
	if (cat === 'feiring' && (t.includes('konsert') || t.includes('rave') || t.includes('jam') || t.includes('sang'))) return 'music';
	if (cat === 'feiring' && (t.includes('middag') || t.includes('lunsj'))) return 'food';
	if (cat === 'mesterklasse' || cat === 'verksted') return 'workshop';
	if (cat === 'feiring') return 'culture';
	// Samtale, Åpning → culture
	return 'culture';
}

/** Parse "07.00–09.00" or "07:00–09:00" */
function parseTime(raw: string): { start: string; end?: string } {
	const normalized = raw.replace(/\./g, ':');
	const m = normalized.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
	if (m) return { start: m[1].padStart(5, '0'), end: m[2].padStart(5, '0') };
	const single = normalized.match(/(\d{1,2}:\d{2})/);
	if (single) return { start: single[1].padStart(5, '0') };
	return { start: '12:00' };
}

/** Parse "Fredag 29. mai" → "2026-05-29" */
function parseDate(raw: string): string | null {
	const months: Record<string, string> = {
		januar: '01', februar: '02', mars: '03', april: '04', mai: '05', juni: '06',
		juli: '07', august: '08', september: '09', oktober: '10', november: '11', desember: '12',
	};
	const m = raw.match(/(\d{1,2})\.\s*(\w+)/);
	if (!m) return null;
	const day = m[1].padStart(2, '0');
	const month = months[m[2].toLowerCase()];
	if (!month) return null;
	// Festival is in 2026 — but use current year logic for future-proofing
	const year = new Date().getFullYear();
	return `${year}-${month}-${day}`;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Generasjonsfestivalen program...`);

	const html = await fetchHTML(PROGRAM_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch program page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	let found = 0;
	let inserted = 0;

	const cards = $('div.lecture-card').toArray();
	console.log(`[${SOURCE}] ${cards.length} program items`);

	for (const el of cards) {
		const $el = $(el);

		const title = $el.attr('data-title')?.trim();
		const dayText = $el.attr('data-day')?.trim();       // "Fredag 29. mai"
		const timeText = $el.attr('data-time')?.trim();      // "07.00–09.00"
		const category = $el.attr('data-category')?.trim() || '';
		const venue = $el.attr('data-location-free-text')?.trim()
			|| $el.attr('data-location')?.trim()
			|| 'Bergen sentrum';
		const imageUrl = $el.attr('data-image')?.trim() || undefined;
		const ticketUrl = $el.attr('data-modal-url')?.trim() || undefined;

		if (!title || !dayText) continue;

		const dateStr = parseDate(dayText);
		if (!dateStr) continue;

		const { start: startTime, end: endTime } = parseTime(timeText || '');
		const offset = bergenOffset(dateStr);
		const dateStart = new Date(`${dateStr}T${startTime}:00${offset}`).toISOString();
		const dateEnd = endTime ? new Date(`${dateStr}T${endTime}:00${offset}`).toISOString() : undefined;

		// Skip past events
		if (new Date(dateStart) < new Date()) continue;

		found++;

		// Use ticket URL as source_url when available, otherwise construct a unique one from title slug
		const slug = makeSlug(title, dateStr);
		const sourceUrl = ticketUrl || `${BASE_URL}/program#${slug}`;
		if (await eventExists(sourceUrl)) continue;

		const bydel = mapBydel(venue);
		const mappedCategory = guessCategory(title, category);

		const aiDesc = await generateDescription({ title, venue, category: mappedCategory, date: dateStart, price: 'Gratis' });

		const success = await insertEvent({
			slug: makeSlug(title, dateStr),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category: mappedCategory,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venue,
			address: venue + ', Bergen',
			bydel,
			price: 'Gratis',
			ticket_url: ticketUrl || `${BASE_URL}/program`,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} @ ${venue} (${dateStr})`);
			inserted++;
		}
	}

	return { found, inserted };
}
