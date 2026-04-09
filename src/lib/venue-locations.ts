// Venue location data for JSON-LD structured data enrichment
// Used by seo.ts to add street addresses, postal codes and GeoCoordinates to Event schema

export interface VenueLocation {
	street: string;
	postalCode: string;
	lat: number;
	lng: number;
}

const LOCATIONS: Record<string, VenueLocation> = {
	'grieghallen': { street: 'Edvard Griegs plass 1', postalCode: '5015', lat: 60.3882, lng: 5.3299 },
	'den nationale scene': { street: 'Engen 21', postalCode: '5011', lat: 60.3907, lng: 5.3265 },
	'dns': { street: 'Engen 21', postalCode: '5011', lat: 60.3907, lng: 5.3265 },
	'ole bull scene': { street: 'Øvre Ole Bulls plass 6', postalCode: '5012', lat: 60.3910, lng: 5.3263 },
	'ole bull huset': { street: 'Øvre Ole Bulls plass 6', postalCode: '5012', lat: 60.3910, lng: 5.3263 },
	'lille ole bull': { street: 'Øvre Ole Bulls plass 6', postalCode: '5012', lat: 60.3910, lng: 5.3263 },
	'forum scene': { street: 'Komediebakken 9', postalCode: '5010', lat: 60.3922, lng: 5.3241 },
	'usf verftet': { street: 'Georgernes Verft 12', postalCode: '5011', lat: 60.3985, lng: 5.3103 },
	'usf': { street: 'Georgernes Verft 12', postalCode: '5011', lat: 60.3985, lng: 5.3103 },
	'sardinen': { street: 'Georgernes Verft 12', postalCode: '5011', lat: 60.3985, lng: 5.3103 },
	'hulen': { street: 'Olaf Ryes vei 48', postalCode: '5008', lat: 60.3827, lng: 5.3324 },
	'madam felle': { street: 'Strandgaten 3', postalCode: '5013', lat: 60.3949, lng: 5.3251 },
	'bergen kjøtt': { street: 'Skutevikstorget 1', postalCode: '5035', lat: 60.4008, lng: 5.3154 },
	'kvarteret': { street: 'Olav Kyrres gate 49', postalCode: '5015', lat: 60.3870, lng: 5.3290 },
	'det akademiske kvarter': { street: 'Olav Kyrres gate 49', postalCode: '5015', lat: 60.3870, lng: 5.3290 },
	'cornerteateret': { street: 'Nøstegaten 33', postalCode: '5011', lat: 60.3936, lng: 5.3160 },
	'landmark': { street: 'Rasmus Meyers allé 5', postalCode: '5015', lat: 60.3877, lng: 5.3260 },
	'kulturhuset i bergen': { street: 'Ostronesgate 10', postalCode: '5017', lat: 60.3832, lng: 5.3378 },
	'bergen kunsthall': { street: 'Rasmus Meyers allé 5', postalCode: '5015', lat: 60.3877, lng: 5.3260 },
	'kode': { street: 'Rasmus Meyers allé 9', postalCode: '5015', lat: 60.3879, lng: 5.3252 },
	'permanenten': { street: 'Nordahl Bruns gate 9', postalCode: '5014', lat: 60.3889, lng: 5.3237 },
	'litteraturhuset': { street: 'Østre Skostredet 5-7', postalCode: '5017', lat: 60.3926, lng: 5.3296 },
	'litteraturhuset i bergen': { street: 'Østre Skostredet 5-7', postalCode: '5017', lat: 60.3926, lng: 5.3296 },
	'bergen offentlige bibliotek': { street: 'Strømgaten 6', postalCode: '5015', lat: 60.3893, lng: 5.3316 },
	'bergen bibliotek': { street: 'Strømgaten 6', postalCode: '5015', lat: 60.3893, lng: 5.3316 },
	'hovedbiblioteket': { street: 'Strømgaten 6', postalCode: '5015', lat: 60.3893, lng: 5.3316 },
	'det vestnorske teateret': { street: 'Engen 14', postalCode: '5011', lat: 60.3904, lng: 5.3252 },
	'bergen internasjonale teater': { street: 'Nøstegaten 54', postalCode: '5011', lat: 60.3937, lng: 5.3151 },
	'bit teatergarasjen': { street: 'Nøstegaten 54', postalCode: '5011', lat: 60.3937, lng: 5.3151 },
	'carte blanche': { street: 'Sigurds gate 6', postalCode: '5015', lat: 60.3882, lng: 5.3299 },
	'fyllingsdalen teater': { street: 'Folke Bernadottes vei 21', postalCode: '5147', lat: 60.3508, lng: 5.2974 },
	'akvariet': { street: 'Nordnesbakken 4', postalCode: '5005', lat: 60.3990, lng: 5.3048 },
	'akvariet i bergen': { street: 'Nordnesbakken 4', postalCode: '5005', lat: 60.3990, lng: 5.3048 },
	'bryggens museum': { street: 'Dreggsallmenningen 3', postalCode: '5003', lat: 60.3970, lng: 5.3237 },
	'håkonshallen': { street: 'Bradbenken 1', postalCode: '5003', lat: 60.3997, lng: 5.3224 },
	'rosenkrantztårnet': { street: 'Bergenhus festning', postalCode: '5003', lat: 60.3993, lng: 5.3211 },
	'vilvite': { street: 'Thormøhlens gate 51', postalCode: '5006', lat: 60.3933, lng: 5.3098 },
	'colonialen': { street: 'Kong Oscars gate 44', postalCode: '5017', lat: 60.3920, lng: 5.3305 },
	'stene matglede': { street: 'Strandgaten 180', postalCode: '5004', lat: 60.3966, lng: 5.3182 },
	'fløyen': { street: 'Vetrlidsallmenningen 21', postalCode: '5014', lat: 60.3964, lng: 5.3283 },
	'fløibanen': { street: 'Vetrlidsallmenningen 21', postalCode: '5014', lat: 60.3964, lng: 5.3283 },
	'brann stadion': { street: 'Kniksens plass 1', postalCode: '5042', lat: 60.3690, lng: 5.3580 },
	'sk brann': { street: 'Kniksens plass 1', postalCode: '5042', lat: 60.3690, lng: 5.3580 },
	'nordnes sjøbad': { street: 'Nordnesbakken 30', postalCode: '5005', lat: 60.3982, lng: 5.3012 },
	'oseana': { street: 'Oseana kulturhus', postalCode: '5200', lat: 60.2312, lng: 5.4695 },
	'bergen domkirke': { street: 'Domkirkeplassen 1', postalCode: '5003', lat: 60.3958, lng: 5.3268 },
	'bodega': { street: 'Neumanns gate 22', postalCode: '5015', lat: 60.3870, lng: 5.3253 },
	'gg bergen': { street: 'Lagunen storsenter', postalCode: '5239', lat: 60.3118, lng: 5.3375 },
};

/**
 * Look up a venue's physical location by name (case-insensitive, partial match).
 */
export function getVenueLocation(venueName: string): VenueLocation | null {
	const lower = venueName.toLowerCase().replace(/\s+/g, ' ').trim();
	if (LOCATIONS[lower]) return LOCATIONS[lower];
	for (const [key, loc] of Object.entries(LOCATIONS)) {
		if (lower.includes(key)) return loc;
	}
	return null;
}
