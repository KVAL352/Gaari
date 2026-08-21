import { describe, it, expect } from 'vitest';
import { loggbarSti, utenEpost } from '../../send-newsletter.js';

/**
 * Actions-loggen er offentlig fordi repoet er det.
 *
 * Commiten 2026-08-20 fjernet abonnentens e-postadresse fra én advarsel, og
 * innførte den samme dagen på nytt gjennom en annen: rate-limit-advarselen
 * logget hele stien, og stien for medlemstillegg inneholder adressen. Disse to
 * hjelperne er sperren, og de er derfor verdt å teste.
 */
describe('loggbarSti', () => {
	it('fjerner e-postadressen fra abonnentstien', () => {
		const sti = `/subscribers/${encodeURIComponent('ola.nordmann@eksempel.no')}/groups/12345`;
		expect(loggbarSti(sti)).toBe('/subscribers/:id/groups/:id');
		expect(loggbarSti(sti)).not.toContain('ola');
		expect(loggbarSti(sti)).not.toContain('%40');
	});

	it('tar ogsaa en uenkodet adresse', () => {
		expect(loggbarSti('/subscribers/ola@eksempel.no/groups/1')).toBe('/subscribers/:id/groups/:id');
	});

	it('beholder endepunktnavn saa loggen fortsatt kan leses', () => {
		expect(loggbarSti('/campaigns/9988776655/schedule')).toBe('/campaigns/:id/schedule');
		expect(loggbarSti('/groups')).toBe('/groups');
		expect(loggbarSti('/campaigns')).toBe('/campaigns');
	});

	it('stripper spoerrestrengen, som kan baere filtre', () => {
		expect(loggbarSti('/subscribers?filter[status]=active&limit=100')).toBe('/subscribers');
	});
});

describe('utenEpost', () => {
	it('fjerner adresser fra en svarkropp vi logger videre', () => {
		const kropp = '{"message":"Subscriber ola@eksempel.no not found"}';
		expect(utenEpost(kropp)).toBe('{"message":"Subscriber [e-post fjernet] not found"}');
	});

	it('tar alle adressene, ikke bare den foerste', () => {
		expect(utenEpost('a@b.no og c@d.com')).toBe('[e-post fjernet] og [e-post fjernet]');
	});

	it('lar tekst uten adresser staa uroert', () => {
		expect(utenEpost('429 Too Many Requests')).toBe('429 Too Many Requests');
	});
});
