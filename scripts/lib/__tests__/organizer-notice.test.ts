import { describe, it, expect } from 'vitest';
import { bygg, fornavn, harSomeSamtykke, type Henvendelse } from '../organizer-notice.js';

const h = (source: string, name = 'Kaj Alver'): Henvendelse => ({
	id: 'x',
	name,
	email: 'kaj@example.no',
	event_source: source
});

const ETT = [
	{ slug: 'high-voltage-rockfest-2026-2026-09-04', title_no: 'High Voltage Rockfest 2026', date_start: '2026-09-04T15:00:00+00:00' }
];

const SEKS = [
	{ slug: 'jul-i-villaveien-2026-12-05', title_no: 'Jul i Villaveien — lørdag 5. desember', date_start: '2026-12-05T08:30:00+00:00' },
	{ slug: 'jul-i-villaveien-2026-12-06', title_no: 'Jul i Villaveien — søndag 6. desember', date_start: '2026-12-06T08:30:00+00:00' }
];

describe('fornavn', () => {
	it('tar første ord', () => {
		expect(fornavn('Kaj Alver')).toBe('Kaj');
	});

	it('tåler tomt navn uten å kaste', () => {
		expect(fornavn('')).toBe('');
	});
});

describe('bygg', () => {
	it('nekter å bygge et brev uten arrangementer', () => {
		// Uten denne ville en henvendelse med event_source satt, men ingenting
		// publisert, gitt en e-post med tom lenkeliste.
		expect(() => bygg(h('highvoltage'), [])).toThrow(/uten arrangementer/);
	});

	it('bruker arrangementstittelen som emne når det bare er ett', () => {
		expect(bygg(h('highvoltage'), ETT).subject).toBe('High Voltage Rockfest 2026 er lagt ut på gaari.no');
	});

	it('bytter til flertallsemne når det er flere', () => {
		expect(bygg(h('julivillaveien'), SEKS).subject).toBe('Arrangementene deres er lagt ut på gaari.no');
	});

	it('lister hver dato med egen lenke når det er flere', () => {
		const { html } = bygg(h('julivillaveien'), SEKS);
		expect(html).toContain('/no/events/jul-i-villaveien-2026-12-05');
		expect(html).toContain('/no/events/jul-i-villaveien-2026-12-06');
		expect(html).toContain('lørdag 5. desember');
	});

	it('hilser med fornavn', () => {
		expect(bygg(h('highvoltage'), ETT).html).toContain('Hei Kaj,');
	});

	it('hilser uten navn i stedet for «Hei ,» når navnet mangler', () => {
		const { html } = bygg(h('highvoltage', ''), ETT);
		expect(html).toContain('<p>Hei,</p>');
	});
});

describe('bildeomfang følger consent.json', () => {
	// Kjernen i hele malen. Lover brevet sosiale medier til en arrangør som bare
	// har sagt ja til visning, har vi gitt et skriftlig løfte vi ikke har dekning
	// for. Derfor leses omfanget fra registeret og ikke fra en liste i malen.

	it('highvoltage har kun visning, og skal få invitasjonen', () => {
		expect(harSomeSamtykke('highvoltage')).toBe(false);
		const { html } = bygg(h('highvoltage'), ETT);
		expect(html).toContain('kun på gaari.no og i nyhetsbrevet');
		expect(html).toContain('er det bare å si fra');
	});

	it('julivillaveien har sagt ja til SoMe, og skal ikke få invitasjonen', () => {
		expect(harSomeSamtykke('julivillaveien')).toBe(true);
		const { html } = bygg(h('julivillaveien'), SEKS);
		expect(html).toContain('Facebook og Instagram, slik dere har sagt ja til');
		expect(html).not.toContain('er det bare å si fra');
	});

	it('en ukjent kilde behandles som ikke godkjent for SoMe', () => {
		expect(harSomeSamtykke('finnes-ikke')).toBe(false);
		expect(bygg(h('finnes-ikke'), ETT).html).toContain('kun på gaari.no');
	});
});
