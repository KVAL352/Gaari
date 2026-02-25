import type { GaariEvent, Lang } from './types';
import type { Collection } from './collections';
import { isFreeEvent } from './utils';

const BASE_URL = 'https://gaari.no';

export function getCanonicalUrl(path: string): string {
	return `${BASE_URL}${path}`;
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
		'@type': 'Event',
		name: title,
		description: description,
		url: pageUrl,
		startDate: event.date_start,
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
		jsonLd.endDate = event.date_end;
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
		description: 'Gåri er en gratis arrangementskalender for Bergen, Norge. Vi samler arrangementer fra 44 kilder — konserter, utstillinger, teater, festival, mat og mer — på ett sted. Oppdatert to ganger daglig.',
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
			email: 'gaari.bergen@proton.me',
			contactType: 'customer service',
			availableLanguage: ['Norwegian', 'English']
		},
		sameAs: ['https://github.com/KVAL352/Gaari']
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
			? 'Gåri samler alle arrangementer i Bergen på ett sted — konserter, utstillinger, teater, mat og mer. Oppdatert to ganger daglig fra 44 kilder.'
			: 'Gåri aggregates all events in Bergen in one place — concerts, exhibitions, theatre, food and more. Updated twice daily from 44 sources.',
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

export function generateCollectionJsonLd(
	collection: Pick<Collection, 'title' | 'description' | 'slug'>,
	lang: Lang,
	pageUrl: string,
	eventCount: number
): string {
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: collection.title[lang],
		description: collection.description[lang],
		url: pageUrl,
		numberOfItems: eventCount,
		isPartOf: {
			'@type': 'WebSite',
			name: 'Gåri',
			url: BASE_URL
		}
	};

	return safeJsonLd(jsonLd);
}
