import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'forumscene';
const LISTING_URL = 'https://www.forumscene.no/arrangementer';

// English month abbreviations (Webflow outputs English, client JS converts to Norwegian)
const MONTH_MAP: Record<string, number> = {
	'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
	'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
};

function parseDate(dayText: string, monthText: string): { month: number; day: number } | null {
	const day = parseInt(dayText.trim());
	const month = MONTH_MAP[monthText.trim().toLowerCase().slice(0, 3)];
	if (isNaN(day) || month === undefined) return null;
	return { month, day };
}

function buildDateISO(day: number, month: number): string {
	const now = new Date();
	let year = now.getFullYear();
	// If the date would be more than 2 months in the past, assume next year
	const candidate = new Date(year, month, day);
	if (candidate.getTime() < now.getTime() - 60 * 24 * 60 * 60 * 1000) {
		year++;
	}
	const m = String(month + 1).padStart(2, '0');
	const d = String(day).padStart(2, '0');
	return `${year}-${m}-${d}`;
}

function bergenOffset(dateISO: string): string {
	const month = parseInt(dateISO.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

function mapCategory(filterType: string, title: string): string {
	const lower = title.toLowerCase();
	// Title-based overrides for theatre/comedy
	if (lower.includes('musikal') || lower.includes('teater') || lower.includes('forestilling')) return 'theatre';

	switch (filterType.toLowerCase()) {
		case 'musikk': return 'music';
		case 'underholdning': return 'nightlife';
		case 'annet': return 'culture';
		default: return 'culture';
	}
}

interface ParsedEvent {
	title: string;
	category: string;
	dateISO: string;
	endDateISO?: string;
	sourceUrl: string;
	imageUrl?: string;
	ticketUrl?: string;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Forum Scene events...`);

	const html = await fetchHTML(LISTING_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch listing page`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);

	// Target the Finsweet CMS filter list to avoid tab duplicates
	const container = $('div[fs-cmsfilter-element="list"]');
	const cards = container.find('div.w-dyn-item');

	console.log(`[${SOURCE}] Found ${cards.length} event cards in filter list`);

	// Parse all cards into a map (dedup by URL)
	const uniqueEvents = new Map<string, ParsedEvent>();

	cards.each((_, el) => {
		const card = $(el);

		const linkEl = card.find('a.link-cards');
		const href = linkEl.attr('href');
		if (!href || !href.startsWith('/arrangementer/')) return;

		const sourceUrl = `https://www.forumscene.no${href}`;
		if (uniqueEvents.has(sourceUrl)) return;

		// Check if sold out (button visible = sold out)
		const soldOutBtn = card.find('a.c-button__disabled');
		if (soldOutBtn.length > 0 && !soldOutBtn.hasClass('w-condition-invisible')) return;

		// Extract start date
		const dateBlocks = card.find('div.x-date');
		if (dateBlocks.length === 0) return;

		const startBlock = dateBlocks.first();
		const startParsed = parseDate(
			startBlock.find('div.x-date__day').text(),
			startBlock.find('div.x-date__month').text()
		);
		if (!startParsed) return;

		// End date (if range, second date block is visible)
		let endDateISO: string | undefined;
		if (dateBlocks.length >= 2) {
			const endBlock = dateBlocks.eq(1);
			if (!endBlock.hasClass('w-condition-invisible')) {
				const endParsed = parseDate(
					endBlock.find('div.x-date__day').text(),
					endBlock.find('div.x-date__month').text()
				);
				if (endParsed) {
					endDateISO = buildDateISO(endParsed.day, endParsed.month);
				}
			}
		}

		const title = card.find('h3.x-eventname').text().trim() || linkEl.text().trim();
		if (!title) return;

		const filterType = card.find('div[fs-cmsfilter-field="type"]').text().trim();
		const imageUrl = card.find('img.mediaelement').attr('src') || undefined;
		const ticketUrl = card.find('a.x-button--flex-grow').attr('href') || undefined;

		uniqueEvents.set(sourceUrl, {
			title,
			category: mapCategory(filterType, title),
			dateISO: buildDateISO(startParsed.day, startParsed.month),
			endDateISO,
			sourceUrl,
			imageUrl,
			ticketUrl,
		});
	});

	const found = uniqueEvents.size;
	let inserted = 0;
	console.log(`[${SOURCE}] ${found} unique events after dedup`);

	for (const ev of uniqueEvents.values()) {
		if (await eventExists(ev.sourceUrl)) continue;

		const bydel = mapBydel('Forum Scene');
		const offset = bergenOffset(ev.dateISO);

		const aiDesc = await generateDescription({ title: ev.title, venue: 'Forum Scene', category: ev.category, date: new Date(`${ev.dateISO}T20:00:00${offset}`), price: '' });
		const success = await insertEvent({
			slug: makeSlug(ev.title, ev.dateISO),
			title_no: ev.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category: ev.category,
			date_start: new Date(`${ev.dateISO}T20:00:00${offset}`).toISOString(),
			date_end: ev.endDateISO ? new Date(`${ev.endDateISO}T23:00:00${offset}`).toISOString() : undefined,
			venue_name: 'Forum Scene',
			address: 'Forum Scene, Bergen',
			bydel,
			price: '',
			ticket_url: ev.ticketUrl || ev.sourceUrl,
			source: SOURCE,
			source_url: ev.sourceUrl,
			image_url: ev.imageUrl,
			age_group: 'all',
			language: ev.title.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${ev.title} (${ev.category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
