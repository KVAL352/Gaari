import type { GaariEvent, Lang, Category } from './types';
import type { Collection } from './collections';
import { isFreeEvent } from './utils';

const BASE_URL = 'https://gaari.no';

const EVENT_TYPE_MAP: Partial<Record<Category, string>> = {
	music: 'MusicEvent',
	theatre: 'TheaterEvent',
	sports: 'SportsEvent',
	food: 'FoodEvent',
	festival: 'Festival'
};

function getEventSchemaType(category?: string): string {
	return (category && EVENT_TYPE_MAP[category as Category]) || 'Event';
}

/**
 * Returns Bergen's UTC offset for a given ISO date string.
 * CET (+01:00) in winter, CEST (+02:00) in summer.
 * DST: last Sunday of March 01:00 UTC → last Sunday of October 01:00 UTC.
 */
function bergenOffset(isoDate: string): '+02:00' | '+01:00' {
	const d = new Date(isoDate);
	if (isNaN(d.getTime())) return '+01:00';
	const year = d.getUTCFullYear();
	const dstStart = new Date(Date.UTC(year, 2, 31 - new Date(Date.UTC(year, 2, 31)).getUTCDay(), 1));
	const dstEnd = new Date(Date.UTC(year, 9, 31 - new Date(Date.UTC(year, 9, 31)).getUTCDay(), 1));
	return (d >= dstStart && d < dstEnd) ? '+02:00' : '+01:00';
}

/**
 * Converts a UTC ISO date string to a Bergen local time ISO string with offset.
 * e.g. "2026-06-20T16:00:00.000Z" → "2026-06-20T18:00:00+02:00"
 * Required by Google's Event schema validator (ISO 8601 with timezone).
 */
export function toBergenIso(dateStr: string): string {
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return dateStr;
	const offset = bergenOffset(dateStr);
	const offsetMs = (offset === '+02:00' ? 2 : 1) * 3_600_000;
	const local = new Date(d.getTime() + offsetMs);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}${offset}`;
}

export function getCanonicalUrl(path: string): string {
	return `${BASE_URL}${path}`;
}

// Maps ?when= values to their collection page slug, per language.
// Only 'weekend' and 'today' have collection equivalents.
const WHEN_COLLECTION: Record<string, Record<string, string>> = {
	no: { weekend: 'denne-helgen', today: 'i-dag' },
	en: { weekend: 'this-weekend', today: 'today-in-bergen' }
};

/**
 * Computes the canonical URL and noindex flag for a homepage URL.
 *
 * Rules:
 *  1–3. Single category or bydel → self-referencing canonical
 *  4.   Both category + bydel → canonical to category-only version (more content)
 *  5.   Pagination without meaningful filters → keep page param, strip sort/noise
 *  6.   ?when=weekend or ?when=today (alone) → canonical to collection page
 *  7.   <5 results → noindex (thin content)
 *
 * Noise params (time, price, audience, q) are stripped from the canonical.
 */
export function computeCanonical(
	url: URL,
	lang: string,
	eventCount: number
): { canonical: string; noindex: boolean } {
	const params = url.searchParams;
	const category = params.get('category') || '';
	const bydel = params.get('bydel') || '';
	const when = params.get('when') || '';
	const page = params.get('page') || '';
	const pageNum = Number(page) || 1;

	// Rule 6: ?when=today or ?when=weekend, alone → collection page canonical
	if (when && !category && !bydel) {
		const slug = WHEN_COLLECTION[lang]?.[when];
		if (slug) {
			return { canonical: `${BASE_URL}/${lang}/${slug}`, noindex: false };
		}
		// Other when values (tomorrow, week, specific date, range) — fall through
	}

	// Rule 4: category + bydel both set → canonical to category version
	if (category && bydel) {
		const sp = new URLSearchParams({ category });
		if (pageNum > 1) sp.set('page', page);
		return {
			canonical: `${BASE_URL}/${lang}?${sp}`,
			noindex: eventCount < 5
		};
	}

	// Rules 1–3: single category or bydel → self-referencing
	if (category || bydel) {
		const sp = new URLSearchParams();
		if (category) sp.set('category', category);
		if (bydel) sp.set('bydel', bydel);
		if (pageNum > 1) sp.set('page', page);
		return {
			canonical: `${BASE_URL}/${lang}?${sp}`,
			noindex: eventCount < 5
		};
	}

	// Rule 5: pagination only → keep page param, strip sort/noise
	if (pageNum > 1) {
		return {
			canonical: `${BASE_URL}/${lang}?page=${page}`,
			noindex: false
		};
	}

	// Default: no indexable filter state → base URL canonical
	return {
		canonical: `${BASE_URL}/${lang}`,
		noindex: false
	};
}

export function safeJsonLd(obj: Record<string, unknown>): string {
	return JSON.stringify(obj).replace(/</g, '\\u003c');
}

export function generateEventJsonLd(
	event: GaariEvent,
	lang: Lang,
	pageUrl: string
): string {
	const title = (lang === 'en' && event.title_en) ? event.title_en : event.title_no;
	const description = (lang === 'en' && event.description_en) ? event.description_en : event.description_no;

	const location: Record<string, unknown> = {
		'@type': 'Place',
		name: event.venue_name,
		address: {
			'@type': 'PostalAddress',
			streetAddress: event.address,
			addressLocality: 'Bergen',
			addressRegion: 'Vestland',
			addressCountry: 'NO'
		}
	};

	if (event.latitude && event.longitude) {
		location.geo = {
			'@type': 'GeoCoordinates',
			latitude: event.latitude,
			longitude: event.longitude
		};
	}

	const offers: Record<string, unknown> = {
		'@type': 'Offer',
		availability: event.status === 'cancelled'
			? 'https://schema.org/Discontinued'
			: 'https://schema.org/InStock',
		url: event.ticket_url || pageUrl
	};

	if (isFreeEvent(event.price)) {
		offers.price = '0';
		offers.priceCurrency = 'NOK';
	} else if (typeof event.price === 'number' || (typeof event.price === 'string' && !isNaN(Number(event.price)) && event.price !== '')) {
		offers.price = String(event.price);
		offers.priceCurrency = 'NOK';
	}

	const inLanguage = event.language === 'both'
		? ['nb', 'en']
		: event.language === 'en' ? 'en' : 'nb';

	const jsonLd: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': getEventSchemaType(event.category),
		name: title,
		description: description,
		url: pageUrl,
		startDate: toBergenIso(event.date_start),
		location,
		offers,
		organizer: {
			'@type': 'Organization',
			name: event.venue_name
		},
		eventStatus: event.status === 'cancelled'
			? 'https://schema.org/EventCancelled'
			: 'https://schema.org/EventScheduled',
		eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
		inLanguage
	};

	if (event.date_end) {
		jsonLd.endDate = toBergenIso(event.date_end);
	}

	if (event.image_url) {
		jsonLd.image = event.image_url;
	}

	return safeJsonLd(jsonLd);
}

export function generateBreadcrumbJsonLd(
	items: { name: string; url?: string }[]
): string {
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, i) => {
			const element: Record<string, unknown> = {
				'@type': 'ListItem',
				position: i + 1,
				name: item.name
			};
			// Last item has no URL per spec
			if (item.url && i < items.length - 1) {
				element.item = item.url;
			}
			return element;
		})
	};

	return safeJsonLd(jsonLd);
}

export function generateOrganizationJsonLd(): string {
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'Gåri',
		alternateName: 'Gaari',
		url: BASE_URL,
		logo: `${BASE_URL}/og/default.png`,
		description: 'Gåri er en gratis arrangementskalender for Bergen, Norge. Vi samler arrangementer fra 52 kilder — konserter, utstillinger, teater, festival, mat og mer — på ett sted. Oppdatert to ganger daglig.',
		foundingDate: '2026',
		areaServed: {
			'@type': 'City',
			name: 'Bergen',
			sameAs: 'https://www.wikidata.org/wiki/Q26693'
		},
		knowsAbout: [
			'events in Bergen Norway',
			'Bergen concerts',
			'Bergen culture',
			'hva skjer i Bergen',
			'Bergen arrangementer'
		],
		inLanguage: ['nb', 'en'],
		contactPoint: {
			'@type': 'ContactPoint',
			email: 'post@gaari.no',
			contactType: 'customer service',
			availableLanguage: ['Norwegian', 'English']
		},
		sameAs: ['https://github.com/KKAL352/Gaari']
	};

	return safeJsonLd(jsonLd);
}

export function generateWebSiteJsonLd(lang: Lang): string {
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'Gåri',
		alternateName: lang === 'no' ? 'Ke det går i Bergen?' : 'What\'s on in Bergen?',
		url: BASE_URL,
		description: lang === 'no'
			? 'Gåri samler alle arrangementer i Bergen på ett sted — konserter, utstillinger, teater, mat og mer. Oppdatert to ganger daglig fra 52 kilder.'
			: 'Gåri aggregates all events in Bergen in one place — concerts, exhibitions, theatre, food and more. Updated twice daily from 52 sources.',
		inLanguage: ['nb', 'en'],
		about: {
			'@type': 'City',
			name: 'Bergen',
			sameAs: 'https://www.wikidata.org/wiki/Q26693'
		},
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${BASE_URL}/${lang}?q={search_term_string}`
			},
			'query-input': 'required name=search_term_string'
		}
	};

	return safeJsonLd(jsonLd);
}

const FAQ_ITEMS: Record<Lang, Array<{ q: string; a: string }>> = {
	no: [
		{
			q: 'Hva er Gåri?',
			a: 'Gåri er en gratis arrangementskalender for Bergen som samler arrangementer fra 52 kilder — konsertsteder, teatre, museer, biblioteker, festivaler og billettsider — på ett sted. Oppdatert to ganger daglig.'
		},
		{
			q: 'Hva skjer i Bergen denne helgen?',
			a: 'Bruk siden «Denne helgen i Bergen» på gaari.no/no/denne-helgen for en fullstendig oversikt over helgens arrangementer — konserter, utstillinger, familieaktiviteter og mer.'
		},
		{
			q: 'Finnes det gratis arrangementer i Bergen?',
			a: 'Ja. Gåri har en egen side for gratis arrangementer i Bergen denne uken på gaari.no/no/gratis. Mange museer, biblioteker og utendørsarrangementer har gratis inngang.'
		},
		{
			q: 'Er Gåri gratis å bruke?',
			a: 'Ja, Gåri er helt gratis. Du trenger ingen konto eller registrering for å se arrangementer.'
		},
		{
			q: 'Hvilke områder i Bergen dekker Gåri?',
			a: 'Gåri dekker arrangementer i hele Bergen kommune — Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane og Arna.'
		},
		{
			q: 'Hvilke typer arrangementer finner jeg på Gåri?',
			a: 'Musikk og konserter, kunst og kultur, teater og scenekunst, familie og barn, mat og drikke, festivaler og markeder, sport og friluft, uteliv, kurs og workshops, studentarrangementer og turer.'
		},
		{
			q: 'Hvordan sender jeg inn et arrangement til Gåri?',
			a: 'Bruk innsendingsskjemaet på gaari.no. Alle innsendte arrangementer gjennomgås manuelt før publisering.'
		}
	],
	en: [
		{
			q: 'What is Gåri?',
			a: 'Gåri is a free event calendar for Bergen, Norway, collecting events from 52 sources — concert venues, theatres, museums, libraries, festivals and ticket platforms — in one place. Updated twice daily.'
		},
		{
			q: 'What\'s on in Bergen this weekend?',
			a: 'Visit gaari.no/en/this-weekend for a complete overview of this weekend\'s events in Bergen — concerts, exhibitions, family activities and more.'
		},
		{
			q: 'Are there free events in Bergen?',
			a: 'Yes. Gåri has a dedicated page for free events in Bergen this week at gaari.no/en/free-things-to-do-bergen. Many museums, libraries and outdoor events have free admission.'
		},
		{
			q: 'Is Gåri free to use?',
			a: 'Yes, completely free. No account or registration required to browse events.'
		},
		{
			q: 'What areas of Bergen does Gåri cover?',
			a: 'Gåri covers events across all of Bergen municipality — Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane and Arna.'
		},
		{
			q: 'What types of events does Gåri list?',
			a: 'Music and concerts, arts and culture, theatre and performing arts, family and kids, food and drink, festivals and markets, sports and outdoors, nightlife, workshops and classes, student events, and tours.'
		},
		{
			q: 'How do I submit an event to Gåri?',
			a: 'Use the submission form at gaari.no. All submitted events are reviewed before publishing.'
		}
	]
};

export function getFaqItems(lang: Lang): Array<{ q: string; a: string }> {
	return FAQ_ITEMS[lang];
}

export function generateFaqJsonLdFromItems(items: Array<{ q: string; a: string }>): string {
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: items.map(item => ({
			'@type': 'Question',
			name: item.q,
			acceptedAnswer: { '@type': 'Answer', text: item.a }
		}))
	};
	return safeJsonLd(jsonLd);
}

export function generateFaqJsonLd(lang: Lang): string {
	return generateFaqJsonLdFromItems(FAQ_ITEMS[lang]);
}

export function generateCollectionJsonLd(
	collection: Pick<Collection, 'title' | 'description' | 'slug'>,
	lang: Lang,
	pageUrl: string,
	events: GaariEvent[]
): string {
	const listed = events.slice(0, 50);
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: collection.title[lang],
		description: collection.description[lang],
		url: pageUrl,
		numberOfItems: events.length,
		isPartOf: {
			'@type': 'WebSite',
			name: 'Gåri',
			url: BASE_URL
		},
		mainEntity: {
			'@type': 'ItemList',
			numberOfItems: listed.length,
			itemListElement: listed.map((event, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				url: `${BASE_URL}/${lang}/events/${event.slug}`
			}))
		}
	};

	return safeJsonLd(jsonLd);
}
