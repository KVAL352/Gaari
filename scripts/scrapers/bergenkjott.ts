import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bergenkjott';
const BASE_URL = 'https://www.bergenkjott.org';
const RSS_URL = `${BASE_URL}/kalendar?format=rss`;
const VENUE = 'Bergen Kjøtt';
const ADDRESS = 'Skutevikstorget 1, Bergen';
const USER_AGENT = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';

interface EventJsonLd {
	'@type': string;
	name?: string;
	startDate?: string;
	endDate?: string;
	image?: string | string[];
	location?: { name?: string; address?: string };
}

function hasWord(text: string, word: string): boolean {
	return new RegExp(`\\b${word}\\b`).test(text);
}

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

function extractPrice(text: string): string {
	const m = text.match(/\b(\d{2,5})\s*kr\b/i) || text.match(/\bkr\.?\s*(\d{2,5})\b/i);
	if (m) return `${m[1]} kr`;
	if (/gratis|fri\s+inngang|free\s+entry/i.test(text)) return 'Gratis';
	return '';
}

function extractRssLinks(rssXml: string): { title: string; link: string; description: string }[] {
	const items: { title: string; link: string; description: string }[] = [];
	const itemRegex = /<item>([\s\S]*?)<\/item>/g;
	let m: RegExpExecArray | null;
	while ((m = itemRegex.exec(rssXml)) !== null) {
		const block = m[1];
		const title = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1].trim() || '';
		const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1].trim() || '';
		const description = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] || '';
		if (title && link) items.push({ title, link, description });
	}
	return items;
}

function extractEventJsonLd(html: string): EventJsonLd | null {
	const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
	for (const block of blocks) {
		const json = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
		try {
			const parsed = JSON.parse(json);
			if (parsed['@type'] === 'Event') return parsed;
		} catch {
			continue;
		}
	}
	return null;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Kjøtt events (RSS + detail pages)...`);

	let rssXml: string;
	try {
		const res = await fetch(RSS_URL, { headers: { 'User-Agent': USER_AGENT } });
		if (!res.ok) {
			console.error(`[${SOURCE}] RSS feed returned ${res.status}`);
			return { found: 0, inserted: 0 };
		}
		rssXml = await res.text();
	} catch (err) {
		console.error(`[${SOURCE}] Failed to fetch RSS:`, err);
		return { found: 0, inserted: 0 };
	}

	const rssItems = extractRssLinks(rssXml);
	console.log(`[${SOURCE}] Found ${rssItems.length} items in RSS feed`);

	if (rssItems.length === 0) return { found: 0, inserted: 0 };

	const now = new Date();
	let found = 0;
	let inserted = 0;

	for (const item of rssItems) {
		const sourceUrl = item.link;
		if (await eventExists(sourceUrl)) continue;

		await delay(1500);

		let html: string;
		try {
			const res = await fetch(sourceUrl, { headers: { 'User-Agent': USER_AGENT } });
			if (!res.ok) continue;
			html = await res.text();
		} catch {
			continue;
		}

		const eventLd = extractEventJsonLd(html);
		if (!eventLd?.startDate) continue;

		const startDate = new Date(eventLd.startDate);
		if (startDate < now) continue;

		found++;

		const title = eventLd.name?.replace(/\s+—\s+Bergen Kjøtt\s*$/, '').trim() || item.title;
		const dateStart = startDate.toISOString();
		const dateEnd = eventLd.endDate ? new Date(eventLd.endDate).toISOString() : undefined;
		const datePart = dateStart.slice(0, 10);
		const category = guessCategory(title);
		const bydel = mapBydel(VENUE);

		const imageUrl = Array.isArray(eventLd.image) ? eventLd.image[0] : eventLd.image;
		const venueName = eventLd.location?.name || VENUE;
		const address = eventLd.location?.address
			? eventLd.location.address.replace(/\n/g, ', ')
			: ADDRESS;

		const bodyText = stripHtml(item.description);
		const price = extractPrice(bodyText);
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
			image_url: imageUrl || undefined,
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
