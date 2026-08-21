#!/usr/bin/env node
/**
 * Sammenligner nøkkelnavnene i .env mot dem som lå der sist .env ble sikkerhetskopiert
 * til Proton Pass. Leser aldri verdier — bare navn på venstre side av likhetstegnet.
 *
 * Tilstanden ligger i .env.backup-state, som .gitignore fanger via `.env.*`.
 * Fila er med vilje lokal: den beskriver denne maskinens backup-status, ikke prosjektets.
 *
 *   node .claude/skills/wrap-up/scripts/check-env-backup.mjs            sjekk
 *   node .claude/skills/wrap-up/scripts/check-env-backup.mjs --record   kvitter ut ny backup
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ENV = '.env';
const STATE = '.env.backup-state';

function keysOf(text) {
	return [
		...new Set(
			text
				.split(/\r?\n/)
				.map((line) => line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=/))
				.filter(Boolean)
				.map((m) => m[1])
		)
	].sort();
}

if (!existsSync(ENV)) {
	console.log('SKIPPED: .env finnes ikke her — kjør fra prosjektroten.');
	process.exit(0);
}

const current = keysOf(readFileSync(ENV, 'utf8'));

if (process.argv.includes('--record')) {
	const today = new Date().toISOString().slice(0, 10);
	writeFileSync(
		STATE,
		[
			'# Nøkkelnavnene i .env slik de var ved siste backup til Proton Pass.',
			'# Ingen verdier. Skrives av .claude/skills/wrap-up/scripts/check-env-backup.mjs --record.',
			`# Kjør --record FØRST etter at backupen faktisk er tatt, ikke før.`,
			`backed_up: ${today}`,
			'',
			...current
		].join('\n') + '\n',
		'utf8'
	);
	console.log(`RECORDED: ${current.length} nøkler, backup datert ${today}.`);
	console.log(`Husk at Proton Pass-notatet bør hete "Gåri .env — ${today}".`);
	process.exit(0);
}

if (!existsSync(STATE)) {
	console.log(`ACTION NEEDED: ingen backup registrert, og .env har ${current.length} nøkler.`);
	console.log('Ta backup til Proton Pass, kjør så skriptet med --record.');
	process.exit(0);
}

const stateText = readFileSync(STATE, 'utf8');
const backedUpAt = stateText.match(/^backed_up:\s*(\S+)/m)?.[1] ?? 'ukjent dato';
const recorded = keysOf(
	stateText
		.split(/\r?\n/)
		.filter((l) => !l.startsWith('#') && !l.startsWith('backed_up:'))
		.map((l) => `${l.trim()}=`)
		.join('\n')
);

const added = current.filter((k) => !recorded.includes(k));
const removed = recorded.filter((k) => !current.includes(k));

if (!added.length && !removed.length) {
	console.log(`PASS: ${current.length} nøkler, uendret siden backup ${backedUpAt}.`);
	process.exit(0);
}

console.log(`ACTION NEEDED: .env har endret seg siden backup ${backedUpAt}.`);
if (added.length) console.log(`  Nye, ikke i backup: ${added.join(', ')}`);
if (removed.length) console.log(`  Fjernet fra .env, fortsatt i backup: ${removed.join(', ')}`);
console.log('Ta ny backup til Proton Pass, kjør så skriptet med --record.');
