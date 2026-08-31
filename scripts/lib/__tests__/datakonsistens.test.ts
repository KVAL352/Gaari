import { describe, it, expect } from 'vitest';

import {
	SJEKKER,
	kjoerSjekker,
	klokkeslettITekst,
	klokkeslettIFelt,
	type KonsistensRad,
} from '../datakonsistens.js';

/**
 * Sjekkene finnes for aa fange en feilklasse som ikke gir feilmelding noe
 * sted: et strukturert felt som motsier radens egen tekst. Testene maa derfor
 * feste to ting like hardt.
 *
 * At sjekken finner den ekte feilen, og at den lar riktige rader vaere i fred.
 * En sperrende sjekk som ogsaa slaar ut paa normale rader ville gjort jobben
 * roed hver dag, og en portvakt som alltid er roed laerer folk aa se bort fra
 * roedt. Det er verre enn ingen portvakt.
 */

const rad = (o: Partial<KonsistensRad>): KonsistensRad => ({
	id: 'x', slug: 'x', source: 'test', title_no: 'Tittel',
	description_no: '', age_group: 'all', date_start: '2026-10-01T18:00:00+00:00', ...o,
});

const finn = (navn: string, rader: KonsistensRad[]) => {
	const sjekk = SJEKKER.find(s => s.navn === navn)!;
	return sjekk.finn(rader);
};

describe('aldersgrense-mangler', () => {
	it('fanger teksten som oppgir 18 aar mens feltet sier alle', () => {
		const r = [rad({ age_group: 'all', description_no: 'Arrangementet har aldersgrense 18 år.' })];
		expect(finn('aldersgrense-mangler', r)).toHaveLength(1);
	});

	it('fanger ogsaa naar feltet sier students', () => {
		const r = [rad({ age_group: 'students', description_no: 'Konserten har aldersgrense 18 år.' })];
		expect(finn('aldersgrense-mangler', r)).toHaveLength(1);
	});

	it('lar en rad som alt er merket 18+ vaere i fred', () => {
		const r = [rad({ age_group: '18+', description_no: 'Arrangementet har aldersgrense 18 år.' })];
		expect(finn('aldersgrense-mangler', r)).toHaveLength(0);
	});

	it('slaar ikke ut paa datoer eller nedre aldersgrenser', () => {
		const r = [
			rad({ description_no: 'Konserten er fredag 18. september 2026.' }),
			rad({ description_no: 'Verkstedet er for ungdom mellom 13 og 18 år.' }),
			rad({ description_no: 'Arrangementet har fri aldersgrense.' }),
		];
		expect(finn('aldersgrense-mangler', r)).toHaveLength(0);
	});
});

describe('aldersgrense-for-streng', () => {
	it('fanger 18+ paa noe som sier fri aldersgrense', () => {
		// Nettopp feilen som ble gjort paa Kjoett Festival 31. august: raden ble
		// satt til 18+ paa grunnlag av en utdatert kildeside.
		const r = [rad({ age_group: '18+', description_no: 'Arrangementet har fri aldersgrense.' })];
		expect(finn('aldersgrense-for-streng', r)).toHaveLength(1);
	});

	it('lar et ekte 18+-arrangement staa', () => {
		const r = [rad({ age_group: '18+', description_no: 'Konsert med aldersgrense 18 år.' })];
		expect(finn('aldersgrense-for-streng', r)).toHaveLength(0);
	});
});

describe('slutt-foer-start', () => {
	it('fanger ombyttede tidspunkter', () => {
		const r = [rad({ date_start: '2026-09-05T12:30:00+00:00', date_end: '2026-09-05T09:30:00+00:00' })];
		expect(finn('slutt-foer-start', r)).toHaveLength(1);
	});

	it('lar normale og aapne sluttidspunkter staa', () => {
		const r = [
			rad({ date_start: '2026-09-05T09:30:00+00:00', date_end: '2026-09-05T12:30:00+00:00' }),
			rad({ date_start: '2026-09-05T09:30:00+00:00', date_end: null }),
		];
		expect(finn('slutt-foer-start', r)).toHaveLength(0);
	});
});

describe('klokkeslett i tekst mot felt', () => {
	it('leser klokkeslettet slik beskrivelsene faktisk skriver det', () => {
		expect(klokkeslettITekst('starter kl. 19.00.')).toBe('19:00');
		expect(klokkeslettITekst('starter kl 9:05')).toBe('09:05');
		expect(klokkeslettITekst('ingen klokkeslett her')).toBeNull();
		expect(klokkeslettITekst('kl. 45.99')).toBeNull();
	});

	it('leser date_start som veggklokke i Bergen, ikke som UTC', () => {
		// Sommertid: 17:00 UTC er 19:00 i Bergen. Leses feltet som UTC, ville
		// hele sjekken meldt falskt paa hver eneste rad om sommeren.
		expect(klokkeslettIFelt('2026-10-23T17:00:00+00:00')).toBe('19:00');
		// Vintertid: samme UTC-time er 18:00.
		expect(klokkeslettIFelt('2026-12-04T17:00:00+00:00')).toBe('18:00');
		expect(klokkeslettIFelt(null)).toBeNull();
	});

	it('melder bare naar de to faktisk spriker', () => {
		const enig = [rad({ date_start: '2026-10-23T17:00:00+00:00', description_no: 'starter kl. 19.00.' })];
		const uenig = [rad({ date_start: '2026-10-23T17:00:00+00:00', description_no: 'starter kl. 18.00.' })];
		expect(finn('klokkeslett-spriker', enig)).toHaveLength(0);
		expect(finn('klokkeslett-spriker', uenig)).toHaveLength(1);
	});
});

describe('kjoerSjekker', () => {
	it('lar en sperrende sjekk gi brudd paa ett eneste funn', () => {
		const r = [rad({ age_group: 'all', description_no: 'aldersgrense 18 år' })];
		const res = kjoerSjekker(r).find(x => x.sjekk.navn === 'aldersgrense-mangler')!;
		expect(res.brudd).toBe(true);
	});

	it('lar en maalt sjekk vaere i fred saa lenge den ikke vokser', () => {
		// Maalte sjekker laaser dagens nivaa. Poenget er at tallet ikke skal
		// oeke, ikke at nivaaet er greit.
		const sjekk = { navn: 'test', hva: '', sperrende: false, grense: 2,
			finn: () => [{ rad: rad({}), forklaring: '' }, { rad: rad({}), forklaring: '' }] };
		expect(kjoerSjekker([], [sjekk])[0].brudd).toBe(false);

		const vokst = { ...sjekk, finn: () => [1, 2, 3].map(() => ({ rad: rad({}), forklaring: '' })) };
		expect(kjoerSjekker([], [vokst])[0].brudd).toBe(true);
	});

	it('gir ingen brudd paa en frisk rad', () => {
		const r = [rad({ age_group: 'all', description_no: 'En konsert på USF Verftet. Trolig gratis.',
			date_start: '2026-10-23T17:00:00+00:00', date_end: '2026-10-23T20:00:00+00:00' })];
		expect(kjoerSjekker(r).filter(x => x.brudd)).toHaveLength(0);
	});
});
