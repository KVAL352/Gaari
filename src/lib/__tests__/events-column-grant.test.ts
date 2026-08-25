import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * `select('*')` mot `events` er en stille feil, ikke en synlig.
 *
 * Migrasjonen 20260821150000_rls_lock_personal_data.sql ga anon SELECT paa 29
 * navngitte kolonner. `submitter_email` er ikke blant dem, og Postgres avviser
 * hele spoerringen med 42501 naar en kolonne mangler i grantet. Den feiler
 * altsaa ikke delvis, den feiler helt.
 *
 * To steder gjorde det fra 21. august uten at noe varslet:
 *
 *   /api/health/deep meldte «unhealthy» paa alle aatte sjekkene mens siden gikk
 *   fint, saa overvaakningen var den eneste syke. UptimeRobot poller bare
 *   /api/health, saa to roede cron-jobber fikk staa i tre og fire dager.
 *
 *   /llms.txt svarte «check gaari.no for current count» til hver AI-crawler i
 *   stedet for antall arrangementer.
 *
 * Testen leser kildefilene fra disk, som reminders.test.ts og
 * bildesamtykke.test.ts, saa den fanger det som faktisk ville blitt pushet.
 * Bruk navngitte kolonner, eller PUBLIC_EVENT_COLUMNS fra
 * src/lib/server/event-columns.ts.
 */
const SRC = path.join(import.meta.dirname, '..', '..');

function kildefiler(katalog: string): string[] {
	const funn: string[] = [];
	for (const oppfoering of fs.readdirSync(katalog, { withFileTypes: true })) {
		const full = path.join(katalog, oppfoering.name);
		if (oppfoering.isDirectory()) {
			if (oppfoering.name === '__tests__' || oppfoering.name === 'node_modules') continue;
			funn.push(...kildefiler(full));
		} else if (/\.(ts|svelte)$/.test(oppfoering.name)) {
			funn.push(full);
		}
	}
	return funn;
}

describe('events: ingen wildcard-select mot kolonnegrantet', () => {
	it('finner kildefiler aa sjekke', () => {
		expect(kildefiler(SRC).length).toBeGreaterThan(50);
	});

	it("anon-klienten gjoer ingen .from('events').select('*')", () => {
		// \bsupabase\b treffer ikke inni supabaseAdmin, siden det ikke er noen
		// ordgrense mellom «supabase» og «Admin». Det er nettopp skillet testen
		// handler om: service role gaar utenom grantet, saa '*' er helt i orden
		// der. Kjedene er formatert over flere linjer, saa moensteret maa spenne
		// dem, og [^;]* stopper ved setningsslutt slik at en select('*') mot en
		// annen tabell lenger nede i fila ikke gir falskt treff.
		const moenster = /\bsupabase\b\s*\.from\(\s*['"]events['"]\s*\)[^;]*?\.select\(\s*['"]\*['"]/s;

		const brudd = kildefiler(SRC)
			.filter((sti) => moenster.test(fs.readFileSync(sti, 'utf-8')))
			.map((sti) => path.relative(SRC, sti));

		expect(
			brudd,
			"anon har SELECT paa 29 navngitte kolonner i events; '*' gir 42501 og feiler hele spoerringen"
		).toEqual([]);
	});
});
