import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { KOER, ventedager, harVentetForLenge } from '../ventende.js';

const adminOps = readFileSync(fileURLToPath(new URL('../../admin-ops.ts', import.meta.url)), 'utf-8');

describe('KOER', () => {
	// Feilen dette låser: digesten talte henvendelser med `pending` mens
	// admin-ops og raden selv bruker `new`. Seks henvendelser var usynlige.
	it.each(KOER.map((k) => [k.tabell, k.status]))('%s teller samme status som admin-ops (%s)', (tabell, status) => {
		const moenster = new RegExp(`from\\('${tabell}'\\)[^;]*?\\.eq\\('status', '${status}'\\)`);
		expect(adminOps).toMatch(moenster);
	});
});

describe('ventedager', () => {
	const naa = new Date('2026-10-21T12:00:00Z');

	it('er null når køen er tom', () => {
		expect(ventedager(null, naa)).toBeNull();
		expect(harVentetForLenge(null)).toBe(false);
	});

	it('teller hele døgn', () => {
		expect(ventedager('2026-10-20T13:00:00Z', naa)).toBe(0);
		expect(ventedager('2026-10-19T12:00:00Z', naa)).toBe(2);
	});

	it('løfter alt som ligger i kø, også det som kom i dag', () => {
		expect(harVentetForLenge(0)).toBe(true);
		expect(harVentetForLenge(2)).toBe(true);
		expect(harVentetForLenge(ventedager('2026-04-13T10:29:44Z', naa))).toBe(true);
	});
});
