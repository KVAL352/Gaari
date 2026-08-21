import { describe, it, expect } from 'vitest';
import {
	erStorskjerm,
	byggTittel,
	finnKategori,
	formaterPris,
	formaterAdresse,
	type BookibudRad
} from '../bookibud.js';
import { titlesMatch, sammeSted } from '../../lib/dedup.js';
import { normalizeTitle } from '../../lib/utils.js';

/** Minimal rad. Feltene som ikke er nevnt spiller ingen rolle for testen. */
function rad(over: Partial<BookibudRad>): BookibudRad {
	return {
		id: 'x:2026-09-05',
		eventId: 'x',
		title: 'Uten tittel',
		day: '2026-09-05',
		url: 'https://bookibud.com/bergen-street-food/event/x?date=2026-09-05',
		start: '2026-09-05T19:00:00+02:00',
		...over
	};
}

describe('bookibud — storskjerm', () => {
	it('kjenner igjen ligakamper og Formel 1 fra tittelen', () => {
		expect(erStorskjerm(rad({ title: 'Eliteserien: Brann - Kristiansund' }))).toBe(true);
		expect(erStorskjerm(rad({ title: 'PAOK - Brann (Conference League kval.)' }))).toBe(true);
		expect(erStorskjerm(rad({ title: 'Dutch Grand Prix - Formel 1' }))).toBe(true);
	});

	it('tar en Sports-rad med to lag selv om ligaen ikke er navngitt', () => {
		expect(erStorskjerm(rad({ title: 'Rosenborg - Viking', category: 'Sports' }))).toBe(true);
	});

	it('lar andre arrangementer være i fred', () => {
		expect(erStorskjerm(rad({ title: 'Nattklubb', category: 'Club Night' }))).toBe(false);
		expect(erStorskjerm(rad({ title: 'Bergens Letteste Quiz' }))).toBe(false);
		// En Sports-rad uten motstander er ikke en sending.
		expect(erStorskjerm(rad({ title: 'Yoga i lokalet', category: 'Sports' }))).toBe(false);
	});

	it('setter prefiks én gang, ikke to', () => {
		expect(byggTittel(rad({ title: 'Eliteserien: Brann - Molde' }))).toBe(
			'Storskjerm: Eliteserien: Brann - Molde'
		);
		expect(byggTittel(rad({ title: 'Storskjerm: Brann - Molde' }))).toBe('Storskjerm: Brann - Molde');
	});

	it('lar tittelen stå urørt når det ikke er en sending', () => {
		expect(byggTittel(rad({ title: '  Konsert: Duvèt  ' }))).toBe('Konsert: Duvèt');
	});
});

describe('bookibud — dedup mot brann.ts', () => {
	// Uten prefiks slettes den ene av disse to. Kampen spilles på Brann
	// Stadion; Bookibud-raden er en visning på Bergen Street Food samme kveld.
	const kampen = 'Brann – Kristiansund';
	const visningen = 'Eliteserien: Brann - Kristiansund';

	it('kildens egen tittel kolliderer med kampen', () => {
		expect(
			titlesMatch(normalizeTitle(visningen), normalizeTitle(kampen), 'bookibud', 'brann')
		).toBe(true);
	});

	it('prefikset skiller dem', () => {
		const vaar = byggTittel(rad({ title: visningen }));
		expect(titlesMatch(normalizeTitle(vaar), normalizeTitle(kampen), 'bookibud', 'brann')).toBe(
			false
		);
	});

	it('stedene teller ikke som samme sted', () => {
		expect(sammeSted('Bergen Street Food', 'Brann Stadion')).toBe(false);
	});
});

describe('bookibud — kategori', () => {
	it('sender går til sports uansett hva kilden kaller dem', () => {
		expect(finnKategori(rad({ title: 'Eliteserien: Brann - Molde', category: null }))).toBe('sports');
		expect(finnKategori(rad({ title: 'Italian Grand Prix - Formel 1' }))).toBe('sports');
	});

	it('bruker kildens etikett når den finnes', () => {
		expect(finnKategori(rad({ title: 'Nattklubb', category: 'Club Night' }))).toBe('nightlife');
		expect(finnKategori(rad({ title: 'Duvèt', category: 'Concert' }))).toBe('music');
	});

	it('gjetter fra tittelen når etiketten mangler', () => {
		expect(finnKategori(rad({ title: 'Bergens Letteste Quiz' }))).toBe('nightlife');
		expect(finnKategori(rad({ title: 'STANDUP-STAFETT MED STAND UP BERGEN' }))).toBe('nightlife');
		expect(finnKategori(rad({ title: 'Konsert: Duvèt' }))).toBe('music');
	});

	it('lar ikke stedsnavnet smitte over på kategorien', () => {
		// «food» i «Bergen Street Food» gjorde standupshow til matarrangement.
		const standup = rad({
			title: 'GONGSHOW MED STAND UP BERGEN',
			venueName: 'Bergen Street Food',
			organizer: { id: 'o', name: 'Standup Bergen', linkname: 'standup-bergen' },
			description: 'Denne høsten slår Stand Up Bergen seg sammen med Bergen Street Food.'
		});
		expect(finnKategori(standup)).toBe('nightlife');
	});

	it('lar klokkeslettet avgjøre når ingenting annet gjør det', () => {
		expect(finnKategori(rad({ title: 'CLMD', start: '2026-09-05T22:00:00+02:00' }))).toBe('nightlife');
		expect(finnKategori(rad({ title: 'CLMD', start: '2026-09-05T18:00:00+02:00' }))).toBe('culture');
	});
});

describe('bookibud — pris', () => {
	it('regner om fra øre til kroner', () => {
		expect(formaterPris(rad({ priceFrom: { amount: 14200, currency: 'NOK' } }))).toBe('142 kr');
		expect(formaterPris(rad({ priceFrom: { amount: 10000, currency: 'NOK' } }))).toBe('100 kr');
	});

	it('lar isFree slå gjennom', () => {
		expect(formaterPris(rad({ isFree: true, priceFrom: null }))).toBe('Gratis');
	});

	it('svarer tomt når prisen mangler eller ikke er i kroner', () => {
		expect(formaterPris(rad({ priceFrom: null }))).toBe('');
		expect(formaterPris(rad({ priceFrom: { amount: 0, currency: 'NOK' } }))).toBe('');
		expect(formaterPris(rad({ priceFrom: { amount: 5000, currency: 'EUR' } }))).toBe('');
	});
});

describe('bookibud — adresse', () => {
	it('setter sammen gate, postnummer og poststed', () => {
		expect(
			formaterAdresse(
				rad({ address: { street: 'Christies gate 13', zip: '5015', city: 'Bergen', country: 'Norway' } })
			)
		).toBe('Christies gate 13, 5015 Bergen');
	});

	it('faller tilbake på Bergen når adressen mangler', () => {
		expect(formaterAdresse(rad({ address: null }))).toBe('Bergen');
	});
});
