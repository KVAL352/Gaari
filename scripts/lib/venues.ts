// Venue registry — map Bergen venue names to their own websites
// Used by all scrapers to ensure ticket_url points to real venues, not aggregators

// Aggregator domains — these are competitor event listings, NOT ticket/venue pages
// Note: bergen.kommune.no is NOT listed because venue pages live there (e.g. /kulturhus/fana).
// Only the billett subdomain (event listing system) is an aggregator.
const AGGREGATOR_DOMAINS = [
	'kulturikveld.no',
	'barnasnorge.no',
	'billett.bergen.kommune.no',
	'studentbergen.no',
	'bergenlive.no',
	// Non-ticket sites scrapers sometimes pick up
	'miljofyrtarn.no',
	'facebook.com',
	'instagram.com',
	'twitter.com',
	'linkedin.com',
	'youtube.com',
	'aftenposten.no', // Aftenposten Fordel subscriber discount links — not real ticket pages
	'visitbergen.com', // Visit Bergen aggregator — scraper removed, block residual links
];

// Venue name → website URL
const VENUE_URLS: Record<string, string> = {
	// Major concert/performance venues
	'ole bull scene': 'https://olebullhuset.no',
	'ole bull huset': 'https://olebullhuset.no',
	'lille ole bull': 'https://olebullhuset.no',
	'det vestnorske teateret': 'https://dfrtvest.no',
	'dns': 'https://dns.no',
	'den nationale scene': 'https://dns.no',
	'forum scene': 'https://forumscene.no',
	'grieghallen': 'https://grieghallen.no',

	// USF complex
	'usf verftet': 'https://usf.no',
	'usf': 'https://usf.no',
	'sardinen': 'https://usf.no',
	'sardinen usf': 'https://usf.no',
	'studio usf': 'https://usf.no',
	'rokeriet usf': 'https://usf.no',
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
	'victoria': 'https://www.victoriapub.no',
	'vic': 'https://www.victoriapub.no',
	'statsraaden': 'https://lehmkuhl.no',
	'statsraaden bar': 'https://lehmkuhl.no',
	'statsraaden bar & reception': 'https://lehmkuhl.no',
	'statsraad lehmkuhl': 'https://lehmkuhl.no',
	"o'connor's irish pub": 'https://oconnors.no/bergen',
	"o'connor's": 'https://oconnors.no/bergen',
	'oconnors': 'https://oconnors.no/bergen',

	'østre - hus for lydkunst og elektronisk musikk': 'https://ekko.no',
	'vestre': 'https://ekko.no',
	'laugaren': 'https://laugaren.no',
	'lydgalleriet': 'https://lydgalleriet.no',
	'borealis': 'https://borealisfestival.no',
	'borealis festival': 'https://borealisfestival.no',

	// Cultural institutions
	'bergen kunsthall': 'https://bergenkunsthall.no',
	'kode': 'https://kodebergen.no',
	'permanenten': 'https://kodebergen.no',
	'stenersen': 'https://kodebergen.no',
	'lysverket': 'https://kodebergen.no',
	'rasmus meyer': 'https://kodebergen.no',
	'troldhaugen': 'https://kodebergen.no',
	'litteraturhuset': 'https://litthusbergen.no',
	'litteraturhuset i bergen': 'https://litthusbergen.no',
	'cinemateket i bergen': 'https://cinemateket.no',
	'cinemateket': 'https://cinemateket.no',
	'bergen domkirke': 'https://kirkemusikkibergen.no',
	'bergen internasjonale teater': 'https://bitteater.no',
	'bit teatergarasjen': 'https://bitteater.no',
	'carte blanche': 'https://carteblanche.no',
	'bergen filharmoniske orkester': 'https://harmonien.no',
	'harmonien': 'https://harmonien.no',

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
	'fyllingsdalen teater': 'https://fyllingsdalenteater.no',
	'ny-krohnborg kultursenter': 'https://bergen.kommune.no/ny-krohnborg',
	'ny krohnborg kultursenter': 'https://bergen.kommune.no/ny-krohnborg',
	'ytrebygda kultursenter': 'https://bergen.kommune.no/ytrebygda-kultursenter',
	'kulturhuset sentrum': 'https://bergen.kommune.no/kulturhus',
	'kultursalen vestkanten': 'https://bergen.kommune.no/kulturhus',

	// Family/science
	'akvariet': 'https://akvariet.no',
	'akvariet i bergen': 'https://akvariet.no',
	'vilvite': 'https://vilvite.no',

	// Cinema / film festivals
	'bergen kino': 'https://bergenkino.no',
	'biff': 'https://www.biff.no',
	'bergen internasjonale filmfestival': 'https://www.biff.no',

	// Pride
	'bergen pride': 'https://bergenpride.no',
	'regnbuedagene': 'https://bergenpride.no',

	// Restaurants/bars with event programs
	'bodega': 'https://bodega.part.no',
	'børskjelleren': 'https://borskjelleren.no',
	'pappa': 'https://pappa.no',

	// Student venues
	'lagshuset': 'https://sammen.no/lagshuset',
	'tivoli': 'https://kvarteret.no',

	// Museum Vest (3 Bergen museums)
	'norges fiskerimuseum': 'https://fiskerimuseum.museumvest.no',
	'fiskerimuseet': 'https://fiskerimuseum.museumvest.no',
	'sandviksboder 23': 'https://fiskerimuseum.museumvest.no',
	'bergens sjøfartsmuseum': 'https://sjofartsmuseum.museumvest.no',
	'sjøfartsmuseet': 'https://sjofartsmuseum.museumvest.no',
	'det hanseatiske museum': 'https://hanseatiskemuseum.museumvest.no',
	'hanseatiske museum': 'https://hanseatiskemuseum.museumvest.no',

	// Bymuseet i Bergen (9 museums)
	'bymuseet': 'https://bymuseet.no',
	'bymuseet i bergen': 'https://bymuseet.no',
	'bryggens museum': 'https://bymuseet.no',
	'gamle bergen museum': 'https://bymuseet.no',
	'hordamuseet': 'https://bymuseet.no',
	'lepramuseet': 'https://bymuseet.no',
	'schøtstuene': 'https://bymuseet.no',
	'skolemuseet': 'https://bymuseet.no',
	'damsgård hovedgård': 'https://bymuseet.no',
	'damsgård': 'https://bymuseet.no',
	'rosenkrantztårnet': 'https://bymuseet.no',

	// Historical/outdoor venues
	'bergenhus festning': 'https://forsvarsbygg.no/festningene/bergenhus-festning',
	'håkonshallen': 'https://forsvarsbygg.no/festningene/bergenhus-festning',
	'koengen': 'https://forsvarsbygg.no/festningene/bergenhus-festning',

	// Kulturhuset i Bergen rooms
	'kulturhuset i bergen hovedsalen': 'https://kulturhusetibergen.no',
	'kulturhuset i bergen lillesalen': 'https://kulturhusetibergen.no',
	'kulturhuset i bergen restauranten': 'https://kulturhusetibergen.no',
	'kulturhuset i bergen galleriet': 'https://kulturhusetibergen.no',
	'kulturhuset i bergen mesaninen': 'https://kulturhusetibergen.no',
	'kulturhuset i bergen amfi': 'https://kulturhusetibergen.no',

	// Mandelhuset (Tysnes)
	'mandelhuset': 'https://mandelhuset.no',

	// Stene Matglede
	'stene matglede': 'https://stenematglede.com',

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
	'nordahl bruns gate 9': 'https://kodebergen.no',
	'nordahl brun gate 9': 'https://kodebergen.no',
	'engen 21': 'https://dns.no',
	'strandgaten 250': 'https://usf.no',
	'olav kyrres gate 49': 'https://bergenbibliotek.no',
	'strømgaten 6': 'https://bergenbibliotek.no',
	'øvre ole bulls plass 6': 'https://olebullhuset.no',
	'bontelabo 2': 'https://forsvarsbygg.no/festningene/bergenhus-festning',
	'åsane senter 52': 'https://bergenbibliotek.no',
	'østre nesttunvegen 18': 'https://bergen.kommune.no/kulturhus/fana',
	'øvre nesttunvegen 18': 'https://bergen.kommune.no/kulturhus/fana',
	'nattlandsveien 76a': 'https://bergenbibliotek.no',
	'inndalsveien 28': 'https://kvarteret.no',

	// Festivals
	'bergenfest': 'https://bergenfest.no',

	// Festspillene venues
	'festallmenningen': 'https://www.fib.no',
	'festspillene': 'https://www.fib.no',
	'spissen': 'https://www.fib.no',

	// Climate festival venues
	'byrommet': 'https://varmerevaterevillere.no',
	'østre': 'https://ekko.no',

	// DNT (outdoor/hiking)
	'dnt bergen': 'https://www.dnt.no/dnt-der-du-er/bergen-og-hordaland-turlag/',

	// Electronic art
	'bek': 'https://bek.no',
	'bergen senter for elektronisk kunst': 'https://bek.no',

	// Sports
	'brann stadion': 'https://brann.no',
	'sk brann': 'https://brann.no',

	// Swimming/sports
	'nordnes sjøbad': 'https://nordnessjobad.no',
	'ado arena': 'https://adoarena.no',

	// Workshop/creative venues
	'paint\'n sip': 'https://paintnsip.no',
	'paintnsip': 'https://paintnsip.no',

	// Gaming/esports
	'gg bergen': 'https://ggbergen.org',

	// Film/theater
	'bergen filmklubb': 'https://bergenfilmklubb.no',
};

// Venue name → Instagram handle (without @)
const VENUE_INSTAGRAM: Record<string, string> = {
	'grieghallen': 'grieghallen',
	'den nationale scene': 'dennationalescene',
	'dns': 'dennationalescene',
	'usf verftet': 'usfverftet',
	'usf': 'usfverftet',
	'bergen kunsthall': 'bergenkunsthall',
	'kode': 'kodebergen',
	'litteraturhuset i bergen': 'litthusbergen',
	'litteraturhuset': 'litthusbergen',
	'hulen': 'hulenbergen',
	'kvarteret': 'detakademiskekvarter',
	'det akademiske kvarter': 'detakademiskekvarter',
	'bergen kjøtt': 'bergenkjott',
	'cornerteateret': 'cornerteateret',
	'forum scene': 'forumscene',
	'ole bull scene': 'olebullhuset',
	'ole bull huset': 'olebullhuset',
	'akvariet i bergen': 'akvariet',
	'akvariet': 'akvariet',
	'carte blanche': 'carteblanchedans',
	'bergen filharmoniske orkester': 'bergenphilharmonic',
	'harmonien': 'bergenphilharmonic',
	'det vestnorske teateret': 'detvestnorsketeateret',
	'kulturhuset i bergen': 'kulturhusetibergen',
	'bergen offentlige bibliotek': 'bergenbibliotek',
	'bergen bibliotek': 'bergenbibliotek',
	'hovedbiblioteket': 'bergenbibliotek',
	'nordnes sjøbad': 'nordnessjobad',
	'sk brann': 'skbrann',
	'brann stadion': 'skbrann',
	'fløibanen': 'floibanen',
	'oseana': 'oseanakunstsenter',
	'landmark': 'landmark.bergen',
	'madam felle': 'madamfelle',
	'bergenfest': 'bergenfest',
	'festspillene': 'festspillene',
	'bergen pride': 'bergenpride',
	'biff': 'bergenfilmfest',
	'bergen internasjonale filmfestival': 'bergenfilmfest',
	'bergen internasjonale teater': 'bitteater',
	'bit teatergarasjen': 'bitteater',
	'bymuseet i bergen': 'bymuseetibergen',
	'bymuseet': 'bymuseetibergen',
	'stene matglede': 'stenematglede',
	'colonialen': 'colonialen',
	'østre': 'ostrebergen',
	'borealis': 'borealisfestival',
	'borealis festival': 'borealisfestival',
	'nattjazz': 'nattjazz',
	'vilvite': 'vilvite',
	'cinemateket': 'cinemateket_bergen',
	'cinemateket i bergen': 'cinemateket_bergen',
	'fyllingsdalen teater': 'fyllingsdalenteater',
	'bjørgvin blues club': 'bjorgvinblues',
	"o'connor's irish pub": 'oconnors_bergen',
	"o'connor's": 'oconnors_bergen',
	'bergen filmklubb': 'bergenfilmklubb',
	"paint'n sip": 'paintnsip.bergen',
	'paintnsip': 'paintnsip.bergen',
	// KODE-bygg (alle del av samme institusjon)
	'permanenten': 'kodebergen',
	'lysverket': 'kodebergen',
	'rasmus meyer': 'kodebergen',
	'stenersen': 'kodebergen',
	// Bymuseet-bygg
	'det hanseatiske museum': 'bymuseetibergen',
	'bergens sjøfartsmuseum': 'bymuseetibergen',
	'håkonshallen': 'bymuseetibergen',
	'bergenhus festning': 'bymuseetibergen',
	// Troldhaugen / Edvard Grieg Museum
	'troldhaugen': 'edvardgriegmuseum',
	'troldsalen': 'edvardgriegmuseum',
	'siljustøl': 'edvardgriegmuseum',
	// Museum Vest
	'norges fiskerimuseum': 'museumvest',
	// Bibliotek-filialer (alle del av Bergen Bibliotek)
	'laksevåg bibliotek': 'bergenbibliotek',
	'åsane bibliotek': 'bergenbibliotek',
	'landås bibliotek': 'bergenbibliotek',
	'loddefjord bibliotek': 'bergenbibliotek',
	'ny-krohnborg fellesbibliotek': 'bergenbibliotek',
	'fana bibliotek': 'bergenbibliotek',
	'ytre arna bibliotek': 'bergenbibliotek',
	'fyllingsdalen bibliotek': 'bergenbibliotek',
	// Grieghallen-saler (alle del av Grieghallen)
	'griegsalen': 'grieghallen',
	'peer gynt-salen': 'grieghallen',
	// Ole Bull Scene-saler
	'lille ole bull': 'olebullhuset',
	// Bekreftet av bruker 2026-04-07 (har IG-konto)
	'bodega': 'bodega.bergen',
	'bergen næringsråd': 'bergennaringsrad',
	'art lab bergen': 'artlabbergen',
	'råbrent keramikkverksted': 'raabrent',
	'råbrent': 'raabrent',
	'7 fjell bryggeri': '7fjellbryggeri',
	'7fjell bryggeri': '7fjellbryggeri',
	'fana kulturhus': 'fanakulturhus',
	'gg bergen': 'gg.bergen',
	'olav h hauge': 'litthusbergen',
	'fløyen': 'floyenbergen',
	'ado arena': 'adoarena',
	'rosenkrantztårnet': 'bymuseetibergen',
	// Bekreftet av bruker 2026-04-07 (har IKKE IG-konto, ikke legg til handle):
	// - Mandelhuset
	// - Rasmussen Samlingene
	// - Studio Bergen
	// - Nordnes Bydelshus
};

/**
 * Look up a venue's Instagram handle by name (case-insensitive)
 * Returns handle without @ prefix, or null if not found.
 */
export function getVenueInstagram(venueName: string): string | null {
	// Normalize whitespace (collapse newlines/tabs, trim) so DB-imported names
	// like "Rasmus\nMeyer" still match "rasmus meyer".
	const lower = venueName.toLowerCase().replace(/\s+/g, ' ').trim();
	if (VENUE_INSTAGRAM[lower]) return VENUE_INSTAGRAM[lower];
	for (const [key, handle] of Object.entries(VENUE_INSTAGRAM)) {
		if (lower.includes(key)) return handle;
	}
	return null;
}

/**
 * Look up a venue's website URL by name (case-insensitive, partial match)
 */
export function getVenueUrl(venueName: string): string | null {
	const lower = venueName.toLowerCase().trim();

	// Direct match
	if (VENUE_URLS[lower]) return VENUE_URLS[lower];

	// Partial match — only check if input contains the key (NOT reverse)
	for (const [key, url] of Object.entries(VENUE_URLS)) {
		if (lower.includes(key)) return url;
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
