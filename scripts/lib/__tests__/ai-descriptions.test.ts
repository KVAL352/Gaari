import { describe, it, expect } from 'vitest';
import { harVerbatimOverlapp } from '../ai-descriptions.js';

/**
 * Opphavsrettssperra.
 *
 * Arrangørens egen omtale sendes til modellen som faktagrunnlag, fordi
 * beskrivelsene ellers blir 115 tegn — modellen vet bare tittel, sted,
 * kategori og dato. Teksten skal aldri gjengis; åndsverksloven gjelder den.
 *
 * Prompten sier fra om det, men en promptregel er en oppfordring, ikke en
 * sperre. Denne funksjonen er sperren, og den fanget et ekte tilfelle første
 * gang den kjørte mot Madam Felle-programmet. Derfor skal den ha en test som
 * faktisk kan feile.
 */
describe('harVerbatimOverlapp', () => {
	const kilde =
		'Etter et års pause fra livespilling er Masåva klare for å spille på hjemmebane igjen. ' +
		'Bandet består av Selma French Bolstad, Øystein Aarnes Vik, Solveig Wang og Martin Morland, ' +
		'og kjennetegnes av sitt organiske og drivende sound med ettertenksomme tekster.';

	it('fanger prosa som er løftet ordrett', () => {
		const generert =
			'Masåva spiller på Revolver. Etter et års pause fra livespilling er Masåva klare for å spille på hjemmebane igjen.';
		expect(harVerbatimOverlapp(generert, kilde)).toBe(true);
	});

	it('slipper gjennom en ekte omskriving', () => {
		const generert =
			'Masåva spiller konsert på Revolver i Bergen tirsdag 25. august. Kvartetten teller Selma French Bolstad, ' +
			'Øystein Aarnes Vik, Solveig Wang og Martin Morland.';
		expect(harVerbatimOverlapp(generert, kilde)).toBe(false);
	});

	it('lar korte fellesledd staa — de er ikke sitater', () => {
		// «Bandet består av» er tre ord og uunngåelig. Terskelen er åtte.
		expect(harVerbatimOverlapp('Bandet består av fire musikere fra Bergen.', kilde)).toBe(false);
	});

	it('bryr seg ikke om tegnsetting', () => {
		const generert = 'etter et års pause fra livespilling er masåva klare for å spille på hjemmebane igjen!!!';
		expect(harVerbatimOverlapp(generert, kilde)).toBe(true);
	});

	/**
	 * Terskelen er en avveining, ikke en fasit.
	 *
	 * Aatte ord paa rad med minst fire vanlige ord blant dem. Settes minVanlige
	 * lavere, forkastes beskrivelser som bare har faatt med besetningen — og
	 * det er nettopp de vi vil ha. Settes den hoeyere, slipper kortere loeftede
	 * setninger gjennom.
	 *
	 * Konsekvensen av valget: «Bandet består av <fire navn>» slipper gjennom.
	 * Det er en bar faktaopplysning i den eneste naturlige norske formuleringen,
	 * og en sperre som stopper den ville hindret oss i aa oppgi besetningen i
	 * det hele tatt. Vurderingen boer proeves mot noen som kan opphavsrett.
	 */
	it('slipper gjennom en bar faktaopplysning med triviell bindetekst', () => {
		const generert = 'Bandet består av Selma French Bolstad, Øystein Aarnes Vik, Solveig Wang og Martin Morland.';
		expect(harVerbatimOverlapp(generert, kilde)).toBe(false);
	});

	it('svarer nei naar en av tekstene er for kort til aa vurdere', () => {
		expect(harVerbatimOverlapp('Konsert på Revolver.', kilde)).toBe(false);
		expect(harVerbatimOverlapp('En lang nok generert tekst med mange ord i seg her.', 'Kort.')).toBe(false);
	});

	it('kan skjerpes og slakkes med minOrd', () => {
		const generert = 'Bandet består av Selma French Bolstad og flere andre musikere.';
		// Fem ord felles: slipper gjennom paa aatte, fanges paa fire.
		expect(harVerbatimOverlapp(generert, kilde, 8)).toBe(false);
		expect(harVerbatimOverlapp(generert, kilde, 4, 2)).toBe(true);
	});

	it('lar en ren navneliste staa — fire navn er fakta, ikke formulering', () => {
		// Denne fanget en ekte designfeil. Foerste utgave forkastet nettopp de
		// beskrivelsene som hadde faatt med besetningen, fordi elleve navneord
		// paa rad saa ut som et sitat. Aandsverksloven verner ikke en
		// navneliste, og en omskriving kan umulig unngaa den.
		const generert =
			'Masåva spiller på Revolver. Kvartetten teller Selma French Bolstad, ' +
			'Øystein Aarnes Vik, Solveig Wang og Martin Morland.';
		expect(harVerbatimOverlapp(generert, kilde)).toBe(false);
	});

	it('fanger loeftet bindetekst selv om den staar mellom egennavn', () => {
		const generert =
			'Masåva er et band som kjennetegnes av sitt organiske og drivende sound med ettertenksomme tekster.';
		expect(harVerbatimOverlapp(generert, kilde)).toBe(true);
	});
});
