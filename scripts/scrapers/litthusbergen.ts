import * as cheerio from 'cheerio';
import { mapBydel, isFamilyTitle } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'litthusbergen';
const BASE_URL = 'https://www.litthusbergen.no/program';
const PAGE_PARAM = '90422230_page';

/**
 * Starttidspunktet slik programsidens h3-tekst oppgir det.
 *
 * Hver bit ligger i sitt eget h3-element, saa `.text()` limer sammen
 * dag + dato + maaned + tid HELT uten skilletegn:
 *
 *     "Tirs.08.0918:30–21:00Petrichor skrivegruppe"
 *
 * FEILEN SOM VAR HER (rettet 2. september 2026): uttrykket krevde et
 * ikke-siffer foran timetallet, for aa unngaa treff som «38:30». Men
 * maanedstallet limer seg rett foran starttiden — «...08.0918:30» — saa
 * starten hadde alltid et siffer foran seg og ble hoppet over. Det foerste
 * lovlige treffet ble SLUTT-tiden, som staar rett etter tankestreken.
 *
 * Alle 25 arrangementene paa programsiden ble rammet, og leseren fikk beskjed
 * om aa moete opp naar arrangementet var slutt: «Oster og sidere» 4. september
 * sto 22:00 mot reelle 19:00. 97 rader maatte rettes i basen.
 *
 * LOESNINGEN: fjern datoprefikset foerst. Da kan ingen sifre lime seg foran
 * klokkeslettet, og det foerste treffet er starten.
 *
 * Eksportert med vilje: bade `rett-litthusbergen-klokkeslett.ts` og testen
 * bruker den. Ligger regelen tre steder, kan de tre drifte fra hverandre —
 * og da kan testen vaere groenn mens scraperen tar feil.
 */
export function startTidFraH3(h3Text: string): string {
	const utenDatoprefiks = h3Text.replace(/^\D*\d{1,2}\.\d{2}/, '');
	const m = utenDatoprefiks.match(/([01]?\d|2[0-3]):([0-5]\d)/);
	// Timetallet kan mangle ledende null («8:30»), og ISO krever to sifre.
	return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '19:00';
}

/** Fetch detail page for price and ticket URL */
async function fetchDetailPrice(url: string): Promise<{ price: string; ticketUrl?: string }> {
	const html = await fetchHTML(url);
	if (!html) return { price: '' };
	const $ = cheerio.load(html);

	// Ticket URL from "Kjøp billett" button linking to TicketCo
	const ticketLink = $('a.button-kjop-billett:not(.w-condition-invisible)').attr('href');
	const ticketUrl = ticketLink || undefined;

	// Price from bold text in rich text body (e.g. "60,–" or "100,–")
	let price = '';
	$('.rich-text-block-2 strong').each((_, el) => {
		const text = $(el).text().trim();
		const m = text.match(/^(\d+)\s*,[-–]?\s*$/);
		if (m) price = `${m[1]} kr`;
	});

	// Also check for "Gratis" badge being visible on detail page
	if (!price && $('.event-gratis:not(.w-condition-invisible)').length > 0) {
		price = 'Gratis';
	}

	return { price, ticketUrl };
}

/** Parse "Feb 20, 2026" → "2026-02-20" (timezone-safe: uses local date parts) */
function parseEnglishDate(str: string): string | null {
	const d = new Date(str);
	if (isNaN(d.getTime())) return null;
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function guessCategory(title: string, tags: string[]): string {
	const text = `${title} ${tags.join(' ')}`.toLowerCase();
	if (text.includes('konsert') || text.includes('musikk') || text.includes('concert')) return 'music';
	if (isFamilyTitle(text) || text.includes('kids')) return 'family';
	if (text.includes('lesesirkel') || text.includes('bokgruppe')) return 'culture';
	if (text.includes('kurs') || text.includes('workshop') || text.includes('skriv')) return 'workshop';
	if (text.includes('debatt') || text.includes('samtale') || text.includes('foredrag')) return 'culture';
	if (text.includes('quiz')) return 'nightlife';
	if (text.includes('festival')) return 'festival';
	return 'culture';
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching Litteraturhuset i Bergen events...`);

	let found = 0;
	let inserted = 0;
	let page = 1;
	const maxPages = 5;

	while (page <= maxPages) {
		const url = page === 1 ? BASE_URL : `${BASE_URL}?${PAGE_PARAM}=${page}`;
		const html = await fetchHTML(url);
		if (!html) {
			if (page === 1) console.error(`[${SOURCE}] Failed to fetch page ${page}`);
			break;
		}

		const $ = cheerio.load(html);
		// Scope to #program-list to avoid JetBoost filter checkboxes (also .w-dyn-item)
		const items = $('#program-list .w-dyn-item');

		if (items.length === 0) break;

		if (page === 1) console.log(`[${SOURCE}] Page ${page}: ${items.length} items`);

		const pageEvents: Array<{
			title: string;
			dateStart: string;
			dateEnd: string | undefined;
			time: string;
			room: string;
			tags: string[];
			sourceUrl: string;
			imageUrl: string | undefined;
			isFree: boolean;
			hasTicketButton: boolean;
		}> = [];

		items.each((_, el) => {
			const item = $(el);

			// Skip items without event links (structural wrappers)
			const link = item.find('a[href*="/arrangement/"]').attr('href');
			if (!link) return;

			// Title from [class*="name"] element
			const title = item.find('[class*="name"]').first().text().trim();
			if (!title) return;

			// Parse hidden date inputs ("Feb 20, 2026" format)
			const startRaw = item.find('input.event-start-date').attr('value') || '';
			const endRaw = item.find('input.event-end-date').attr('value') || '';
			const dateStart = parseEnglishDate(startRaw);
			if (!dateStart) return;
			const dateEnd = parseEnglishDate(endRaw) || undefined;

			const time = startTidFraH3(item.find('h3').text());

			// Room from .heading-3 element
			const room = item.find('[class*="heading-3"]').first().text().trim() ||
				'Litteraturhuset i Bergen';

			// Tags from category label
			const tags: string[] = [];
			item.find('.info-text-category-tablet, .filter-tag-link-block').each((_, tagEl) => {
				const tag = $(tagEl).text().trim();
				if (tag) tags.push(tag);
			});

			// Free indicator: check visible Gratis badge (not hidden by w-condition-invisible)
			const isFree = item.find('.event-gratis:not(.w-condition-invisible)').length > 0;
			const hasTicketButton = item.find('.button-kjop-billett:not(.w-condition-invisible)').length > 0;

			// Image
			const img = item.find('img').first();
			const imageUrl = img.attr('src') || undefined;

			const sourceUrl = `https://www.litthusbergen.no${link}`;

			pageEvents.push({ title, dateStart, dateEnd, time, room, tags, sourceUrl, imageUrl, isFree, hasTicketButton });
		});

		for (const ev of pageEvents) {
			found++;

			if (await eventExists(ev.sourceUrl)) continue;

			const category = guessCategory(ev.title, ev.tags);
			const bydel = mapBydel('Litteraturhuset');
			const offset = bergenOffset(ev.dateStart);

			// Validate date construction
			const startDate = new Date(`${ev.dateStart}T${ev.time}:00${offset}`);
			if (isNaN(startDate.getTime())) {
				console.error(`  [${SOURCE}] Bad date for "${ev.title}": ${ev.dateStart} ${ev.time}`);
				continue;
			}
			const dateStart = startDate.toISOString();
			let dateEnd: string | undefined;
			// Sluttdato som ligger FOER startdatoen er alltid feil, og kilden har
			// levert den: 2. september 2026 hadde «Petrichor skrivegruppe» 22.
			// september sluttdato 15. september. Da er feltet ubrukelig, og en
			// tom sluttdato er riktigere enn en umulig. Uten denne vakten laa
			// raden og roedet den sperrende `slutt-foer-start`-sjekken.
			if (ev.dateEnd && ev.dateEnd !== ev.dateStart && ev.dateEnd > ev.dateStart) {
				const end = new Date(`${ev.dateEnd}T22:00:00${bergenOffset(ev.dateEnd)}`);
				dateEnd = isNaN(end.getTime()) ? undefined : end.toISOString();
			}

			// Fetch detail page for price and ticket URL
			let price = ev.isFree ? 'Gratis' : '';
			let ticketUrl = ev.sourceUrl;
			if (!ev.isFree) {
				await delay(1000);
				const detail = await fetchDetailPrice(ev.sourceUrl);
				if (detail.price) price = detail.price;
				if (detail.ticketUrl) ticketUrl = detail.ticketUrl;
			}

			const roomHint = ev.room && ev.room !== 'Litteraturhuset i Bergen' ? ev.room : undefined;
			const aiDesc = await generateDescription({ title: ev.title, venue: 'Litteraturhuset i Bergen', category, date: startDate, price, room: roomHint });
			const success = await insertEvent({
				slug: makeSlug(ev.title, ev.dateStart),
				title_no: ev.title,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				title_en: aiDesc.title_en,
				category,
				date_start: dateStart,
				date_end: dateEnd,
				venue_name: 'Litteraturhuset i Bergen',
				address: 'Østre Skostredet 5-7, Bergen',
				bydel,
				price,
				ticket_url: ticketUrl,
				source: SOURCE,
				source_url: ev.sourceUrl,
				image_url: ev.imageUrl,
				age_group: ev.tags.some(t => t.toLowerCase().includes('barn')) ? 'family' : 'all',
				language: ev.tags.some(t => t.toLowerCase().includes('english')) ? 'en' : 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${ev.title} (${category}${ev.isFree ? ', gratis' : ''})`);
				inserted++;
			}
		}

		page++;
		if (page <= maxPages) await delay(1500);
	}

	return { found, inserted };
}
