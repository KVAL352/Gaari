// Venue registry — map Bergen venue names to their own websites
// Used by all scrapers to ensure ticket_url points to real venues, not aggregators

// Aggregator domains — these are competitor event listings, NOT ticket/venue pages
// Note: bergen.kommune.no is NOT listed because venue pages live there (e.g. /kulturhus/fana).
// Only the billett subdomain (event listing system) is an aggregator.
const AGGREGATOR_DOMAINS = [
	'visitbergen.com',
	'kulturikveld.no',
	'barnasnorge.no',
	'billett.bergen.kommune.no',
	'studentbergen.no',
	'bergenlive.no',
];

// Venue name → website URL
const VENUE_URLS: Record<string, string> = {
	// Major concert/performance venues
	'ole bull scene': 'https://olebullscene.no',
	'lille ole bull': 'https://olebullscene.no',
	'det vestnorske teateret': 'https://dfrtvest.no',
	'dns': 'https://dns.no',
	'den nationale scene': 'https://dns.no',
	'forum scene': 'https://forumscene.no',
	'grieghallen': 'https://grieghallen.no',

	// USF complex
	'usf verftet': 'https://usf.no',
	'usf': 'https://usf.no',
	'sardinen': 'https://usf.no',
	'røkeriet': 'https://usf.no',

	// Smaller venues
	'madam felle': 'https://madamfelle.no',
	'cornerteateret': 'https://cornerteateret.no',
	'cornerhagen': 'https://cornerteateret.no',
	'hulen': 'https://hulen.no',
	'bergen kjøtt': 'https://bergenkjott.no',
	'kvarteret': 'https://kvarteret.no',
	'det akademiske kvarter': 'https://kvarteret.no',
	'landmark': 'https://landmark.no',
	'victoria': 'https://victoria.no',

	// Cultural institutions
	'bergen kunsthall': 'https://bergenkunsthall.no',
	'kode': 'https://kfrb.no',
	'litteraturhuset': 'https://litteraturhuset.no/bergen',
	'cinemateket i bergen': 'https://cinemateket.no',
	'cinemateket': 'https://cinemateket.no',

	// Libraries
	'bergen offentlige bibliotek': 'https://bergenbibliotek.no',
	'bergen bibliotek': 'https://bergenbibliotek.no',
	'hovedbiblioteket': 'https://bergenbibliotek.no',
	'åsane bibliotek': 'https://bergenbibliotek.no',
	'fana bibliotek': 'https://bergenbibliotek.no',
	'fyllingsdalen bibliotek': 'https://bergenbibliotek.no',
	'arna bibliotek': 'https://bergenbibliotek.no',
	'laksevåg bibliotek': 'https://bergenbibliotek.no',
	'loddefjord bibliotek': 'https://bergenbibliotek.no',
	'landås bibliotek': 'https://bergenbibliotek.no',
	'ytre arna bibliotek': 'https://bergenbibliotek.no',

	// Municipal cultural venues
	'fana kulturhus': 'https://bergen.kommune.no/kulturhus/fana',
	'åsane kulturhus': 'https://bergen.kommune.no/kulturhus/asane',
	'laksevåg kultursenter': 'https://bergen.kommune.no/kulturhus/laksevag',
	'fyllingsdalen arena': 'https://bergen.kommune.no/kulturhus/fyllingsdalen',
	'ny-krohnborg kultursenter': 'https://bergen.kommune.no/ny-krohnborg',
	'ny krohnborg kultursenter': 'https://bergen.kommune.no/ny-krohnborg',
	'ytrebygda kultursenter': 'https://bergen.kommune.no/ytrebygda-kultursenter',
	'kulturhuset sentrum': 'https://bergen.kommune.no/kulturhus',
	'kultursalen vestkanten': 'https://bergen.kommune.no/kulturhus',

	// Family/science
	'akvariet': 'https://akvariet.no',
	'akvariet i bergen': 'https://akvariet.no',
	'vilvite': 'https://vilvite.no',

	// Cinema
	'bergen kino': 'https://bergenkino.no',

	// Restaurants/bars with event programs
	'børskjelleren': 'https://borskjelleren.no',
	'pappa': 'https://pappa.no',

	// Student venues
	'lagshuset': 'https://sammen.no/lagshuset',
	'tivoli': 'https://kvarteret.no',

	// Historical/outdoor venues
	'bergenhus festning': 'https://forsvarsbygg.no/festningene/bergenhus-festning',
	'håkonshallen': 'https://forsvarsbygg.no/festningene/bergenhus-festning',
	'koengen': 'https://forsvarsbygg.no/festningene/bergenhus-festning',

	// Other venues
	'oseana': 'https://oseana.no',
	'studio bergen': 'https://studiobergen.no',
	'konsertpaleet': 'https://konsertpaleet.no',
	'kulturhuset i bergen': 'https://kulturhusetibergen.no',
	'tekstilindustrimuseet': 'https://timuseum.no',
	'torbjørns konserthall': 'https://torbjornskonserthall.no',
	'kulturboden': 'https://kulturboden.no',
	'furedalen alpin': 'https://furedalen.no',
	'fløibanen': 'https://floyen.no',
	'ulriken': 'https://ulriken643.no',

	// Address-based keys (for BarnasNorge which uses addresses as venue)
	'nordnesbakken 4': 'https://akvariet.no',
	'thormøhlens gate 51': 'https://vilvite.no',
	'muséplass 3': 'https://kfrb.no',
	'rasmus meyers allé 5': 'https://kfrb.no',
	'nordahl bruns gate 9': 'https://grieghallen.no',
	'nordahl brun gate 9': 'https://grieghallen.no',
	'engen 21': 'https://dns.no',
	'strandgaten 250': 'https://usf.no',
	'olav kyrres gate 49': 'https://bergenbibliotek.no',
	'strømgaten 6': 'https://bergenbibliotek.no',
	'øvre ole bulls plass 6': 'https://olebullscene.no',
	'bontelabo 2': 'https://forsvarsbygg.no/festningene/bergenhus-festning',
	'åsane senter 52': 'https://bergenbibliotek.no',
	'østre nesttunvegen 18': 'https://bergen.kommune.no/kulturhus/fana',
	'øvre nesttunvegen 18': 'https://bergen.kommune.no/kulturhus/fana',
	'nattlandsveien 76a': 'https://bergenbibliotek.no',
	'inndalsveien 28': 'https://kvarteret.no',

	// DNT (outdoor/hiking)
	'dnt bergen': 'https://www.dnt.no/dnt-der-du-er/bergen-og-hordaland-turlag/',

	// Swimming/sports
	'nordnes sjøbad': 'https://nordnessjobad.no',
	'ado arena': 'https://adoarena.no',

	// Workshop/creative venues
	'paint\'n sip': 'https://paintnsip.no',
	'paintnsip': 'https://paintnsip.no',

	// Film/theater
	'bergen filmklubb': 'https://bergenfilmklubb.no',
	'tivoli': 'https://kvarteret.no',
};

/**
 * Look up a venue's website URL by name (case-insensitive, partial match)
 */
export function getVenueUrl(venueName: string): string | null {
	const lower = venueName.toLowerCase().trim();

	// Direct match
	if (VENUE_URLS[lower]) return VENUE_URLS[lower];

	// Partial match — same pattern as mapBydel
	for (const [key, url] of Object.entries(VENUE_URLS)) {
		if (lower.includes(key) || key.includes(lower)) return url;
	}

	return null;
}

/**
 * Check if a URL points to an aggregator/competitor site
 */
export function isAggregatorUrl(url: string): boolean {
	return AGGREGATOR_DOMAINS.some(domain => url.includes(domain));
}

/**
 * Resolve the best ticket_url for an event.
 *
 * Priority:
 * 1. Keep ticket platform URLs (ticketmaster, ticketco, etc.) — real purchase links
 * 2. Keep existing URL if it's a real venue website (not aggregator)
 * 3. Look up venue in registry → use venue website
 * 4. Fall back to existing URL (last resort)
 */
export function resolveTicketUrl(venueName: string, existingUrl?: string): string | undefined {
	// If no existing URL, try venue lookup
	if (!existingUrl) return getVenueUrl(venueName) || undefined;

	// Keep ticket platform URLs — these are real purchase links
	if (!isAggregatorUrl(existingUrl)) return existingUrl;

	// Existing URL is an aggregator — try to find a better one from the registry
	return getVenueUrl(venueName) || existingUrl;
}
