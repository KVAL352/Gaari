import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// venue-policy importerer supabase, som trenger dotenv fra scripts/package.json.
// CI installerer bare rot-avhengighetene. Samme mock som de andre testene i
// scripts/ bruker.
vi.mock('../../lib/supabase.js', () => ({ supabase: {} }));

import { fjernBlokkerte, CAPPED_VENUES, mandagDenneUken } from '../venue-policy.js';

const socialDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Bakgrunn: fram til 2026-08-11 håndhevet generate-posts.ts venue-regelen mens
 * generate-reels.ts ikke hadde den i det hele tatt. Akvariet, som alltid skal
 * begrenses, kunne dermed gå i hver eneste ukesreel. Regelen fantes, men bare
 * i én av to veier ut.
 *
 * Den viktigste testen her er derfor ikke logikken, men at hver generator som
 * publiserer faktisk spør. En ny kanal bygget om et år arver problemet med
 * mindre noe sier fra.
 */
describe('venue-regelen', () => {
	it('fjerner arrangementer fra blokkerte venues', () => {
		const events = [
			{ venue_name: 'Akvariet i Bergen', id: '1' },
			{ venue_name: 'USF Verftet', id: '2' },
			{ venue_name: 'Akvariet i Bergen', id: '3' }
		];
		const igjen = fjernBlokkerte(events, new Set(['Akvariet i Bergen']));
		expect(igjen.map((e) => e.id)).toEqual(['2']);
	});

	it('rører ingenting når ingen er blokkert', () => {
		const events = [{ venue_name: 'USF Verftet', id: '1' }];
		expect(fjernBlokkerte(events, new Set())).toBe(events);
	});

	it('regner mandag riktig, også på en søndag', () => {
		// 2026-08-16 er en søndag. Mandagen i den uken er 10. august.
		expect(mandagDenneUken(new Date('2026-08-16T12:00:00+02:00'))).toBe('2026-08-10');
		// 2026-08-10 er selv en mandag og skal gi seg selv.
		expect(mandagDenneUken(new Date('2026-08-10T12:00:00+02:00'))).toBe('2026-08-10');
	});

	it('har minst ett begrenset venue, ellers er regelen tannløs', () => {
		expect(CAPPED_VENUES.size).toBeGreaterThan(0);
	});

	/**
	 * Strukturell test. Den ser etter at hver generator som lager innhold for
	 * Gåris egne kanaler importerer fra venue-policy. Den beviser ikke at
	 * regelen brukes riktig, men den fanger det som faktisk skjedde: at en hel
	 * kanal ble bygget uten å kjenne til regelen.
	 */
	it('brukes av hver generator som publiserer til egne kanaler', () => {
		const publiserende = readdirSync(socialDir).filter(
			(f) => /^generate-(posts|reels|week)\.ts$/.test(f)
		);
		expect(publiserende.length, 'fant ingen generatorer å sjekke').toBeGreaterThan(0);

		const uten = publiserende.filter((f) => {
			const kode = readFileSync(join(socialDir, f), 'utf8');
			return !kode.includes("from './venue-policy.js'");
		});

		expect(
			uten,
			'Disse generatorene publiserer til Gåris egne kanaler uten å spørre om ' +
				'venue-regelen. Importer fra venue-policy.js og kall vurderVenues før ' +
				'utvalget gjøres. Uten det kan et begrenset venue gå fritt i denne kanalen.'
		).toEqual([]);
	});
});
