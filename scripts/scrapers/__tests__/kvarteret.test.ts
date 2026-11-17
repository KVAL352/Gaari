import { describe, it, expect } from 'vitest';
import { extractEvent, findEvent, isExcluded, isBergen, toIso, mapCategory, parsePrice, isCancelled, pickTicketUrl } from '../kvarteret.js';

const page = (graph: unknown[]) =>
	`<html><script type="application/ld+json">${JSON.stringify({ '@graph': [{ '@type': 'Organization' }] })}</script>` +
	`<script type="application/ld+json">${JSON.stringify({ '@graph': graph })}</script></html>`;

describe('extractEvent', () => {
	it('finner Event i den andre JSON-LD-blokken', () => {
		const ev = extractEvent(page([{ '@type': 'Event', name: 'Quiz' }]));
		expect(ev?.name).toBe('Quiz');
	});
	it('gir null når siden ikke har noe Event', () => {
		expect(extractEvent(page([{ '@type': 'WebSite' }]))).toBeNull();
		expect(extractEvent('<html></html>')).toBeNull();
	});
	it('tåler ugyldig JSON', () => {
		expect(extractEvent('<script type="application/ld+json">{ikke json</script>')).toBeNull();
	});
	it('tåler enkeltobjekt uten @graph', () => {
		expect(findEvent({ '@type': 'Event', name: 'X' })?.name).toBe('X');
	});
});

describe('filtre', () => {
	it('holder velkomstuke og fadder ute, men ikke vanlige titler', () => {
		expect(isExcluded('Velkomstuken 2026 Psyk fak')).toBe(true);
		expect(isExcluded('Fadderuke')).toBe(true);
		expect(isExcluded('Konsert med Synne Sørgjerd')).toBe(false);
	});
	it('bare postnummer 5xxx er Bergen', () => {
		expect(isBergen('5015')).toBe(true);
		expect(isBergen('0150')).toBe(false);
		expect(isBergen('')).toBe(false);
		expect(isBergen(undefined)).toBe(false);
	});
	it('avlyste arrangementer avvises', () => {
		expect(isCancelled({ eventStatus: 'https://schema.org/EventCancelled' })).toBe(true);
		expect(isCancelled({ eventStatus: 'https://schema.org/EventScheduled' })).toBe(false);
		expect(isCancelled({})).toBe(false);
	});
});

describe('toIso', () => {
	it('beholder UTC-instantet (21:00 lokal tid = 20:00Z)', () => {
		expect(toIso('2026-11-21T20:00:00.000Z')).toBe('2026-11-21T20:00:00.000Z');
	});
	it('gir null for ugyldig eller manglende dato', () => {
		expect(toIso('ikke dato')).toBeNull();
		expect(toIso(undefined)).toBeNull();
	});
});

describe('mapCategory', () => {
	it('mapper stikkord fra kilden', () => {
		expect(mapCategory(['Konserter', 'Konsert'])).toBe('music');
		expect(mapCategory(['Faglig', 'Foredrag'])).toBe('culture');
		expect(mapCategory(['Kultur', 'Quiz'])).toBe('nightlife');
		expect(mapCategory(['Kultur', 'Forestilling'])).toBe('theatre');
		expect(mapCategory(['Kultur', 'Åpen Øving'])).toBe('workshop');
	});
	it('faller tilbake til student uten stikkord', () => {
		expect(mapCategory([])).toBe('student');
		expect(mapCategory(undefined)).toBe('student');
	});
});

describe('parsePrice', () => {
	it('gratis gir 0', () => {
		expect(parsePrice({ isAccessibleForFree: true, offers: [{ price: '0' }] })).toBe('0');
	});
	it('betalt gir første tilbuds pris', () => {
		expect(parsePrice({ isAccessibleForFree: false, offers: [{ price: '255' }, { price: '195' }] })).toBe('255 kr');
	});
	it('ukjent pris gir tom streng, ikke gjetting', () => {
		expect(parsePrice({ isAccessibleForFree: false, offers: [] })).toBe('');
		expect(parsePrice({})).toBe('');
	});
});

describe('pickTicketUrl', () => {
	it('bruker billettlenken fra tilbudet', () => {
		expect(pickTicketUrl({ offers: [{ url: 'https://studentersamfunnetibergen.hoopla.no/event/1' }] }))
			.toContain('hoopla.no/event/1');
	});
	it('gir undefined uten tilbud', () => {
		expect(pickTicketUrl({})).toBeUndefined();
	});
});
