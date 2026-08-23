/**
 * Finner — og eventuelt sletter — bilder i event-images som ingen arrangement
 * peker paa.
 *
 * Hvorfor de finnes: fram til 2026-08-23 slettet removeExpiredEvents() raden i
 * basen og lot fila staa. Maalt den dagen: 17 filer, 31 MB. Hullet er lukket i
 * utils.ts, saa dette skriptet rydder fortiden — det er ikke ment aa vaere en
 * fast jobb.
 *
 * Tre sperrer, alle med vilje:
 *
 *   1. TOERRKJOERING ER STANDARD. Uten --delete skjer ingenting. Les lista
 *      foer du sletter, ikke bare antallet.
 *   2. KUN events/. eventImageStoragePath() nekter aa returnere noe annet, saa
 *      de delte fallback/-bildene kan ikke treffes her.
 *   3. NYE FILER FREDES. En innsending laster opp bildet FOER raden skrives.
 *      Kjoerer opprydningen i det vinduet, ser et helt levende bilde
 *      foreldreloest ut. Alt under MIN_ALDER_TIMER staar urort.
 *
 * Bruk:
 *   npx tsx cleanup-orphan-images.ts            # vis hva som ville forsvunnet
 *   npx tsx cleanup-orphan-images.ts --delete   # slett det
 */
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { supabase } from './lib/supabase.js';
import { EVENT_IMAGE_BUCKET, eventImageStoragePath } from '../src/lib/storage-path.js';

const MIN_ALDER_TIMER = 24;
const MAPPE = 'events';

interface Fil {
	sti: string;
	bytes: number;
	/** null naar storage ikke oppgir dato. Da fredes fila — se main(). */
	opprettet: Date | null;
}

/** Lister hele mappa. Storage-API-et gir maks 100 av gangen. */
async function listAlleFiler(): Promise<Fil[]> {
	const filer: Fil[] = [];
	for (let offset = 0; ; offset += 100) {
		const { data, error } = await supabase.storage
			.from(EVENT_IMAGE_BUCKET)
			.list(MAPPE, { limit: 100, offset });
		if (error) throw new Error(`Kunne ikke liste ${MAPPE}/: ${error.message}`);
		if (!data || data.length === 0) break;

		for (const o of data) {
			// list() tar med mapper som rader uten id. De har ingen fil aa slette.
			if (!o.id) continue;
			filer.push({
				sti: `${MAPPE}/${o.name}`,
				bytes: Number(o.metadata?.size ?? 0),
				opprettet: o.created_at ? new Date(o.created_at) : null
			});
		}
		if (data.length < 100) break;
	}
	return filer;
}

/** Alle stier som et arrangement faktisk peker paa. */
async function stierIBruk(): Promise<Set<string>> {
	const brukt = new Set<string>();
	for (let fra = 0; ; fra += 1000) {
		const { data, error } = await supabase
			.from('events')
			.select('image_url')
			.not('image_url', 'is', null)
			.order('id')
			.range(fra, fra + 999);
		if (error) throw new Error(`Kunne ikke lese events: ${error.message}`);
		if (!data || data.length === 0) break;

		// Samme helper som slettingen bruker. Hadde denne sida brukt en annen
		// tolkning av URL-en enn utils.ts, ville avviket blitt til sletting av
		// filer som er i bruk.
		for (const e of data) {
			const sti = eventImageStoragePath(e.image_url);
			if (sti) brukt.add(sti);
		}
		if (data.length < 1000) break;
	}
	return brukt;
}

function mb(bytes: number): string {
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
	const skalSlette = process.argv.includes('--delete');

	const [filer, brukt] = await Promise.all([listAlleFiler(), stierIBruk()]);
	console.log(`${filer.length} filer i ${MAPPE}/, ${brukt.size} i bruk av et arrangement.\n`);

	const grense = new Date(Date.now() - MIN_ALDER_TIMER * 3600_000);
	const foreldreloese = filer.filter(f => !brukt.has(f.sti));
	// Uten dato kan alderen ikke vurderes, og da fredes fila. En manglende
	// created_at skal aldri kunne bli til en sletting.
	const forNye = foreldreloese.filter(f => f.opprettet === null || f.opprettet > grense);
	const kandidater = foreldreloese.filter(f => f.opprettet !== null && f.opprettet <= grense);

	if (forNye.length > 0) {
		console.log(`${forNye.length} fredet (under ${MIN_ALDER_TIMER} timer gamle, eller uten dato):`);
		for (const f of forNye) console.log(`  ${f.sti}`);
		console.log();
	}

	if (kandidater.length === 0) {
		console.log('Ingen foreldreloese filer aa rydde.');
		return;
	}

	const total = kandidater.reduce((sum, f) => sum + f.bytes, 0);
	console.log(`${kandidater.length} foreldreloese filer, ${mb(total)}:\n`);
	for (const f of kandidater.sort((a, b) => b.bytes - a.bytes)) {
		const dato = f.opprettet ? f.opprettet.toISOString().slice(0, 10) : '??????????';
		console.log(`  ${mb(f.bytes).padStart(8)}  ${dato}  ${f.sti}`);
	}

	if (!skalSlette) {
		console.log(`\nToerrkjoering. Kjoer med --delete for aa slette disse ${kandidater.length}.`);
		return;
	}

	console.log('\nSletter...');
	let slettet = 0;
	const stier = kandidater.map(f => f.sti);
	for (let i = 0; i < stier.length; i += 100) {
		const batch = stier.slice(i, i + 100);
		const { error } = await supabase.storage.from(EVENT_IMAGE_BUCKET).remove(batch);
		if (error) {
			console.error(`  Feilet paa ${batch.length} filer: ${error.message}`);
		} else {
			slettet += batch.length;
		}
	}
	console.log(`Slettet ${slettet} filer, frigjorde ${mb(total)}.`);
}

// Modulen gjoer ingenting ved import. Se paaminnelsen om de 46 skriptene som
// kjoerte ved import — send-newsletter.ts begynte en ekte utsending fordi en
// test importerte to hjelpefunksjoner fra den.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
