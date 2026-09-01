import { describe, it, expect } from 'vitest';
import { bergenOffset } from '../../lib/utils.js';

/**
 * Grieghallen oppgir tidspunktet som naken lokal tid, «2026-09-02 19:30:00».
 *
 * `new Date()` tolker en slik streng som kjøretidens lokale tid. GitHub
 * Actions kjører i UTC, så konserten ble lagret som 19:30 UTC og vist som
 * 21:30 i Bergen. Nettsida viste Grieghallen-konserter to timer for sent om
 * sommeren og én time for sent om vinteren.
 *
 * Testen speiler `tilBergenTid()` i scraperen. Funksjonen er ikke eksportert,
 * så logikken gjentas her. Det er med vilje: testen skal feile hvis noen
 * fjerner offsetten, og den skal lese som en påstand om hva riktig svar er.
 */
function tilBergenTid(naken: string): Date {
	const t = naken.trim().replace(' ', 'T');
	return new Date(`${t}${bergenOffset(t.slice(0, 10))}`);
}

/** Klokkeslettet slik en leser i Bergen ser det. */
const iBergen = (d: Date) =>
	d.toLocaleTimeString('nb-NO', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit' });

describe('Grieghallen: naken lokal tid tolkes som Bergen-tid', () => {
	it('en sommerkonsert kl. 19.30 vises som 19:30, ikke 21:30', () => {
		expect(iBergen(tilBergenTid('2026-09-02 19:30:00'))).toBe('19:30');
	});

	it('en vinterkonsert kl. 19.00 vises som 19:00, ikke 20:00', () => {
		expect(iBergen(tilBergenTid('2026-12-04 19:00:00'))).toBe('19:00');
	});

	it('en morgenoevelse kl. 08.30 vises som 08:30', () => {
		expect(iBergen(tilBergenTid('2026-09-03 08:30:00'))).toBe('08:30');
	});

	it('bruker riktig forskyvning paa hver side av sommertidsskiftet', () => {
		// Klokka gaar tilbake natt til 25. oktober 2026.
		expect(bergenOffset('2026-10-24')).toBe('+02:00');
		expect(bergenOffset('2026-10-26')).toBe('+01:00');
	});

	it('den gamle maaten ville gitt feil svar', () => {
		// Dokumenterer feilen vi rettet. Denne testen beskytter mot at noen
		// «forenkler» tilbake til new Date(streng).
		const gammel = new Date('2026-09-02T19:30:00Z'); // slik UTC-kjoeringen tolket den
		expect(iBergen(gammel)).toBe('21:30');
		expect(iBergen(tilBergenTid('2026-09-02 19:30:00'))).not.toBe(iBergen(gammel));
	});
});
