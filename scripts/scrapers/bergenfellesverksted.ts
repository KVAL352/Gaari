import { makeSlug, eventExists, insertEvent, bergenOffset, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';
import { resolveTicketUrl } from '../lib/venues.js';

const SOURCE = 'bergenfellesverksted';
const API_URL = 'https://www.bergenfellesverksted.no/wp-json/tribe/events/v1/events';
const VENUE = 'Bergen Fellesverksted';
const ADDRESS = 'Damsgårdsveien 227, Bergen';
const BYDEL = 'Laksevåg';

// Kategorier som er medlemskap-gate, ikke åpne for alle: onboarding for folk
// som allerede har meldt seg inn, og kurs merket "Members Only" i tittelen.
// CLAUDE.md sier ingen non-public events — dette er den non-public-klassen
// hos denne kilden.
const MEMBERS_ONLY_CATEGORY_SLUGS = new Set(['new-member-introduction']);

const WORKSHOP_CATEGORY_SLUGS = new Set([
	'smikurs', 'cnc-fresing', 'cad-design', 'laserkutting', 'sykkellab',
	'figurmaling', 'hekling-og-strikking', 'spikking', 'glassmaleri',
	'tredreiing', 'cosplay', 'robot-rumble', 'kurs',
	'introduction-to-wood-workshop', 'introduksjon-til-metallverksted',
]);

interface TribeCategory {
	slug: string;
}

interface TribeEvent {
	id: number;
	title: string;
	description: string;
	url: string;
	start_date: string;
	end_date?: string;
	cost: string;
	cost_details?: { values?: string[] };
	image?: { url?: string } | false;
	categories?: TribeCategory[];
}

interface TribeResponse {
	events: TribeEvent[];
	total_pages: number;
}

function decodeEntities(text: string): string {
	return text
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
		.replace(/&amp;/g, '&')
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"');
}

function isMembersOnly(title: string, slugs: string[]): boolean {
	return /members only/i.test(title) || slugs.some(s => MEMBERS_ONLY_CATEGORY_SLUGS.has(s));
}

function mapCategory(slugs: string[]): string {
	if (slugs.includes('barneaktivitet')) return 'family';
	if (slugs.includes('ungdomsklubb')) return 'student';
	if (slugs.some(s => WORKSHOP_CATEGORY_SLUGS.has(s))) return 'workshop';
	return 'culture';
}

// `cost` kommer ferdig formatert fra Tribe ("300,00kr", "500,00kr-950,00kr",
// "Gratis" eller tom streng når arrangøren ikke har satt pris). Vi leser den
// strukturerte verdien i stedet for fritekst — teksten i beskrivelsen bruker
// ord som "kostnadsfritt" om forbruksvarer, ikke om arrangementet, og
// insertEvent sin egen fritekst-gjetting ville slått ut der.
function formatPrice(cost: string, values?: string[]): string {
	const decoded = decodeEntities(cost).trim();
	const hasRealValue = values && values.some(v => v && v !== '0');
	if (!hasRealValue) return 'Gratis';
	return decoded.replace(/kr/gi, ' kr').replace(/\s+/g, ' ').trim();
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Bergen Fellesverksted events via Tribe Events API...`);

	let found = 0;
	let inserted = 0;
	let page = 1;
	let totalPages = 1;

	do {
		const url = `${API_URL}?per_page=50&page=${page}&status=publish`;
		let data: TribeResponse;
		try {
			const res = await fetch(url, {
				headers: {
					'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
					'Accept': 'application/json',
				},
			});
			if (!res.ok) {
				console.error(`[${SOURCE}] API returned ${res.status} on page ${page}`);
				break;
			}
			data = await res.json();
		} catch (err: any) {
			console.error(`[${SOURCE}] API error: ${err.message}`);
			break;
		}

		totalPages = data.total_pages || 1;
		console.log(`[${SOURCE}] Page ${page}/${totalPages}: ${data.events.length} events`);

		for (const ev of data.events) {
			const title = decodeEntities(ev.title);
			const slugs = (ev.categories || []).map(c => c.slug);

			if (isMembersOnly(title, slugs)) continue;

			found++;
			if (await eventExists(ev.url)) continue;

			const [datePart, timePart] = ev.start_date.split(' ');
			if (!datePart || !timePart) continue;
			const offset = bergenOffset(datePart);
			const dateStart = new Date(`${datePart}T${timePart}${offset}`).toISOString();
			if (isNaN(new Date(dateStart).getTime())) continue;

			let dateEnd: string | undefined;
			if (ev.end_date && ev.end_date !== ev.start_date) {
				const [endDatePart, endTimePart] = ev.end_date.split(' ');
				if (endDatePart && endTimePart) {
					const endOffset = bergenOffset(endDatePart);
					dateEnd = new Date(`${endDatePart}T${endTimePart}${endOffset}`).toISOString();
				}
			}

			const category = mapCategory(slugs);
			const price = formatPrice(ev.cost, ev.cost_details?.values);
			const imageUrl = (ev.image && ev.image.url) || undefined;
			const ticketUrl = resolveTicketUrl(VENUE, ev.url);

			const aiDesc = await generateDescription({
				title,
				venue: VENUE,
				category,
				date: new Date(dateStart),
				price,
				bydel: BYDEL,
				address: ADDRESS,
			});

			const success = await insertEvent({
				slug: makeSlug(title, dateStart),
				title_no: title,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				title_en: aiDesc.title_en,
				category,
				date_start: dateStart,
				date_end: dateEnd,
				venue_name: VENUE,
				address: ADDRESS,
				bydel: BYDEL,
				price,
				ticket_url: ticketUrl,
				source: SOURCE,
				source_url: ev.url,
				image_url: imageUrl,
				age_group: category === 'family' ? 'family' : 'all',
				language: 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${title} (${category}, ${datePart})`);
				inserted++;
			}
		}

		page++;
		if (page <= totalPages) await delay(1500);
	} while (page <= totalPages);

	return { found, inserted };
}
