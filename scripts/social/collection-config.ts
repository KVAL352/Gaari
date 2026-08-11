/**
 * Delt oppsett for samlesidene som brukes i Gåris egne kanaler.
 *
 * Konstantene her lå tidligere kopiert i hver enkelt generator. ENGLISH_SLUGS
 * fantes for eksempel fire steder, identisk, i generate-posts, generate-reels,
 * post-to-socials og post-to-bluesky. Å legge til en engelsk samleside krevde
 * dermed at man husket fire filer, og glemte man én, fikk innholdet norsk
 * tekst i én kanal og engelsk i en annen uten at noe sa fra.
 *
 * Samme resonnement som venue-policy.ts og consent.json: én definisjon,
 * mange lesere.
 */

/**
 * Samlesider som postes på engelsk.
 *
 * Merk at dette ikke er utledbart fra `collections.ts`. Alle samlesider har
 * både norsk og engelsk tittel; dette er et redaksjonelt valg om hvilke vi
 * faktisk poster om på engelsk.
 */
export const ENGLISH_SLUGS = new Set<string>(['today-in-bergen', 'this-weekend']);

/** Om en samleside skal postes på engelsk. */
export function erEngelsk(slug: string): boolean {
	return ENGLISH_SLUGS.has(slug);
}

/**
 * Færreste antall arrangementer med bilde før vi publiserer i det hele tatt.
 *
 * Var 5 i generate-posts, 5 i generate-reels og 4 i generate-week. Den siste
 * var neppe et bevisst valg, bare et tall som ble skrevet i en annen fil en
 * annen dag. Kjersti bestemte 2026-08-11 at alle tre skal være 5.
 *
 * Poenget med terskelen er å slippe å publisere noe tynt. En karusell med tre
 * arrangementer ser ut som at det ikke skjer noe i Bergen, og det er verre enn
 * å ikke poste den dagen.
 */
export const MIN_EVENTS_FOR_POST = 5;

/**
 * Grunntagger per samleside.
 *
 * Lå tidligere tre steder: i schedule-arrayet i generate-posts, i en egen
 * HASHTAGS-tabell i generate-reels, og som to flate lister i generate-week.
 * De hadde allerede drevet fra hverandre: denne-helgen fikk åtte tagger fra
 * reels og fem generiske fra ukespakken. Listene her er de fra generate-posts,
 * som var de rikeste og dekket flest samlesider.
 */
export const COLLECTION_HASHTAGS: Record<string, string[]> = {
	'denne-helgen': ['#bergen', '#bergenby', '#hvaskjer', '#hvaskjeribergen', '#helgibergen', '#bergenliv', '#bergensentrum', '#bergennorway', '#norgebergen'],
	'i-kveld': ['#bergen', '#bergenby', '#hvaskjer', '#hvaskjeribergen', '#kveldibergen', '#bergenliv', '#bergensentrum', '#bergennorway', '#utibergen'],
	'gratis': ['#bergen', '#bergenby', '#hvaskjer', '#hvaskjeribergen', '#gratis', '#gratisibergen', '#gratisarrangementer', '#bergenliv', '#gratisbergen'],
	'today-in-bergen': ['#bergen', '#bergennorway', '#todayinbergen', '#whattodoinbergen', '#bergenevents', '#thingstodoinbergen', '#bergentoday', '#norway', '#vestland'],
	'familiehelg': ['#bergen', '#bergenby', '#hvaskjer', '#barnibergen', '#familiehelg', '#bergenfamilie', '#barninorge', '#familieliv', '#bergenbarn'],
	'konserter': ['#bergen', '#bergenby', '#hvaskjer', '#bergenkonsert', '#livemusikk', '#bergenmusikk', '#musikk', '#konsert', '#liveconcert', '#hvaskjeribergen'],
	'studentkveld': ['#bergen', '#bergenby', '#hvaskjer', '#studentbergen', '#bergenstudent', '#uib', '#hvlbergen', '#uteliv', '#bergennattliv', '#studentliv'],
	'this-weekend': ['#bergen', '#bergennorway', '#thisweekend', '#weekendinbergen', '#bergenevents', '#whattodoinbergen', '#norway', '#bergenweekend', '#vestland'],
	'teater': ['#bergen', '#bergenby', '#hvaskjer', '#bergenteater', '#teater', '#forestilling', '#dns', '#scenekunst', '#hvaskjeribergen'],
	'utstillinger': ['#bergen', '#bergenby', '#hvaskjer', '#bergenkunst', '#utstilling', '#kode', '#bergenkunsthall', '#samtidskunst', '#hvaskjeribergen'],
	'mat-og-drikke': ['#bergen', '#bergenby', '#hvaskjer', '#bergenmat', '#matibergen', '#bergenfood', '#kokekurs', '#matopplevelse', '#hvaskjeribergen'],
};

/**
 * Kategoritagger, valgt ut fra hva som faktisk er i posten.
 *
 * Dette er den delen som er verdt å ta vare på: i stedet for de samme taggene
 * uansett innhold, ser den på kategoriene til arrangementene som er med. Tre
 * konserter og en teaterforestilling gir #bergenkonsert og #bergenteater.
 */
export const CATEGORY_HASHTAGS: Record<string, string[]> = {
	music: ['#bergenkonsert', '#livemusikk', '#bergenmusikk'],
	culture: ['#bergenkultur', '#kulturbergen', '#bergenutstilling'],
	theatre: ['#bergenteater', '#teater', '#forestilling'],
	family: ['#barnibergen', '#bergenfamilie', '#barnNorge'],
	food: ['#bergenmat', '#matibergen', '#bergenfood'],
	festival: ['#bergenfestival', '#festival', '#bergenby'],
	sports: ['#bergensport', '#idrettbergen', '#bergenidrott'],
	nightlife: ['#bergennattliv', '#uteliv', '#utpaabergen'],
	workshop: ['#bergenkurs', '#kurs', '#workshop'],
	student: ['#studentbergen', '#bergenstudent', '#studentliv'],
	tours: ['#bergentur', '#bergentours', '#turibergen']
};

/** Fallback for samlesider uten egne tagger. */
const GENERISKE_NO = ['#bergen', '#bergenby', '#hvaskjer', '#hvaskjeribergen', '#bergenliv'];
const GENERISKE_EN = ['#bergen', '#bergennorway', '#bergenevents', '#thingstodoinbergen', '#visitbergen'];

/**
 * Setter sammen taggene for én post: grunntagger for samlesiden, pluss inntil
 * to tagger valgt ut fra de vanligste kategoriene blant arrangementene.
 *
 * Taket på 15 er der fordi Instagram tillater tretti, men lange haler av
 * tagger leses som spam av både folk og algoritmen.
 */
export function byggHashtags(
	slug: string,
	events: Array<{ category: string }> = []
): string[] {
	const engelsk = ENGLISH_SLUGS.has(slug);
	const grunn = COLLECTION_HASHTAGS[slug] ?? (engelsk ? GENERISKE_EN : GENERISKE_NO);

	// Kategoritaggene finnes bare på norsk. På en engelsk samleside ville de gitt
	// #bergenkonsert under en engelsk tekst, som ser ut som en feil. De engelske
	// samlesidene har uansett ni godt målrettede grunntagger, så vi lar det være
	// framfor å blande språk. (Feilen lå i generate-posts fra før og ble
	// oppdaget da logikken ble samlet 2026-08-11.)
	if (engelsk) return [...new Set(grunn)].slice(0, 15);

	const antall = new Map<string, number>();
	for (const e of events) antall.set(e.category, (antall.get(e.category) ?? 0) + 1);

	const toppKategorier = [...antall.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 2)
		.map(([kat]) => kat);

	const kategoritagger = toppKategorier
		.map((kat) => CATEGORY_HASHTAGS[kat]?.[0])
		.filter((t): t is string => Boolean(t));

	return [...new Set([...grunn, ...kategoritagger])].slice(0, 15);
}
