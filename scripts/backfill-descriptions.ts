/**
 * One-off — re-generate AI descriptions for events with thin content (<80 chars).
 * Idempotent: skips events that already have a longer description.
 */
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { generateDescription } from './lib/ai-descriptions.js';
import { makeDescription } from './lib/utils.js';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const MIN_DESC_LEN = 80;

/**
 * Bare én kilde. `npx tsx backfill-descriptions.ts --source bookibud`
 *
 * Gemini har en dagskvote, og et fullt gjennomløp er 800+ kall. Uten et filter
 * blir jobben avbrutt et tilfeldig sted, og man vet ikke hvilke rader som ble
 * tatt. Med filter kan man ta én kilde om gangen og se at den ble ferdig.
 */
const kildeArg = process.argv.indexOf('--source');
const KILDE = kildeArg >= 0 ? process.argv[kildeArg + 1] : null;

/**
 * Er beskrivelsen mal-tekst?
 *
 * Lengdegrensen alene er en tilnærming, og den bommer. Bookibuds
 * storskjermrader fikk «Storskjerm: »-prefiks, og malen deres landet paa 80 til
 * 83 tegn — sju rader med ren mal-tekst og uten title_en ble hoppet over fordi
 * de saa lange nok ut. makeDescription() er fasiten for hva malen produserer,
 * saa vi kan spoerre direkte i stedet for aa gjette paa lengde.
 */
function erMalTekst(e: { description_no: string | null; title_no: string; venue_name: string | null; category: string }): boolean {
	if (!e.description_no) return true;
	if (e.description_no === makeDescription(e.title_no, e.venue_name || 'Bergen', e.category)) return true;

	// Eksakt sammenligning holder bare saa lenge venue_name er den samme naa som
	// da malen ble skrevet. Endrer en scraper stedsnavnet — «Bergen Naeringsraad»
	// blir «Bergen Naeringsraad, Olav Kyrres gate 11» — slutter raden aa matche
	// fasiten og ser ut som ekte tekst. 34 rader stod slik 25. august, blant dem
	// hele Det Vestnorske Teateret.
	//
	// Formen er den samme uansett sted: «tittel — Kategori paa Sted», uten
	// punktum til slutt. Ekte beskrivelser er hele setninger.
	const d = e.description_no.trim();
	const t = e.title_no.trim();
	return d.startsWith(`${t} — `) && / på /.test(d) && !/[.!?]$/.test(d);
}

async function main() {
	const nowUtc = new Date().toISOString();
	let all: any[] = [];
	let from = 0;
	while (true) {
		const { data } = await supabase
			.from('events')
			.select('id, source, title_no, description_no, description_en, title_en, venue_name, category, date_start, price, bydel, address')
			.gte('date_start', nowUtc)
			.order('id')
			.range(from, from + 999);
		if (!data || data.length === 0) break;
		all = all.concat(data);
		if (data.length < 1000) break;
		from += 1000;
	}

	const kandidater = all.filter(
		e => (e.description_no || '').length < MIN_DESC_LEN || erMalTekst(e)
	);
	const thin = KILDE ? kandidater.filter(e => e.source === KILDE) : kandidater;
	const barePaaMal = kandidater.filter(e => (e.description_no || '').length >= MIN_DESC_LEN).length;

	console.log(
		`Found ${thin.length} events to rewrite` +
			(KILDE ? ` for source "${KILDE}"` : '') +
			` (out of ${all.length} future events).` +
			` ${barePaaMal} caught by the template check, not by length.\n`
	);
	if (thin.length === 0) return;

	let updated = 0;
	let unchanged = 0;
	let failed = 0;

	for (const e of thin) {
		try {
			const desc = await generateDescription({
				title: e.title_no,
				venue: e.venue_name || 'Bergen',
				category: e.category,
				date: e.date_start,
				// Bydel og adresse er lokale signaler prompten kan bruke.
				// Prisen sendes ikke lenger inn: beskrivelsen skal aldri paastaa
				// noe om pris, og da er det tryggest aa ikke gi modellen tallet.
				bydel: e.bydel || undefined,
				address: e.address || undefined,
			});

			// Only update if AI actually produced something better
			if (!desc.no || desc.no.length < MIN_DESC_LEN) {
				console.log(`  unchanged   ${e.title_no.slice(0, 60)}`);
				unchanged++;
				continue;
			}

			const update: any = { description_no: desc.no, description_en: desc.en };
			if (desc.title_en && (!e.title_en || e.title_en.trim().length === 0)) {
				update.title_en = desc.title_en;
			}
			const { error } = await supabase.from('events').update(update).eq('id', e.id);
			if (error) {
				console.log(`  FAILED      ${e.title_no.slice(0, 60)}: ${error.message}`);
				failed++;
			} else {
				console.log(`  updated     ${e.title_no.slice(0, 60)}`);
				updated++;
			}
		} catch (err: any) {
			console.log(`  ERROR       ${e.title_no.slice(0, 60)}: ${err.message?.slice(0, 80)}`);
			failed++;
		}
	}

	console.log(`\nDone. updated=${updated}  unchanged=${unchanged}  failed=${failed}`);
}

// Kjoerer bare naar fila startes direkte — se merknaden i send-newsletter.ts.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
