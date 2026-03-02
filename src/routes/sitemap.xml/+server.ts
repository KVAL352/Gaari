import { supabase } from '$lib/server/supabase';
import { getAllCollectionSlugs, getHreflangSlugs } from '$lib/collections';

const BASE = 'https://gaari.no';

const STATIC_PAGES = ['', '/about', '/datainnsamling', '/personvern', '/tilgjengelighet'];

export async function GET() {
	const { data: events } = await supabase
		.from('events')
		.select('slug, date_start, created_at')
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

	// For arrangører / For organizers — temporarily hidden while under construction

	// Collection pages — only emit URL for language(s) the slug belongs to
	for (const slug of getAllCollectionSlugs()) {
		const hreflang = getHreflangSlugs(slug);
		// Determine which language(s) this slug is canonical for
		const languages: ('no' | 'en')[] = [];
		if (hreflang.no === slug) languages.push('no');
		if (hreflang.en === slug) languages.push('en');
		if (languages.length === 0) languages.push('no', 'en'); // fallback

		for (const lang of languages) {
			const altLang = lang === 'no' ? 'en' : 'no';
			urls += `  <url>
    <loc>${BASE}/${lang}/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="${lang === 'no' ? 'nb' : 'en'}" href="${BASE}/${lang}/${hreflang[lang]}" />
    <xhtml:link rel="alternate" hreflang="${altLang === 'no' ? 'nb' : 'en'}" href="${BASE}/${altLang}/${hreflang[altLang]}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}/no/${hreflang.no}" />
  </url>\n`;
		}
	}

	// Event pages in both languages
	for (const event of events || []) {
		const lastmod = event.created_at?.slice(0, 10) || today;
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
