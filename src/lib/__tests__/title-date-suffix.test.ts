import { describe, it, expect } from 'vitest';
import { hasDateSuffix, stripDateSuffix } from '#lib/title-date-suffix';

// Arrangementssiden tar datotillegget av i <title>, fordi sidemalen har sin
// egen dato med årstall. Før 18. nov 2026 sto datoen to ganger:
// «Manneklubben — onsdag 18. november — 18. nov. 2026 — …».
describe('datotillegget på gjentakende titler', () => {
	it('tar av norsk og engelsk tillegg', () => {
		expect(stripDateSuffix('Manneklubben — onsdag 18. november')).toBe('Manneklubben');
		expect(stripDateSuffix('Language Café — Wednesday 18 November')).toBe('Language Café');
		expect(stripDateSuffix('Julemarked på Storetveit — lørdag 28. november')).toBe('Julemarked på Storetveit');
	});

	it('beholder tankestrek som er en del av selve tittelen', () => {
		expect(stripDateSuffix('Jazz — live — fredag 20. november')).toBe('Jazz — live');
		expect(stripDateSuffix('Bergen — byen mellom fjellene')).toBe('Bergen — byen mellom fjellene');
	});

	it('rører ikke titler uten tillegg', () => {
		for (const t of ['1349 - Det kom et skip', 'Stille leseklubb – November', 'Søndagsjazz', 'Lørdagskafé']) {
			expect(hasDateSuffix(t)).toBe(false);
			expect(stripDateSuffix(t)).toBe(t);
		}
	});
});
