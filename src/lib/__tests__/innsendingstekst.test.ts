import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Innsendingsflyten er teksten utenforstående leser før de krysser av på at de
 * har rettighetene til et bilde. Den skal følge de samme absolutte reglene som
 * e-post: ingen tankestreker, ingen emojier.
 *
 * Begge deler lå der 25. august 2026. Fire tankestreker i samtykketekstene, og
 * tre emojier i varselet som sendes til post@gaari.no, der haken kom fram som
 * et ødelagt tegn i stedet for et symbol.
 *
 * Testen leser filene fra disk, som reminders.test.ts og bildesamtykke.test.ts,
 * så den fanger det som faktisk ville blitt pushet.
 *
 * AVGRENSNING: tittelseparatoren i `<title>` og `og:title` er ikke med. Den er
 * en bevisst SEO-konvensjon som vises i Google, og endres ikke uten at eieren
 * bestemmer det. Kodekommentarer er heller ikke med; regelen gjelder tekst
 * noen leser på siden.
 */
const ROT = path.join(import.meta.dirname, '..', '..');
const OVERSETTELSER = path.join(ROT, 'lib', 'i18n', 'translations.ts');
const SKJEMA = path.join(ROT, 'routes', '[lang]', 'submit', '+page.svelte');

const TANKESTREK = /[–—]/;

// Symbol- og bildeemojier. Dekker haken, varseltrekanten og spørsmålstegnet
// som stod i varselteksten.
//
// Pilblokken (U+2190 til U+21FF) er bevisst utelatt. Tilbakepilen foran
// «Tilbake til arrangementer» er en navigasjonsmarkør og ikke pynt, og den
// hører til et designvalg som er tatt et annet sted. Forbudet gjelder
// dekorative emojier og ikoner foran overskrifter.
// Variasjonsvelgeren (U+FE0F) er ikke med. Den staar aldri alene, bare etter et
// grunntegn som allerede fanges av foerste intervall, og eslint avviser den med
// rette i en tegnklasse fordi den er usynlig i kildekoden.
const EMOJI = /[⌀-➿⬀-⯿\u{1f000}-\u{1faff}]/u;

function tekstlinjer(sti: string): Array<{ nr: number; tekst: string }> {
	return fs
		.readFileSync(sti, 'utf-8')
		.split('\n')
		.map((tekst, i) => ({ nr: i + 1, tekst }))
		.filter((l) => {
			const t = l.tekst.trim();
			return !t.startsWith('//') && !t.startsWith('*');
		});
}

describe('innsendingsflyten følger tekstreglene', () => {
	it('ingen tankestrek i samtykke- og skjematekstene', () => {
		const funn = tekstlinjer(OVERSETTELSER)
			.filter((l) => /\b(website|submitChoice)[A-Za-z]*\s*:/.test(l.tekst))
			.filter((l) => TANKESTREK.test(l.tekst))
			.map((l) => `translations.ts:${l.nr}`);

		expect(funn).toEqual([]);
	});

	it('ingen emoji eller tankestrek i varselet som sendes på e-post', () => {
		const kilde = fs.readFileSync(SKJEMA, 'utf-8');
		const blokk = kilde.match(/const imageNotes[^;]*;/s);

		expect(blokk, 'fant ikke imageNotes i innsendingsskjemaet').not.toBeNull();
		expect(
			EMOJI.test(blokk![0]),
			'haken kom fram som et ødelagt tegn i e-posten, ikke som et symbol'
		).toBe(false);
		expect(TANKESTREK.test(blokk![0])).toBe(false);
	});

	it('ingen emoji ellers i innsendingsskjemaet', () => {
		const funn = tekstlinjer(SKJEMA)
			.filter((l) => EMOJI.test(l.tekst))
			.map((l) => `submit/+page.svelte:${l.nr}`);

		expect(funn).toEqual([]);
	});
});
