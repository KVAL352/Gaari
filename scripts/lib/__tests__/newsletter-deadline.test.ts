import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { harTidTilNesteGruppe, SEND_DEADLINE_MS } from '../../send-newsletter.js';

/**
 * Fem av seks utsendinger fra 10. september til 15. oktober 2026 ble drept av
 * `timeout-minutes` midt i løkka. GitHub merket dem «cancelled», ingen fikk
 * varsel, og de siste gruppene fikk ingenting. Skriptets egen frist skal slå
 * inn før GitHubs, med margin til oppsummeringen og bekreftelseskopien.
 */
describe('harTidTilNesteGruppe', () => {
	it('starter neste gruppe før fristen', () => {
		expect(harTidTilNesteGruppe(0, SEND_DEADLINE_MS - 1)).toBe(true);
	});

	it('starter ingen ny gruppe når fristen er nådd', () => {
		expect(harTidTilNesteGruppe(0, SEND_DEADLINE_MS)).toBe(false);
		expect(harTidTilNesteGruppe(0, SEND_DEADLINE_MS + 60_000)).toBe(false);
	});
});

describe('fristen mot workflowens tidsgrense', () => {
	it('slår inn minst 3 minutter før GitHub dreper jobben', () => {
		const yml = readFileSync(
			resolve(import.meta.dirname, '../../../.github/workflows/newsletter.yml'),
			'utf8'
		);
		// Jobbens grense, ikke stegets (npm ci har sin egen på 2 min).
		const jobb = yml.match(/^ {4}timeout-minutes:\s*(\d+)/m);
		expect(jobb, 'fant ikke timeout-minutes på jobbnivå i newsletter.yml').not.toBeNull();
		const grenseMs = Number(jobb![1]) * 60_000;
		expect(grenseMs - SEND_DEADLINE_MS).toBeGreaterThanOrEqual(3 * 60_000);
	});
});
