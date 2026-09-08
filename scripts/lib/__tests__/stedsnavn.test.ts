import { describe, it, expect } from 'vitest';
import { normaliserStedsnavn } from '../utils.js';

/**
 * Stedsnavnet er en nøkkel, ikke bare tekst.
 *
 * Loddefjord menighetshus lå inne under to navn samtidig, «Loddefjord
 * menighetshus» og «Loddefjord menighetshus (Vadmyrveien 91).». For koden var
 * det to steder, og det slo ut tre steder: Instagram-taggingen fant ikke
 * håndtaket, dedup så ikke at det var samme sted, og rettferdighetsregelen i
 * SoMe ga Loddefjord dobbelt plass fordi den telte to.
 *
 * Målt 8. september 2026: 100 kommende rader hadde et navn som ikke var
 * normalisert.
 *
 * TESTEN GÅR BEGGE VEIER MED VILJE. En regel som rydder for mye er like ille
 * som en som rydder for lite, og tørrkjøringen fanget to slike før de nådde
 * basen: «Bergen kino, m.fl.» ble «Bergen kino, m.fl», og etasjeangivelser
 * ville forsvunnet sammen med adressene.
 */
describe('normaliserStedsnavn', () => {
	describe('rydder det som skal ryddes', () => {
		it('fjerner adresse i parentes til slutt', () => {
			expect(normaliserStedsnavn('Loddefjord menighetshus (Vadmyrveien 91).')).toBe(
				'Loddefjord menighetshus'
			);
			expect(normaliserStedsnavn('Norli Akademisk, Studentsenteret (Allégaten 1)')).toBe(
				'Norli Akademisk, Studentsenteret'
			);
		});

		it('fjerner avsluttende punktum og komma', () => {
			expect(normaliserStedsnavn('Hovedbiblioteket, Auditoriet.')).toBe(
				'Hovedbiblioteket, Auditoriet'
			);
			expect(normaliserStedsnavn('DNT Bergen — Løvåsen.....')).toBe('DNT Bergen — Løvåsen');
		});

		it('slår sammen linjeskift og doble mellomrom', () => {
			expect(normaliserStedsnavn('Rasmus\nMeyer ')).toBe('Rasmus Meyer');
			expect(normaliserStedsnavn('Kvarteret:  Tivoli')).toBe('Kvarteret: Tivoli');
			expect(normaliserStedsnavn('  Permanenten  ')).toBe('Permanenten');
		});
	});

	describe('lar det som er riktig være i fred', () => {
		it('beholder etasjeangivelser i parentes', () => {
			// De sier hvor i bygget man skal, og er en del av navnet.
			expect(normaliserStedsnavn('Kvarteret: Storelogen (3.etg)')).toBe(
				'Kvarteret: Storelogen (3.etg)'
			);
			expect(normaliserStedsnavn('Bergen Camping (1. etasje)')).toBe(
				'Bergen Camping (1. etasje)'
			);
		});

		it('beholder punktumet i en forkortelse', () => {
			// Første utgave gjorde dette til «Bergen kino, m.fl».
			expect(normaliserStedsnavn('Bergen kino, m.fl.')).toBe('Bergen kino, m.fl.');
			expect(normaliserStedsnavn('Grieghallen o.l.')).toBe('Grieghallen o.l.');
		});

		it('rører ikke et navn som allerede er riktig', () => {
			for (const navn of [
				'Grieghallen',
				'Den Nationale Scene',
				'USF Verftet',
				'Kvarteret: Storelogen (3.etg)',
				"Paint'n Sip @ Salong Bar"
			]) {
				expect(normaliserStedsnavn(navn)).toBe(navn);
			}
		});

		it('er idempotent', () => {
			// Kjøres den to ganger, skal andre gang ikke endre noe. Ellers ville
			// den daglige invarianten aldri kunne bli grønn.
			for (const navn of [
				'Loddefjord menighetshus (Vadmyrveien 91).',
				'Rasmus\nMeyer ',
				'Bergen kino, m.fl.',
				'DNT Bergen — Løvåsen.....'
			]) {
				const en = normaliserStedsnavn(navn);
				expect(normaliserStedsnavn(en)).toBe(en);
			}
		});
	});

	describe('tomme verdier', () => {
		it('takler null, undefined og tom streng', () => {
			expect(normaliserStedsnavn(null)).toBe('');
			expect(normaliserStedsnavn(undefined)).toBe('');
			expect(normaliserStedsnavn('   ')).toBe('');
		});
	});
});
