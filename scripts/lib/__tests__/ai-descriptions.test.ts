import { describe, it, expect } from 'vitest';
import { harVerbatimOverlapp, erAtomaertFaktum, renskFakta, datoForPrompt } from '../ai-descriptions.js';

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

/**
 * Faktasperra.
 *
 * Den trygge veien inn: modellen får kildesida i steg én, men leverer bare
 * atomære verdier tilbake. Skrivesteget ser aldri prosaen, så det finnes
 * ingen formulering å gjenbruke. Sperren følger av formen, ikke av en
 * terskel noen har gjettet.
 */
describe('erAtomaertFaktum', () => {
	it('godtar korte verdier', () => {
		for (const v of ['Chloé Zhao', 'film', '0-2 år', '19.00', 'Auditoriet', '90 minutter']) {
			expect(erAtomaertFaktum(v), v).toBe(true);
		}
	});

	it('avviser setninger', () => {
		expect(erAtomaertFaktum('En gripende fortelling om sorg og kjærlighet i en liten by')).toBe(false);
	});

	it('avviser tekst med punktum — det er prosa, ikke en verdi', () => {
		expect(erAtomaertFaktum('Filmen er regissert av Chloé Zhao.')).toBe(false);
	});

	it('avviser tomt og altfor langt', () => {
		expect(erAtomaertFaktum('   ')).toBe(false);
		expect(erAtomaertFaktum('a'.repeat(80))).toBe(false);
	});
});

describe('renskFakta', () => {
	it('beholder gyldige felt og kaster ukjente', () => {
		const ut = renskFakta({ form: 'film', regissør: 'Chloé Zhao', tulleFelt: 'noe', beskrivelse: 'En lang tekst her' });
		expect(ut).toEqual({ form: 'film', regissør: 'Chloé Zhao' });
	});

	it('siler lister slik at bare de atomære overlever', () => {
		const ut = renskFakta({
			medvirkende: ['Paul Mescal', 'Jessie Buckley', 'et ensemble av dyktige skuespillere fra hele landet'],
		});
		expect(ut).toEqual({ medvirkende: ['Paul Mescal', 'Jessie Buckley'] });
	});

	it('stopper en hel setning smuglet inn som et faktum', () => {
		// Dette er angrepet sperra finnes for: modellen leverer arrangørens
		// formulering under et faktafeltnavn.
		expect(renskFakta({ tema: ['en uforglemmelig kveld med musikk og magi'] })).toBeUndefined();
	});

	it('svarer undefined naar ingenting overlever', () => {
		expect(renskFakta({ form: 'Dette er en altfor lang verdi til å være et faktum' })).toBeUndefined();
		expect(renskFakta(null)).toBeUndefined();
		expect(renskFakta('tekst')).toBeUndefined();
	});
});

describe('erAtomaertFaktum — klokkeslett', () => {
	/**
	 * Denne fanget en ekte feil. Første utgave forkastet alt med punktum,
	 * og norsk klokkeslett skrives «19.00» — sperra ville stoppet hvert
	 * eneste tidspunkt uten å si fra.
	 */
	it('godtar norsk klokkeslettformat', () => {
		for (const v of ['19.00', '09.30', '18.00–20.30']) {
			expect(erAtomaertFaktum(v), v).toBe(true);
		}
	});

	it('avviser fortsatt en setning som slutter med punktum', () => {
		expect(erAtomaertFaktum('Dørene åpner klokken sju.')).toBe(false);
	});
});

describe('datoForPrompt', () => {
	/**
	 * Foer 1. september 2026 gikk den raa ISO-strengen rett inn i prompten:
	 * `Date: 2026-12-04T18:00:00+00:00`. Modellen leste sifrene og skrev
	 * «kl. 18.00», altsaa UTC-tiden, mens sida viser Oslo-tid.
	 *
	 * Maalt samme dag: 303 kommende arrangementer hadde sprik mellom
	 * beskrivelsen og date_start, og 250 av dem var akkurat +60 eller +120
	 * minutter. Det er vinter- og sommertid i Norge, altsaa signaturen paa
	 * nettopp denne feilen.
	 *
	 * En leser som stoler paa beskrivelsen moeter opp én eller to timer for
	 * tidlig. Derfor er dette en brukerfeil, ikke en skjoennhetsfeil.
	 */
	it('gir Oslo-tid om sommeren, ikke UTC', () => {
		// 17:00 UTC i juli er 19:00 i Bergen.
		expect(datoForPrompt('2026-07-15T17:00:00+00:00')).toContain('19:00');
		expect(datoForPrompt('2026-07-15T17:00:00+00:00')).not.toContain('17:00');
	});

	it('gir Oslo-tid om vinteren, ikke UTC', () => {
		// 18:00 UTC i desember er 19:00 i Bergen.
		expect(datoForPrompt('2026-12-04T18:00:00+00:00')).toContain('19:00');
	});

	it('haandterer skiftet til vintertid', () => {
		// 25. oktober 2026 gaar klokka tilbake. 12:00 UTC er da 13:00, ikke 14:00.
		expect(datoForPrompt('2026-10-25T12:00:00+00:00')).toContain('13:00');
	});

	it('tar imot Date-objekt like godt som streng', () => {
		expect(datoForPrompt(new Date('2026-07-15T17:00:00Z'))).toContain('19:00');
	});

	it('kaster ikke paa soppel, men gir det tilbake', () => {
		// En scraper skal ikke stoppe fordi en dato er raar.
		expect(datoForPrompt('ikke en dato')).toBe('ikke en dato');
	});
});
