import { makeSlug, eventExists, insertEvent, delay, makeDescription } from '../lib/utils.js';

const SOURCE = 'festspillene';
const STORYBLOK_TOKEN = '9GLqtx9xc3ueOm5rVi0sZgtt';
const STORYBLOK_API = 'https://api.storyblok.com/v2/cdn/stories';

interface EventContent {
	SyncId: string;
	SyncName: string;
	SyncScene: string;
	SyncVenue: string;
	SyncEventStartTime: string;
	SyncEventEndTime: string;
	SyncEventDuration: string;
	SyncFreeEvent: boolean;
	SyncBookingLink: { url: string };
	SyncPricing: Array<{ PriceZoneA: number | string; PricingType: string }>;
	SyncOrganiser: string;
	SyncProduction: string[];
	SyncPrivateEvent: boolean;
	SyncCategories: string[];
}

interface ProductionContent {
	SyncName: string;
	excerpt: string;
	summaryTitle: string;
	thumbnail: { filename: string; alt: string };
	mobileThumbnail: { filename: string };
	Categories: string[];
}

function bergenOffset(dateStr: string): string {
	const month = parseInt(dateStr.slice(5, 7));
	return (month >= 4 && month <= 10) ? '+02:00' : '+01:00';
}

function guessCategory(name: string, scene: string): string {
	const text = `${name} ${scene}`.toLowerCase();
	if (text.includes('konsert') || text.includes('orkester') || text.includes('symfoni') ||
		text.includes('kvartet') || text.includes('jazz') || text.includes('kor') ||
		text.includes('mahler') || text.includes('grieg')) return 'music';
	if (text.includes('teater') || text.includes('opera') || text.includes('dans') ||
		text.includes('hamlet') || text.includes('forestilling') || text.includes('sirkus')) return 'theatre';
	if (text.includes('barn') || text.includes('familie') || text.includes('kids')) return 'family';
	if (text.includes('workshop') || text.includes('kurs') || text.includes('klasse')) return 'workshop';
	if (text.includes('vandring') || text.includes('tur') || text.includes('byvandring')) return 'tours';
	if (text.includes('utstilling') || text.includes('kunst')) return 'culture';
	if (text.includes('ordskifte') || text.includes('samtale') || text.includes('foredrag') ||
		text.includes('litterær') || text.includes('dypdykk')) return 'culture';
	return 'festival';
}

function formatPrice(pricing: EventContent['SyncPricing'], isFree: boolean): string {
	if (isFree) return 'Gratis';
	if (!pricing || pricing.length === 0) return '';
	const prices = pricing
		.filter(p => p.PriceZoneA && Number(p.PriceZoneA) > 0)
		.map(p => Number(p.PriceZoneA));
	if (prices.length === 0) return 'Gratis';
	const min = Math.min(...prices);
	const max = Math.max(...prices);
	return min === max ? `${min} kr` : `${min}–${max} kr`;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Festspillene i Bergen events...`);

	// Step 1: Fetch all Event stories
	const allEvents: Array<{ content: EventContent; uuid: string; name: string; full_slug: string }> = [];
	let page = 1;

	while (true) {
		const url = `${STORYBLOK_API}?token=${STORYBLOK_TOKEN}&filter_query[component][in]=Event&per_page=100&page=${page}&version=published`;
		const res = await fetch(url, {
			headers: { 'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)' },
		});
		if (!res.ok) {
			console.error(`[${SOURCE}] HTTP ${res.status} on page ${page}`);
			break;
		}
		const data = await res.json();
		const stories = data.stories || [];
		if (stories.length === 0) break;
		allEvents.push(...stories);
		page++;
		if (page > 1) await delay(1000);
	}

	// Filter to 2026 future events
	const now = new Date();
	const cutoff = new Date(now.getTime() - 86400000);
	const future = allEvents.filter(s => {
		const start = s.content.SyncEventStartTime;
		if (!start || !start.startsWith('2026-')) return false;
		if (s.content.SyncPrivateEvent) return false;
		const startDate = new Date(`${start.replace(' ', 'T')}:00${bergenOffset(start)}`);
		return startDate.getTime() > cutoff.getTime();
	});

	console.log(`[${SOURCE}] ${allEvents.length} total events, ${future.length} future 2026 events`);

	// Step 2: Fetch productions for images and descriptions
	const productionUuids = new Set<string>();
	for (const event of future) {
		for (const uuid of (event.content.SyncProduction || [])) {
			productionUuids.add(uuid);
		}
	}

	const productions = new Map<string, ProductionContent>();
	const uuidList = [...productionUuids];
	for (let i = 0; i < uuidList.length; i += 50) {
		const batch = uuidList.slice(i, i + 50).join(',');
		const url = `${STORYBLOK_API}?token=${STORYBLOK_TOKEN}&by_uuids=${batch}&version=published`;
		const res = await fetch(url, {
			headers: { 'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)' },
		});
		if (res.ok) {
			const data = await res.json();
			for (const story of (data.stories || [])) {
				productions.set(story.uuid, story.content);
			}
		}
		await delay(1000);
	}

	console.log(`[${SOURCE}] Fetched ${productions.size} production details`);

	// Step 3: Insert events
	let found = future.length;
	let inserted = 0;

	for (const event of future) {
		const c = event.content;
		const title = c.SyncName || event.name;
		if (!title) continue;

		// Build source URL from production slug or fib.no
		const productionUuid = c.SyncProduction?.[0];
		const production = productionUuid ? productions.get(productionUuid) : undefined;

		const start = c.SyncEventStartTime;
		const dateOnly = start.slice(0, 10);
		const offset = bergenOffset(dateOnly);
		const startDate = new Date(`${start.replace(' ', 'T')}:00${offset}`);

		const ticketUrl = c.SyncBookingLink?.url || '';
		// Use SyncId or UUID for unique source URL when no ticket link
		const syncId = c.SyncId || event.uuid;
		const sourceUrl = ticketUrl || `https://www.fib.no/program/2026/#${syncId}`;

		if (await eventExists(sourceUrl)) continue;

		let dateEnd: string | undefined;
		if (c.SyncEventEndTime) {
			const endDate = new Date(`${c.SyncEventEndTime.replace(' ', 'T')}:00${bergenOffset(c.SyncEventEndTime)}`);
			if (!isNaN(endDate.getTime()) && endDate.getTime() > startDate.getTime()) {
				dateEnd = endDate.toISOString();
			}
		}

		const category = guessCategory(title, c.SyncScene || '');
		const price = formatPrice(c.SyncPricing, c.SyncFreeEvent);
		const imageUrl = production?.thumbnail?.filename || production?.mobileThumbnail?.filename;
		const venue = c.SyncScene || 'Festspillene i Bergen';
		const description = `Festspillene i Bergen: ${makeDescription(title, venue, category)}`;

		const success = await insertEvent({
			slug: makeSlug(title, dateOnly),
			title_no: title,
			description_no: description,
			category,
			date_start: startDate.toISOString(),
			date_end: dateEnd,
			venue_name: c.SyncScene || 'Festspillene i Bergen',
			address: 'Bergen',
			bydel: 'Sentrum',
			price,
			ticket_url: ticketUrl || sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: imageUrl,
			age_group: category === 'family' ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${c.SyncScene || '?'}, ${dateOnly})`);
			inserted++;
		}
	}

	return { found, inserted };
}
