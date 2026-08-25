/**
 * Backfill av `title_en` — engelske arrangementstitler.
 *
 * HVORFOR EN EGEN JOBB
 *
 * backfill-descriptions.ts plukker bare rader med tynn eller mal-generert
 * beskrivelse. Den 25. august 2026 manglet 1 720 av 1 978 kommende
 * arrangementer `title_en`, og 237 av dem hadde allerede en god
 * AI-beskrivelse. De 237 er usynlige for beskrivelsesjobben og ville aldri
 * blitt fikset av den, uansett hvor mange ganger den kjoerte.
 *
 * En stikkproeve paa tolv av dem ga engelsk tittel paa tolv. De manglet altsaa
 * ikke tittel fordi Gemini vurderte at tittelen ikke boer oversettes, men fordi
 * de ble generert foer feltet fantes i prompten.
 *
 * HVORFOR SATSVIS
 *
 * Én tittel per API-kall er 1 720 kall. Gratiskvoten hos Gemini taaler ikke
 * det paa én dag — stikkproeven paa tolv traff taket allerede paa kall sju og
 * maatte vente 37 sekunder. Tjue titler per kall gjoer den samme jobben paa
 * under hundre kall. Det er forskjellen paa «over flere dager, med tilsyn» og
 * «ferdig i loepet av en kaffepause», og det holder oss innenfor gratisnivaaet.
 *
 * HVORFOR IKKE MASKINOVERSETTING
 *
 * LibreTranslate og Helsinki-NLP er gratis og selvhostet, men de oversetter
 * alt de faar. Oppgaven her er ikke oversettelse — den er aa avgjoere OM noe
 * skal oversettes. «Beyond the Gates», «Hallaien» og «Otis Gibbs (US)» skal
 * staa som de staar. En MT-motor gjoer «Hallaien» til «The Hall». Derfor
 * spoer vi en modell som kan si nei.
 *
 * Bruk:
 *   npx tsx backfill-title-en.ts --dry-run          # se hva den ville gjort
 *   npx tsx backfill-title-en.ts --limit 100        # ta hundre foerst
 *   npx tsx backfill-title-en.ts --source ticketco  # én kilde om gangen
 *   npx tsx backfill-title-en.ts                    # hele koeen
 *
 * Jobben er idempotent: den plukker bare rader der title_en er tom, saa en
 * avbrutt kjoering kan startes paa nytt uten aa gjoere noe om igjen.
 */
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { supabase } from './lib/supabase.js';
import { fetchAllRows } from './lib/utils.js';

const GEMINI_MODEL = 'gemini-2.5-flash';
const BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const DELAY_BETWEEN_BATCHES_MS = 1500;

const argv = process.argv;
const DRY_RUN = argv.includes('--dry-run');
const flag = (name: string): string | null => {
	const i = argv.indexOf(name);
	return i >= 0 ? argv[i + 1] ?? null : null;
};
const LIMIT = flag('--limit') ? Number(flag('--limit')) : null;
const SOURCE = flag('--source');

interface Rad {
	id: string;
	source: string | null;
	title_no: string;
	venue_name: string | null;
	category: string | null;
}

function getClient(): GoogleGenAI {
	const key = process.env.GEMINI_API_KEY;
	if (!key) {
		console.error('GEMINI_API_KEY mangler. Sett den i scripts/.env eller .env.');
		process.exit(1);
	}
	return new GoogleGenAI({ apiKey: key });
}

function buildPrompt(batch: Rad[]): string {
	const list = batch
		.map((e, i) => `${i}. ${e.title_no.replace(/\s+/g, ' ').trim()}   [${e.venue_name ?? 'Bergen'}, ${e.category ?? 'event'}]`)
		.join('\n');

	return [
		'You translate Norwegian event titles into English for a Bergen event listings site.',
		'',
		'Rules:',
		'- Return a natural English event title, not a literal word-for-word translation.',
		'- Keep proper nouns untranslated: festival names, band names, venue names,',
		'  artwork titles, brand names. "Beyond the Gates" and "Hallaien" stay as they are.',
		'- If the title is already English, or is purely a proper noun with nothing to',
		'  translate, return null for that entry. Do not invent an English variant.',
		'- Keep any weekday/date suffix in the same position, translated to English.',
		'  Always format it as "Monday 16 November" — no comma after the weekday,',
		'  no ordinal dot or suffix on the number. Be consistent across every entry.',
		'- Match the register of the original. Do not add marketing language.',
		'- Never abbreviate or initialise a name to save space. "Bergen International',
		'  Festival" and "Orchestre Revolutionnaire et Romantique" are written out in',
		'  full or left in Norwegian — "Bergen Int. Festival" and "O.R.R." are wrong.',
		'- Aim for under 90 characters, but a correct longer title beats a short one',
		'  with abbreviations in it.',
		'',
		'Titles (the bracketed venue and category are context only — do not translate them):',
		list,
		'',
		'Respond with JSON only, no prose and no code fences, in exactly this shape:',
		'{"titles": [{"i": 0, "en": "..."}, {"i": 1, "en": null}]}',
		'Include one entry for every index above.',
	].join('\n');
}

function parseRetryDelayMs(err: any): number | null {
	const msg = typeof err?.message === 'string' ? err.message : '';
	const m = msg.match(/retryDelay"?\s*[:=]\s*"?(\d+)s/);
	return m ? Number(m[1]) * 1000 : null;
}

function isDailyQuota(err: any): boolean {
	const msg = typeof err?.message === 'string' ? err.message : '';
	return msg.includes('PerDay') || msg.includes('per_day');
}

async function translateBatch(client: GoogleGenAI, batch: Rad[]): Promise<Map<number, string>> {
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			const response = await client.models.generateContent({
				model: GEMINI_MODEL,
				contents: buildPrompt(batch),
			});
			const text = response.text?.trim();
			if (!text) return new Map();

			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				console.warn('  (ingen JSON i svaret — hopper over satsen)');
				return new Map();
			}

			const parsed = JSON.parse(jsonMatch[0]) as { titles?: Array<{ i: number; en: string | null }> };
			const ut = new Map<number, string>();
			for (const rad of parsed.titles ?? []) {
				if (typeof rad.i !== 'number' || !rad.en) continue;
				const en = rad.en.replace(/\s+/g, ' ').trim();
				// Identisk med originalen betyr at det ikke var noe aa oversette.
				if (!en || en === batch[rad.i]?.title_no.replace(/\s+/g, ' ').trim()) continue;
				ut.set(rad.i, en.length > 120 ? en.slice(0, 117) + '...' : en);
			}
			return ut;
		} catch (err: any) {
			const rateLimited = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');

			if (rateLimited && isDailyQuota(err)) {
				// Dagskvoten er brukt opp. Aa fortsette gir bare feil paa feil,
				// og jobben er idempotent — resten tas i morgen.
				throw new Error('DAGSKVOTE_BRUKT_OPP');
			}
			if (rateLimited && attempt < MAX_RETRIES) {
				const ventMs = parseRetryDelayMs(err) ?? 15000 * (attempt + 1);
				console.warn(`  ratebegrenset — venter ${Math.round(ventMs / 1000)}s (forsoek ${attempt + 1}/${MAX_RETRIES})`);
				await new Promise(r => setTimeout(r, ventMs));
				continue;
			}
			console.warn(`  satsen feilet: ${err?.message?.slice(0, 100)}`);
			return new Map();
		}
	}
	return new Map();
}

async function main() {
	const nowUtc = new Date().toISOString();

	const alle = await fetchAllRows<Rad>(
		(fra, til) =>
			supabase
				.from('events')
				.select('id, source, title_no, venue_name, category')
				.eq('status', 'approved')
				.or(`date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`)
				.or('title_en.is.null,title_en.eq.')
				.order('id', { ascending: true })
				.range(fra, til),
		'title_en-backfill'
	);

	let koe = SOURCE ? alle.filter(e => e.source === SOURCE) : alle;
	if (LIMIT) koe = koe.slice(0, LIMIT);

	console.log(
		`${alle.length} kommende arrangementer mangler title_en` +
			(SOURCE ? ` — ${koe.length} fra kilden "${SOURCE}"` : '') +
			(LIMIT ? ` — begrenset til ${koe.length}` : '') +
			`.`
	);
	if (koe.length === 0) return;

	const satser = Math.ceil(koe.length / BATCH_SIZE);
	console.log(`${satser} API-kall à ${BATCH_SIZE} titler.${DRY_RUN ? '  (TOERRKJOERING — ingenting skrives)' : ''}\n`);

	const client = getClient();
	let oversatt = 0;
	let avslaatt = 0;
	let feilet = 0;
	let stoppetTidlig = false;

	for (let i = 0; i < koe.length; i += BATCH_SIZE) {
		const batch = koe.slice(i, i + BATCH_SIZE);
		const nr = Math.floor(i / BATCH_SIZE) + 1;
		process.stdout.write(`[${nr}/${satser}] `);

		let resultat: Map<number, string>;
		try {
			resultat = await translateBatch(client, batch);
		} catch (err: any) {
			if (err.message === 'DAGSKVOTE_BRUKT_OPP') {
				console.log('\n\nDagskvoten hos Gemini er brukt opp. Stopper her.');
				console.log('Jobben er idempotent — kjoer den igjen i morgen for resten.');
				stoppetTidlig = true;
				break;
			}
			throw err;
		}

		console.log(`${resultat.size}/${batch.length} oversatt`);

		for (const [idx, en] of resultat) {
			const rad = batch[idx];
			if (!rad) continue;
			if (DRY_RUN) {
				console.log(`    "${rad.title_no.slice(0, 46)}"  ->  "${en.slice(0, 46)}"`);
				oversatt++;
				continue;
			}
			const { error } = await supabase.from('events').update({ title_en: en }).eq('id', rad.id);
			if (error) {
				console.log(`    FEIL  ${rad.title_no.slice(0, 40)}: ${error.message}`);
				feilet++;
			} else {
				oversatt++;
			}
		}
		avslaatt += batch.length - resultat.size;

		if (i + BATCH_SIZE < koe.length) {
			await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
		}
	}

	console.log(
		`\nFerdig. oversatt=${oversatt}  uten_oversettelse=${avslaatt}  feilet=${feilet}` +
			(stoppetTidlig ? '  (stoppet paa kvote)' : '')
	);
	if (DRY_RUN) console.log('Toerrkjoering — ingenting ble skrevet til basen.');
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
