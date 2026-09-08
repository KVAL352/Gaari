/**
 * Rydder stedsnavn og kategori på rader som alt ligger i basen.
 *
 * `normaliserStedsnavn()` i `insertEvent` beskytter bare NYE rader. Da denne
 * ble skrevet lå 38 rader med adresse i parentes og 44 med avsluttende
 * punktum allerede inne, pluss 19 babysang- og korøvelse-rader som sto som
 * «music». Jf. [[pattern_regler_gjelder_bare_framover]].
 *
 * Kjør alltid med --dry-run først, og les radene, ikke antallet.
 *
 *   cd scripts && npx tsx rydd-stedsnavn.ts --dry-run
 *   cd scripts && npx tsx rydd-stedsnavn.ts
 */
import { supabase } from './lib/supabase.js';
import { fetchAllRows, normaliserStedsnavn } from './lib/utils.js';

const TORR = process.argv.includes('--dry-run');

interface Rad {
	id: string;
	slug: string;
	title_no: string;
	venue_name: string | null;
	category: string;
}

const rader = await fetchAllRows<Rad>(
	(f, t) =>
		supabase
			.from('events')
			.select('id, slug, title_no, venue_name, category')
			.gte('date_start', new Date().toISOString())
			.eq('status', 'approved')
			.order('id', { ascending: true })
			.range(f, t),
	'rydd-stedsnavn'
);

const stedFiks = rader.filter(
	(r) => r.venue_name && r.venue_name !== normaliserStedsnavn(r.venue_name)
);
const babysang = rader.filter((r) => /babysang/i.test(r.title_no) && r.category === 'music');
const korøvelse = rader.filter((r) => /korøvelse/i.test(r.title_no) && r.category === 'music');

console.log(`Kommende rader: ${rader.length}\n`);

console.log(`Stedsnavn å rydde: ${stedFiks.length}`);
const unike = new Map<string, number>();
for (const r of stedFiks) unike.set(r.venue_name!, (unike.get(r.venue_name!) ?? 0) + 1);
for (const [navn, antall] of [...unike].sort((a, b) => b[1] - a[1])) {
	console.log(`  ${String(antall).padStart(3)}x  «${navn}»  ->  «${normaliserStedsnavn(navn)}»`);
}

console.log(`\nBabysang, music -> family: ${babysang.length}`);
for (const r of babysang.slice(0, 3)) console.log(`  ${r.title_no}`);
if (babysang.length > 3) console.log(`  ... og ${babysang.length - 3} til`);

console.log(`\nKorøvelse, music -> workshop: ${korøvelse.length}`);
for (const r of korøvelse.slice(0, 3)) console.log(`  ${r.title_no}`);
if (korøvelse.length > 3) console.log(`  ... og ${korøvelse.length - 3} til`);

if (TORR) {
	console.log('\n(tørrkjøring, ingenting skrevet)');
	process.exit(0);
}

let n = 0;
for (const r of stedFiks) {
	const { error } = await supabase
		.from('events')
		.update({ venue_name: normaliserStedsnavn(r.venue_name) })
		.eq('id', r.id);
	if (error) {
		console.error(`  FEIL ${r.slug}: ${error.message}`);
		continue;
	}
	n++;
}
console.log(`\n${n} stedsnavn ryddet.`);

let k = 0;
for (const [liste, kategori] of [
	[babysang, 'family'],
	[korøvelse, 'workshop']
] as [Rad[], string][]) {
	for (const r of liste) {
		const { error } = await supabase.from('events').update({ category: kategori }).eq('id', r.id);
		if (error) {
			console.error(`  FEIL ${r.slug}: ${error.message}`);
			continue;
		}
		k++;
	}
}
console.log(`${k} kategorier rettet.`);

console.log('\nMerk: beskrivelsene er skrevet ut fra den gamle kategorien og');
console.log('sier fortsatt «Konsert». De må skrives om separat, og med Gemini');
console.log('nede blir de malbeskrivelser uansett. Jf. pattern_retting_etterlater_avledet_tekst.');
