import { describe, it, expect } from 'vitest';
import { parseDay, parseOvernattingDate, isFilm } from '../akvariet.js';

/**
 * Utsnitt av akvariet.no slik sidene så ut 2026-11-17, etter ombyggingen.
 * Før den sto programmet på /hva-skjer/aktivitetskalender/dag/<dato> med
 * Bootstrap-kort (div.row.mb-3.p-3.border). Den adressen svarer nå 404, og
 * skraperen fant 0 i minst 14 dager uten at noe ble rødt.
 */
const MERKE = `<span class="text-body-small inline-flex items-center gap-1.5 rounded-full bg-brand-dyphavsbla px-3 py-1"><svg aria-hidden="true"></svg> Høydepunkt </span>`;

const KORT = (tid: string, tittel: string, sted: string, lenke: string, hoydepunkt = false) => `
<li role="listitem">
  <details class="group">
    <summary class="flex">
      <span class="font-semibold text-brand-dyphavsbla tabular-nums"> ${tid} </span>
      <span class="min-w-0 space-y-1">
        ${hoydepunkt ? MERKE : ''}
        <span class="text-h5 block font-semibold text-brand-dyphavsbla"> ${tittel} </span>
        <span class="text-body-small block text-blue-800">${sted}</span>
      </span>
    </summary>
    <div class="space-y-5 px-5 pb-5">
      <div class="aspect-4/3"><img src="https://akvariet1.hel1.your-objectstorage.com/assets/program-og-kino/foto-some-8.jpg" alt="" /></div>
      <div class="prose"><p>Lær om fiskene i Rotunden!</p></div>
      <a href="${lenke}" class="btn"> Les mer <svg></svg></a>
    </div>
  </details>
</li>`;

const DAG = `<html><body><ul>
${KORT('15:00 – 15:15', 'Fiskesnakk i Rotunden', 'Hovedplan', '/program/fiskesnakk?date=2026-11-17', true)}
${KORT('11:00 - 11:20', '&quot;Den lille prinsen&quot; (norsk)', 'Kino', '/program/den-lille-prinsen-norsk?date=2026-11-17')}
${KORT('9.30 – 10.00', 'Sjøløvetrening - Begrenset antall plasser', 'Sjøløvebassenget', '/program/sjoloevetrening?date=2026-11-17')}
</ul></body></html>`;

describe('parseDay (nytt program etter ombyggingen)', () => {
	const kort = parseDay(DAG);

	it('finner alle kortene', () => {
		expect(kort.map((k) => k.title)).toEqual([
			'Fiskesnakk i Rotunden',
			'"Den lille prinsen" (norsk)',
			'Sjøløvetrening',
		]);
	});

	it('leser start- og sluttid med tankestrek, bindestrek og punktum', () => {
		expect(kort.map((k) => [k.time, k.endTime])).toEqual([
			['15:00', '15:15'],
			['11:00', '11:20'],
			['09:30', '10:00'],
		]);
	});

	it('leser sted, beskrivelse, bilde og «Les mer»-lenke', () => {
		expect(kort[0]).toMatchObject({
			location: 'Hovedplan',
			description: 'Lær om fiskene i Rotunden!',
			imageUrl: 'https://akvariet1.hel1.your-objectstorage.com/assets/program-og-kino/foto-some-8.jpg',
			detailUrl: 'https://www.akvariet.no/program/fiskesnakk?date=2026-11-17',
		});
	});

	it('kjenner igjen Akvariets «Høydepunkt»-merke, og leser ikke merket som sted', () => {
		expect(kort.map((k) => k.isHighlight)).toEqual([true, false, false]);
		expect(kort.map((k) => k.location)).toEqual(['Hovedplan', 'Kino', 'Sjøløvebassenget']);
	});

	it('gir tom liste for den gamle Bootstrap-strukturen, så skraperen kan si fra', () => {
		const gammel = '<div class="row mb-3 p-3 border"><h3>Pingvin</h3></div>';
		expect(parseDay(gammel)).toEqual([]);
	});
});

describe('isFilm (Ingvild ba 2026-04-20 om at kino aldri vises)', () => {
	it.each([
		['"Den lille prinsen" (norsk)', true],
		['"The Little Prince" (engelsk)', true],
		['"Til Svalbard med seilbåt" (norsk tale, sub: engelsk)', true],
		['Ny film (english)', true],
		['Pingvin', false],
		['Bak på røktergangen', false],
	])('%s → %s', (tittel, forventet) => {
		expect(isFilm(tittel)).toBe(forventet);
	});
});

describe('parseOvernattingDate', () => {
	const side = (setning: string) =>
		`<html><body><script>var x = "Når skjer det? feil";</script><h2>Når skjer det?</h2><p>${setning}</p></body></html>`;

	it('leser datoen når året bare står på sluttdatoen', () => {
		expect(
			parseOvernattingDate(side('Når skjer det? Fredag 29. januar kl. 17:00 til lørdag 30. januar 2027 kl. 07:30.'))
		).toEqual({ startDate: '2027-01-29', startTime: '17:00', endDate: '2027-01-30', endTime: '07:30' });
	});

	it('trekker fra ett år når natta går over nyttår', () => {
		expect(
			parseOvernattingDate(side('Når skjer det? Torsdag 31. desember kl. 18.00 til fredag 1. januar 2027 kl. 8.00'))
		).toEqual({ startDate: '2026-12-31', startTime: '18:00', endDate: '2027-01-01', endTime: '08:00' });
	});

	it('gir null når setningen mangler, i stedet for å gjette en dato', () => {
		expect(parseOvernattingDate(side('Neste overnatting kommer i vår.'))).toBeNull();
	});
});
