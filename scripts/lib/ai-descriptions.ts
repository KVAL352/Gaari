import { GoogleGenAI } from '@google/genai';
import { makeDescription, makeDescriptionEn, CATEGORY_LABELS_NO } from './utils.js';

interface EventMeta {
	title: string;
	venue: string;
	category: string;
	date?: string | Date;
	price?: string;
	room?: string;
	/** Bydel og adresse er lokale signaler. Valgfrie — scraperne som ikke har
	 *  dem sender dem ikke, og prompten hopper da over dem. */
	bydel?: string;
	address?: string;
	/**
	 * Vaare egne felt. Null opphavsrettsrisiko — vi har satt dem selv, og de
	 * ble aldri brukt til aa skrive beskrivelsen.
	 *
	 * ageGroup: 'all' | 'family' | '18+' | 'students' | 'youth'
	 * language: 'no' | 'en' | 'both' — verdt aa si naar arrangementet gaar paa
	 *   engelsk, siden turister er den gruppa som konverterer best.
	 */
	ageGroup?: string;
	language?: string;
	/**
	 * Fakta trukket ut av kildesida — se hentFakta().
	 *
	 * Dette er den trygge veien inn. Verdiene er atomaere («Chloé Zhao»,
	 * «0-2 aar», «film»), ikke setninger, saa arrangoerens formuleringer kan
	 * ikke baeres videre gjennom dem. Foretrekkes framfor sourceText.
	 */
	facts?: Record<string, string | string[]>;
	/**
	 * Arrangoerens egen omtale, som FAKTAGRUNNLAG — aldri til gjenbruk.
	 *
	 * 64 scrapere henter ut slik tekst i dag, og ingen av dem sender den hit.
	 * ticketco.ts henter 500 tegn paa linje 207, bruker dem til aa gjette
	 * kategori, og kaster dem. Resultatet er at modellen bare vet tittel,
	 * sted, kategori og dato — og derfor blir beskrivelsene 115 tegn.
	 *
	 * aandsverksloven: teksten skal aldri gjengis. Prompten forbyr det, og
	 * harVerbatimOverlapp() under haandhever det i kode, fordi en promptregel
	 * alene ikke er en sperre.
	 */
	sourceText?: string;
}

/** Felt vi ber om. Alt annet fra modellen forkastes. */
const FAKTAFELT = [
	'form', 'serie', 'regissør', 'medvirkende', 'arrangør',
	'aldersgruppe', 'språk', 'varighet', 'tema', 'sted_detalj',
	// Klokkeslett er et faktum — men bare naar det staar paa sida.
	//
	// date_start i basen duger ikke: 11 % av kommende arrangementer starter
	// 18:00 UTC, som roeper at flere scrapere setter et standardklokkeslett.
	// Da kan vi ikke skille ekte tid fra gjettet tid. Staar tida i
	// arrangoerens egen omtale, er den derimot bekreftet, og kan sies.
	'klokkeslett',
] as const;

/** Et faktum er atomaert. Er det lengre, er det en setning. */
const MAKS_ORD_PER_FAKTUM = 6;

/**
 * Er verdien et faktum og ikke en formulering?
 *
 * Dette er selve sperra i den faktabaserte veien. «Chloé Zhao» er et faktum.
 * «en gripende fortelling om sorg og kjaerlighet» er arrangoerens uttrykk, og
 * skal ikke passere uansett hvor godt den ville kledd beskrivelsen.
 *
 * Grensa haandheves i kode og ikke i prompten, fordi en prompt er en
 * oppfordring. Faar uttrykk ikke plass, kan det ikke baeres videre.
 */
export function erAtomaertFaktum(verdi: string): boolean {
	const v = verdi.trim();
	if (!v || v.length > 60) return false;
	if (v.split(/\s+/).length > MAKS_ORD_PER_FAKTUM) return false;
	// Setningstegn roeper prosa. Men et punktum midt i et tall gjoer det ikke:
	// norsk klokkeslett skrives «19.00», og en regel mot alle punktum ville
	// stoppet hvert eneste klokkeslett i stillhet. Testen fanget nettopp det.
	// Derfor: bare punktum som avslutter et ord teller.
	if (/[!?]/.test(v)) return false;
	if (/\.(\s|$)/.test(v)) return false;
	return true;
}

/**
 * Behold bare det som faktisk er fakta.
 *
 * Returnerer et rent objekt, eller undefined om ingenting overlevde.
 */
export function renskFakta(raa: unknown): Record<string, string | string[]> | undefined {
	if (!raa || typeof raa !== 'object') return undefined;
	const ut: Record<string, string | string[]> = {};
	for (const felt of FAKTAFELT) {
		const v = (raa as Record<string, unknown>)[felt];
		if (typeof v === 'string') {
			if (erAtomaertFaktum(v)) ut[felt] = v.trim();
			// Norsk klokkeslett skrives med punktum. Modellen leverer «18:00» og
			// «17.00» om hverandre, og forskjellen synes paa arrangementssida.
			if (felt === 'klokkeslett' && ut[felt]) ut[felt] = (ut[felt] as string).replace(/:/g, '.');
		} else if (Array.isArray(v)) {
			const rene = v.filter((x): x is string => typeof x === 'string' && erAtomaertFaktum(x)).map(x => x.trim());
			if (rene.length) ut[felt] = rene.slice(0, 8);
		}
	}
	return Object.keys(ut).length ? ut : undefined;
}

/**
 * Deler beskrivelsen en sammenhengende ordrekke med kildeteksten?
 *
 * En promptregel om aa «skrive originalt» er en oppfordring, ikke en sperre.
 * Denne er sperren: aatte ord paa rad er ikke lenger en omskriving, det er et
 * sitat. Da forkastes svaret framfor aa lagre noe vi ikke har rett til.
 */
export function harVerbatimOverlapp(generert: string, kilde: string, minOrd = 8, minVanlige = 4): boolean {
	// Casen beholdes: egennavn skal telles for seg. Se under.
	const ord = (s: string) =>
		s.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
	const g = ord(generert);
	const k = ord(kilde);
	if (g.length < minOrd || k.length < minOrd) return false;

	const erEgennavn = (o: string) => /^\p{Lu}/u.test(o);
	const lav = (a: string[]) => a.map(o => o.toLowerCase());

	const kLav = lav(k);
	const kFraser = new Set<string>();
	for (let i = 0; i + minOrd <= kLav.length; i++) {
		kFraser.add(kLav.slice(i, i + minOrd).join(' '));
	}

	const gLav = lav(g);
	for (let i = 0; i + minOrd <= gLav.length; i++) {
		if (!kFraser.has(gLav.slice(i, i + minOrd).join(' '))) continue;

		// Treff paa ordrekka alene er ikke nok.
		//
		// «Selma French Bolstad, Øystein Aarnes Vik, Solveig Wang og Martin
		// Morland» er elleve ord paa rad, og en omskriving kan umulig unngaa
		// dem — fire personers navn er fakta, ikke formulering, og
		// aandsverksloven verner ikke en navneliste. Foerste utgave av denne
		// funksjonen forkastet nettopp de beskrivelsene som hadde faatt med
		// besetningen, altsaa det verdifulle.
		//
		// Et sitat kjennes paa bindeteksten mellom navnene. Krever vi at
		// rekka ogsaa inneholder noen vanlige ord, fanger vi «kjennetegnes av
		// sitt organiske og drivende sound» og slipper navnelista gjennom.
		const vanlige = g.slice(i, i + minOrd).filter(o => !erEgennavn(o)).length;
		if (vanlige >= minVanlige) return true;
	}
	return false;
}

interface BilingualDescription {
	no: string;
	en: string;
	title_en?: string;
}

const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const MIN_DELAY_MS = 200;

let ai: GoogleGenAI | null = null;
let dailyQuotaExhausted = false;

function getClient(): GoogleGenAI | null {
	if (ai) return ai;
	const key = process.env.GEMINI_API_KEY;
	if (!key) {
		console.warn('[ai-descriptions] GEMINI_API_KEY not set — using template fallback');
		return null;
	}
	ai = new GoogleGenAI({ apiKey: key });
	return ai;
}

/**
 * Trekk fakta ut av kildesida.
 *
 * Foerste steg av to. Modellen faar arrangoerens tekst her, men leverer bare
 * atomaere verdier tilbake — og renskFakta() haandhever det. Steg to skriver
 * beskrivelsen fra faktaene alene og ser aldri prosaen.
 *
 * Grunnen til at det er delt: opphavsretten verner uttrykk, ikke fakta. Naar
 * bare fakta kommer ut av steg én, finnes det ingen formulering aa gjenbruke
 * i steg to. Sperra foelger av formen, ikke av en terskel jeg har gjettet.
 */
export async function hentFakta(sideTekst: string): Promise<Record<string, string | string[]> | undefined> {
	const client = getClient();
	if (!client || dailyQuotaExhausted) return undefined;
	const tekst = sideTekst.replace(/\s+/g, ' ').trim().slice(0, 4000);
	if (tekst.length < 60) return undefined;

	const prompt = [
		'Extract factual attributes from this Norwegian event page. Return JSON only.',
		'',
		'Return SHORT ATOMIC VALUES, never sentences or phrases from the text.',
		`Every value must be at most ${MAKS_ORD_PER_FAKTUM} words. Longer values are discarded.`,
		'Omit any field you cannot fill from the page. Never guess.',
		'',
		'Fields:',
		'  form          what kind of thing it is, 1-2 words: "film", "konsert", "lesesirkel", "kurs"',
		'  serie         name of a recurring series it belongs to, if any',
		'  regissør      director name, for films',
		'  medvirkende   array of performer, author, artist or speaker names',
		'  arrangør      the organising body, if named and different from the venue',
		'  aldersgruppe  e.g. "0-2 år", "fra 12 år"',
		'  språk         only if stated, e.g. "engelsk"',
		'  varighet      e.g. "90 minutter"',
		'  tema          array of 1-3 word topic words',
		'  sted_detalj   room or hall within the venue, e.g. "Auditoriet"',
		'  klokkeslett   start time ONLY if the page states one, e.g. "19.00"',
		'',
		'Do NOT return descriptions, summaries, taglines or marketing copy.',
		'',
		'PAGE TEXT:',
		'---',
		tekst,
		'---',
	].join('\n');

	try {
		const response = await client.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
		const m = response.text?.match(/\{[\s\S]*\}/);
		if (!m) return undefined;
		return renskFakta(JSON.parse(m[0]));
	} catch {
		// Uttrekket er en forbedring, ikke en forutsetning. Feiler det, skriver
		// vi beskrivelsen fra metadataen slik vi gjorde foer.
		return undefined;
	}
}

function buildPrompt(event: EventMeta, skjerpet = false): string {
	const lines = [
		'You write event descriptions for Gåri, an event listings site for Bergen, Norway.',
		'Write an original description in both Norwegian (bokmål) and English, and translate the title to English.',
		'',
		'LENGTH AND SHAPE',
		'- Write as much as the metadata honestly supports and not one clause more.',
		'  For most events that is two sentences and 120-250 characters. Only go longer',
		'  when there are real specifics to carry it. A description is never padded to',
		'  reach a length.',
		'- The FIRST sentence must stand alone and be quotable: it says what the event is,',
		'  where it is, and that it is in Bergen. Search engines cut the description short,',
		'  and AI assistants lift that first sentence — everything essential goes there.',
		'- Do not restate the title as a subordinate clause to fill space. "Naturskole - UNG',
		'  er en familieaktivitet ... som er en naturskole rettet mot unge" says the same',
		'  thing twice.',
		'- State a clock time ONLY if one appears under VERIFIED FACTS below. The Date',
		'  field is not a source for it: several of our scrapers fill in a default time,',
		'  so a time taken from there may be invented. A time under VERIFIED FACTS came',
		'  off the event page and is safe. Write it Norwegian style — "kl. 19.00" —',
		'  with a full stop, never a colon, in both languages.',
		'- Never describe practical arrangements — where to meet, what to bring, how to',
		'  get there — unless given as a fact.',
		'',
		'FACTUAL DISCIPLINE — this outranks every other rule, including length',
		'- Use ONLY the metadata below. You know nothing else about this event.',
		'- Where an ORGANISER TEXT is supplied, it is your factual source. Take the',
		'  facts from it — who performs, what the work is, what happens — and write',
		'  them in your own words. You must NOT reuse its sentences, its phrasing or',
		'  its adjectives, and you must not translate it sentence by sentence. If you',
		'  find yourself following its structure, stop and start from the facts alone.',
		'  Norwegian copyright law applies to that text; we may state its facts, never',
		'  reproduce its expression.',
		'- The organiser text is marketing. Strip the sell: "en magisk kveld du sent',
		'  vil glemme" is not a fact. Keep names, works, line-ups, genres and format.',
		'- A short, wholly factual description is a SUCCESS. Running out of things you',
		'  actually know is the normal case, not a failure. Stop writing at that point.',
		'  Two accurate sentences beat four with one invented clause.',
		'- You are FORBIDDEN to write any of the following unless it is stated in the',
		'  metadata: what visitors will see, learn, feel or experience; the atmosphere,',
		'  scenery, season or weather; who the event suits or is aimed at; the programme,',
		'  performers, running time or history; the chance to network, discover or explore.',
		'  These are the phrases that make a description sound full while saying nothing',
		'  true. "Her kan du nyte høstfargene" and "explore new ideas and connect with',
		'  peers" are exactly the failure being described.',
		'- Never state or imply a price, and never say something is free.',
		'- If the title is opaque (an unfamiliar band name, an artwork title), describe the',
		'  event TYPE, the venue and the date, and stop. Do not guess what it contains.',
		'',
		'LOCAL SIGNALS',
		'- Name the venue, and use the word "Bergen" naturally at least once.',
		'- Mention the bydel only where it genuinely helps someone place the venue —',
		'  typically outside the centre. Never add a clause whose only purpose is to fit',
		'  the bydel in. "som er en del av utelivstilbudet i Bergenhus" is padding: cut it.',
		'- Refer to the date readably. Norwegian: "lørdag 3. oktober". English:',
		'  "Saturday 3 October" — no comma after the weekday, no ordinal suffix, and do not',
		'  append the year unless the event is more than a year away.',
		'',
		'STYLE',
		'- Describe what the EVENT is, never what the venue generally offers. Phrases like',
		'  "Konsert på Grieghallen" or "Mat og drikke på X" carry no information.',
		'- Plain, warm and concrete. No marketing language, no exclamation marks, no',
		'  "opplev", "bli med på", "en uforglemmelig kveld", "don\'t miss".',
		'- The English version is a real English description, not a word-for-word rendering',
		'  of the Norwegian.',
		'- Keep proper nouns, band names and artwork titles unchanged in title_en. If the',
		'  title is already English or purely a proper noun, use it as-is.',
		'',
		'METADATA',
		`Title: ${event.title}`,
		`Venue: ${event.venue}`,
		`Category: ${CATEGORY_LABELS_NO[event.category] || event.category}`,
	];
	if (event.bydel) lines.push(`Bydel (city district): ${event.bydel}`);
	if (event.address) lines.push(`Address: ${event.address}`);
	if (event.room) lines.push(`Room: ${event.room}`);
	if (event.date) lines.push(`Date: ${event.date}`);
	if (event.ageGroup && event.ageGroup !== 'all') lines.push(`Audience: ${event.ageGroup}`);
	if (event.language === 'en') lines.push('Event language: English');
	if (event.language === 'both') lines.push('Event language: Norwegian and English');

	if (event.facts && Object.keys(event.facts).length > 0) {
		// Den trygge veien. Verdiene er atomaere fakta hentet fra kildesida —
		// navn, form, aldersgrense, klokkeslett — aldri arrangoerens setninger.
		// Se hentFakta() og erAtomaertFaktum().
		lines.push('', 'VERIFIED FACTS from the event page (use these, they are why the description can be specific):');
		for (const [k, v] of Object.entries(event.facts)) {
			lines.push(`  ${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
		}
		lines.push(
			'A time given here is confirmed by the page and may be stated.',
			'Facts you were not given do not exist. Do not fill the gaps.'
		);
	}

	if (event.sourceText) {
		// Avgrenset med markoerer slik at modellen ser hvor fakta slutter og
		// instruksjonene begynner. 1 200 tegn holder til aa faa med besetning
		// og verk uten aa drukne prompten i markedsfoeringstekst.
		lines.push(
			'',
			'ORGANISER TEXT (facts only — never reuse its wording):',
			'---',
			event.sourceText.replace(/\s+/g, ' ').trim().slice(0, 1200),
			'---'
		);
	}
	if (skjerpet) {
		lines.push(
			'',
			'YOUR PREVIOUS ANSWER REUSED THE ORGANISER TEXT VERBATIM AND WAS REJECTED.',
			'Write from the facts alone. Do not look at how the organiser phrased them.',
			'Change the sentence order and the vocabulary. Shorter is fine.'
		);
	}
	lines.push('', 'Respond in JSON only: {"no": "...", "en": "...", "title_en": "..."}');
	return lines.join('\n');
}

function fallback(event: EventMeta): BilingualDescription {
	return {
		no: makeDescription(event.title, event.venue, event.category),
		en: makeDescriptionEn(event.title, event.venue, event.category),
	};
}

function parseRetryDelay(err: any): number | null {
	const msg = typeof err?.message === 'string' ? err.message : '';
	// Look for "retryDelay":"XXs" in the error JSON
	const match = msg.match(/retryDelay.*?(\d+(?:\.\d+)?)s/);
	if (match) return Math.ceil(parseFloat(match[1]) * 1000);
	return null;
}

function isDailyQuotaError(err: any): boolean {
	const msg = typeof err?.message === 'string' ? err.message : '';
	return msg.includes('PerDay') || msg.includes('per_day');
}

/**
 * Innhentingsmodus: hopp over AI-kallet og legg inn maltekst med én gang.
 *
 * DETTE ER ANDRE HALVDEL AV DELINGEN FRA 26. AUGUST 2026
 *
 * Den dagen ble berikelsen flyttet ut av scrapen til descriptions.yml, fordi
 * scrapen ble drept av tidsavbruddet paa 25 minutter. Men bare berikelsen ble
 * flyttet. Det foerste AI-kallet per nytt arrangement ble staaende igjen inne
 * i innhentingen, i 63 av 65 scrapere, og delingen var dermed halvveis.
 *
 * Arbeidsdelingen er nå den som var ment: innhentingen skal vaere rask og
 * komplett og skriver maltekst, mens descriptions.yml tar teksten etterpaa med
 * 50 minutter til raadighet og en jobb som taaler aa bli avbrutt.
 *
 * Maltekst er alltid under 160 tegn (makeDescription kutter der), og
 * berikelsen plukker alt under 170. Overleveringen kan derfor ikke gaa tapt:
 * hver rad innhentingen legger igjen, havner i koeen til berikelsen.
 *
 * Flagget settes av scrape.ts og gjelder bare den prosessen. Backfill-jobbene
 * kjoerer for seg og roeres ikke.
 */
let innhentingsmodus = false;

export function settInnhentingsmodus(paa: boolean): void {
	innhentingsmodus = paa;
}

/** Finnes for at testen skal kunne feste at flagget er av som standard og ikke
 *  blir klebrig, uten aa maatte kalle generateDescription og gaa paa nett. */
export function erIInnhentingsmodus(): boolean {
	return innhentingsmodus;
}

export async function generateDescription(event: EventMeta): Promise<BilingualDescription> {
	if (innhentingsmodus) return fallback(event);

	const client = getClient();
	if (!client || dailyQuotaExhausted) return fallback(event);

	// Settes naar et svar laa for taett paa kildeteksten, og skjerper prompten
	// i neste forsoek.
	let skjerpet = false;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			const response = await client.models.generateContent({
				model: GEMINI_MODEL,
				contents: buildPrompt(event, skjerpet),
			});

			const text = response.text?.trim();
			if (!text) {
				console.warn(`[ai-descriptions] Empty response for "${event.title}" — using fallback`);
				return fallback(event);
			}

			// Extract JSON from response (may be wrapped in markdown code fences)
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				console.warn(`[ai-descriptions] No JSON in response for "${event.title}" — using fallback`);
				return fallback(event);
			}

			const parsed = JSON.parse(jsonMatch[0]) as BilingualDescription;
			if (!parsed.no || !parsed.en) {
				console.warn(`[ai-descriptions] Incomplete JSON for "${event.title}" — using fallback`);
				return fallback(event);
			}

			// Taket var 160 tegn «for SEO meta descriptions». Det var feil sted aa
			// haandheve det: metaDescription i +page.svelte klipper allerede sin
			// egen 160-tegns utgave og legger paa dato og sted, og broedteksten
			// har en vis mer-knapp fra samme grense. Taket ga oss altsaa ingen
			// SEO-gevinst — det ga oss arrangementssider uten broedtekst, og
			// nesten ingenting for svarmotorene aa sitere.
			//
			// 500 er en sikkerhetsventil mot en modell som loeper loepsk, ikke et
			// maal. Prompten ber om 250-450.
			const MAKS = 500;
			if (parsed.no.length > MAKS) parsed.no = parsed.no.slice(0, MAKS - 3) + '...';
			if (parsed.en.length > MAKS) parsed.en = parsed.en.slice(0, MAKS - 3) + '...';

			// Opphavsrettssperra. En promptregel er en oppfordring; dette er
			// sperra. Deler svaret aatte ord paa rad med arrangoerens tekst, er
			// det et sitat og ikke en omskriving — da forkaster vi det heller enn
			// aa lagre noe vi ikke har rett til aa publisere.
			if (event.sourceText) {
				const forTett = (['no', 'en'] as const).find(f => harVerbatimOverlapp(parsed[f], event.sourceText!));
				if (forTett) {
					// Ett forsoek til med skjerpet instruks foer vi gir opp. Aa falle
					// rett til mal er aa bytte et for godt svar mot et ubrukelig et.
					if (!skjerpet) {
						console.warn(`[ai-descriptions] "${event.title}" (${forTett}) laa for taett paa kildeteksten — proever igjen`);
						skjerpet = true;
						continue;
					}
					console.warn(`[ai-descriptions] "${event.title}" laa for taett to ganger — bruker mal`);
					return fallback(event);
				}
			}

			// title_en is optional — keep if present and non-empty
			if (!parsed.title_en || parsed.title_en.trim().length === 0) {
				delete parsed.title_en;
			}

			// Rate limit delay between successful calls
			await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS));

			return parsed;
		} catch (err: any) {
			const isRateLimit = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');

			if (isRateLimit && isDailyQuotaError(err)) {
				console.warn(`[ai-descriptions] Daily quota exhausted — all remaining events will use fallback`);
				dailyQuotaExhausted = true;
				return fallback(event);
			}

			if (isRateLimit && attempt < MAX_RETRIES) {
				const retryMs = parseRetryDelay(err) || (15000 * (attempt + 1));
				console.warn(`[ai-descriptions] Rate limited for "${event.title}" — retrying in ${Math.round(retryMs / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
				await new Promise(resolve => setTimeout(resolve, retryMs));
				continue;
			}

			console.warn(`[ai-descriptions] API error for "${event.title}": ${err.message?.slice(0, 120)} — using fallback`);
			return fallback(event);
		}
	}

	return fallback(event);
}
