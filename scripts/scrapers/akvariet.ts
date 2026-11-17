import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, updateEventImage, fetchHTML, delay, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'akvariet';
const BASE_URL = 'https://www.akvariet.no';
// Nettstedet ble bygd om høsten 2026: den gamle `/hva-skjer/aktivitetskalender/dag/<dato>`
// svarer 404, og programmet ligger nå på `/program?date=<dato>`. Skraperen fant 0 i
// minst 14 dager uten at kjøringen ble merket som feilet.
const PROGRAM_URL = `${BASE_URL}/program`;
const DAYS_AHEAD = 14;

// Akvariet fixed admission price — activities are included in general admission.
// Update when prices change.
// (Last verified: May 2026, reminder set for ~May 2027)
const ADMISSION_PRICE = 'Inkl. i billett (voksen 415 kr, barn 265 kr, familie 1 145 kr)';
const AFTERNOON_PRICE = 'Inkl. i ettermiddagsbillett kl. 16-18 (voksen 355 kr, barn 225 kr, familie 970 kr)';

// Egen side for «En natt på Akvariet» (ikke i dagsprogrammet). Etter ombyggingen
// står datoen bare i teksten («Når skjer det? Fredag 29. januar kl. 17:00 til
// lørdag 30. januar 2027 kl. 07:30»), med én felles billettlenke.
const OVERNATTING_URL = `${BASE_URL}/en-natt-paa-akvariet`;
const OVERNATTING_PRICE = '1030 kr (960 kr for årskortbrukere)';

const NORWEGIAN_MONTHS: Record<string, number> = {
	januar: 1, februar: 2, mars: 3, april: 4, mai: 5, juni: 6,
	juli: 7, august: 8, september: 9, oktober: 10, november: 11, desember: 12,
};

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
export function isCinemaFilm(title: string): boolean {
	return /\((?:norsk tale|english|norwegian|engelsk tale)/i.test(title)
		|| /\bsub:\s*(?:engelsk|english|norsk|norwegian)/i.test(title);
}

/** Kino fra Akvariet-programmet: navngitt film eller språkmerke i tittelen. */
export function isFilm(title: string): boolean {
	return RECURRING_FILMS.includes(normalizeActivityTitle(title)) || isCinemaFilm(title);
}

function normalizeActivityTitle(title: string): string {
	return title
		.replace(/&quot;/g, '"')
		.replace(/["""]/g, '')
		.replace(/\s*\(norsk\)\s*/gi, '')
		.replace(/\s*\(engelsk\)\s*/gi, '')
		.replace(/\s*\(english\)\s*/gi, '')
		.trim()
		.toLowerCase();
}

function guessCategory(title: string): string {
	const lower = title.toLowerCase();
	if (/konsert|concert/.test(lower)) return 'music';
	if (/film|kino|prince|prinsen|dokumentar/.test(lower)) return 'culture';
	if (/workshop|kurs|lær/.test(lower)) return 'workshop';
	return 'family';
}

export interface AkvarietActivity {
	title: string;
	time: string;
	endTime: string;
	location: string;
	description: string;
	imageUrl?: string;
	detailUrl?: string;
	isHighlight: boolean;
}

/**
 * Les ett dagsprogram fra `/program?date=<dato>`.
 * Hvert kort er en `<details>`: i `<summary>` står tid (`tabular-nums`),
 * tittel (`text-h5`) og sted (`text-body-small`); under står bilde,
 * beskrivelse og en «Les mer»-lenke til `/program/<navn>?date=<dato>`.
 */
export function parseDay(html: string): AkvarietActivity[] {
	const $ = cheerio.load(html);
	const activities: AkvarietActivity[] = [];

	$('details').each((_i, el) => {
		const card = $(el);
		const summary = card.children('summary');

		// Tittel: fjern kapasitetsmerknader som varierer fra dag til dag
		const rawTitle = summary.find('.text-h5').first().text().trim()
			.replace(/\s*-\s*Begrenset antall.*/i, '')
			.replace(/\s*\.\s*Spør etter.*/i, '');
		if (!rawTitle) return;

		// «15:00 – 15:15» (tankestrek) eller «15:00 - 15:15»
		const timeText = summary.find('.tabular-nums').first().text().trim();
		const timeMatch = timeText.match(/(\d{1,2}[:.]\d{2})(?:\s*[-–—]\s*(\d{1,2}[:.]\d{2}))?/);
		const norm = (t?: string) => (t ? t.replace('.', ':').padStart(5, '0') : '');
		const time = norm(timeMatch?.[1]);
		const endTime = norm(timeMatch?.[2]);

		// Akvariet merker sine anbefalte aktiviteter med et «Høydepunkt»-merke
		// (avrundet .text-body-small foran tittelen). Stedet er .text-body-small etter tittelen.
		const isHighlight = summary.find('.rounded-full').filter((_j, b) => /høydepunkt/i.test($(b).text())).length > 0;
		const location = summary.find('.text-h5').first().nextAll('.text-body-small').first().text().trim();
		const body = card.children().not('summary');
		const description = body.find('p').first().text().trim();
		const imageUrl = body.find('img').first().attr('src') || undefined;

		const detailLink = body.find('a[href*="/program/"]').first().attr('href');
		const detailUrl = detailLink
			? (detailLink.startsWith('http') ? detailLink : `${BASE_URL}${detailLink}`)
			: undefined;

		activities.push({ title: rawTitle, time, endTime, location, description, imageUrl, detailUrl, isHighlight });
	});

	return activities;
}

/**
 * Finn datoen for «En natt på Akvariet» i teksten:
 * «Når skjer det? Fredag 29. januar kl. 17:00 til lørdag 30. januar 2027 kl. 07:30.»
 * Året står ofte bare på sluttdatoen. Gir null når setningen ikke finnes, slik
 * at en ny formulering gir 0 funnet, ikke en gal dato.
 */
export function parseOvernattingDate(html: string): {
	startDate: string; startTime: string; endDate: string; endTime: string;
} | null {
	const $ = cheerio.load(html);
	$('script, style').remove();
	const text = $('body').text().replace(/\s+/g, ' ');
	const m = text.match(
		/Når skjer det\?\s*\p{L}+\s+(\d{1,2})\.\s*(\p{L}+)(?:\s+(\d{4}))?\s+kl\.?\s*(\d{1,2}[:.]\d{2})\s+til\s+\p{L}+\s+(\d{1,2})\.\s*(\p{L}+)\s+(\d{4})\s+kl\.?\s*(\d{1,2}[:.]\d{2})/u
	);
	if (!m) return null;
	const sMonth = NORWEGIAN_MONTHS[m[2].toLowerCase()];
	const eMonth = NORWEGIAN_MONTHS[m[6].toLowerCase()];
	if (!sMonth || !eMonth) return null;
	const eYear = parseInt(m[7], 10);
	const sYear = m[3] ? parseInt(m[3], 10) : (sMonth > eMonth ? eYear - 1 : eYear);
	const pad = (n: number) => String(n).padStart(2, '0');
	const t = (s: string) => s.replace('.', ':').padStart(5, '0');
	return {
		startDate: `${sYear}-${pad(sMonth)}-${pad(parseInt(m[1], 10))}`,
		startTime: t(m[4]),
		endDate: `${eYear}-${pad(eMonth)}-${pad(parseInt(m[5], 10))}`,
		endTime: t(m[8]),
	};
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
	const ticketHref = $('a[href*="billett.akvariet.no/arrangementer/"]').first().attr('href');

	const when = parseOvernattingDate(html);
	if (!when) {
		console.warn(`[${SOURCE}]   Fant ingen dato på overnattingssiden («Når skjer det?» mangler)`);
		return { found, inserted };
	}

	{
		const { startDate: dateStr, startTime, endDate: endDateStr, endTime } = when;
		const dateStart = new Date(`${dateStr}T${startTime}:00${bergenOffset(dateStr)}`).toISOString();
		if (new Date(dateStart) < new Date()) return { found, inserted };

		found++;

		const ticketUrl = ticketHref || OVERNATTING_URL;
		const sourceUrl = `${OVERNATTING_URL}#${dateStr}`;

		if (await eventExists(sourceUrl)) return { found, inserted };

		const dateEnd = new Date(`${endDateStr}T${endTime}:00${bergenOffset(endDateStr)}`).toISOString();

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
	let failedDays = 0;
	let emptyDays = 0;

	const today = new Date();

	for (let d = 0; d < DAYS_AHEAD; d++) {
		const date = new Date(today);
		date.setDate(today.getDate() + d);
		const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD

		const url = `${PROGRAM_URL}?date=${dateStr}`;

		if (d > 0) await delay(1500);

		const html = await fetchHTML(url);
		if (!html) {
			console.warn(`[${SOURCE}]   Failed to fetch ${dateStr}`);
			failedDays++;
			continue;
		}

		const activities = parseDay(html);
		if (activities.length === 0) emptyDays++;

		let daySpecialCount = 0;
		for (const activity of activities) {
			// Bare det Akvariet selv merker «Høydepunkt» (avgjort 2026-11-17). Fôringer og
			// visninger uten merket går flere ganger i uka og drukner resten av lista.
			// Kino aldri, selv om den skulle bli merket: Ingvild ba om det 2026-04-20.
			if (!activity.isHighlight) continue;
			if (isFilm(activity.title)) continue;

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
			const sourceUrl = `${PROGRAM_URL}?date=${dateStr}#${titleSlug}`;

			// Resolve image first so we can update existing events that lack one
			let imageUrl = activity.imageUrl;
			if (!imageUrl && activity.detailUrl) {
				imageUrl = await fetchDetailImage(activity.detailUrl);
			}

			if (await eventExists(sourceUrl)) {
				if (imageUrl) await updateEventImage(sourceUrl, imageUrl);
				continue;
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
			const ticketUrl = activity.detailUrl || `${PROGRAM_URL}?date=${dateStr}`;

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

	// Akvariet har daglige aktiviteter (pingvin, sjøløve) hver dag. Ingen kort på
	// noen dag betyr at adressen eller HTML-en er endret, ikke at programmet er tomt.
	// Uten dette ble 14 dager med 404 logget som en vanlig kjøring med «found 0».
	if (failedDays + emptyDays === DAYS_AHEAD) {
		throw new Error(`Akvariet: ingen aktiviteter på ${DAYS_AHEAD} dager (${failedDays} feilet, ${emptyDays} tomme). Sjekk ${PROGRAM_URL}`);
	}
	return { found, inserted };
}
