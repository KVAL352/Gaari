import { describe, it, expect } from 'vitest';
import { erUtstilling } from '../utstilling';

describe('erUtstilling', () => {
	it('tar med sammensatte ord på -utstilling', () => {
		expect(erUtstilling({ category: 'culture', title_no: 'Samlingsutstilling', venue_name: 'Oseana' })).toBe(true);
	});
	it('tåler linjeskift og ekstra mellomrom i venue_name', () => {
		expect(erUtstilling({ category: 'culture', title_no: 'Art Nouveau fra Paris', venue_name: 'Rasmus\nMeyer ' })).toBe(true);
	});
	it('tar ikke med steder som ikke er utstillingssteder', () => {
		expect(erUtstilling({ category: 'culture', title_no: 'Omvisning', venue_name: 'Et annet sted' })).toBe(false);
	});
	it('stanser fortsatt kor og andre aktiviteter', () => {
		expect(erUtstilling({ category: 'culture', title_no: 'Kode-koret', venue_name: 'KODE' })).toBe(false);
	});
	it('krever kategorien culture', () => {
		expect(erUtstilling({ category: 'music', title_no: 'Samlingsutstilling', venue_name: 'Oseana' })).toBe(false);
	});
});
