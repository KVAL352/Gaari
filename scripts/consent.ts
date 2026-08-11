/**
 * Bildesamtykke-verktøy.
 *
 *   npx tsx scripts/consent.ts add <slug> [flagg]   registrer et nytt ja
 *   npx tsx scripts/consent.ts sync                 regenerer dokumentet
 *   npx tsx scripts/consent.ts check                feiler hvis dokumentet er utdatert
 *   npx tsx scripts/consent.ts due [dato]           viser samtykker som bør vurderes på nytt
 *
 * Fasiten er scripts/lib/consent.json. Dokumentet er avledet og skal aldri
 * redigeres for hånd. Allowlistene i lib/utils.ts leses fra samme fil, så de
 * tre kan ikke lenger si ulike ting.
 *
 * Logikken ligger i lib/consent-doc.ts, slik at testen kan bruke den uten å
 * starte dette programmet.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
	load,
	render,
	nyKilde,
	settInn,
	DOC_PATH,
	CONSENT_PATH,
	type NyKildeInput
} from './lib/consent-doc.js';

const argv = process.argv.slice(2);
const cmd = argv[0];

/** --flagg verdi, --flagg=verdi, eller --flagg alene for av/på. */
function flagg(navn: string): string | boolean | undefined {
	const i = argv.findIndex((a) => a === `--${navn}` || a.startsWith(`--${navn}=`));
	if (i < 0) return undefined;
	if (argv[i].includes('=')) return argv[i].slice(argv[i].indexOf('=') + 1);
	const neste = argv[i + 1];
	return neste && !neste.startsWith('--') ? neste : true;
}

function tekst(navn: string): string | undefined {
	const v = flagg(navn);
	return typeof v === 'string' ? v : undefined;
}

function sync(data: ReturnType<typeof load>): void {
	writeFileSync(CONSENT_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
	writeFileSync(DOC_PATH, render(data), 'utf8');
}

const data = load();

if (cmd === 'add') {
	const slug = argv[1];
	if (!slug || slug.startsWith('--')) {
		console.error('Mangler slug. Eksempel:\n' +
			'  npx tsx scripts/consent.ts add studiovertikal --navn "Studio Vertikal" \\\n' +
			'    --kontakt "Sofie Vervaet" --epost sofie@studiovertikal.no \\\n' +
			'    --omfang visning,some --bevis Avtaler --dato 2026-08-06');
		process.exit(1);
	}

	const input: NyKildeInput = {
		slug,
		navn: tekst('navn') ?? slug,
		kontakt: tekst('kontakt'),
		epost: tekst('epost'),
		// Uten --dato brukes i dag. Datoen skal være når arrangøren svarte,
		// ikke når du rakk å registrere det, så oppgi den når de avviker.
		dato: tekst('dato') ?? new Date().toISOString().slice(0, 10),
		grunnlag: (tekst('grunnlag') as NyKildeInput['grunnlag']) ?? 'skriftlig',
		omfang: (tekst('omfang') ?? 'visning').split(',').map((s) => s.trim()).filter(Boolean),
		bevis: tekst('bevis') ?? 'Avtaler',
		merknad: tekst('merknad'),
		selvhostet: flagg('selvhostet') === true,
		viserPersoner: flagg('viser-personer') === true,
		viserBarn: flagg('viser-barn') === true,
		vurderesInnen: tekst('vurderes-innen')
	};

	let kilde;
	try {
		kilde = nyKilde(input);
	} catch (err) {
		console.error('Kunne ikke registrere samtykket:\n');
		console.error((err as Error).message);
		process.exit(1);
	}

	let oppdatert;
	try {
		oppdatert = settInn(data, kilde, flagg('oppdater') === true);
	} catch (err) {
		console.error((err as Error).message);
		process.exit(1);
	}

	sync(oppdatert);

	const some = kilde.omfang.includes('some');
	console.log(`Registrert: ${kilde.slug} (${kilde.navn})`);
	console.log(`  Omfang:     ${some ? 'visning + sosiale medier' : 'kun visning på gaari.no'}`);
	console.log(`  Grunnlag:   ${kilde.grunnlag}`);
	console.log(`  Bekreftet:  ${kilde.dato}`);
	console.log(`  Vurderes:   ${kilde.vurderesInnen}`);
	console.log(`  Kilder nå:  ${oppdatert.kilder.length}`);
	console.log('');
	console.log('Oppdatert: scripts/lib/consent.json og docs/bildesamtykke.md.');
	console.log('Allowlistene i utils.ts leser fra samme fil, så de følger med.');
	console.log('');
	console.log('Gjenstår, og dette må du gjøre selv:');
	console.log(`  1. Flytt e-posten fra ${kilde.epost ?? 'arrangøren'} til Folders/Gaari/Avtaler.`);
	console.log('  2. Commit endringen, så samtykket får et tidsstempel i git.');
	if (kilde.viserBarn) {
		console.log('  3. VIKTIG: bildene viser barn. Tillatelsen fra arrangøren dekker ikke');
		console.log('     samtykke fra foresatte. Få det skriftlig før bildet brukes i SoMe.');
	}
} else if (cmd === 'sync') {
	writeFileSync(DOC_PATH, render(data), 'utf8');
	console.log(`docs/bildesamtykke.md regenerert: ${data.kilder.length} kilder, ${data.avslag.length} avslag`);
} else if (cmd === 'check') {
	if (readFileSync(DOC_PATH, 'utf8') !== render(data)) {
		console.error('docs/bildesamtykke.md er utdatert. Kjor: npx tsx scripts/consent.ts sync');
		process.exit(1);
	}
	console.log('docs/bildesamtykke.md er oppdatert.');
} else if (cmd === 'due') {
	// Dato kan sendes inn, slik at kommandoen kan kjores reproduserbart.
	const today = argv[1] || new Date().toISOString().slice(0, 10);
	const due = data.kilder.filter((k) => k.vurderesInnen <= today);
	if (!due.length) {
		console.log(`Ingen samtykker forfaller per ${today}.`);
	} else {
		console.log(`${due.length} samtykker bor vurderes pa nytt per ${today}:`);
		for (const k of due) console.log(`  ${k.slug} (${k.navn}), sist bekreftet ${k.dato}`);
	}
} else {
	console.log('Bruk: npx tsx scripts/consent.ts <add|sync|check|due>');
	process.exit(1);
}
