import type { Lang } from './types';

export interface VenueInfo {
	slug: string;
	name: string;
	nameDisplay: Record<Lang, string>;
	description: Record<Lang, string>;
	street: string;
	postalCode: string;
	lat: number;
	lng: number;
	website?: string;
	bydel: string;
}

/**
 * Top venues in Bergen — curated for SEO venue pages.
 * Venue names must match how they appear in event.venue_name from Supabase (case-insensitive match).
 */
export const TOP_VENUES: VenueInfo[] = [
	{
		slug: 'grieghallen',
		name: 'Grieghallen',
		nameDisplay: { no: 'Grieghallen', en: 'Grieghallen' },
		description: {
			no: 'Bergens største konsert- og konferansehus med 1 500 plasser i Griegsalen. Huser Bergen Filharmoniske Orkester og vertskap for festivaler som Festspillene og Nattjazz.',
			en: "Bergen's largest concert and conference hall with 1,500 seats in the Grieg Hall. Home to the Bergen Philharmonic Orchestra and host of festivals like Bergen International Festival and Nattjazz."
		},
		street: 'Edvard Griegs plass 1', postalCode: '5015', lat: 60.3882, lng: 5.3299,
		website: 'https://grieghallen.no', bydel: 'Sentrum'
	},
	{
		slug: 'usf-verftet',
		name: 'USF Verftet',
		nameDisplay: { no: 'USF Verftet', en: 'USF Verftet' },
		description: {
			no: 'Kultursenter på Nordnes med konserter, teater, dans og kunst. Har flere scener inkludert Sardinen og Røkeriet. Et av Bergens viktigste kulturhus.',
			en: 'Cultural centre on Nordnes with concerts, theatre, dance and art. Features multiple stages including Sardinen and Røkeriet. One of Bergen\'s most important cultural venues.'
		},
		street: 'Georgernes Verft 12', postalCode: '5011', lat: 60.3985, lng: 5.3103,
		website: 'https://usf.no', bydel: 'Bergenhus'
	},
	{
		slug: 'ole-bull-scene',
		name: 'Ole Bull Scene',
		nameDisplay: { no: 'Ole Bull Scene', en: 'Ole Bull Scene' },
		description: {
			no: 'Historisk konserthus sentralt i Bergen med Lille Ole Bull og flere scener. Arrangerer konserter, standup, teater og konferanser.',
			en: 'Historic concert venue in central Bergen with Lille Ole Bull and multiple stages. Hosts concerts, comedy, theatre and conferences.'
		},
		street: 'Øvre Ole Bulls plass 6', postalCode: '5012', lat: 60.3910, lng: 5.3263,
		website: 'https://olebullhuset.no', bydel: 'Sentrum'
	},
	{
		slug: 'den-nationale-scene',
		name: 'Den Nationale Scene',
		nameDisplay: { no: 'Den Nationale Scene', en: 'The National Theatre Bergen' },
		description: {
			no: 'Norges eldste permanente teater, grunnlagt i 1850. Har flere scener og setter opp drama, musikal, barne- og ungdomsteater.',
			en: "Norway's oldest permanent theatre, founded in 1850. Features multiple stages with drama, musicals, children's and youth theatre."
		},
		street: 'Engen 21', postalCode: '5011', lat: 60.3907, lng: 5.3265,
		website: 'https://dns.no', bydel: 'Sentrum'
	},
	{
		slug: 'hulen',
		name: 'Hulen',
		nameDisplay: { no: 'Hulen', en: 'Hulen' },
		description: {
			no: 'Europas eldste rockeklubb, drevet av frivillige studenter siden 1968. Intim scene i en gammel luftvernbunker på Nygårdshøyden.',
			en: "Europe's oldest rock club, run by student volunteers since 1968. Intimate venue in a former air-raid shelter on Nygårdshøyden."
		},
		street: 'Olaf Ryes vei 48', postalCode: '5008', lat: 60.3827, lng: 5.3324,
		website: 'https://hulen.no', bydel: 'Sentrum'
	},
	{
		slug: 'kvarteret',
		name: 'Kvarteret',
		nameDisplay: { no: 'Kvarteret', en: 'Kvarteret' },
		description: {
			no: 'Norges største studentdrevne kulturhus med konserter, teater, quiz, debatter og utstillinger. Sentralt på Nygårdshøyden.',
			en: "Norway's largest student-run cultural venue with concerts, theatre, quizzes, debates and exhibitions. Central on Nygårdshøyden."
		},
		street: 'Olav Kyrres gate 49', postalCode: '5015', lat: 60.3870, lng: 5.3290,
		website: 'https://kvarteret.no', bydel: 'Sentrum'
	},
	{
		slug: 'kode',
		name: 'KODE',
		nameDisplay: { no: 'KODE Kunstmuseer', en: 'KODE Art Museums' },
		description: {
			no: 'Bergens kunstmuseum med fire bygninger rundt Lille Lungegårdsvannet. Har Norges største samling av Edvard Munch og Nikolai Astrup.',
			en: "Bergen's art museum with four buildings around Lille Lungegårdsvannet. Houses Norway's largest collection of Edvard Munch and Nikolai Astrup."
		},
		street: 'Rasmus Meyers allé 9', postalCode: '5015', lat: 60.3879, lng: 5.3252,
		website: 'https://kodebergen.no', bydel: 'Sentrum'
	},
	{
		slug: 'bergen-kjott',
		name: 'Bergen Kjøtt',
		nameDisplay: { no: 'Bergen Kjøtt', en: 'Bergen Kjøtt' },
		description: {
			no: 'Kultursenter i et gammelt slakteri i Skuteviken. Konserter, kunst, workshops og matopplevelser i et rått industribygg.',
			en: 'Cultural centre in a former slaughterhouse in Skuteviken. Concerts, art, workshops and food experiences in a raw industrial building.'
		},
		street: 'Skutevikstorget 1', postalCode: '5035', lat: 60.4008, lng: 5.3154,
		website: 'https://bergenkjott.no', bydel: 'Bergenhus'
	},
	{
		slug: 'det-vestnorske-teateret',
		name: 'Det Vestnorske Teateret',
		nameDisplay: { no: 'Det Vestnorske Teateret', en: 'The Western Norwegian Theatre' },
		description: {
			no: 'Nynorsk regionteater med et bredt repertoar. Har flere scener og setter opp alt fra klassisk drama til moderne samtidsteater.',
			en: 'Nynorsk regional theatre with a broad repertoire. Multiple stages with everything from classical drama to modern contemporary theatre.'
		},
		street: 'Engen 14', postalCode: '5011', lat: 60.3904, lng: 5.3252,
		website: 'https://dfrtvest.no', bydel: 'Sentrum'
	},
	{
		slug: 'litteraturhuset',
		name: 'Litteraturhuset i Bergen',
		nameDisplay: { no: 'Litteraturhuset i Bergen', en: 'Bergen House of Literature' },
		description: {
			no: 'Møteplass for litteratur, debatt og kultur i Østre Skostredet. Gratis arrangementer, forfattersamtaler og boklanseringer.',
			en: 'Meeting place for literature, debate and culture in Østre Skostredet. Free events, author talks and book launches.'
		},
		street: 'Østre Skostredet 5-7', postalCode: '5017', lat: 60.3926, lng: 5.3296,
		website: 'https://litthusbergen.no', bydel: 'Sentrum'
	},
	{
		slug: 'madam-felle',
		name: 'Madam Felle',
		nameDisplay: { no: 'Madam Felle', en: 'Madam Felle' },
		description: {
			no: 'Pub og konsertscene på Bryggen med livemusikk flere kvelder i uken. Populær blant lokale og besøkende.',
			en: 'Pub and concert venue on Bryggen with live music several evenings a week. Popular with locals and visitors alike.'
		},
		street: 'Strandgaten 3', postalCode: '5013', lat: 60.3949, lng: 5.3251,
		website: 'https://madamfelle.no', bydel: 'Bergenhus'
	},
	{
		slug: 'kulturhuset-i-bergen',
		name: 'Kulturhuset i Bergen',
		nameDisplay: { no: 'Kulturhuset i Bergen', en: 'Kulturhuset Bergen' },
		description: {
			no: 'Stort konserthus og kulturarena med flere scener. Vertskap for konserter, standup, teater og konferanser.',
			en: 'Large concert hall and cultural arena with multiple stages. Hosts concerts, comedy, theatre and conferences.'
		},
		street: 'Ostronesgate 10', postalCode: '5017', lat: 60.3832, lng: 5.3378,
		website: 'https://kulturhusetibergen.no', bydel: 'Sentrum'
	},
	{
		slug: 'bergen-bibliotek',
		name: 'Bergen Offentlige Bibliotek',
		nameDisplay: { no: 'Bergen Offentlige Bibliotek', en: 'Bergen Public Library' },
		description: {
			no: 'Hovedbiblioteket i Bergen med gratis arrangementer, utstillinger, foredrag og aktiviteter for alle aldre.',
			en: 'Bergen main library with free events, exhibitions, talks and activities for all ages.'
		},
		street: 'Strømgaten 6', postalCode: '5015', lat: 60.3893, lng: 5.3316,
		website: 'https://bergenbibliotek.no', bydel: 'Sentrum'
	},
	{
		slug: 'forum-scene',
		name: 'Forum Scene',
		nameDisplay: { no: 'Forum Scene', en: 'Forum Scene' },
		description: {
			no: 'Konsertarena sentralt i Bergen med kapasitet for 800 gjester. Arrangerer konserter, standup og andre forestillinger.',
			en: 'Concert arena in central Bergen with capacity for 800 guests. Hosts concerts, comedy shows and other performances.'
		},
		street: 'Komediebakken 9', postalCode: '5010', lat: 60.3922, lng: 5.3241,
		website: 'https://forumscene.no', bydel: 'Sentrum'
	},
	{
		slug: 'akvariet',
		name: 'Akvariet i Bergen',
		nameDisplay: { no: 'Akvariet i Bergen', en: 'Bergen Aquarium' },
		description: {
			no: 'Et av Norges mest populære familieattraksjoner med fisk, sjøløver, pingviner og tropisk avdeling. Daglige fôringer og aktiviteter.',
			en: "One of Norway's most popular family attractions with fish, sea lions, penguins and a tropical section. Daily feedings and activities."
		},
		street: 'Nordnesbakken 4', postalCode: '5005', lat: 60.3996, lng: 5.3047,
		website: 'https://akvariet.no', bydel: 'Bergenhus'
	}
];

export function getVenueBySlug(slug: string): VenueInfo | undefined {
	return TOP_VENUES.find(v => v.slug === slug);
}

export function getAllVenueSlugs(): string[] {
	return TOP_VENUES.map(v => v.slug);
}

// ── Student discount data ──
// Hybrid: manually maintained + enrichable by scrapers.
// venue key = lowercase venue name substring (matched with .includes()).
// source: 'manual' (verified by us) | 'scraped' (auto-detected, needs verification).
export interface StudentDiscount {
	discount: string;          // e.g. "50% på billetter", "100 kr rabatt"
	source: 'manual' | 'scraped';
	url?: string;              // link to pricing page for verification
	verified?: string;         // ISO date when last verified
}

export const STUDENT_DISCOUNTS: Record<string, StudentDiscount> = {
	// ── Theatre & performing arts ──
	'den nationale scene': {
		discount: '50% for studenter og unge 16–25 år. Teatertjommi 18–30.',
		source: 'manual',
		url: 'https://www.dns.no/billetter',
		verified: '2026-04-15',
	},
	'dns': {
		discount: '50% for studenter og unge 16–25 år.',
		source: 'manual',
		verified: '2026-04-15',
	},
	'det vestnorske teateret': {
		discount: 'Studentkategori, ca kr 250 på utvalgte forestillinger.',
		source: 'manual',
		url: 'https://www.detvestnorsketeateret.no/billettinformasjon',
		verified: '2026-04-15',
	},
	'logen teater': {
		discount: 'Studentkategori via Det Vestnorske Teateret, ca kr 250.',
		source: 'manual',
		url: 'https://www.detvestnorsketeateret.no/billettinformasjon',
		verified: '2026-04-15',
	},
	'carte blanche': {
		discount: 'Studentrabatt bekreftet. Kontakt billett@ncb.no for priser.',
		source: 'manual',
		url: 'https://carteblanche.no/en/about-us/',
		verified: '2026-04-15',
	},
	'bit teatergarasjen': {
		discount: 'Betal-hva-du-kan: kr 150 / 275 / 350.',
		source: 'manual',
		url: 'https://bitteater.no/en/your-visit/tickets/',
		verified: '2026-04-15',
	},
	'bergen nasjonale opera': {
		discount: 'Student/u30: kr 150–375 (sone 2–4). Ordinær kr 300–900.',
		source: 'manual',
		url: 'https://bno.no/billettinformasjon/under-30-ar',
		verified: '2026-04-15',
	},

	// ── Music & entertainment ──
	'ole bull scene': {
		discount: 'Student-torsdag: 50% på stand-up. Rimelige barpriser.',
		source: 'manual',
		url: 'https://olebull.no',
		verified: '2026-04-15',
	},
	'bergen filharmoniske orkester': {
		discount: 'Studentbilletter fra kr 150. Tidvis gratis studentkonserter.',
		source: 'manual',
		url: 'https://harmonien.no',
		verified: '2026-04-15',
	},
	'harmonien': {
		discount: 'Studentbilletter fra kr 150.',
		source: 'manual',
		verified: '2026-04-15',
	},

	// ── Cinema ──
	'bergen kino': {
		discount: 'Studentkino: kr 90–100 (onsdag 20:30, LUX). Egen billettkategori.',
		source: 'manual',
		url: 'https://www.bergenkino.no/list/studentkino',
		verified: '2026-04-15',
	},

	// ── Museums ──
	'kode': {
		discount: 'Student kr 100. Gratis for KMD/KIB/BAS/UiB kunsthistorie.',
		source: 'manual',
		url: 'https://www.kodebergen.no/en/billetter',
		verified: '2026-04-15',
	},
};

/** Check if a venue has a known student discount. */
export function getStudentDiscount(venueName: string): StudentDiscount | undefined {
	const v = venueName.toLowerCase();
	for (const [key, discount] of Object.entries(STUDENT_DISCOUNTS)) {
		if (v.includes(key)) return discount;
	}
	return undefined;
}
