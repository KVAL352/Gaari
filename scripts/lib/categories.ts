// Map source category names → Gåri categories
const CATEGORY_MAP: Record<string, string> = {
	// Norwegian (longer/specific keys first due to sorted iteration)
	'konserter': 'music',
	'konsert': 'music',
	'musikk': 'music',
	'jazz': 'music',
	'rock': 'music',
	'pop': 'music',
	'elektronisk': 'music',
	'klassisk': 'music',
	'festival': 'festival',
	'festivaler': 'festival',
	'marked': 'festival',
	'markeder': 'festival',
	'julemarked': 'festival',
	'teater/musikal': 'theatre',
	'teater': 'theatre',
	'theater': 'theatre',
	'scenekunst': 'theatre',
	'opera': 'theatre',
	'dans': 'theatre',
	'revy': 'theatre',
	'musikal': 'theatre',
	'standup': 'nightlife',
	'stand-up': 'nightlife',
	'uteliv': 'nightlife',
	'nattklubb': 'nightlife',
	'klubb': 'nightlife',
	'quiz': 'nightlife',
	'pub': 'nightlife',
	'humor': 'nightlife',
	'kunst': 'culture',
	'kultur': 'culture',
	'utstilling': 'culture',
	'utstillinger': 'culture',
	'galleri': 'culture',
	'museum': 'culture',
	'literatur': 'culture',
	'kino': 'culture',
	'film': 'culture',
	'foredrag': 'culture',
	'debatt': 'culture',
	'lesning': 'culture',
	'annet': 'culture',
	'mat og drikke': 'food',
	'restaurant': 'food',
	'mat': 'food',
	'vin': 'food',
	'smak': 'food',
	'familieaktiviteter': 'family',
	'barneaktiviteter': 'family',
	'familie/barn': 'family',
	'familie': 'family',
	'barn': 'family',
	'sport': 'sports',
	'idrett': 'sports',
	'fotball': 'sports',
	'friluft': 'sports',
	'turgåing': 'sports',
	'vandring': 'sports',
	'yoga': 'sports',
	'omvisning': 'tours',
	'guidet': 'tours',
	'sightseeing': 'tours',
	'tur': 'tours',
	'kurs': 'workshop',
	'workshop': 'workshop',
	'verksted': 'workshop',
	'student': 'student',
	// English
	'concerts': 'music',
	'concert': 'music',
	'music': 'music',
	'festivals': 'festival',
	'markets': 'festival',
	'performing arts': 'theatre',
	'theatre': 'theatre',
	'nightlife': 'nightlife',
	'comedy': 'nightlife',
	'arts': 'culture',
	'culture': 'culture',
	'exhibition': 'culture',
	'exhibitions': 'culture',
	'food & drink': 'food',
	'food': 'food',
	'family': 'family',
	'kids': 'family',
	'children': 'family',
	'sports': 'sports',
	'outdoors': 'sports',
	'tours': 'tours',
	'workshops': 'workshop',
	'classes': 'workshop',
};

// Pre-sort entries by key length descending so longer/more specific keys match first
const SORTED_CATEGORY_ENTRIES = Object.entries(CATEGORY_MAP).sort((a, b) => b[0].length - a[0].length);

export function mapCategory(sourceCategory: string): string {
	const lower = sourceCategory.toLowerCase().trim();

	// Direct match
	if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];

	// Partial match — only check if input contains the key (NOT reverse)
	for (const [key, value] of SORTED_CATEGORY_ENTRIES) {
		if (lower.includes(key)) return value;
	}

	// Default
	return 'culture';
}

// Map known venues → bydel
const VENUE_BYDEL_MAP: Record<string, string> = {
	'grieghallen': 'Sentrum',
	'den nationale scene': 'Sentrum',
	'ole bull scene': 'Sentrum',
	'lille ole bull': 'Sentrum',
	'forum scene': 'Sentrum',
	'det akademiske kvarter': 'Sentrum',
	'kvarteret': 'Sentrum',
	'konsertpaleet': 'Sentrum',
	'kulturhuset': 'Sentrum',
	'bergen kunsthall': 'Sentrum',
	'kode': 'Sentrum',
	'permanenten': 'Sentrum',
	'stenersen': 'Sentrum',
	'lysverket': 'Sentrum',
	'rasmus meyer': 'Sentrum',
	'troldhaugen': 'Fana',
	'siljustol': 'Fana',
	'bergen kino': 'Sentrum',
	'media city bergen': 'Sentrum',
	'media city': 'Sentrum',
	'medieklyngen': 'Sentrum',
	'byparken': 'Sentrum',
	'festplassen': 'Sentrum',
	'fisketorget': 'Sentrum',
	'torgallmenningen': 'Sentrum',
	'bergen bibliotek': 'Sentrum',
	'bergen offentlige bibliotek': 'Sentrum',
	'hulen': 'Sentrum',
	'usf verftet': 'Bergenhus',
	'usf': 'Bergenhus',
	'sardinen': 'Bergenhus',
	'røkeriet': 'Bergenhus',
	'bryggen': 'Bergenhus',
	'bryggens museum': 'Bergenhus',
	'håkonshallen': 'Bergenhus',
	'rosenkrantztårnet': 'Bergenhus',
	'bergenhus festning': 'Bergenhus',
	'schøtstuene': 'Bergenhus',
	'brann stadion': 'Bergenhus',
	'klubb natt': 'Bergenhus',
	'akvariet': 'Bergenhus',
	'fløibanen': 'Sentrum',
	'fløyen': 'Sentrum',
	'gg bergen': 'Laksevåg',
	'ungdommens hus': 'Laksevåg',
	'laksevåg kultursenter': 'Laksevåg',
	'fyllingsdalen arena': 'Fyllingsdalen',
	'fyllingsdalen bibliotek': 'Fyllingsdalen',
	'fyllingsdalen teater': 'Fyllingsdalen',
	'fyllingsdalen': 'Fyllingsdalen',
	'åsane bibliotek': 'Åsane',
	'åsane kulturhus': 'Åsane',
	'skyland': 'Åsane',
	'fana kulturhus': 'Fana',
	'fana bibliotek': 'Fana',
	'hordamuseet': 'Fana',
	'arna stasjon': 'Arna',
	'ytre arna bibliotek': 'Arna',
	'vilvite': 'Sentrum',
	'torbjørns konserthall': 'Sentrum',
	'madam felle': 'Sentrum',
	'cornerteateret': 'Sentrum',
	'cornerhagen': 'Sentrum',
	'litteraturhuset': 'Sentrum',
	'cinemateket': 'Sentrum',
	'landmark': 'Sentrum',
	'frille': 'Sentrum',
	'dyvekes': 'Sentrum',
	'statsraaden': 'Sentrum',
	'victoria': 'Sentrum',
	'vic': 'Sentrum',
	'bergen kjøtt': 'Sentrum',
	'studio bergen': 'Sentrum',
	'oseana': 'Os',
	's12 galleri': 'Sentrum',
	'7fjell': 'Sentrum',
	'7 fjell': 'Sentrum',
	'colonialen': 'Sentrum',
	'paint\'n sip': 'Sentrum',
	'bergen filmklubb': 'Sentrum',
	'lille dns': 'Sentrum',
	'søylesalen': 'Sentrum',
	'marinehagen amfi': 'Sentrum',
	'lepramuseet': 'Sentrum',
	'skolten': 'Sentrum',
	'studio usf': 'Bergenhus',
	'rokeriet usf': 'Bergenhus',
	'sardinen usf': 'Bergenhus',
	'det vestnorske teateret': 'Sentrum',
	'logen': 'Sentrum',
	'nordnes bydelshus': 'Bergenhus',
	'ny-krohnborg kultursenter': 'Bergenhus',
	'ny krohnborg kultursenter': 'Bergenhus',
	'loddefjord bibliotek': 'Laksevåg',
	'landås bibliotek': 'Bergenhus',
	'gamle bergen museum': 'Bergenhus',
	'damsgård hovedgård': 'Laksevåg',
	'damsgård': 'Laksevåg',
	'ytrebygda kultursenter': 'Ytrebygda',
	// Tikkio venues
	'pappa': 'Sentrum',
	'dr. wiesener': 'Sentrum',
	'terminus hall': 'Bergenhus',
	'biblioteket bar': 'Sentrum',
	'folk kultursenter': 'Sentrum',
	// Broadcast.events venues
	"o'connor's irish pub": 'Bergenhus',
	"o'connor's": 'Bergenhus',
	'oconnors': 'Bergenhus',
	'østre': 'Sentrum',
};

export function isKnownBergenVenue(venueName: string): boolean {
	const lower = venueName.toLowerCase().trim();
	if (VENUE_BYDEL_MAP[lower]) return true;
	for (const key of Object.keys(VENUE_BYDEL_MAP)) {
		if (lower.includes(key)) return true;
	}
	return false;
}

export function mapBydel(venueName: string): string {
	const lower = venueName.toLowerCase().trim();

	// Direct match
	if (VENUE_BYDEL_MAP[lower]) return VENUE_BYDEL_MAP[lower];

	// Partial match — only check if input contains the key (NOT reverse)
	for (const [key, value] of Object.entries(VENUE_BYDEL_MAP)) {
		if (lower.includes(key)) return value;
	}

	// Default — most Bergen events are central
	return 'Sentrum';
}
