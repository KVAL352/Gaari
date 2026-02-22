import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bek';
const API_URL = 'https://www.bek.no/wp-json/wp/v2/posts';
const VENUE = 'BEK – Bergen Senter for Elektronisk Kunst';
const ADDRESS = 'C. Sundts gate 55, Bergen';

// Categories: 19 = Arrangement, 51 = Events
const CATEGORIES = '19,51';

const NORWEGIAN_MONTHS: Record<string, number> = {
	januar: 0, februar: 1, mars: 2, april: 3, mai: 4, juni: 5,
	juli: 6, august: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

function bergenOffset(month: number): string {
	return (month >= 3 && month <= 9) ? '+02:00' : '+01:00'; // April(3)–October(9) = CEST
}

function stripHtml(html: string): string {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#8211;/g, '–')
		.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
		.replace(/\s+/g, ' ')
		.trim();
}

interface WPPost {
	id: number;
	date: string;
	title: { rendered: string };
	content: { rendered: string };
	link: string;
	_embedded?: {
		'wp:featuredmedia'?: Array<{ source_url?: string }>;
	};
}

/**
 * Extract the first Norwegian date from content text.
 * Returns { year, month (0-indexed), day, dateStr "YYYY-MM-DD" }
 */
function extractDate(text: string, postYear: number): { year: number; month: number; day: number; dateStr: string } | null {
	const dateMatch = text.match(
		/(\d{1,2})\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)(?:\s+(\d{4}))?/i
	);
	if (!dateMatch) return null;

	const day = parseInt(dateMatch[1]);
	const month = NORWEGIAN_MONTHS[dateMatch[2].toLowerCase()];
	const year = dateMatch[3] ? parseInt(dateMatch[3]) : postYear;

	if (month === undefined || isNaN(day)) return null;
	const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	return { year, month, day, dateStr };
}

/**
 * Extract time from content. Patterns: "kl. 19:00", "19:00–23:00", "kl 14:00-18:00"
 */
function extractTime(text: string): { startHour: number; startMin: number; endHour?: number; endMin?: number } | null {
	const timeMatch = text.match(/(?:kl\.?\s*)?(\d{1,2})[:.:](\d{2})\s*[–\-]\s*(\d{1,2})[:.:](\d{2})/);
	if (timeMatch) {
		return {
			startHour: parseInt(timeMatch[1]),
			startMin: parseInt(timeMatch[2]),
			endHour: parseInt(timeMatch[3]),
			endMin: parseInt(timeMatch[4]),
		};
	}

	const singleMatch = text.match(/kl\.?\s*(\d{1,2})[:.:](\d{2})/);
	if (singleMatch) {
		return {
			startHour: parseInt(singleMatch[1]),
			startMin: parseInt(singleMatch[2]),
		};
	}

	return null;
}

function guessCategory(title: string, content: string): string {
	const text = `${title} ${content}`.toLowerCase();
	if (text.includes('workshop') || text.includes('kurs')) return 'workshop';
	if (text.includes('konsert') || text.includes('musikk') || text.includes('lyd')) return 'music';
	if (text.includes('film')) return 'culture';
	if (text.includes('familie') || text.includes('barn')) return 'family';
	if (text.includes('performance') || text.includes('installasjon')) return 'culture';
	return 'culture';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching BEK events via WordPress API...`);

	const url = `${API_URL}?categories=${CATEGORIES}&per_page=20&_embed&orderby=date&order=desc`;

	let posts: WPPost[];
	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
				'Accept': 'application/json',
			},
		});
		if (!res.ok) {
			console.error(`[${SOURCE}] API returned ${res.status}`);
			return { found: 0, inserted: 0 };
		}
		posts = await res.json();
	} catch (err: any) {
		console.error(`[${SOURCE}] API error: ${err.message}`);
		return { found: 0, inserted: 0 };
	}

	console.log(`[${SOURCE}] ${posts.length} posts from API`);

	const now = new Date();
	let found = 0;
	let inserted = 0;

	for (const post of posts) {
		const title = stripHtml(post.title.rendered);
		const content = stripHtml(post.content.rendered);
		const postYear = new Date(post.date).getFullYear();

		// Skip "program overview" posts that list multiple events
		// These typically have "program" in the title and list several dates
		const dateMatches = content.match(
			/\d{1,2}\.\s*(?:januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)/gi
		);
		if (dateMatches && dateMatches.length > 3) {
			console.log(`  Skip overview post: "${title}" (${dateMatches.length} dates)`);
			continue;
		}

		// Extract date from content
		const eventDate = extractDate(content, postYear);
		if (!eventDate) {
			console.log(`  Skip (no date): "${title}"`);
			continue;
		}

		// Skip past events (compare date strings to avoid timezone issues)
		const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		if (eventDate.dateStr < todayStr) continue;

		found++;

		// Check existence
		if (await eventExists(post.link)) continue;

		// Extract time
		const time = extractTime(content);
		const offset = bergenOffset(eventDate.month);

		let dateStart: string;
		let dateEnd: string | undefined;

		if (time) {
			dateStart = new Date(
				`${eventDate.dateStr}T${String(time.startHour).padStart(2, '0')}:${String(time.startMin).padStart(2, '0')}:00${offset}`
			).toISOString();

			if (time.endHour !== undefined && time.endMin !== undefined) {
				dateEnd = new Date(
					`${eventDate.dateStr}T${String(time.endHour).padStart(2, '0')}:${String(time.endMin).padStart(2, '0')}:00${offset}`
				).toISOString();
			}
		} else {
			dateStart = new Date(`${eventDate.dateStr}T18:00:00${offset}`).toISOString();
		}

		// Image from featured media
		const imageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || undefined;

		const category = guessCategory(title, content);
		const bydel = mapBydel(VENUE);

		const aiDesc = await generateDescription({ title, venue: VENUE, category, date: new Date(dateStart), price: '' });

		const success = await insertEvent({
			slug: makeSlug(title, dateStart),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: VENUE,
			address: ADDRESS,
			bydel,
			price: '',
			ticket_url: post.link,
			source: SOURCE,
			source_url: post.link,
			image_url: imageUrl,
			age_group: category === 'family' ? 'family' : 'all',
			language: title.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${eventDate.dateStr})`);
			inserted++;
		}
	}

	return { found, inserted };
}
