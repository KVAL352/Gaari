import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bergenkjott';
const BASE_URL = 'https://www.bergenkjott.org';
const JSON_URL = `${BASE_URL}/kalendar?format=json`;
const VENUE = 'Bergen Kjøtt';
const ADDRESS = 'Skutevikstorget 1, Bergen';
const USER_AGENT = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';

interface SquarespaceItem {
	title: string;
	fullUrl: string;
	startDate: number; // ms epoch
	endDate?: number;
	body?: string;
	assetUrl?: string;
	location?: {
		addressTitle?: string;
		addressLine1?: string;
		addressLine2?: string;
	};
}

/** Word-boundary check — avoids false positives like "format" matching "mat" */
function hasWord(text: string, word: string): boolean {
	return new RegExp(`\\b${word}\\b`).test(text);
}

/** Check for Norwegian compound words ending with the keyword */
function hasCompound(text: string, suffix: string): boolean {
	return new RegExp(`\\w${suffix}\\b`).test(text);
}

function guessCategory(title: string): string {
	const t = title.toLowerCase();
	if (hasWord(t, 'konsert') || hasWord(t, 'release') || hasWord(t, 'trio') || hasWord(t, 'band') || hasWord(t, 'dj') || hasCompound(t, 'konsert')) return 'music';
	if (hasWord(t, 'soup') || t.includes('mat og drikke') || hasWord(t, 'mela') || hasWord(t, 'food')) return 'food';
	if (hasWord(t, 'festival') || hasWord(t, 'swap') || hasWord(t, 'marked')) return 'festival';
	if (hasWord(t, 'workshop') || hasWord(t, 'kurs') || hasWord(t, 'draw')) return 'workshop';
	if (hasWord(t, 'quiz') || hasCompound(t, 'quiz')) return 'nightlife';
	if (t.includes('re-opening') || t.includes('party') || t.includes('afterparty')) return 'nightlife';
	if (hasWord(t, 'wrestling') || hasWord(t, 'sport')) return 'sports';
	if (hasWord(t, 'utstilling') || hasWord(t, 'kunst') || hasWord(t, 'art')) return 'culture';
	return 'culture';
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractPrice(body: string): string {
	const text = stripHtml(body);
	const m = text.match(/\b(\d{2,5})\s*kr\b/i) || text.match(/\bkr\.?\s*(\d{2,5})\b/i);
	if (m) return `${m[1]} kr`;
	if (/gratis|fri\s+inngang|free\s+entry/i.test(text)) return 'Gratis';
	return '';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Kjøtt events (Squarespace JSON API)...`);

	let data: { items?: SquarespaceItem[] };
	try {
		const res = await fetch(JSON_URL, {
			headers: { 'User-Agent': USER_AGENT },
		});
		if (!res.ok) {
			console.error(`[${SOURCE}] JSON API returned ${res.status}`);
			return { found: 0, inserted: 0 };
		}
		data = await res.json();
	} catch (err) {
		console.error(`[${SOURCE}] Failed to fetch JSON:`, err);
		return { found: 0, inserted: 0 };
	}

	const items = data.items || [];
	console.log(`[${SOURCE}] Found ${items.length} events in JSON feed`);

	if (items.length === 0) return { found: 0, inserted: 0 };

	const now = new Date();
	let found = 0;
	let inserted = 0;

	for (const item of items) {
		if (!item.title || !item.startDate) continue;

		const startDate = new Date(item.startDate);
		if (startDate < now) continue;

		const sourceUrl = `${BASE_URL}${item.fullUrl}`;
		if (await eventExists(sourceUrl)) continue;

		found++;

		const title = item.title;
		const dateStart = startDate.toISOString();
		const dateEnd = item.endDate ? new Date(item.endDate).toISOString() : undefined;
		const datePart = dateStart.slice(0, 10);
		const category = guessCategory(title);
		const bydel = mapBydel(VENUE);

		const imageUrl = item.assetUrl || undefined;
		const venueName = item.location?.addressTitle || VENUE;
		const address = item.location?.addressLine1
			? `${item.location.addressLine1}, ${item.location?.addressLine2 || 'Bergen'}`
			: ADDRESS;

		const price = item.body ? extractPrice(item.body) : '';
		const aiDesc = await generateDescription({ title, venue: venueName, category, date: startDate, price });

		const success = await insertEvent({
			slug: makeSlug(title, datePart),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venueName,
			address,
			bydel,
			price,
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: 'all',
			language: title.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
