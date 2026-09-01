#!/usr/bin/env node
/**
 * PostToolUse-hook: si fra når sperrelisten eller samtykkeregisteret er endret,
 * og noe som alt ligger i basen bryter de nye reglene.
 *
 * HVORFOR
 *
 * CLAUDE.md har regelen «Endret sperrelisten eller samtykkeregisteret? Kjør
 * scripts/enforce-image-blocks.ts». Den er rådgivende, og rådgivende regler
 * blir glemt. 18. august 2026 viste fire Hulen-konserter bilde selv om `hulen`
 * hadde stått i sperrelisten siden 23. april.
 *
 * Denne hooken kjører sjekken av seg selv. Den kjører TØRT: skriptet fjerner
 * ingenting uten `--skriv`, så hooken kan aldri slette et bilde på egen hånd.
 * Den bare rapporterer, og lar Claude ta det derfra.
 *
 * Exit 2 på PostToolUse viser stderr til Claude uten å stoppe noe, siden
 * verktøyet alt har kjørt. Det er nettopp det vi vil: en beskjed, ikke en
 * sperre.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const UTLOESERE = [
	'scripts/lib/utils.ts', // IMAGE_APPROVED_SOURCES, PROMO_APPROVED_SOURCES, IMAGE_BLOCKED_VENUE_PATTERNS
	'scripts/lib/consent.json',
	'scripts/lib/consent-doc.ts',
	'docs/bildesamtykke.md',
];

function les() {
	try {
		return JSON.parse(readFileSync(0, 'utf8'));
	} catch {
		return null;
	}
}

const inn = les();
const sti = (inn?.tool_input?.file_path ?? '').replace(/\\/g, '/');
if (!sti || !UTLOESERE.some((u) => sti.endsWith(u))) process.exit(0);

let ut = '';
try {
	// execSync med skall, ikke execFileSync: paa Windows er `npx` en .cmd og
	// kan ikke startes direkte. Foerste utgave feilet med ENOENT her.
	ut = execSync('npx tsx scripts/enforce-image-blocks.ts', {
		cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
		encoding: 'utf8',
		timeout: 120_000,
	});
} catch (e) {
	// Kjoeringen feilet, for eksempel uten databasetilgang. Si fra, men ikke
	// paastaa noe om tilstanden.
	console.error(
		`[bildesperre] Kunne ikke kjoere enforce-image-blocks.ts etter endring i ${sti}. ` +
			`Kjoer den for haand. (${String(e?.message ?? e).slice(0, 120)})`
	);
	process.exit(2);
}

const m = ut.match(/(\d+) bryter reglene/);
const antall = m ? Number(m[1]) : null;

if (antall === null) {
	console.error(`[bildesperre] Klarte ikke lese resultatet av enforce-image-blocks.ts. Kjoer den for haand.`);
	process.exit(2);
}

if (antall > 0) {
	console.error(
		`[bildesperre] ${sti} er endret, og ${antall} arrangementer i basen bryter naa bildereglene.\n` +
			`Sperra ved innlegging gjelder bare framover, saa disse blir staaende til noen rydder dem.\n` +
			`Kjoer: cd scripts && npx tsx enforce-image-blocks.ts   (og deretter --skriv naar du har sett lista)`
	);
	process.exit(2);
}

process.exit(0);
