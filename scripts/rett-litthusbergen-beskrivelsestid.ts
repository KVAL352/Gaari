/**
 * Retter klokkeslettet som staar i TEKSTEN paa litthusbergen-rader.
 *
 * HVORFOR DENNE FINNES
 *
 * `rett-litthusbergen-klokkeslett.ts` rettet `date_start` paa 97 rader som
 * hadde faatt sluttidspunktet som starttid. Men beskrivelsene ble skrevet av
 * modellen FOER rettelsen, ut fra det gale tidspunktet, og de sier det fortsatt:
 *
 *     «Arrangementet starter kl. 21.00.»   mens feltet naa sier 18:30
 *
 * Feltet er altsaa riktig og teksten gal, og det er teksten leseren leser.
 * `klokkeslett-spriker` gikk fra 53 til 76 i samme oeyeblikk retting nummer én
 * ble skrevet — ikke fordi noe ble verre, men fordi halve jobben var gjort.
 *
 * HVORFOR VI IKKE BARE BYTTER SIFRENE OVERALT
 *
 * En beskrivelse skrevet for kl. 19 kan si «en hyggelig kveldsstund». Flyttes
 * arrangementet til 08:30, blir sifrene riktige og setningen gal. Derfor
 * sammenlignes hvilken DEL AV DOEGNET det gamle og det nye klokkeslettet hoerer
 * til. Krysser rettelsen en grense, roerer vi ikke raden — den listes i stedet
 * for ny beskrivelse. Jf. [[pattern_torrkjor_for_du_sletter]]: les radene.
 *
 * Bruk:
 *   cd scripts && npx tsx rett-litthusbergen-beskrivelsestid.ts          # toerrkjoering
 *   cd scripts && npx tsx rett-litthusbergen-beskrivelsestid.ts --apply  # skriver
 */
import 'dotenv/config';
import { supabase } from './lib/supabase';
import { fetchAllRows } from './lib/utils';
import { klokkeslettITekst, klokkeslettIFelt } from './lib/datakonsistens';

const SKRIV = process.argv.includes('--apply');

type Rad = {
	id: string;
	slug: string;
	title_no: string;
	description_no: string | null;
	description_en: string | null;
	date_start: string;
};

/**
 * Grov inndeling av doegnet. Brukes bare til aa avgjoere om en tekst som
 * omtaler tidspunktet med ord («kveld», «frokost») fortsatt stemmer.
 */
function doegndel(hhmm: string): string {
	const t = Number(hhmm.slice(0, 2));
	if (t < 5) return 'natt';
	if (t < 11) return 'morgen';
	if (t < 14) return 'midt paa dagen';
	if (t < 17) return 'ettermiddag';
	return 'kveld';
}

/** Bytter «kl. 21.00» / «kl 21:00» til det riktige, med samme skilletegn. */
function bytt(tekst: string | null, galt: string, riktig: string): string | null {
	if (!tekst) return tekst;
	const [gT, gM] = galt.split(':');
	const [rT, rM] = riktig.split(':');
	// Timetallet kan staa med eller uten ledende null i teksten.
	const timeAlt = Number(gT) < 10 ? `0?${Number(gT)}` : gT;
	const re = new RegExp(`(\\bkl\\.?\\s*)${timeAlt}([.:])${gM}\\b`, 'gi');
	return tekst.replace(re, (_m, prefiks, skille) => `${prefiks}${rT}${skille}${rM}`);
}

async function main() {
	const iDag = new Date().toISOString().slice(0, 10);
	const rader = await fetchAllRows<Rad>(
		(fra, til) =>
			supabase
				.from('events')
				.select('id, slug, title_no, description_no, description_en, date_start')
				.eq('source', 'litthusbergen')
				.eq('status', 'approved')
				.gte('date_start', iDag)
				.order('id', { ascending: true })
				.range(fra, til),
		'litthusbergen-tekst'
	);

	const endringer: Array<{ rad: Rad; galt: string; riktig: string; no: string | null; en: string | null }> = [];
	const maaSkrivesOm: Array<{ rad: Rad; galt: string; riktig: string }> = [];

	for (const rad of rader) {
		const iTekst = klokkeslettITekst(rad.description_no);
		const iFelt = klokkeslettIFelt(rad.date_start);
		if (!iTekst || !iFelt || iTekst === iFelt) continue;

		if (doegndel(iTekst) !== doegndel(iFelt)) {
			maaSkrivesOm.push({ rad, galt: iTekst, riktig: iFelt });
			continue;
		}

		const no = bytt(rad.description_no, iTekst, iFelt);
		const en = bytt(rad.description_en, iTekst, iFelt);
		if (no === rad.description_no && en === rad.description_en) continue;
		endringer.push({ rad, galt: iTekst, riktig: iFelt, no, en });
	}

	console.log(`${rader.length} kommende litthusbergen-rader.\n`);

	if (maaSkrivesOm.length > 0) {
		console.log(`${maaSkrivesOm.length} rader krysser en doegngrense og roeres IKKE.`);
		console.log('De trenger ny beskrivelse, ikke nye sifre:');
		for (const { rad, galt, riktig } of maaSkrivesOm) {
			console.log(`  ${rad.title_no.slice(0, 46)}`);
			console.log(`     ${galt} (${doegndel(galt)})  →  ${riktig} (${doegndel(riktig)})`);
		}
		console.log('');
	}

	if (endringer.length === 0) {
		console.log('Ingen tekster aa rette.');
		return;
	}

	console.log(`${endringer.length} rader far rettet klokkeslettet i teksten:\n`);
	for (const { rad, galt, riktig, no } of endringer) {
		console.log(`  ${rad.title_no.slice(0, 46)}   ${galt} → ${riktig}`);
		console.log(`     ${(no ?? '').slice(0, 120)}`);
	}

	if (!SKRIV) {
		console.log('\nToerrkjoering. Les listen over. Kjoer med --apply for aa skrive.');
		return;
	}

	let ok = 0;
	for (const { rad, no, en } of endringer) {
		const { error } = await supabase
			.from('events')
			.update({ description_no: no, description_en: en })
			.eq('id', rad.id);
		if (error) console.warn(`  ! ${rad.slug}: ${error.message}`);
		else ok++;
	}
	console.log(`\nRettet: ${ok} av ${endringer.length}.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
