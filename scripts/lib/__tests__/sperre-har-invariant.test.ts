import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * En sperre ved innlegging skal alltid ha en invariant som ser paa alt som
 * alt ligger der.
 *
 * FEILEN DENNE TESTEN FINNES FOR
 *
 * Tre ganger i dette prosjektet er en regel innfoert som bare gjelder
 * framover, mens radene som alt laa i basen ble staaende feil:
 *
 *   1. isImageAllowed() ble lagt i innleggingen, men bildene som alt laa inne
 *      ble staaende til enforce-image-blocks.ts ryddet dem.
 *   2. hasAdultAgeLimit() ble lagt i insertEvent 31. august 2026. 38 kommende
 *      arrangementer sto fortsatt som «alle» med «aldersgrense 18 aar» i sin
 *      egen tekst, og maatte rettes for haand.
 *   3. Bookibud la henvisningskoden paa lenkene, men eventExists() hoppet over
 *      rader som alt laa inne, saa 43 av 82 pekte paa lenka uten kode.
 *
 * Felles for alle tre: sperra virket. Den saa bare aldri bakover, og
 * ingenting ble roedt.
 *
 * Vanen «husk aa rydde etterpaa» har alt sviktet tre ganger, saa denne testen
 * gjoer kravet mekanisk i stedet: bruker insertEvent en sperre, maa samme
 * sperre ogsaa vaere brukt i datakonsistens.ts, som gaar gjennom alle
 * kommende rader hver dag.
 *
 * BEGRENSNING, sagt tydelig: testen ser bare sperrer som importeres til
 * utils.ts fra categories.ts og kalles inne i insertEvent. En sperre skrevet
 * rett inn i insertEvent fanges ikke. Den dekker moensteret vi faktisk har
 * gaatt paa, ikke alle tenkelige varianter.
 */

const rot = path.resolve(__dirname, '..');
const les = (f: string) => fs.readFileSync(path.join(rot, f), 'utf8');

/** Kroppen til insertEvent, fram til neste toppnivaa-eksport. */
function insertEventKropp(kilde: string): string {
	const start = kilde.indexOf('export async function insertEvent');
	expect(start, 'fant ikke insertEvent i utils.ts').toBeGreaterThan(-1);
	const slutt = kilde.indexOf('\nexport ', start + 10);
	return kilde.slice(start, slutt > 0 ? slutt : kilde.length);
}

/** Navn importert til utils.ts fra categories.ts. */
function importertFraCategories(kilde: string): string[] {
	const m = kilde.match(/import \{([^}]+)\} from '\.\/categories\.js'/);
	if (!m) return [];
	return m[1]
		.split(',')
		.map((n) => n.trim())
		.filter(Boolean);
}

describe('sperre ved innlegging har en invariant som ser bakover', () => {
	const utils = les('utils.ts');
	const konsistens = les('datakonsistens.ts');
	const kropp = insertEventKropp(utils);

	const sperrerIBruk = importertFraCategories(utils).filter((navn) =>
		new RegExp(`\\b${navn}\\s*\\(`).test(kropp)
	);

	it('finner minst én sperre, ellers maaler testen ingenting', () => {
		// Uten denne ville testen bestaatt stille den dagen noen endret
		// importlinja eller doepte om insertEvent. Ingen funn er ikke det samme
		// som ingen feil.
		expect(sperrerIBruk.length).toBeGreaterThan(0);
	});

	it.each(sperrerIBruk)('%s brukes ogsaa i datakonsistens.ts', (navn) => {
		expect(
			konsistens.includes(navn),
			`${navn} er en sperre i insertEvent, men ingen invariant i datakonsistens.ts bruker den. ` +
				'Sperra beskytter nye rader; uten invarianten blir de som alt ligger der staaende feil, ' +
				'og ingenting blir roedt. Legg til en sjekk i SJEKKER som kaller samme funksjon.'
		).toBe(true);
	});
});
