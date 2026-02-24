import { supabase } from '$lib/server/supabase';
import { getAllCollectionSlugs } from '$lib/collections';

const BASE = 'https://gaari.no';

const STATIC_PAGES = ['', '/about', '/datainnsamling'];

export async function GET() {
	const { data: events } = await supabase
		.from('events')
		.select('slug, date_start')
		.in('status', ['approved'])
		.order('date_start', { ascending: false })
		.limit(5000);

	const today = new Date().toISOString().slice(0, 10);

	let urls = '';

	// Static pages in both languages
	for (const page of STATIC_PAGES) {
		for (const lang of ['no', 'en']) {
			const altLang = lang === 'no' ? 'en' : 'no';
			urls += `  <url>
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

	// Collection pages in both languages
	for (const slug of getAllCollectionSlugs()) {
		for (const lang of ['no', 'en']) {
			const altLang = lang === 'no' ? 'en' : 'no';
			urls += `  <url>
    <loc>${BASE}/${lang}/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="${lang === 'no' ? 'nb' : 'en'}" href="${BASE}/${lang}/${slug}" />
    <xhtml:link rel="alternate" hreflang="${altLang === 'no' ? 'nb' : 'en'}" href="${BASE}/${altLang}/${slug}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}/no/${slug}" />
  </url>\n`;
		}
	}

	// Event pages in both languages
	for (const event of events || []) {
		const lastmod = event.date_start?.slice(0, 10) || today;
		for (const lang of ['no', 'en']) {
			const altLang = lang === 'no' ? 'en' : 'no';
			urls += `  <url>
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

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
}
