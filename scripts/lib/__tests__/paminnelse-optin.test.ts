import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Dobbel opt-in på arrangementspåminnelser hviler på tre ting, i tre filer.
 * Ryker én av dem, er sperra borte, og ingenting blir rødt:
 *
 *   1. `/api/remind` skriver raden med `confirmed_at: null`.
 *   2. `/api/remind/confirm` er det eneste stedet `confirmed_at` settes.
 *   3. `send-reminders.ts` sender bare rader der `confirmed_at` er satt.
 *
 * Punkt 3 er den som betyr noe. En sperre ved påmelding som ikke håndheves
 * ved utsending er ingen sperre, og feilen ville vært usynlig: e-postene ville
 * gått ut akkurat som før.
 *
 * Testen leser kildekoden i stedet for å kjøre den, fordi alle tre rører
 * databasen og e-post. Den fanger at noen fjerner filteret, som er den
 * realistiske måten dette ryker på.
 */

const rot = path.resolve(__dirname, '../../..');
const les = (p: string) => fs.readFileSync(path.join(rot, p), 'utf8');

describe('dobbel opt-in paa paaminnelser', () => {
	it('utsendingen filtrerer bort ubekreftede rader', () => {
		const s = les('scripts/send-reminders.ts');
		expect(
			/\.not\(\s*['"]confirmed_at['"]\s*,\s*['"]is['"]\s*,\s*null\s*\)/.test(s),
			'send-reminders.ts maa filtrere paa confirmed_at. Uten det sendes ubekreftede paameldinger, ' +
				'og hele dobbel opt-in er uten virkning.'
		).toBe(true);
	});

	it('paameldingen skriver raden som ubekreftet', () => {
		const s = les('src/routes/api/remind/+server.ts');
		expect(/confirmed_at:\s*null/.test(s)).toBe(true);
	});

	it('paameldingen setter ikke confirmed_at til en tid', () => {
		// Den realistiske feilen: noen «forenkler» ved aa sette tidsstempelet
		// med én gang, og da er bekreftelsen bare pynt.
		const s = les('src/routes/api/remind/+server.ts');
		expect(/confirmed_at:\s*new Date\(\)/.test(s)).toBe(false);
	});

	it('bekreftelsen krever et token', () => {
		const s = les('src/routes/api/remind/confirm/+server.ts');
		expect(/searchParams\.get\(\s*['"]token['"]\s*\)/.test(s)).toBe(true);
		expect(/\.eq\(\s*['"]confirm_token['"]/.test(s)).toBe(true);
	});

	it('bekreftelseslenka virker bare én gang', () => {
		// Tokenet nulles, og oppdateringen krever at raden er ubekreftet fra foer.
		const s = les('src/routes/api/remind/confirm/+server.ts');
		expect(/confirm_token:\s*null/.test(s)).toBe(true);
		expect(/\.is\(\s*['"]confirmed_at['"]\s*,\s*null\s*\)/.test(s)).toBe(true);
	});

	it('tokenet er tilfeldig, ikke utledet av adressen', () => {
		const s = les('src/routes/api/remind/+server.ts');
		expect(/randomBytes\(\s*(\d+)\s*\)/.test(s)).toBe(true);
		const m = s.match(/randomBytes\(\s*(\d+)\s*\)/);
		expect(Number(m![1])).toBeGreaterThanOrEqual(16);
	});

	it('migrasjonen finnes og legger til begge kolonnene', () => {
		const f = 'supabase/migrations/20260901140000_reminder_double_optin.sql';
		const s = les(f);
		expect(s).toContain('confirm_token');
		expect(s).toContain('confirmed_at');
	});
});
