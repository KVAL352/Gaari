import type { GaariEvent } from '$lib/types';

// Helper: create dates relative to today
function daysFromNow(days: number, hour = 19, minute = 0): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	d.setHours(hour, minute, 0, 0);
	return d.toISOString();
}

function endTime(startStr: string, hours = 2): string {
	const d = new Date(startStr);
	d.setHours(d.getHours() + hours);
	return d.toISOString();
}

const today0 = daysFromNow(0, 18, 0);
const today1 = daysFromNow(0, 20, 0);
const today2 = daysFromNow(0, 21, 0);
const tomorrow0 = daysFromNow(1, 17, 0);
const tomorrow1 = daysFromNow(1, 19, 30);
const tomorrow2 = daysFromNow(1, 20, 0);
const day2a = daysFromNow(2, 12, 0);
const day2b = daysFromNow(2, 18, 0);
const day2c = daysFromNow(2, 20, 0);
const day3a = daysFromNow(3, 10, 0);
const day3b = daysFromNow(3, 14, 0);
const day3c = daysFromNow(3, 19, 0);
const day4a = daysFromNow(4, 18, 0);
const day4b = daysFromNow(4, 20, 0);
const day5a = daysFromNow(5, 11, 0);
const day5b = daysFromNow(5, 19, 0);
const day6a = daysFromNow(6, 13, 0);
const day7a = daysFromNow(7, 19, 0);
const day8a = daysFromNow(8, 20, 0);
const day10a = daysFromNow(10, 18, 0);
const day12a = daysFromNow(12, 12, 0);
const day14a = daysFromNow(14, 19, 0);

export const seedEvents: GaariEvent[] = [
	// ── TODAY ──
	{
		id: '1',
		slug: 'aurora-grieghallen',
		title_no: 'AURORA — Live i Grieghallen',
		title_en: 'AURORA — Live at Grieghallen',
		description_no: 'AURORA gjør comeback til Grieghallen med sitt etterlengtede nye album. En magisk kveld med Bergens egen stjerne i verdensklasse akustikk.',
		description_en: 'AURORA returns to Grieghallen with her highly anticipated new album. A magical evening with Bergen\'s own star in world-class acoustics.',
		category: 'music',
		date_start: today0,
		date_end: endTime(today0, 3),
		venue_name: 'Grieghallen',
		address: 'Edvard Griegs plass 1',
		bydel: 'Sentrum',
		price: 590,
		ticket_url: 'https://grieghallen.no',
		image_url: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=450&fit=crop',
		age_group: 'all',
		language: 'both',
		status: 'approved'
	},
	{
		id: '2',
		slug: 'quiz-kvarteret',
		title_no: 'Pub Quiz på Kvarteret',
		title_en: 'Pub Quiz at Kvarteret',
		description_no: 'Ukentlig pub quiz på Det Akademiske Kvarter. Lag på 2-6 personer. Premie til vinnerlaget!',
		description_en: 'Weekly pub quiz at Det Akademiske Kvarter. Teams of 2-6 people. Prize for the winning team!',
		category: 'student',
		date_start: today1,
		date_end: endTime(today1, 2),
		venue_name: 'Det Akademiske Kvarter',
		address: 'Olav Kyrres gate 49',
		bydel: 'Sentrum',
		price: 0,
		age_group: 'students',
		language: 'no',
		status: 'approved'
	},
	{
		id: '3',
		slug: 'jazz-sardinen',
		title_no: 'Jazzkveld — Sardinen USF',
		title_en: 'Jazz Night — Sardinen USF',
		description_no: 'Intim jazzkonsert med lokale Bergen-musikere på Sardinen. Åpen scene fra kl. 21.',
		description_en: 'Intimate jazz concert with local Bergen musicians at Sardinen. Open stage from 9 PM.',
		category: 'music',
		date_start: today2,
		date_end: endTime(today2, 3),
		venue_name: 'Sardinen USF',
		address: 'Georgernes Verft 12',
		bydel: 'Bergenhus',
		price: 150,
		image_url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&h=450&fit=crop',
		age_group: '18+',
		language: 'both',
		status: 'approved'
	},

	// ── TOMORROW ──
	{
		id: '4',
		slug: 'kode-edvard-munch',
		title_no: 'Edvard Munch — Det Indre Øye',
		title_en: 'Edvard Munch — The Inner Eye',
		description_no: 'Stor utstilling av Munchs mindre kjente verk fra Rasmus Meyers samlinger. Gratis omvisning kl. 17.',
		description_en: 'Major exhibition of Munch\'s lesser-known works from the Rasmus Meyer collections. Free guided tour at 5 PM.',
		category: 'culture',
		date_start: tomorrow0,
		date_end: endTime(tomorrow0, 4),
		venue_name: 'KODE 3',
		address: 'Rasmus Meyers allé 3',
		bydel: 'Sentrum',
		price: 0,
		image_url: 'https://images.unsplash.com/photo-1578926288207-a90a5366759d?w=800&h=450&fit=crop',
		age_group: 'all',
		language: 'both',
		status: 'approved'
	},
	{
		id: '5',
		slug: 'standup-ole-bull-scene',
		title_no: 'Stand-up kveld med lokale komikere',
		title_en: 'Stand-up Night with Local Comedians',
		description_no: 'Bergens beste stand-up komikere på én scene. Programleder: Jonas Eikevik.',
		description_en: 'Bergen\'s best stand-up comedians on one stage. Hosted by Jonas Eikevik.',
		category: 'nightlife',
		date_start: tomorrow1,
		date_end: endTime(tomorrow1, 2),
		venue_name: 'Ole Bull Scene',
		address: 'Ole Bulls plass 9',
		bydel: 'Sentrum',
		price: 250,
		age_group: '18+',
		language: 'no',
		status: 'approved'
	},
	{
		id: '6',
		slug: 'forum-scene-rock',
		title_no: 'Kvelertak — Norsk rock på sitt beste',
		title_en: 'Kvelertak — Norwegian Rock at Its Best',
		description_no: 'Kvelertak tar med seg sin eksplosive energi til Forum Scene. Støtte: lokale Bergen-band.',
		description_en: 'Kvelertak brings their explosive energy to Forum Scene. Support: local Bergen bands.',
		category: 'music',
		date_start: tomorrow2,
		date_end: endTime(tomorrow2, 3),
		venue_name: 'Forum Scene',
		address: 'Komediebakken 9',
		bydel: 'Sentrum',
		price: 450,
		ticket_url: 'https://forumscene.no',
		image_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=450&fit=crop',
		age_group: '18+',
		language: 'no',
		status: 'approved'
	},

	// ── DAY 2 ──
	{
		id: '7',
		slug: 'fiskemarked-matfestival',
		title_no: 'Bergen Matfestival — Fisketorget',
		title_en: 'Bergen Food Festival — Fish Market',
		description_no: 'Smak Vestlandets beste sjømat og lokale delikatesser. Kokeshow, gratis smaksprøver og matverksteder for alle aldre.',
		description_en: 'Taste the best seafood and local delicacies from Western Norway. Cooking shows, free tastings, and food workshops for all ages.',
		category: 'food',
		date_start: day2a,
		date_end: endTime(day2a, 6),
		venue_name: 'Fisketorget',
		address: 'Torget 5',
		bydel: 'Sentrum',
		price: 0,
		image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=450&fit=crop',
		age_group: 'all',
		language: 'both',
		status: 'approved'
	},
	{
		id: '8',
		slug: 'bergen-kunsthall-contemporary',
		title_no: 'Samtidskunst — Bergen Kunsthall',
		title_en: 'Contemporary Art — Bergen Kunsthall',
		description_no: 'Ny gruppeutstilling med internasjonale samtidskunstnere. Åpning med kunstnersamtale.',
		description_en: 'New group exhibition featuring international contemporary artists. Opening with artist talk.',
		category: 'culture',
		date_start: day2b,
		date_end: endTime(day2b, 3),
		venue_name: 'Bergen Kunsthall',
		address: 'Rasmus Meyers allé 5',
		bydel: 'Sentrum',
		price: 100,
		age_group: 'all',
		language: 'both',
		status: 'approved'
	},
	{
		id: '9',
		slug: 'dj-natt-club',
		title_no: 'DJ-kveld — Klubb Natt',
		title_en: 'DJ Night — Klubb Natt',
		description_no: 'Elektronisk musikk hele natten. DJs fra Bergen og Oslo.',
		category: 'nightlife',
		date_start: day2c,
		date_end: endTime(day2c, 5),
		venue_name: 'Klubb Natt',
		address: 'Nøstegaten 20',
		bydel: 'Bergenhus',
		price: 200,
		age_group: '18+',
		language: 'no',
		status: 'approved'
	},

	// ── DAY 3 ──
	{
		id: '10',
		slug: 'floyen-familievandring',
		title_no: 'Familievandring til Fløyen',
		title_en: 'Family Hike to Fløyen',
		description_no: 'Guidet vandring til Fløyen med aktiviteter for barn. Trollstien og naturlek underveis. Møtepunkt ved Fløibanen.',
		description_en: 'Guided hike to Fløyen with activities for kids. Troll trail and nature play along the way. Meeting point at Fløibanen.',
		category: 'family',
		date_start: day3a,
		date_end: endTime(day3a, 3),
		venue_name: 'Fløibanen',
		address: 'Vetrlidsallmenningen 21',
		bydel: 'Sentrum',
		price: 0,
		image_url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=450&fit=crop',
		age_group: 'family',
		language: 'both',
		status: 'approved'
	},
	{
		id: '11',
		slug: 'keramikkverksted-laksevag',
		title_no: 'Keramikkverksted for nybegynnere',
		title_en: 'Ceramics Workshop for Beginners',
		description_no: 'Lær grunnleggende keramikkteknikker i hyggelige omgivelser. Alt materiell inkludert.',
		description_en: 'Learn basic ceramics techniques in a cozy setting. All materials included.',
		category: 'workshop',
		date_start: day3b,
		date_end: endTime(day3b, 3),
		venue_name: 'Laksevåg Kultursenter',
		address: 'Damsgårdsveien 35',
		bydel: 'Laksevåg',
		price: 350,
		age_group: 'all',
		language: 'no',
		status: 'approved'
	},
	{
		id: '12',
		slug: 'dns-peer-gynt',
		title_no: 'Peer Gynt — Den Nationale Scene',
		title_en: 'Peer Gynt — The National Theatre Bergen',
		description_no: 'Henrik Ibsens mesterverk i ny, moderne oppsetning. Med Griegs musikk fremført av Bergen Filharmoniske Orkester.',
		description_en: 'Henrik Ibsen\'s masterpiece in a new, modern production. With Grieg\'s music performed by the Bergen Philharmonic.',
		category: 'theatre',
		date_start: day3c,
		date_end: endTime(day3c, 3),
		venue_name: 'Den Nationale Scene',
		address: 'Engen 1',
		bydel: 'Sentrum',
		price: 490,
		ticket_url: 'https://dns.no',
		image_url: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=450&fit=crop',
		age_group: 'all',
		language: 'no',
		status: 'approved'
	},

	// ── DAY 4 ──
	{
		id: '13',
		slug: 'brann-fotball',
		title_no: 'SK Brann vs Viking FK',
		title_en: 'SK Brann vs Viking FK',
		description_no: 'Vestlandsderby på Brann Stadion! En av Eliteseriens mest intense kamper.',
		description_en: 'West coast derby at Brann Stadium! One of the most intense matches in the Norwegian Premier League.',
		category: 'sports',
		date_start: day4a,
		date_end: endTime(day4a, 2),
		venue_name: 'Brann Stadion',
		address: 'Kniksens plass 1',
		bydel: 'Bergenhus',
		price: 350,
		ticket_url: 'https://brann.no',
		image_url: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=450&fit=crop',
		age_group: 'all',
		language: 'no',
		status: 'approved'
	},
	{
		id: '14',
		slug: 'vinkveld-altona',
		title_no: 'Vinsmaking — Italienske viner',
		title_en: 'Wine Tasting — Italian Wines',
		description_no: 'Opplev italienske viner med sommelier. 6 viner med tilhørende osterett. Begrenset antall plasser.',
		description_en: 'Experience Italian wines with a sommelier. 6 wines paired with cheese. Limited spots available.',
		category: 'food',
		date_start: day4b,
		date_end: endTime(day4b, 2),
		venue_name: 'Altona Vinbar',
		address: 'Augustin Grunnanes gate 22',
		bydel: 'Sentrum',
		price: 500,
		age_group: '18+',
		language: 'no',
		status: 'approved'
	},

	// ── DAY 5 ──
	{
		id: '15',
		slug: 'loppemarked-usf',
		title_no: 'Loppemarked på USF Verftet',
		title_en: 'Flea Market at USF Verftet',
		description_no: 'Stor loppemarked med vintage-klær, vinyl, bøker og kuriosa. Kafé med hjemmebakst.',
		description_en: 'Large flea market with vintage clothes, vinyl, books, and curiosities. Café with homemade pastries.',
		category: 'festival',
		date_start: day5a,
		date_end: endTime(day5a, 5),
		venue_name: 'USF Verftet',
		address: 'Georgernes Verft 12',
		bydel: 'Bergenhus',
		price: 0,
		image_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&h=450&fit=crop',
		age_group: 'all',
		language: 'no',
		status: 'approved'
	},
	{
		id: '16',
		slug: 'symphonic-metal-usf',
		title_no: 'Wardruna — Akustisk kveld',
		title_en: 'Wardruna — Acoustic Evening',
		description_no: 'Wardruna fremfører sine norrøne verk i akustisk format. En sjelden og intim opplevelse.',
		description_en: 'Wardruna performs their Norse works in acoustic format. A rare and intimate experience.',
		category: 'music',
		date_start: day5b,
		date_end: endTime(day5b, 2),
		venue_name: 'USF Verftet',
		address: 'Georgernes Verft 12',
		bydel: 'Bergenhus',
		price: 650,
		ticket_url: 'https://usf.no',
		age_group: 'all',
		language: 'both',
		status: 'approved'
	},

	// ── DAY 6 ──
	{
		id: '17',
		slug: 'bryggen-walking-tour',
		title_no: 'Guidet tur — Bryggen og Hanseatene',
		title_en: 'Guided Tour — Bryggen and the Hanseatic League',
		description_no: 'Utforsk UNESCOs verdensarv Bryggen med historiker. Historier fra hanseatisk tid. Varighet: 90 min.',
		description_en: 'Explore UNESCO World Heritage Site Bryggen with a historian. Stories from Hanseatic times. Duration: 90 min.',
		category: 'tours',
		date_start: day6a,
		date_end: endTime(day6a, 1.5),
		venue_name: 'Bryggens Museum',
		address: 'Dreggsallmenningen 3',
		bydel: 'Bergenhus',
		price: 200,
		image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=450&fit=crop',
		age_group: 'all',
		language: 'en',
		status: 'approved'
	},

	// ── NEXT WEEK ──
	{
		id: '18',
		slug: 'yoga-fana-kulturhus',
		title_no: 'Yoga i parken — Fana Kulturhus',
		title_en: 'Yoga in the Park — Fana Kulturhus',
		description_no: 'Utendørs yoga for alle nivåer. Ta med egen matte. Avlyst ved regn (dette er Bergen).',
		description_en: 'Outdoor yoga for all levels. Bring your own mat. Cancelled in rain (this is Bergen).',
		category: 'sports',
		date_start: day7a,
		date_end: endTime(day7a, 1),
		venue_name: 'Fana Kulturhus',
		address: 'Fanafjordveien 11',
		bydel: 'Fana',
		price: 0,
		age_group: 'all',
		language: 'both',
		status: 'approved'
	},
	{
		id: '19',
		slug: 'elektronika-kveld-hulen',
		title_no: 'Elektronika — Hulen',
		title_en: 'Electronic Night — Hulen',
		description_no: 'Norges eldste studentklubb inviterer til elektronisk musikk i kjelleren. Lokale DJs.',
		description_en: 'Norway\'s oldest student club invites you to electronic music in the basement. Local DJs.',
		category: 'student',
		date_start: day8a,
		date_end: endTime(day8a, 4),
		venue_name: 'Hulen',
		address: 'Olaf Ryes vei 48',
		bydel: 'Sentrum',
		price: 100,
		age_group: 'students',
		language: 'no',
		status: 'approved'
	},
	{
		id: '20',
		slug: 'barnefestival-asane',
		title_no: 'Barneteater — Eventyrstund på biblioteket',
		title_en: 'Children\'s Theatre — Story Time at the Library',
		description_no: 'Interaktivt barneteater basert på norske folkeeventyr. For barn 3-8 år.',
		description_en: 'Interactive children\'s theatre based on Norwegian folk tales. For kids aged 3-8.',
		category: 'family',
		date_start: day10a,
		date_end: endTime(day10a, 1.5),
		venue_name: 'Åsane Bibliotek',
		address: 'Åsane Senter',
		bydel: 'Åsane',
		price: 50,
		age_group: 'family',
		language: 'no',
		status: 'approved'
	},
	{
		id: '21',
		slug: 'kreativt-kodekurs',
		title_no: 'Kreativt koding — Generativ kunst',
		title_en: 'Creative Coding — Generative Art',
		description_no: 'Lær å lage kunst med kode! Workshop i p5.js for nybegynnere. Ta med egen laptop.',
		description_en: 'Learn to create art with code! p5.js workshop for beginners. Bring your own laptop.',
		category: 'workshop',
		date_start: day12a,
		date_end: endTime(day12a, 4),
		venue_name: 'Media City Bergen',
		address: 'Lars Hilles gate 30',
		bydel: 'Sentrum',
		price: 200,
		age_group: 'all',
		language: 'both',
		status: 'approved'
	},
	{
		id: '22',
		slug: 'vossjazz-forsmak',
		title_no: 'Vossajazz — Forsmak i Bergen',
		title_en: 'Vossajazz — Bergen Preview',
		description_no: 'Smakebiter fra årets Vossajazz-program med internasjonale artister. Billetter inkluderer én drink.',
		description_en: 'Previews from this year\'s Vossajazz programme with international artists. Tickets include one drink.',
		category: 'music',
		date_start: day14a,
		date_end: endTime(day14a, 3),
		venue_name: 'Grieghallen',
		address: 'Edvard Griegs plass 1',
		bydel: 'Sentrum',
		price: 380,
		ticket_url: 'https://grieghallen.no',
		image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=450&fit=crop',
		age_group: 'all',
		language: 'both',
		status: 'approved'
	},
	// Cancelled event for testing
	{
		id: '23',
		slug: 'avlyst-utekonsert',
		title_no: 'Utekonsert i Byparken (AVLYST)',
		title_en: 'Outdoor Concert in Byparken (CANCELLED)',
		description_no: 'Avlyst grunnet værforhold. Vi beklager ulempene.',
		description_en: 'Cancelled due to weather conditions. We apologize for the inconvenience.',
		category: 'music',
		date_start: tomorrow1,
		venue_name: 'Byparken',
		address: 'Festplassen',
		bydel: 'Sentrum',
		price: 0,
		age_group: 'all',
		language: 'both',
		status: 'cancelled'
	},
	// Event in Fyllingsdalen
	{
		id: '24',
		slug: 'handballkamp-fyllingen',
		title_no: 'Fyllingen Håndball — Seriefinale',
		title_en: 'Fyllingen Handball — Season Finale',
		description_no: 'Spennende seriefinale i Fyllingsdalen Arena. Heiagjeng og salg av pølser og brus.',
		description_en: 'Exciting season finale at Fyllingsdalen Arena. Cheering squad and hot dogs.',
		category: 'sports',
		date_start: day3a,
		date_end: endTime(day3a, 2),
		venue_name: 'Fyllingsdalen Arena',
		address: 'Folke Bernadottes vei 52',
		bydel: 'Fyllingsdalen',
		price: 100,
		age_group: 'all',
		language: 'no',
		status: 'approved'
	},
	// Event in Arna
	{
		id: '25',
		slug: 'arna-turgruppe',
		title_no: 'Fjelltur fra Arna — Gullfjellet',
		title_en: 'Mountain Hike from Arna — Gullfjellet',
		description_no: 'Guidet fjelltur til Gullfjellet (987 m.o.h.). Moderat vanskelighetsgrad. Pack matpakke.',
		description_en: 'Guided mountain hike to Gullfjellet (987m). Moderate difficulty. Pack lunch.',
		category: 'sports',
		date_start: day5a,
		date_end: endTime(day5a, 6),
		venue_name: 'Arna Stasjon',
		address: 'Arna Stasjon',
		bydel: 'Arna',
		price: 0,
		image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=450&fit=crop',
		age_group: 'all',
		language: 'no',
		status: 'approved'
	}
];
