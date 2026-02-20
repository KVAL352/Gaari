import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay, makeDescription } from '../lib/utils.js';

const SOURCE = 'usfverftet';
const LISTING_URL = 'https://usf.no/program';

interface USFEventSummary {
	objectId: string;
	type: string;
	title: string;
	info: string; // "DD/MM/YY"
	image: string;
	link: string; // "slug/objectId"
	ticketLink: string;
}

interface USFPostData {
	id: string;
	name: string;
	start_time: string;
	tags: string[];
	details: string;
	custom_fields: {
		end_time?: string;
		age?: string;
		coverCharge?: string;
		type?: string;
		ticketUrl?: string;
		freeEntry?: boolean;
		soldOut?: boolean;
		eventStatus?: string;
		zone?: string;
		show_start_time?: string;
	};
}

interface USFPlace {
	name: string;
	address: string;
	city: string;
	postal_code: string;
}

function extractNextData(html: string): any {
	const marker = '<script id="__NEXT_DATA__" type="application/json">';
	const idx = html.indexOf(marker);
	if (idx < 0) return null;

	const jsonStart = idx + marker.length;
	const endTag = '</script>';
	const endIdx = html.indexOf(endTag, jsonStart);
	if (endIdx < 0) return null;

	try {
		return JSON.parse(html.slice(jsonStart, endIdx));
	} catch {
		return null;
	}
}

function mapCategory(type: string, tags: string[]): string {
	const lower = type?.toLowerCase() || '';
	if (lower.includes('concert') || lower.includes('konsert')) return 'music';
	if (lower.includes('theatre') || lower.includes('teater')) return 'theatre';
	if (lower.includes('film') || lower.includes('kino')) return 'culture';
	if (lower.includes('workshop') || lower.includes('kurs')) return 'workshop';
	if (lower.includes('festival')) return 'festival';

	// Check tags
	for (const tag of tags) {
		const t = tag.toLowerCase();
		if (t.includes('jazz') || t.includes('pop') || t.includes('rock') || t.includes('folk') || t.includes('electronic')) return 'music';
		if (t.includes('comedy') || t.includes('humor')) return 'nightlife';
		if (t.includes('dance') || t.includes('dans')) return 'theatre';
	}

	return 'music'; // USF Verftet is primarily a music venue
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching USF Verftet events...`);

	// Step 1: Fetch listing page for event summaries
	const listingHtml = await fetchHTML(LISTING_URL);
	if (!listingHtml) {
		console.error(`[${SOURCE}] Failed to fetch listing page`);
		return { found: 0, inserted: 0 };
	}

	const listingData = extractNextData(listingHtml);
	if (!listingData) {
		console.error(`[${SOURCE}] Could not parse __NEXT_DATA__ on listing page`);
		return { found: 0, inserted: 0 };
	}

	const heroContent: USFEventSummary[] =
		listingData.props?.pageProps?.venueData?.siteSettings?.heroContent ||
		listingData.props?.pageProps?.siteSettings?.heroContent || [];
	const eventSummaries = heroContent.filter(e => e.type === 'event');
	console.log(`[${SOURCE}] Found ${eventSummaries.length} upcoming events`);

	let found = eventSummaries.length;
	let inserted = 0;

	// Step 2: For each event, check if exists, then fetch detail page
	for (const summary of eventSummaries) {
		const sourceUrl = `https://usf.no/events/${summary.link}`;
		if (await eventExists(sourceUrl)) continue;

		await delay(3000);

		// Fetch detail page for full event data
		const detailHtml = await fetchHTML(sourceUrl);
		if (!detailHtml) continue;

		const detailData = extractNextData(detailHtml);
		if (!detailData) continue;

		const post: USFPostData | undefined = detailData.props?.pageProps?.postData;
		const place: USFPlace | undefined = detailData.props?.pageProps?.place;
		if (!post) continue;

		const cf = post.custom_fields || {};

		// Skip sold out
		if (cf.soldOut) continue;

		const venueName = cf.zone || place?.name || 'USF Verftet';
		const address = place ? `${place.address}, ${place.city}` : 'Georgernes Verft 12, Bergen';
		const category = mapCategory(cf.type || '', post.tags || []);
		const bydel = mapBydel(venueName);
		const datePart = post.start_time?.slice(0, 10) || '';
		const ticketUrl = cf.ticketUrl || summary.ticketLink || sourceUrl;

		// Price from coverCharge (e.g. "240/200")
		const priceStr = cf.coverCharge ? `${cf.coverCharge} kr` : (cf.freeEntry ? 'Gratis' : '');

		const success = await insertEvent({
			slug: makeSlug(post.name, datePart),
			title_no: post.name,
			description_no: makeDescription(post.name, venueName, category),
			category,
			date_start: post.start_time ? new Date(post.start_time).toISOString() : new Date().toISOString(),
			date_end: cf.end_time ? new Date(cf.end_time).toISOString() : undefined,
			venue_name: venueName,
			address,
			bydel,
			price: priceStr,
			ticket_url: ticketUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: summary.image || undefined,
			age_group: cf.age ? (parseInt(cf.age) >= 18 ? 'all' : 'family') : 'all',
			language: post.name.match(/[a-zA-Z]{5,}/) ? 'both' : 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${post.name} @ ${venueName} (${category}, ${priceStr})`);
			inserted++;
		}
	}

	return { found, inserted };
}
