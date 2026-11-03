import { describe, it, expect } from 'vitest';
import { vurderNyhetsbrevKjoring, type WorkflowRun } from '../newsletter-run-status.js';

const fredag = new Date('2026-10-16T08:00:00Z');

function run(overstyr: Partial<WorkflowRun> = {}): WorkflowRun {
	return {
		status: 'completed',
		conclusion: 'success',
		created_at: '2026-10-15T14:31:51Z',
		html_url: 'https://github.com/KVAL352/Gaari/actions/runs/1',
		...overstyr
	};
}

describe('vurderNyhetsbrevKjoring', () => {
	it('er grønn når torsdagens kjøring lyktes', () => {
		expect(vurderNyhetsbrevKjoring(run(), fredag).ok).toBe(true);
	});

	// Dette er tilfellet som gikk ubemerket i seks uker.
	it('er rød når kjøringen ble avbrutt', () => {
		const s = vurderNyhetsbrevKjoring(run({ conclusion: 'cancelled' }), fredag);
		expect(s.ok).toBe(false);
		expect(s.melding).toContain('avbrutt');
	});

	it('er rød når skriptet meldte at noen ikke ble nådd', () => {
		expect(vurderNyhetsbrevKjoring(run({ conclusion: 'failure' }), fredag).ok).toBe(false);
	});

	it('er rød når cronen ikke har kjørt på over en uke', () => {
		const s = vurderNyhetsbrevKjoring(run({ created_at: '2026-10-01T14:00:00Z' }), fredag);
		expect(s.ok).toBe(false);
		expect(s.melding).toContain('ikke kjørt');
	});

	it('er rød når det ikke finnes noen kjøring', () => {
		expect(vurderNyhetsbrevKjoring(null, fredag).ok).toBe(false);
	});

	it('slår ikke alarm mens utsendingen pågår', () => {
		const s = vurderNyhetsbrevKjoring(run({ status: 'in_progress', conclusion: null }), fredag);
		expect(s.ok).toBe(true);
	});
});
