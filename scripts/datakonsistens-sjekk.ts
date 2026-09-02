#!/usr/bin/env node
/**
 * Kjoerer konsistenssjekkene mot kommende arrangementer i drift.
 *
 * Se lib/datakonsistens.ts for hvorfor sjekkene finnes og hva som skiller en
 * sperrende sjekk fra en maalt.
 *
 * Bruk:
 *   cd scripts && npx tsx datakonsistens-sjekk.ts
 *   cd scripts && npx tsx datakonsistens-sjekk.ts --vis 10   (flere eksempler)
 *   cd scripts && npx tsx datakonsistens-sjekk.ts --ingen-exit
 *
 * Verdikten staar paa siste linje, slik at den overlever `tail`. Samme grep
 * som verify-tests.mjs: en jobb som blir kuttet i loggen skal ikke kunne se
 * groenn ut.
 */
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { fetchAllRows } from './lib/utils.js';
import { kjoerSjekker, type KonsistensRad } from './lib/datakonsistens.js';

const argv = process.argv.slice(2);
const INGEN_EXIT = argv.includes('--ingen-exit');
const VIS = argv.includes('--vis') ? Number(argv[argv.indexOf('--vis') + 1]) || 3 : 3;

async function main() {
	const nowUtc = new Date().toISOString();

	const rader = await fetchAllRows<KonsistensRad>(
		(fra, til) =>
			supabase
				.from('events')
				.select(
					'id, slug, source, source_url, ticket_url, title_no, title_en, description_no, description_en, age_group, category, date_start, date_end'
				)
				.eq('status', 'approved')
				.eq('is_canary', false)
				.gte('date_start', nowUtc)
				.order('id', { ascending: true })
				.range(fra, til),
		'datakonsistens'
	);

	console.log(`Datakonsistens — ${rader.length} kommende arrangementer\n`);

	const resultater = kjoerSjekker(rader);
	let brudd = 0;

	for (const { sjekk, funn, brudd: erBrudd } of resultater) {
		const merke = erBrudd ? 'BRUDD' : '     ';
		const type = sjekk.sperrende ? 'sperrende' : 'maalt   ';

		// Andelsgrenser skrives som prosent, med det absolutte tallet i parentes.
		// Uten begge blir en linje ubrukelig: prosenten alene skjuler hvor mange
		// rader det gjelder, tallet alene skjuler at katalogen har vokst.
		let grenseTekst: string;
		if (sjekk.sperrende) {
			grenseTekst = 'grense 0';
		} else if (sjekk.andelsgrense !== undefined) {
			const andel = rader.length ? (funn.length / rader.length) * 100 : 0;
			grenseTekst = `${andel.toFixed(1)} % av grense ${(sjekk.andelsgrense * 100).toFixed(1)} %`;
		} else {
			grenseTekst = `grense ${sjekk.grense ?? 0}`;
		}

		console.log(
			`${merke} [${type}] ${sjekk.navn.padEnd(24)} ${String(funn.length).padStart(4)} (${grenseTekst})`
		);

		if (erBrudd) {
			brudd++;
			console.log(`        ${sjekk.hva}`);
			for (const f of funn.slice(0, VIS)) {
				console.log(
					`        - [${f.rad.source}] ${(f.rad.title_no ?? '').slice(0, 45)}: ${f.forklaring}`
				);
			}
			if (funn.length > VIS) console.log(`        ... og ${funn.length - VIS} til`);
		}
	}

	console.log('');
	if (brudd === 0) {
		console.log('VERDIKT: OK — ingen sjekker over grensen.');
	} else {
		console.log(`VERDIKT: FEIL — ${brudd} sjekk(er) over grensen.`);
		if (!INGEN_EXIT) process.exit(1);
	}
}

main().catch((e) => {
	console.error(e);
	// Feiler spoerringen, er det ikke det samme som at dataene er i orden.
	console.log('VERDIKT: FEIL — sjekken kunne ikke kjoere.');
	process.exit(1);
});
