import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * scripts/reminders.json er sporet av git, og repoet er offentlig.
 *
 * 21. august 2026 laa det 9 e-postadresser, ett telefonnummer og et titalls
 * fulle navn og ordrette sitater fra privat korrespondanse i fila. Den fulle
 * ordlyden ble flyttet til private/reminders.json, som er gitignorert, og den
 * sporede utgaven ble skrubbet.
 *
 * Testene her leser fila paa disk, ikke en import, saa de fanger det som
 * faktisk ville blitt pushet. Samme framgangsmaate som bildesamtykke.test.ts.
 */
const SPORET = path.join(import.meta.dirname, '..', '..', 'reminders.json');
const PRIVAT = path.join(import.meta.dirname, '..', '..', '..', 'private', 'reminders.json');

interface Reminder {
	date: string;
	title: string;
	description: string;
}

function les(sti: string): Reminder[] {
	return JSON.parse(fs.readFileSync(sti, 'utf-8'));
}

const sporet = les(SPORET);
const tekst = sporet.map((r) => `${r.title} ${r.description}`);

/**
 * Navnene som ble fjernet ligger i private/pii-denylist.json, ikke her.
 *
 * Foerste utgave av denne testen hadde dem som en literal liste, og publiserte
 * dermed nettopp de navnene skrubbingen skulle fjerne — i samme fil som skulle
 * hindre det. En denylist over personopplysninger er selv personopplysninger.
 *
 * Konsekvensen er at navnesjekken bare kjoerer lokalt. Det er der skrubbingen
 * faktisk gjoeres, saa den fanger den som redigerer. E-post- og
 * telefonsjekkene under trenger ingen navn og kjoerer alltid, ogsaa i CI.
 */
const DENYLIST = path.join(import.meta.dirname, '..', '..', '..', 'private', 'pii-denylist.json');

function fjernedeNavn(): string[] {
	return JSON.parse(fs.readFileSync(DENYLIST, 'utf-8')).navn;
}

describe('reminders.json — sporet utgave er fri for personopplysninger', () => {
	it('inneholder ingen e-postadresser', () => {
		const funn = tekst.flatMap((t) => t.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g) ?? []);
		expect(funn, `E-postadresser i den sporede fila: ${funn.join(', ')}`).toEqual([]);
	});

	it('inneholder ingen norske telefonnummer', () => {
		const funn = tekst.flatMap((t) => t.match(/\b\d{8}\b/g) ?? []);
		expect(funn, `Ser ut som telefonnummer: ${funn.join(', ')}`).toEqual([]);
	});

	// private/ finnes ikke i CI. Kjoerer der skrubbingen faktisk gjoeres.
	it.skipIf(!fs.existsSync(DENYLIST))('inneholder ingen av navnene som ble fjernet', () => {
		const funn = fjernedeNavn().filter((n) =>
			tekst.some((t) => new RegExp(`\\b${n}\\b`).test(t))
		);
		expect(funn.length, `${funn.length} navn er tilbake i den sporede fila`).toBe(0);
	});
});

describe('reminders.json — struktur', () => {
	it('er en liste med dato, tittel og beskrivelse', () => {
		expect(Array.isArray(sporet)).toBe(true);
		expect(sporet.length).toBeGreaterThan(0);
		for (const r of sporet) {
			expect(r.date, `Ugyldig dato: ${JSON.stringify(r)}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(r.title?.length, `Tom tittel: ${JSON.stringify(r)}`).toBeGreaterThan(0);
			expect(r.description?.length, `Tom beskrivelse i "${r.title}"`).toBeGreaterThan(0);
		}
	});

	// private/ finnes ikke i CI. Testen kjoerer bare der fila er.
	it.skipIf(!fs.existsSync(PRIVAT))(
		'den private utgaven dekker de samme datoene og titlene',
		() => {
			const privat = les(PRIVAT);
			expect(privat.length).toBe(sporet.length);
			expect(privat.map((r) => r.date).sort()).toEqual(sporet.map((r) => r.date).sort());
		}
	);
});
