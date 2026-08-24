import { describe, it, expect } from 'vitest';
import { buildSourceUrl } from '../kode.js';

/**
 * Seksjonene KODE faktisk bruker, hentet fra deres egne eventType-dokumenter i
 * Sanity og kryssjekket mot sitemap.xml 2026-08-24. Poenget med tabellen er at
 * ingen av dem lar seg gjette fra tittelen: «Kurs og verksted» blir /verksted/,
 * «Familieaktiviteter» blir /familie/ og «Arrangement» staar i entall.
 */
const KODE_SEKSJONER: Array<[tittel: string, slug: string]> = [
	['Utstillinger', 'utstillinger'],
	['Konserter', 'konserter'],
	['Omvisning', 'omvisning'],
	['Samtale og foredrag', 'samtale-og-foredrag'],
	['Kurs og verksted', 'verksted'],
	['Familieaktiviteter', 'familie'],
	['Arrangement', 'arrangement'],
	['Kunstsatellitten', 'kunstsatellitten']
];

describe('KODE source_url', () => {
	it('bruker seksjonsslugen fra Sanity, ikke en gjetning fra typenavnet', () => {
		for (const [, slug] of KODE_SEKSJONER) {
			expect(buildSourceUrl('kode-koret', slug)).toBe(
				`https://www.kodebergen.no/hva-skjer/${slug}/kode-koret`
			);
		}
	});

	it('bygger aldri /arrangementer/, seksjonen som ga 404', () => {
		for (const [, slug] of KODE_SEKSJONER) {
			expect(buildSourceUrl('noe', slug)).not.toContain('/arrangementer/');
		}
	});

	it('gir Kode-koret omvisning-stien, ikke arrangementer-stien', () => {
		// Kode-koret ligger som «Omvisning» i KODEs CMS. Vi sendte den til
		// /arrangementer/kode-koret, som svarte 404.
		expect(buildSourceUrl('kode-koret', 'omvisning')).toBe(
			'https://www.kodebergen.no/hva-skjer/omvisning/kode-koret'
		);
	});

	it('gir ingen lenke naar seksjonen mangler, framfor aa gjette', () => {
		expect(buildSourceUrl('kode-koret', null)).toBeNull();
		expect(buildSourceUrl('kode-koret', '  ')).toBeNull();
		expect(buildSourceUrl('', 'omvisning')).toBeNull();
	});

	it('koder mellomrom i slugene fra KODEs eget CMS', () => {
		expect(buildSourceUrl(' kode koret ', 'omvisning')).toBe(
			'https://www.kodebergen.no/hva-skjer/omvisning/kode%20koret'
		);
	});
});
