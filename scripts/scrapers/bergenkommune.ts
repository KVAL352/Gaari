import * as cheerio from 'cheerio';
import { mapCategory, mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'bergenkommune';
const BASE_URL = 'https://billett.bergen.kommune.no';
const LIST_URL = `${BASE_URL}/DNComponent/GetFilteredEventList`;
const MAX_PAGES = 30;
const DELAY_MS = 1000;

// Skip events not accessible to the general public (kindergartens, school visits, etc.)
const NON_PUBLIC_KEYWORDS = [
	'barnehage', 'barnehager', 'barnehagar', 'barnehagebarn',
	'klassebesøk', 'klassebesok', 'skoleklasse', 'skolebesøk', 'skolebesok',
	'kun for',
];

interface ListEvent {
	eventId: string;
	title: string;
	detailUrl: string;
	dateStart: string;
	dateEnd: string;
	venue: string;
	subtitle: string;
	imageUrl?: string;
	tags: string;
}

interface DetailData {
	price: string;
	description: string;
	time: string;
	address: string;
	organizer: string;
	isNonPublic: boolean;
}

function parseListPage(html: string): ListEvent[] {
	const $ = cheerio.load(html);
	const events: ListEvent[] = [];

	$('.event-block[data-dn-eid]').each((_, el) => {
		const $block = $(el);
		const eventId = $block.attr('data-dn-eid') || '';
		if (!eventId) return;

		const title = $block.find('h2.event-title').text().trim();
		if (!title || title.length < 3) return;

		const dateStart = $block.find('input.event-start-date').val() as string || '';
		const dateEnd = $block.find('input.event-end-date').val() as string || '';
		if (!dateStart) return;

		// Skip events that have already ended
		const endDate = dateEnd || dateStart;
		if (new Date(endDate) < new Date(new Date().toISOString().slice(0, 10))) return;

		const href = $block.find('a[href*="/Detaljer/EVENT/"]').attr('href') || '';
		const detailUrl = href ? `${BASE_URL}${href}` : `${BASE_URL}/Detaljer/EVENT/${eventId}`;

		// Venue from address span
		const addressEl = $block.find('.event-meta address');
		const venue = addressEl.text().replace('Sted:', '').replace(/\s+/g, ' ').trim();

		const subtitle = $block.find('.event-subtitle-display').text().trim();

		// Image
		const imgSrc = $block.find('img.event-thum-img').attr('src') || '';
		const imageUrl = imgSrc && !imgSrc.includes('icon_no-image') ? imgSrc : undefined;

		const tags = ($block.find('input.tags').val() as string) || '';

		events.push({
			eventId,
			title: title.slice(0, 200),
			detailUrl,
			dateStart,
			dateEnd,
			venue: venue || 'Bergen',
			subtitle,
			imageUrl,
			tags,
		});
	});

	return events;
}

async function fetchDetail(url: string): Promise<DetailData | null> {
	const html = await fetchHTML(url);
	if (!html) return null;

	const $ = cheerio.load(html);

	// Price detection: is-no-price → detail-event-price=0 → salesprice inputs → page text fallback
	const isNoPrice = ($('#is-no-price').val() as string || '').toLowerCase() === 'true';
	const detailEventPrice = parseInt($('input.detail-event-price').val() as string || '-1');
	let price = '';
	if (isNoPrice || detailEventPrice === 0) {
		price = 'Gratis';
	} else {
		// Extract non-zero ticket prices from salesprice inputs
		const prices: number[] = [];
		$('input.salesprice').each((_, el) => {
			const val = parseInt($(el).val() as string || '0');
			if (val > 0) prices.push(val);
		});
		if (prices.length > 0) {
			const min = Math.min(...prices);
			const max = Math.max(...prices);
			price = min === max ? `${min} kr` : `${min}–${max} kr`;
		} else {
			// Fallback: check visible price/ticket area text for "gratis"
			const priceAreaText = ($('.ticket-information, .price-info, .event-price, .billett-info').text()
				|| $('body').text()).toLowerCase();
			if (/\bgratis\b/.test(priceAreaText)) price = 'Gratis';
		}
	}

	// Description from .event-description
	const descHtml = $('.event-description .event-info').first();
	const description = descHtml.text().replace(/\s+/g, ' ').trim().slice(0, 500);

	// Time from next-evnt-time span
	const timeText = $('.next-evnt-time').first().text().replace('Tid:', '').replace('Tid', '').trim();

	// Address from Google Maps link
	let address = '';
	const mapsLink = $('a[href*="maps.google"]').first().attr('href') || '';
	if (mapsLink) {
		const qMatch = mapsLink.match(/[?&]q=([^&]+)/);
		if (qMatch) address = decodeURIComponent(qMatch[1]).replace(/\+/g, ' ');
	}

	// Organizer from Arrangør link
	const organizer = $('b:contains("Arrangør")').parent().text().replace('Arrangør:', '').trim()
		|| $('.detail-event-shop-name').val() as string || '';

	// Check full page text for non-public event indicators
	const pageText = $('body').text().toLowerCase();
	const isNonPublic = NON_PUBLIC_KEYWORDS.some(kw => pageText.includes(kw));

	return { price, description, time: timeText, address, organizer, isNonPublic };
}

// Map Bergen Kommune tag IDs to categories (based on filter analysis)
function guessCategory(title: string, subtitle: string, tags: string): string {
	const titleLower = title.toLowerCase();
	const text = `${title} ${subtitle}`.toLowerCase();

	// Family keywords in the title take priority — "Barnas kulturhus" is family even if subtitle says "forestilling"
	if (/barnas\s|for\s+barn|barnelørdag|barneforestilling/.test(titleLower) || titleLower.includes('familie')) return 'family';

	const w = (word: string) => new RegExp(`\\b${word}\\b`).test(text);
	if (w('konsert') || w('musikk') || w('jazz') || w('kor')) return 'music';
	if (w('teater') || w('revy') || w('forestilling') || w('opera')) return 'theatre';
	if (w('dans')) return 'theatre';
	if (w('kurs') || w('verksted') || w('workshop')) return 'workshop';
	if (w('barn') || w('familie') || w('ung')) return 'family';
	if (w('utstilling') || w('galleri') || w('kunst')) return 'culture';
	if (w('film') || w('kino')) return 'culture';
	if (text.includes('mat og drikke') || w('matkurs') || w('smaking') || w('smakskurs')) return 'food';
	if (w('sport') || w('idrett') || w('trening') || w('friluft')) return 'sports';
	if (w('vandring') || w('omvisning') || w('guidet tur')) return 'tours';
	if (w('festival') || w('marked')) return 'festival';
	if (w('foredrag') || w('debatt') || w('bibliotek')) return 'culture';

	return 'culture'; // Most kommune events are cultural
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Starting scrape of Bergen Kommune...`);

	let found = 0;
	let inserted = 0;
	const allEvents: ListEvent[] = [];

	for (let pageNo = 0; pageNo < MAX_PAGES; pageNo++) {
		const url = `${LIST_URL}?pageNo=${pageNo}&pageSize=50&loadEvenTtype=0&showPinned=false&loadEventLocation=0&searchedValue=&searchedDate=&geographicals=&activeWhatTags=&activeWhoTags=&activeWhereTags=&dateFromVal=&dateToVal=&isEventChecked=&isLeisureChecked=&enableActiveTimeSlotBasedTagFiltering=false`;

		const html = await fetchHTML(url);
		if (!html || html.trim() === '' || html.includes('No events found')) {
			console.log(`[${SOURCE}] Page ${pageNo}: empty — done.`);
			break;
		}

		const events = parseListPage(html);
		if (events.length === 0) {
			console.log(`[${SOURCE}] Page ${pageNo}: 0 events — done.`);
			break;
		}

		console.log(`[${SOURCE}] Page ${pageNo}: ${events.length} events`);
		allEvents.push(...events);

		await delay(DELAY_MS);
	}

	found = allEvents.length;
	console.log(`[${SOURCE}] Total events found: ${found}`);

	for (const event of allEvents) {
		// Skip non-public events (kindergartens, school visits, etc.)
		const titleLower = event.title.toLowerCase();
		if (NON_PUBLIC_KEYWORDS.some(kw => titleLower.includes(kw))) {
			console.log(`  [skip] ${event.title} (non-public event)`);
			continue;
		}

		if (await eventExists(event.detailUrl)) continue;

		// Fetch detail page for richer data
		await delay(1000);
		const detail = await fetchDetail(event.detailUrl);

		// Skip if detail page reveals non-public content
		if (detail?.isNonPublic) {
			console.log(`  [skip] ${event.title} (non-public on detail page)`);
			continue;
		}

		const category = guessCategory(event.title, event.subtitle, event.tags);
		const bydel = mapBydel(event.venue);

		// Build time-aware date_start (Oslo local time → UTC via bergenOffset)
		const offset = bergenOffset(event.dateStart);
		let dateStart = `${event.dateStart}T00:00:00Z`; // placeholder: midnight UTC = no known time
		if (detail?.time) {
			const timeMatch = detail.time.match(/(\d{1,2})[.:](\d{2})/);
			if (timeMatch) {
				const h = timeMatch[1].padStart(2, '0');
				const m = timeMatch[2];
				dateStart = `${event.dateStart}T${h}:${m}:00${offset}`;
			}
		}

		const dateEnd = event.dateEnd && event.dateEnd !== event.dateStart
			? `${event.dateEnd}T23:59:00${offset}`
			: undefined;

		const address = detail?.address || event.venue;

		const aiDesc = await generateDescription({ title: event.title, venue: event.venue, category, date: dateStart, price: detail?.price || '' });

		// Use billett detail URL directly — it IS the specific event registration page.
		// resolveTicketUrl would replace it with a generic venue homepage since
		// billett.bergen.kommune.no is in the aggregator list.
		const ticketUrl = event.detailUrl;

		const success = await insertEvent({
			slug: makeSlug(event.title, event.dateStart),
			title_no: event.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: new Date(dateStart).toISOString(),
			date_end: dateEnd ? new Date(dateEnd).toISOString() : undefined,
			venue_name: event.venue,
			address,
			bydel,
			price: detail?.price || '',
			ticket_url: ticketUrl,
			source: SOURCE,
			source_url: event.detailUrl,
			image_url: event.imageUrl,
			age_group: category === 'family' || /familie|barnelørdag|barnas\s|for\s+barn/i.test(event.title) ? 'family' : 'all',
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${event.title} (${event.venue}, ${category})`);
			inserted++;
		}
	}

	return { found, inserted };
}
