import { describe, it, expect } from 'vitest';

import { sorterBerikelseskoe } from '../berikelseskoe.js';

/**
 * Feilen denne rekkefoelgen retter var stille: jobben behandlet 300 rader hver
 * dag, rapporterte groent, og koeen stod paa stedet hvil fordi de samme
 * feilende radene laa foerst hver gang.
 *
 * Testene under fester den egenskapen som faktisk hindrer det — at en rad som
 * er forsoekt havner bak en rad som ikke er det — og ikke bare at funksjonen
 * sorterer noe.
 */
describe('sorterBerikelseskoe', () => {
	const rad = (id: string, tried: string | null) => ({ id, description_tried_at: tried });

	it('setter aldri forsoekte foerst', () => {
		const koe = sorterBerikelseskoe([
			rad('forsoekt', '2026-08-30T07:00:00Z'),
			rad('ny', null),
		]);

		expect(koe.map(r => r.id)).toEqual(['ny', 'forsoekt']);
	});

	it('setter eldste forsoek foerst blant de forsoekte', () => {
		const koe = sorterBerikelseskoe([
			rad('i_gaar', '2026-08-30T07:00:00Z'),
			rad('i_fjor', '2025-08-30T07:00:00Z'),
			rad('i_dag', '2026-08-31T07:00:00Z'),
		]);

		expect(koe.map(r => r.id)).toEqual(['i_fjor', 'i_gaar', 'i_dag']);
	});

	it('lar en rad som feilet slippe til igjen naar de uproevde er tatt', () => {
		// Ingen hard sperre: en arrangoer kan legge ut omtalen senere. Raden
		// skal nedprioriteres, ikke utelukkes.
		const koe = sorterBerikelseskoe([
			rad('feilet_fem_ganger', '2026-08-25T07:00:00Z'),
			rad('ny', null),
		]);

		expect(koe.map(r => r.id)).toContain('feilet_fem_ganger');
		expect(koe[1].id).toBe('feilet_fem_ganger');
	});

	it('den forsoekte blir ikke med i de foerste plassene naar koeen kuttes', () => {
		// Selve feilen, i miniatyr: med kutt paa 2 skal de to uproevde tas, og
		// den som alt har feilet skal vente.
		const koe = sorterBerikelseskoe([
			rad('feilet', '2026-08-30T07:00:00Z'),
			rad('ny_a', null),
			rad('ny_b', null),
		]).slice(0, 2);

		expect(koe.map(r => r.id).sort()).toEqual(['ny_a', 'ny_b']);
	});

	it('endrer ikke lista som ble sendt inn', () => {
		// Kallstedet teller aldriForsoekt paa den samme lista.
		const original = [rad('forsoekt', '2026-08-30T07:00:00Z'), rad('ny', null)];
		sorterBerikelseskoe(original);

		expect(original.map(r => r.id)).toEqual(['forsoekt', 'ny']);
	});

	it('takler tom liste og bare uproevde', () => {
		expect(sorterBerikelseskoe([])).toEqual([]);
		expect(sorterBerikelseskoe([rad('a', null), rad('b', null)]).map(r => r.id))
			.toEqual(['a', 'b']);
	});
});
