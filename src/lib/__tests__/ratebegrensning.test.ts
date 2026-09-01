import { describe, it, expect } from 'vitest';

import { getRateLimitTier } from '../../hooks.server';

/**
 * Ratebegrensningen dekket bare POST. Sikkerhetsrevisjonen 1. september fant
 * at `DELETE /api/posting-status?week=…` sletter en hel uke med SoMe-avkryssing
 * uten innlogging, og at DELETE aldri traff POST-regelen.
 *
 * Testen fester begge retninger. En for bred regel er like ille: treffer den
 * vanlige GET-er, blir sida ubrukelig etter tre sidelast, og den feilen ville
 * vaert synlig for alle.
 */
describe('getRateLimitTier', () => {
	describe('teller muterende kall mot API-kvoten', () => {
		const skalTelles: [string, string][] = [
			['/api/posting-status', 'DELETE'],
			['/api/posting-status', 'POST'],
			['/api/csp-report', 'POST'],
			['/api/remind', 'POST'],
			['/api/newsletter', 'POST'],
			['/api/notify-submission', 'POST'],
		];

		for (const [sti, metode] of skalTelles) {
			it(`${metode} ${sti}`, () => {
				expect(getRateLimitTier(sti, metode)).toBe('api');
			});
		}

		it('godtar metoden i smaa bokstaver', () => {
			expect(getRateLimitTier('/api/posting-status', 'delete')).toBe('api');
		});
	});

	describe('lar lesing og vanlige sider vaere i fred', () => {
		const skalIkkeTelles: [string, string][] = [
			// Lesing skal aldri begrenses. Gjoer den det, blir sida ubrukelig.
			['/api/posting-status', 'GET'],
			['/api/health', 'GET'],
			['/no', 'GET'],
			['/no/gratis', 'GET'],
			['/en', 'GET'],
			['/api/events.ics', 'GET'],
			// Ikke et av de navngitte endepunktene.
			['/api/noe-annet', 'POST'],
		];

		for (const [sti, metode] of skalIkkeTelles) {
			it(`${metode} ${sti}`, () => {
				expect(getRateLimitTier(sti, metode)).toBeNull();
			});
		}
	});

	describe('de to andre nivaaene staar urrt', () => {
		it('innlogging har sitt eget nivaa', () => {
			expect(getRateLimitTier('/admin/login', 'POST')).toBe('login');
		});

		it('skjemasider har sitt eget nivaa, ogsaa paa GET', () => {
			expect(getRateLimitTier('/no/submit', 'GET')).toBe('form');
			expect(getRateLimitTier('/en/datainnsamling', 'GET')).toBe('form');
		});

		it('innlogging gaar foran skjemanivaaet', () => {
			// Rekkefoelgen i funksjonen avgjoer dette, og login er strengest.
			expect(getRateLimitTier('/admin/login', 'POST')).toBe('login');
		});
	});
});
