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
		'- Never state a clock time, and never describe practical arrangements such as where',
		'  to meet, what to bring or how to get there. Start times in our data are sometimes',
		'  a scraper default rather than the real time, and the page shows the time already.',
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

export async function generateDescription(event: EventMeta): Promise<BilingualDescription> {
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
