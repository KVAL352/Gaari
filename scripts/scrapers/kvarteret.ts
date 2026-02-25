import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'kvarteret';
const API_URL = 'https://kvarteret.no/api/events';

interface KvarteretTranslation {
	title: string;
	description: string;
	languages_code: { url_code: string };
}

interface KvarteretEvent {
	slug: string;
	status: string;
	event_start: string;
	event_end: string | null;
	price: string | null;
	ticket_url: string | null;
	translations: KvarteretTranslation[];
	categories: { name: string }[];
	top_image: { id: string } | null;
}

const CATEGORY_MAP: Record<string, string> = {
	'Konsert og musikk': 'music',
	'Debatter og foredrag': 'culture',
	'Fest': 'nightlife',
	'Quiz': 'nightlife',
	'Revy': 'theatre',
	'Teater': 'theatre',
	'Film': 'culture',
};

function mapCategory(categories: { name: string }[]): string {
	if (!categories || categories.length === 0) return 'student';
	const name = categories[0].name;
	return CATEGORY_MAP[name] || 'student';
}

function parsePrice(price: string | null): string {
	if (!price) return '';
	const trimmed = price.trim().toLowerCase();
	if (trimmed === '0' || trimmed === 'gratis' || trimmed === 'free') return '0';
	// Extract first number from strings like "75 Student // 100 Ordinær"
	const match = price.match(/(\d+)/);
	return match ? `${match[1]} kr` : price.trim();
}

function getImageUrl(topImage: { id: string } | null): string | undefined {
	if (!topImage || !topImage.id) return undefined;
	return `https://kvarteret.no/assets/${topImage.id}`;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Kvarteret events API...`);

	const res = await fetch(API_URL, {
		headers: {
			'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
			'Accept': 'application/json',
		},
	});

	if (!res.ok) {
		console.error(`[${SOURCE}] HTTP ${res.status}`);
		return { found: 0, inserted: 0 };
	}

	const events: KvarteretEvent[] = await res.json();
	const now = new Date();

	// Filter to published future events
	const upcoming = events.filter(e =>
		e.status === 'published' && new Date(e.event_start) > now
	);

	const found = upcoming.length;
	console.log(`[${SOURCE}] Found ${found} upcoming events (${events.length} total)`);

	let inserted = 0;

	for (const event of upcoming) {
		const sourceUrl = `https://kvarteret.no/events/${event.slug}`;
		if (await eventExists(sourceUrl)) continue;

		// Extract Norwegian title (required)
		const noTranslation = event.translations.find(t => t.languages_code.url_code === 'no');
		const enTranslation = event.translations.find(t => t.languages_code.url_code === 'en');

		const titleNo = noTranslation?.title || enTranslation?.title;
		if (!titleNo) {
			console.log(`  - Skipping event with no title: ${event.slug}`);
			continue;
		}

		const titleEn = enTranslation?.title || undefined;
		const category = mapCategory(event.categories);
		const bydel = mapBydel('Det Akademiske Kvarter');
		const price = parsePrice(event.price);
		const datePart = event.event_start.slice(0, 10);

		const aiDesc = await generateDescription({
			title: titleNo,
			venue: 'Det Akademiske Kvarter',
			category,
			date: new Date(event.event_start),
			price,
		});

		const success = await insertEvent({
			slug: makeSlug(titleNo, datePart),
			title_no: titleNo,
			title_en: titleEn,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: new Date(event.event_start).toISOString(),
			date_end: event.event_end ? new Date(event.event_end).toISOString() : undefined,
			venue_name: 'Det Akademiske Kvarter',
			address: 'Olav Kyrres gate 49, 5015 Bergen',
			bydel,
			price,
			ticket_url: event.ticket_url || undefined,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: getImageUrl(event.top_image),
			age_group: 'students',
			language: titleEn ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${titleNo} (${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
