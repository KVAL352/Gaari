import { describe, it, expect } from 'vitest';
import { startTidFraH3 } from '../litthusbergen.js';

/**
 * Litteraturhuset legger dag, dato, maaned og klokkeslett i hvert sitt
 * h3-element. Cheerios `.text()` limer dem sammen uten skilletegn:
 *
 *     "Tirs.08.0918:30–21:00Petrichor skrivegruppe"
 *
 * Uttrykket som hentet ut tiden krevde et ikke-siffer foran timetallet. Men
 * maanedstallet limer seg rett foran starten, saa starten ble hoppet over og
 * SLUTT-tiden — som staar rett etter tankestreken — ble lest som starttid.
 *
 * Alle 25 arrangementene paa programsiden var rammet 2. september 2026, og
 * 97 rader i basen maatte rettes. Nettsida ba folk moete opp naar
 * arrangementet var slutt.
 *
 * Testen importerer scraperens egen funksjon, ikke en kopi av regelen. En
 * test som gjentar logikken kan vaere groenn mens scraperen tar feil.
 */
describe('Litteraturhuset: starttid leses fra h3, ikke sluttid', () => {
	it('tar starten, ikke slutten, naar maaneden limer seg inntil', () => {
		expect(startTidFraH3('Tirs.08.0918:30–21:00Petrichor skrivegruppe')).toBe('18:30');
	});

	it('«Oster og sidere» starter 19:00, ikke 22:00', () => {
		// Raden som sto tre timer for sent i basen 2. september 2026.
		expect(startTidFraH3('Fre.04.0919:00–22:00Oster og sidere fra Hordaland')).toBe('19:00');
	});

	it('takler timetall uten ledende null', () => {
		// «8:30» ga ingen treff foer, og raden falt til standardverdien 19:00.
		// Et frukostmoete ble dermed liggende som et kveldsarrangement.
		expect(startTidFraH3('Ons.24.068:30–10:00Veier til aktivt medborgerskap')).toBe('08:30');
	});

	it('takler tosifret dato og maaned i alle kombinasjoner', () => {
		expect(startTidFraH3('Lør.12.0911:00–14:00Lillelørdag litteraturkafé')).toBe('11:00');
		expect(startTidFraH3('Man.01.0617:00–18:00Litterært djupdykk')).toBe('17:00');
		expect(startTidFraH3('Tors.10.0920:00–22:00The Biggest Problem')).toBe('20:00');
	});

	it('faller til 19:00 naar teksten ikke har noe klokkeslett', () => {
		expect(startTidFraH3('Man.01.06Uten klokkeslett')).toBe('19:00');
	});

	it('den gamle regelen ville gitt sluttiden', () => {
		// Dokumenterer feilen, saa ingen gjeninnfoerer «ikke-siffer foran».
		const gammel = (h3: string) => {
			const m = h3.match(/(?:^|[^\d])([01]\d|2[0-3]):([0-5]\d)/);
			return m ? `${m[1]}:${m[2]}` : '19:00';
		};
		expect(gammel('Tirs.08.0918:30–21:00Petrichor skrivegruppe')).toBe('21:00');
		expect(startTidFraH3('Tirs.08.0918:30–21:00Petrichor skrivegruppe')).toBe('18:30');
	});
});
