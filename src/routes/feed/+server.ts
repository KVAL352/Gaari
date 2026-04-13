import { supabase } from '$lib/server/supabase';
import type { RequestHandler } from '@sveltejs/kit';
import type { Category } from '$lib/types';
import { CATEGORIES } from '$lib/types';
import { SOURCE_COUNT } from '$lib/constants';

const BASE_URL = 'https://gaari.no';

const VALID_FILTERS = [...CATEGORIES, 'free', 'all'] as const;
type FeedFilter = (typeof VALID_FILTERS)[number];

const FEED_TITLES: Record<FeedFilter, { no: string; en: string }> = {
	all:       { no: 'Hva skjer i Bergen',               en: 'What\'s on in Bergen' },
	music:     { no: 'Konserter i Bergen',                en: 'Concerts in Bergen' },
	culture:   { no: 'Kultur i Bergen',                   en: 'Culture in Bergen' },
	theatre:   { no: 'Teater i Bergen',                   en: 'Theatre in Bergen' },
	family:    { no: 'Familieaktiviteter i Bergen',       en: 'Family events in Bergen' },
	food:      { no: 'Mat & drikke i Bergen',             en: 'Food & drink in Bergen' },
	festival:  { no: 'Festivaler i Bergen',               en: 'Festivals in Bergen' },
	sports:    { no: 'Sport i Bergen',                    en: 'Sports in Bergen' },
	nightlife: { no: 'Uteliv i Bergen',                   en: 'Nightlife in Bergen' },
	workshop:  { no: 'Kurs & workshops i Bergen',         en: 'Workshops in Bergen' },
	student:   { no: 'Studentarrangementer i Bergen',     en: 'Student events in Bergen' },
	tours:     { no: 'Turer i Bergen',                    en: 'Tours in Bergen' },
	free:      { no: 'Gratis arrangementer i Bergen',     en: 'Free events in Bergen' },
};

function escapeXml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function toRfc822(isoStr: string): string {
	// RSS 2.0 pubDate format: Mon, 01 Jan 2026 18:00:00 +0100
	const d = new Date(isoStr);
	if (isNaN(d.getTime())) return '';
	return d.toUTCString().replace('GMT', '+0000');
}

export const GET: RequestHandler = async ({ url }) => {
	const filterParam = url.searchParams.get('filter') ?? 'all';
	const filter = VALID_FILTERS.includes(filterParam as FeedFilter)
		? (filterParam as FeedFilter)
		: 'all';

	const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'no';

	const now = new Date().toISOString();
	const lookahead = new Date();
	lookahead.setDate(lookahead.getDate() + 30);

	let query = supabase
		.from('events')
		.select('id, slug, title_no, title_en, description_no, description_en, venue_name, date_start, category, price, image_url')
		.eq('status', 'approved')
		.or(`date_end.gte.${now},and(date_end.is.null,date_start.gte.${now})`)
		.lte('date_start', lookahead.toISOString())
		.order('date_start', { ascending: true })
		.limit(100);

	if (filter === 'free') {
		query = query.or('price.eq.0,price.ilike.%gratis%,price.ilike.%free%,price.ilike.0 kr,price.ilike.0,-');
	} else if (filter !== 'all') {
		query = query.eq('category', filter as Category);
	}

	const { data: events, error } = await query;
	if (error) {
		return new Response('Feed unavailable', { status: 500 });
	}

	const feedTitle = FEED_TITLES[filter]?.[lang] ?? FEED_TITLES.all[lang];
	const feedUrl = `${BASE_URL}/feed${filter !== 'all' ? `?filter=${filter}` : ''}`;
	const feedDescription = lang === 'en'
		? `Events and activities in Bergen, Norway — updated daily from ${SOURCE_COUNT} sources.`
		: `Arrangementer og aktiviteter i Bergen — oppdatert daglig fra ${SOURCE_COUNT} kilder.`;

	const items = (events ?? []).map((event) => {
		const title = (lang === 'en' && event.title_en) ? event.title_en : event.title_no;
		const description = (lang === 'en' && event.description_en) ? event.description_en : event.description_no;
		const link = `${BASE_URL}/${lang}/events/${event.slug}`;
		const pubDate = toRfc822(event.date_start);
		const category = event.category ?? '';

		const imageTag = event.image_url
			? `\n      <enclosure url="${escapeXml(event.image_url)}" type="image/jpeg" length="0"/>`
			: '';

		return `  <item>
    <title>${escapeXml(title ?? '')}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${escapeXml(description ?? '')}</description>
    <category>${escapeXml(category)}</category>${imageTag}
  </item>`;
	});

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${BASE_URL}/${lang}</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>${lang === 'en' ? 'en' : 'nb'}</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    <ttl>60</ttl>
${items.join('\n')}
  </channel>
</rss>`;

	return new Response(rss, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
			'Access-Control-Allow-Origin': '*'
		}
	});
};
