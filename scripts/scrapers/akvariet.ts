import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'akvariet';
const BASE_URL = 'https://www.akvariet.no';
const CALENDAR_URL = `${BASE_URL}/hva-skjer/aktivitetskalender/dag`;
const DAYS_AHEAD = 14;

// Akvariet fixed admission price — activities are included in general admission.
// Update when prices change. Prices change from May 1, 2026.
// (Last verified: Mar 2026, reminder set for Mar 2027)
const ADMISSION_PRICE = 'Inkl. i billett (fra 245 kr)';
const AFTERNOON_PRICE = 'Inkl. i billett (ettermiddagsbillett fra kl. 16)';

// Special article page for the recurring "sleepover at Akvariet" event.
// This is published as a news article (not in the daily activity calendar) and
// lists upcoming dates as ticket links like
// `/kjop-billett/overnatting-en-natt-paa-akvariet-17-april-2026`.
const OVERNATTING_URL = `${BASE_URL}/nyheter/en-natt-paa-akvariet-overnatting-paa-akvariet`;
const OVERNATTING_PRICE = '1030 kr (960 kr for årskortbrukere)';

const NORWEGIAN_MONTHS: Record<string, number> = {
	januar: 1, februar: 2, mars: 3, april: 4, mai: 5, juni: 6,
	juli: 7, august: 8, september: 9, oktober: 10, november: 11, desember: 12,
};

// Recurring daily activities to skip — these repeat every day and are not discrete "events".
// Only skip on exact (case-insensitive) title match. Unique variants like
// "Vinterferieprogram: Bli kjent med havskilpadden" will still be captured.
const RECURRING_TITLES = [
	'pingvin',
	'sjøløve',
	'oter',
	'tropisk',
	'fiskefôring i rotunden',
	'åpen røktergang',
	'møt dyrepasser',
];

// Films/documentaries that screen daily — recurring, not unique events.
// Ingvild (markedskoordinator) ba oss eksplisitt 2026-04-20 om ikke å vise
// kinofilmer fra Akvariet-programmet: "det er dyrepresentasjonene som er
// grunnen til å gå på Akvariet". Alle kino-titler ekskluderes fra Gåri.
const RECURRING_FILMS = [
	'dyrevelferd på akvariet',
	'the little prince',
	'den lille prinsen',
	'kaos i pingvindammen',
	'til svalbard med seilbåt',
];

// Heuristic: cinema films often carry language indicators like "(norsk tale)",
// "(english)", "sub: engelsk". Catches new films Akvariet adds without us
// updating RECURRING_FILMS.
function isCinemaFilm(title: string): boolean {
	return /\((?:norsk tale|english|norwegian|engelsk tale)/i.test(title)
		|| /\bsub:\s*(?:engelsk|english|norsk|norwegian)/i.test(title);
}

function isRecurring(title: string): boolean {
	const normalized = title
		.replace(/&quot;/g, '"')
		.replace(/["""]/g, '')
		.replace(/\s*\(norsk\)\s*/gi, '')
		.replace(/\s*\(engelsk\)\s*/gi, '')
		.replace(/\s*\(english\)\s*/gi, '')
		.trim()
		.toLowerCase();

	return RECURRING_TITLES.includes(normalized) || RECURRING_FILMS.includes(normalized);
}

function guessCategory(title: string): string {
	const lower = title.toLowerCase();
	if (/konsert|concert/.test(lower)) return 'music';
	if (/film|kino|prince|prinsen|dokumentar/.test(lower)) return 'culture';
	if (/workshop|kurs|lær/.test(lower)) return 'workshop';
	return 'family';
}

/**
 * Scrape one day of the Akvariet activity calendar.
 * Returns array of parsed activity cards.
 */
function parseDay($: cheerio.CheerioAPI, dateStr: string) {
	const activities: Array<{
		title: string;
		time: string;
		endTime: string;
		location: string;
		description: string;
		imageUrl?: string;
		detailUrl?: string;
		isHighlight: boolean;
	}> = [];

	// Each activity card is a div.row.mb-3.p-3.border inside the container
	$('div.row.mb-3.p-3.border').each((_i, el) => {
		const card = $(el);

		// Highlight: Akvariet marks featured activities with bg-info (blue background)
		const isHighlight = card.hasClass('bg-info');

		// Time: first <span> with text-primary inside the time column
		const timeText = card.find('.col-3 span.text-primary, .col-lg-2 span.text-primary').first().text().trim();
		// Extract start and end time (e.g. "10:30" and "10:45" from "10:30 - 10:45")
		const timeMatch = timeText.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
		const time = timeMatch ? timeMatch[1] : '';
		const endTime = timeMatch ? timeMatch[2] : '';

		// Title: h3 inside the card — strip capacity notes that vary day-to-day
		const rawTitle = card.find('h3').first().text().trim()
			.replace(/&quot;/g, '"')
			.replace(/\s*-\s*Begrenset antall.*/i, '')
			.replace(/\s*\.\s*Spør etter.*/i, '');
		if (!rawTitle) return;

		// Location: span.fw-normal after the title
		const location = card.find('.d-flex.flex-column span.fw-normal').first().text().trim();

		// Description: paragraph inside the collapse section
		const description = card.find('.collapse p').first().text().trim();

		// Image: img.img-fluid inside <picture> in the collapse section
		const imgSrc = card.find('.collapse picture img.img-fluid').first().attr('src');
		const imageUrl = imgSrc || undefined;

		// Detail link: "Les mer" button
		const detailLink = card.find('.collapse a.btn-primary[href]').first().attr('href');
		let detailUrl: string | undefined;
		if (detailLink) {
			detailUrl = detailLink.startsWith('http') ? detailLink : `${BASE_URL}${detailLink}`;
		}

		activities.push({ title: rawTitle, time, endTime, location, description, imageUrl, detailUrl, isHighlight });
	});

	return activities;
}

/**
 * Fetch og:image from an Akvariet detail page as fallback when the calendar card has no image.
 */
async function fetchDetailImage(url: string): Promise<string | undefined> {
	await delay(1200);
	const html = await fetchHTML(url);
	if (!html) return undefined;
	const $ = cheerio.load(html);
	return $('meta[property="og:image"]').attr('content') || undefined;
}

/**
 * Scrape the dedicated "Overnatting på Akvariet" article page for upcoming
 * sleepover dates. Each future date listed as a ticket link becomes one event.
 */
async function scrapeOvernatting(): Promise<{ found: number; inserted: number }> {
	let found = 0;
	let inserted = 0;

	const html = await fetchHTML(OVERNATTING_URL);
	if (!html) {
		console.warn(`[${SOURCE}]   Failed to fetch overnatting article`);
		return { found, inserted };
	}

	const $ = cheerio.load(html);
	const ogImage = $('meta[property="og:image"]').attr('content') || undefined;

	// Match ticket links like /kjop-billett/overnatting-en-natt-paa-akvariet-17-april-2026
	const seen = new Set<string>();
	const dates: Array<{ year: number; month: number; day: number; href: string }> = [];

	$('a[href*="/kjop-billett/overnatting-en-natt-paa-akvariet-"]').each((_i, el) => {
		const href = $(el).attr('href');
		if (!href || seen.has(href)) return;
		seen.add(href);
		const m = href.match(/overnatting-en-natt-paa-akvariet-(\d{1,2})-([a-zæøå]+)-(\d{4})/i);
		if (!m) return;
		const day = parseInt(m[1], 10);
		const month = NORWEGIAN_MONTHS[m[2].toLowerCase()];
		const year = parseInt(m[3], 10);
		if (!month) return;
		dates.push({ year, month, day, href });
	});

	const todayMidnight = new Date();
	todayMidnight.setHours(0, 0, 0, 0);

	for (const { year, month, day, href } of dates) {
		const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		const eventDate = new Date(`${dateStr}T00:00:00Z`);
		if (eventDate < todayMidnight) continue;

		found++;

		const ticketUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
		const sourceUrl = ticketUrl;

		if (await eventExists(sourceUrl)) continue;

		const offset = bergenOffset(dateStr);
		const dateStart = new Date(`${dateStr}T17:00:00${offset}`).toISOString();
		// Sleepover ends next morning around 09:00
		const endDate = new Date(eventDate);
		endDate.setUTCDate(endDate.getUTCDate() + 1);
		const endDateStr = endDate.toISOString().slice(0, 10);
		const dateEnd = new Date(`${endDateStr}T09:00:00${bergenOffset(endDateStr)}`).toISOString();

		const title = 'Overnatting på Akvariet';
		const aiDesc = await generateDescription({
			title,
			venue: 'Akvariet i Bergen',
			category: 'family',
			date: dateStart,
			price: OVERNATTING_PRICE,
		});

		const success = await insertEvent({
			slug: makeSlug(title, dateStr),
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category: 'family',
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: 'Akvariet i Bergen',
			address: 'Nordnesbakken 4, 5005 Bergen',
			bydel: 'Bergenhus',
			price: OVERNATTING_PRICE,
			ticket_url: ticketUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: ogImage,
			age_group: 'family',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} (${dateStr}) [family] ★`);
			inserted++;
		}
	}

	return { found, inserted };
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Scraping Akvariet activity calendar (next ${DAYS_AHEAD} days)...`);

	let found = 0;
	let inserted = 0;

	const today = new Date();

	for (let d = 0; d < DAYS_AHEAD; d++) {
		const date = new Date(today);
		date.setDate(today.getDate() + d);
		const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD

		const url = `${CALENDAR_URL}/${dateStr}`;

		if (d > 0) await delay(1500);

		const html = await fetchHTML(url);
		if (!html) {
			console.warn(`[${SOURCE}]   Failed to fetch ${dateStr}`);
			continue;
		}

		const $ = cheerio.load(html);
		const activities = parseDay($, dateStr);

		let daySpecialCount = 0;
		for (const activity of activities) {
			// Skip recurring daily activities and cinema films
			if (isRecurring(activity.title) || isCinemaFilm(activity.title)) continue;

			// Previously filtered on bg-info highlight class, but Akvariet removed it (Mar 2026).
			// Now we rely solely on isRecurring() to skip daily repeating activities.

			daySpecialCount++;
			found++;

			// Build unique source_url per event per day
			// Strip capacity notes ("Begrenset antall plasser...") before slugifying
			// so the same activity with/without the suffix maps to one source_url
			const titleForSlug = activity.title
				.replace(/\s*-\s*Begrenset antall.*/i, '')
				.replace(/\s*\.\s*Spør etter.*/i, '');
			const titleSlug = titleForSlug
				.toLowerCase()
				.replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/[å]/g, 'a')
				.replace(/["""]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
			const sourceUrl = `${BASE_URL}/hva-skjer/aktivitetskalender/dag/${dateStr}#${titleSlug}`;

			if (await eventExists(sourceUrl)) continue;

			// Fallback: fetch og:image from detail page if calendar card had no image
			let imageUrl = activity.imageUrl;
			if (!imageUrl && activity.detailUrl) {
				imageUrl = await fetchDetailImage(activity.detailUrl);
			}

			// Build ISO timestamp
			const offset = bergenOffset(dateStr);
			const time = activity.time || '10:00';
			const dateStart = new Date(`${dateStr}T${time}:00${offset}`).toISOString();

			// date_end from parsed end time
			let dateEnd: string | undefined;
			if (activity.endTime) {
				dateEnd = new Date(`${dateStr}T${activity.endTime}:00${offset}`).toISOString();
			}

			// Activities from 16:00+ have cheaper afternoon ticket
			const startHour = parseInt(time.split(':')[0], 10);
			const price = startHour >= 16 ? AFTERNOON_PRICE : ADMISSION_PRICE;

			const category = guessCategory(activity.title);

			const aiDesc = await generateDescription({
				title: activity.title,
				venue: 'Akvariet i Bergen',
				category,
				date: dateStart,
				price,
			});

			// Link to the day's calendar page so visitors see the full programme
			const ticketUrl = activity.detailUrl || `${CALENDAR_URL}/${dateStr}`;

			const success = await insertEvent({
				slug: makeSlug(activity.title, dateStr),
				title_no: activity.title,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				title_en: aiDesc.title_en,
				category,
				date_start: dateStart,
				date_end: dateEnd,
				venue_name: 'Akvariet i Bergen',
				address: 'Nordnesbakken 4, 5005 Bergen',
				bydel: 'Bergenhus',
				price,
				ticket_url: ticketUrl,
				source: SOURCE,
				source_url: sourceUrl,
				image_url: imageUrl,
				age_group: 'family',
				language: 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${activity.title} (${dateStr} ${time}${activity.endTime ? '-' + activity.endTime : ''}) [${category}]${activity.isHighlight ? ' ★' : ''}`);
				inserted++;
			}
		}

		if (daySpecialCount > 0) {
			console.log(`[${SOURCE}]   ${dateStr}: ${activities.length} total, ${daySpecialCount} special events`);
		}
	}

	console.log(`[${SOURCE}] Scraping overnatting article page...`);
	const overnatting = await scrapeOvernatting();
	found += overnatting.found;
	inserted += overnatting.inserted;

	console.log(`[${SOURCE}] Done: found ${found}, inserted ${inserted}`);
	return { found, inserted };
}
