import { supabase } from '$lib/server/supabase';
import { getAllCollectionSlugs, getHreflangSlugs } from '$lib/collections';
import { getAllVenueSlugs } from '$lib/venues';

const BASE = 'https://gaari.no';

const STATIC_PAGES = ['', '/about', '/guide', '/datainnsamling', '/personvern', '/opphavsrett', '/vilkar', '/tilgjengelighet'];

export async function GET() {
	// Supabase caps a response at 1000 rows and says nothing about it — .limit(5000)
	// silently returned 1000. Sorted by date_start descending, the 1000 that came
	// back were the furthest-future events, so every event in the next six weeks
	// was missing from the sitemap: 858 of 1949 present, nothing before 2026-10-05.
	// Those near-term pages are the ones with search demand.
	//
	// Paginate on id rather than date_start: range() splits by position, and a
	// non-unique sort key can drop or repeat rows across page boundaries. Sort by
	// date afterwards. Same approach as dedup.ts and credit-backfill.ts.
	const PAGE_SIZE = 1000;
	const events: {
		slug: string;
		date_start: string;
		date_end: string | null;
		created_at: string;
		description_no: string | null;
		image_url: string | null;
	}[] = [];

	for (let page = 0; ; page++) {
		const { data, error } = await supabase
			.from('events')
			.select('slug, date_start, date_end, created_at, description_no, image_url')
			.in('status', ['approved'])
			.order('id', { ascending: true })
			.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
			.returns<typeof events>();

		if (error || !data || data.length === 0) break;
		events.push(...data);
		if (data.length < PAGE_SIZE) break;
	}

	events.sort((a, b) => (a.date_start < b.date_start ? 1 : a.date_start > b.date_start ? -1 : 0));

	const today = new Date().toISOString().slice(0, 10);

	// ── Priority sitemap: static + collections (high-value pages) ──
	let priorityUrls = '';

	for (const page of STATIC_PAGES) {
		for (const lang of ['no', 'en']) {
			const altLang = lang === 'no' ? 'en' : 'no';
			priorityUrls += `  <url>
    <loc>${BASE}/${lang}${page}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page === '' ? 'daily' : 'monthly'}</changefreq>
    <priority>${page === '' ? '1.0' : '0.7'}</priority>
    <xhtml:link rel="alternate" hreflang="${lang === 'no' ? 'nb' : 'en'}" href="${BASE}/${lang}${page}" />
    <xhtml:link rel="alternate" hreflang="${altLang === 'no' ? 'nb' : 'en'}" href="${BASE}/${altLang}${page}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}/no${page}" />
  </url>\n`;
		}
	}

	// For arrangører — hidden. The switch is B2B_PAGES_PUBLIC in
	// $lib/b2b-visibility; this block has to be restored by hand when it
	// flips, since it was commented out rather than made conditional.
	// priorityUrls += `  <url>
	//   <loc>${BASE}/no/for-arrangorer</loc>
	//   ...
	// </url>\n`;

	// Collection pages
	for (const slug of getAllCollectionSlugs()) {
		const hreflang = getHreflangSlugs(slug);
		const languages: ('no' | 'en')[] = [];
		if (hreflang.no === slug) languages.push('no');
		if (hreflang.en === slug) languages.push('en');
		if (languages.length === 0) languages.push('no', 'en');

		const hasPair = hreflang.no !== hreflang.en;

		for (const lang of languages) {
			const altLang = lang === 'no' ? 'en' : 'no';
			const hreflangLinks = hasPair
				? `    <xhtml:link rel="alternate" hreflang="${lang === 'no' ? 'nb' : 'en'}" href="${BASE}/${lang}/${hreflang[lang]}" />
    <xhtml:link rel="alternate" hreflang="${altLang === 'no' ? 'nb' : 'en'}" href="${BASE}/${altLang}/${hreflang[altLang]}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}/no/${hreflang.no}" />`
				: `    <xhtml:link rel="alternate" hreflang="${lang === 'no' ? 'nb' : 'en'}" href="${BASE}/${lang}/${slug}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}/${lang}/${slug}" />`;
			priorityUrls += `  <url>
    <loc>${BASE}/${lang}/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
${hreflangLinks}
  </url>\n`;
		}
	}

	// ── Venue pages ──
	for (const venueSlug of getAllVenueSlugs()) {
		for (const lang of ['no', 'en']) {
			const altLang = lang === 'no' ? 'en' : 'no';
			priorityUrls += `  <url>
    <loc>${BASE}/${lang}/venue/${venueSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="${lang === 'no' ? 'nb' : 'en'}" href="${BASE}/${lang}/venue/${venueSlug}" />
    <xhtml:link rel="alternate" hreflang="${altLang === 'no' ? 'nb' : 'en'}" href="${BASE}/${altLang}/venue/${venueSlug}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}/no/venue/${venueSlug}" />
  </url>\n`;
		}
	}

	// ── Event sitemap: only events with meaningful content ──
	// Filter to events that have description (>80 chars) OR image — skip thin pages.
	// Also drop events that have already ended: a sitemap should not advertise dead
	// pages. This filter is new — the 1000-row cap used to hide the past events by
	// accident, since the query sorted future-first and never reached them.
	// date_end covers exhibitions and other runs that started long ago.
	const qualityEvents = (events || []).filter(e => {
		const hasContent = (e.description_no && e.description_no.length > 80) || e.image_url;
		const endsOn = (e.date_end || e.date_start).slice(0, 10);
		return hasContent && endsOn >= today;
	});

	let eventUrls = '';
	for (const event of qualityEvents) {
		const lastmod = event.created_at ? event.created_at.slice(0, 10) : today;
		for (const lang of ['no', 'en']) {
			const altLang = lang === 'no' ? 'en' : 'no';
			eventUrls += `  <url>
    <loc>${BASE}/${lang}/events/${event.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <xhtml:link rel="alternate" hreflang="${lang === 'no' ? 'nb' : 'en'}" href="${BASE}/${lang}/events/${event.slug}" />
    <xhtml:link rel="alternate" hreflang="${altLang === 'no' ? 'nb' : 'en'}" href="${BASE}/${altLang}/events/${event.slug}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}/no/events/${event.slug}" />
  </url>\n`;
		}
	}

	// Sitemap index wrapping both
	const prioritySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${priorityUrls}</urlset>`;

	const eventSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${eventUrls}</urlset>`;

	// For now, serve as single combined sitemap (sitemap index requires separate URLs)
	// but with quality-filtered events — reduces from ~5000 to ~1000-2000 event URLs
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${priorityUrls}${eventUrls}</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
}
