import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * GitHub Actions feiler stille på feil variabelnavn.
 *
 * send-reminders.yml eksporterte SUPABASE_URL i stedet for
 * PUBLIC_SUPABASE_URL. Hemmeligheten var riktig, bare navnet var feil, og
 * lib/supabase.ts kaller process.exit(1) ved import når navnet mangler. Fra
 * 21. til 24. august 2026 gikk ingen påminnelser ut. Jobben var rød hver dag,
 * men en rød cron-jobb ingen ser på er det samme som ingen jobb.
 *
 * Testen leser YAML-filene som tekst i stedet for å parse dem. Den skal fange
 * ett bestemt navn, og et regulært uttrykk gjør det uten en YAML-avhengighet.
 */
const WORKFLOWS = path.join(import.meta.dirname, '..', '..', '..', '.github', 'workflows');

function yamlFiler(): string[] {
	return fs
		.readdirSync(WORKFLOWS)
		.filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
		.map((f) => path.join(WORKFLOWS, f));
}

describe('workflow-env', () => {
	it('finner workflow-filer å sjekke', () => {
		expect(yamlFiler().length).toBeGreaterThan(0);
	});

	it('ingen workflow setter SUPABASE_URL i stedet for PUBLIC_SUPABASE_URL', () => {
		// Nøkkelen står som «  SUPABASE_URL: ...» i env-blokken. Ordgrensen
		// hindrer treff på PUBLIC_SUPABASE_URL og SUPABASE_URL_SOMETHING.
		const feil = yamlFiler().filter((sti) =>
			/^\s*SUPABASE_URL\s*:/m.test(fs.readFileSync(sti, 'utf-8'))
		);

		expect(
			feil.map((f) => path.basename(f)),
			'scripts/lib/supabase.ts leser PUBLIC_SUPABASE_URL og avslutter prosessen uten den'
		).toEqual([]);
	});
});
