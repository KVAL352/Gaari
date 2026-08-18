/**
 * Håndhever bildereglene på arrangementer som allerede ligger i basen.
 *
 * `isImageAllowed()` kjører ved innlegging og ved bildeoppdatering. Ingen av
 * delene hjelper når reglene endrer seg etterpå. Sier en arrangør nei i dag,
 * blir bildene som ble lagt inn i går stående, og et nei som bare gjelder
 * framover er ikke et nei.
 *
 * Slik oppdaget vi det 18. august 2026: fire Hulen-konserter viste bilde selv
 * om `hulen` har stått i IMAGE_BLOCKED_VENUE_PATTERNS siden 23. april. To av
 * dem het ikke Hulen i det hele tatt, fordi ticketco setter «Bergen» som sted
 * og tittelen ikke alltid nevner scenen. De to andre ble lagt inn før sperren
 * kom, og ingenting så på dem igjen.
 *
 *   npx tsx scripts/enforce-image-blocks.ts           viser hva som ville skjedd
 *   npx tsx scripts/enforce-image-blocks.ts --skriv   fjerner bildene
 *
 * Kjør den etter hver endring i sperrelisten eller i samtykkeregisteret.
 */
import { supabase } from './lib/supabase.js';
import { isImageAllowed } from './lib/utils.js';

const SKRIV = process.argv.includes('--skriv');

async function main() {
	// Supabase gir maks 1000 rader per kall. Uten sidevisning ville skriptet
	// meldt «alt i orden» om resten uten å ha sett på den.
	type Rad = {
		id: string;
		title_no: string | null;
		venue_name: string | null;
		source: string | null;
		source_url: string | null;
		image_url: string | null;
		image_credit: string | null;
	};
	const data: Rad[] = [];
	const SIDE = 1000;
	for (let fra = 0; ; fra += SIDE) {
		const { data: side, error } = await supabase
			.from('events')
			.select('id, title_no, venue_name, source, source_url, image_url, image_credit')
			.not('image_url', 'is', null)
			.order('id')
			.range(fra, fra + SIDE - 1);
		if (error) {
			console.error(`Kunne ikke hente rader: ${error.message}`);
			process.exit(1);
		}
		data.push(...((side ?? []) as Rad[]));
		if (!side || side.length < SIDE) break;
	}

	const skalFjernes = (data ?? []).filter(
		(e) =>
			!isImageAllowed(
				e.source ?? '',
				e.source_url ?? '',
				e.title_no ?? '',
				e.venue_name ?? undefined,
				e.image_url ?? undefined,
				e.image_credit ?? undefined
			)
	);

	console.log(`${data!.length} arrangementer har bilde. ${skalFjernes.length} bryter reglene.\n`);
	if (skalFjernes.length === 0) return;

	const perKilde = new Map<string, number>();
	for (const e of skalFjernes) {
		const k = e.source ?? '(uten kilde)';
		perKilde.set(k, (perKilde.get(k) ?? 0) + 1);
	}
	for (const [kilde, n] of [...perKilde].sort((a, b) => b[1] - a[1])) {
		console.log(`  ${String(n).padStart(4)}  ${kilde}`);
	}
	console.log();
	for (const e of skalFjernes.slice(0, 40)) {
		console.log(`  ${(e.source ?? '(uten kilde)').padEnd(16)} ${(e.venue_name ?? '-').slice(0, 24).padEnd(25)} ${(e.title_no ?? '').replace(/\s+/g, ' ').slice(0, 45)}`);
	}
	if (skalFjernes.length > 40) console.log(`  ... og ${skalFjernes.length - 40} til`);

	if (!SKRIV) {
		console.log('\nTørrkjøring. Kjør på nytt med --skriv for å fjerne bildene.');
		return;
	}

	let ok = 0;
	for (const e of skalFjernes) {
		const { error: feil } = await supabase
			.from('events')
			.update({ image_url: null, image_credit: null })
			.eq('id', e.id);
		if (feil) console.error(`  FEIL ${e.id}: ${feil.message}`);
		else ok++;
	}
	console.log(`\n${ok} av ${skalFjernes.length} bilder fjernet.`);
}

main();
