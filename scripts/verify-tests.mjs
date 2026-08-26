#!/usr/bin/env node
/**
 * Kjør testene og si ETT utvetydig ord om hvordan det gikk.
 *
 * HVORFOR DETTE FINNES
 *
 * 26. august 2026 pushet jeg to ganger på et testresultat jeg ikke hadde.
 * `npx vitest run | tail -3` klippet bort oppsummeringslinja, jeg så ikke
 * ordet «failed», og leste fraværet av dårlige nyheter som gode nyheter.
 *
 * Samme feilklasse gikk igjen hele den dagen: Umami meldte «US 100 %» og
 * ingen sjekket, en test inneholdt backspace-tegn i stedet for ordgrenser og
 * kunne aldri feile, og en kommentar påsto botblokkering der det var en
 * serverfeil. Alt sammen påstander ingen prøvde mot virkeligheten.
 *
 * Verre enn en rød test er en test som ikke kjørte. Kjøres vitest fra feil
 * katalog finner den ingen testfiler, og «ingenting å gjøre» ser ut som
 * suksess.
 *
 * Derfor: null tester er en FEIL her, ikke en stille suksess. Og verdikten
 * står på siste linje, så den overlever `tail`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = dirname(dirname(fileURLToPath(import.meta.url)));

// Kjør alltid fra repoets rot. Det var katalogdriften som startet det hele.
if (!existsSync(join(rot, 'vitest.config.ts')) && !existsSync(join(rot, 'vite.config.ts'))) {
	console.error('VERDIKT: FEIL — fant ingen vitest-konfigurasjon i ' + rot);
	process.exit(1);
}

// Kall vitest sitt eget inngangspunkt med samme node som kjører dette.
//
// Ikke `npx`, og ikke `shell: true`. Med shell settes argumentene sammen
// uten escaping (Node advarer om det), og uten shell finnes ikke `npx.cmd`
// naar skriptet kalles fra en git-hook i Git Bash. Begge veier feiler paa
// Windows, og en hook som feiler av feil grunn er verre enn ingen hook.
const vitestBin = join(rot, 'node_modules', 'vitest', 'vitest.mjs');
if (!existsSync(vitestBin)) {
	console.error('VERDIKT: FEIL — fant ikke vitest. Kjoer `npm ci` i repoets rot.');
	process.exit(1);
}

const res = spawnSync(process.execPath, [vitestBin, 'run', '--reporter=json', '--outputFile=.vitest-result.json'], {
	cwd: rot,
	stdio: ['ignore', 'pipe', 'pipe'],
	encoding: 'utf-8',
});

let rapport;
try {
	const { readFileSync, unlinkSync } = await import('node:fs');
	rapport = JSON.parse(readFileSync(join(rot, '.vitest-result.json'), 'utf-8'));
	unlinkSync(join(rot, '.vitest-result.json'));
} catch {
	console.error((res.stderr || res.stdout || '').slice(-2000));
	console.error('VERDIKT: FEIL — testene ga ingen rapport i det hele tatt');
	process.exit(1);
}

const totalt = rapport.numTotalTests ?? 0;
const feilet = rapport.numFailedTests ?? 0;
const bestått = rapport.numPassedTests ?? 0;

if (totalt === 0) {
	// Dette er hele poenget med skriptet.
	console.error('VERDIKT: FEIL — null tester kjørte. Det er ikke det samme som at alt er grønt.');
	process.exit(1);
}

if (feilet > 0 || res.status !== 0) {
	for (const fil of rapport.testResults ?? []) {
		for (const t of fil.assertionResults ?? []) {
			if (t.status === 'failed') console.error(`  FEILET  ${t.fullName}`);
		}
	}
	console.error(`VERDIKT: FEIL — ${feilet} av ${totalt} tester feilet`);
	process.exit(1);
}

console.log(`VERDIKT: OK — ${bestått} tester bestått`);
