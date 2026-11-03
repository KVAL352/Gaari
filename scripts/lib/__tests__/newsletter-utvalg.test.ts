import { describe, it, expect } from 'vitest';
import { velgUtvalg, erIHelg } from '../newsletter-utvalg.js';

// Torsdag 5. november 2026: helgen er fredag 6. til søndag 8.
const helg = { start: '2026-11-06', end: '2026-11-08' };

function ev(id: string, dag: string, category = 'music', venue = `sted-${id}`) {
	return { id, category, venue_name: venue, date_start: `${dag}T19:00:00` };
}

describe('erIHelg', () => {
	it('regner fredag, lørdag og søndag som helg, men ikke torsdag og mandag', () => {
		expect(erIHelg('2026-11-05T19:00:00', helg)).toBe(false);
		expect(erIHelg('2026-11-06T00:00:00', helg)).toBe(true);
		expect(erIHelg('2026-11-08T23:59:00', helg)).toBe(true);
		expect(erIHelg('2026-11-09T10:00:00', helg)).toBe(false);
	});
});

describe('velgUtvalg', () => {
	it('setter helgens arrangementer foran torsdagens', () => {
		const events = [ev('t1', '2026-11-05'), ev('t2', '2026-11-05'), ev('l1', '2026-11-07', 'culture')];
		const { utvalg } = velgUtvalg(events, new Set(), helg, 9);
		expect(utvalg[0].id).toBe('l1');
	});

	it('bruker bare helgen når den fyller brevet', () => {
		const events = [
			...Array.from({ length: 3 }, (_, i) => ev(`t${i}`, '2026-11-05', 'theatre')),
			...Array.from({ length: 4 }, (_, i) => ev(`h${i}`, '2026-11-06', ['music', 'culture', 'food', 'sports'][i]))
		];
		const { utvalg } = velgUtvalg(events, new Set(), helg, 4);
		expect(utvalg.map(e => e.id).sort()).toEqual(['h0', 'h1', 'h2', 'h3']);
	});

	it('fyller opp med resten av uka når helgen er tynn', () => {
		const events = [ev('t1', '2026-11-05'), ev('h1', '2026-11-07')];
		const { utvalg } = velgUtvalg(events, new Set(), helg, 9);
		expect(utvalg.map(e => e.id)).toEqual(['h1', 't1']);
	});

	it('tar maks to per kategori i helgen før overflow, slik at utvalget blir blandet', () => {
		const events = [
			ev('m1', '2026-11-07', 'music'), ev('m2', '2026-11-07', 'music'), ev('m3', '2026-11-07', 'music'),
			ev('c1', '2026-11-07', 'culture')
		];
		const { utvalg } = velgUtvalg(events, new Set(), helg, 3);
		expect(utvalg.map(e => e.id)).toEqual(['m1', 'm2', 'c1']);
	});

	it('legger betalende arrangør først og foretrekker et arrangement i helgen', () => {
		const events = [
			ev('p-torsdag', '2026-11-05', 'music', 'Betaler'),
			ev('p-lordag', '2026-11-07', 'music', 'Betaler'),
			ev('h1', '2026-11-06', 'culture')
		];
		const { utvalg, promotedIds } = velgUtvalg(events, new Set(['Betaler']), helg, 9);
		expect(utvalg[0].id).toBe('p-lordag');
		expect(promotedIds.has('p-lordag')).toBe(true);
		expect(promotedIds.has('p-torsdag')).toBe(false);
	});

	it('sprer utvalget over helgens dager i stedet for å fylle det med fredag', () => {
		const events = [
			ev('f1', '2026-11-06', 'music'), ev('f2', '2026-11-06', 'culture'), ev('f3', '2026-11-06', 'food'),
			ev('l1', '2026-11-07', 'theatre'), ev('s1', '2026-11-08', 'family')
		];
		const dager = velgUtvalg(events, new Set(), helg, 3).utvalg.map(e => e.date_start.slice(0, 10));
		expect(new Set(dager).size).toBe(3);
	});

	it('kutter ved maks', () => {
		const events = Array.from({ length: 20 }, (_, i) => ev(`e${i}`, '2026-11-07', `k${i}`));
		expect(velgUtvalg(events, new Set(), helg, 9).utvalg).toHaveLength(9);
	});
});
