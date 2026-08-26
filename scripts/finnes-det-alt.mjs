#!/usr/bin/env node
/**
 * Finnes dette fra før?
 *
 * HVORFOR DETTE FINNES
 *
 * 26. august 2026 lagde jeg sju ganger arbeid av noe som allerede fantes:
 *
 *   * «Seks festivalsider selger fjoråret» — bare Bergenfest gjorde det.
 *     Sto som oppgave i arbeidsflyten og som påminnelse med dato.
 *   * «119 DNT-arrangementer blir slettet» — www.dnt.no sto allerede i
 *     SKIP_DOMAINS. Jeg leste sletteregelen, ikke unntakslista.
 *   * «Bing-feilene må undersøkes» — avklart 28. mai og skrevet ned i
 *     minnenotatet bing_crawl_errors_misleading.
 *   * «LCP er 2,6 s» — utdatert påstand i seo-skillen; den er 1,9.
 *   * «Ingen bruker filtrene» — Umami fjerner spørringsparametre, så
 *     målingen var blind. Fasit lå i vår egen database: 2 465 filterbruk.
 *   * `filter-brukt` — ren duplikat av `filter-used`, som hadde spurt
 *     siden før.
 *
 * Fellesnevneren er ikke slurv med koden. Det er at jeg la til før jeg så
 * etter. Og grunnen til at jeg ikke så etter, er at det å se etter krevde
 * fem-seks søk på ulike steder.
 *
 * Dette verktøyet gjør det til ett.
 *
 * Bruk:
 *   node scripts/finnes-det-alt.mjs filter
 *   node scripts/finnes-det-alt.mjs "core web vitals"
 *   node scripts/finnes-det-alt.mjs dnt --alt      # ta med treff i git-loggen
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROT = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const ORD = args.filter(a => !a.startsWith('--')).join(' ');
const MED_GIT = args.includes('--alt');

if (!ORD) {
	console.error('Bruk: node scripts/finnes-det-alt.mjs <søkeord> [--alt]');
	process.exit(1);
}

const MINNE = join(homedir(), '.claude', 'projects', 'c--Users-kjers-Projects-Gaari', 'memory');

function overskrift(t) {
	console.log(`\n── ${t}`);
}

/** rg/grep over en katalog, med et tak så utdata er til å lese. */
function sok(katalog, glob) {
	if (!existsSync(katalog)) return [];
	try {
		const ut = execFileSync(
			'git',
			['grep', '-rin', '--no-index', '-l', ORD, '--', glob ?? '.'],
			{ cwd: katalog, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
		);
		return ut.split('\n').filter(Boolean);
	} catch {
		return [];
	}
}

function skrivTreff(filer, maks = 12) {
	if (filer.length === 0) {
		console.log('   (ingen)');
		return;
	}
	filer.slice(0, maks).forEach(f => console.log('   ' + f));
	if (filer.length > maks) console.log(`   … og ${filer.length - maks} til`);
}

console.log(`Søker etter «${ORD}»`);

overskrift('Kode (src/, scripts/)');
skrivTreff([...sok(join(ROT, 'src')).map(f => 'src/' + f), ...sok(join(ROT, 'scripts')).map(f => 'scripts/' + f)]);

overskrift('Dokumentasjon (docs/, .claude/)');
skrivTreff([...sok(join(ROT, 'docs')).map(f => 'docs/' + f), ...sok(join(ROT, '.claude')).map(f => '.claude/' + f)]);

overskrift('Påminnelser');
try {
	const r = JSON.parse(readFileSync(join(ROT, 'scripts', 'reminders.json'), 'utf-8'));
	const treff = r.filter(x => `${x.title} ${x.description}`.toLowerCase().includes(ORD.toLowerCase()));
	if (treff.length === 0) console.log('   (ingen)');
	else treff.forEach(x => console.log(`   ${x.date}  ${x.title.slice(0, 68)}`));
} catch {
	console.log('   (kunne ikke lese reminders.json)');
}

overskrift('Minnenotater');
if (!existsSync(MINNE)) {
	console.log('   (minnekatalogen finnes ikke her)');
} else {
	const treff = readdirSync(MINNE)
		.filter(f => f.endsWith('.md') && statSync(join(MINNE, f)).isFile())
		.filter(f => readFileSync(join(MINNE, f), 'utf-8').toLowerCase().includes(ORD.toLowerCase()));
	skrivTreff(treff);
}

if (MED_GIT) {
	overskrift('Git-loggen');
	try {
		const ut = execFileSync('git', ['log', '--oneline', '-i', '--grep', ORD, '-15'], {
			cwd: ROT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'],
		});
		console.log(ut.trim() ? ut.trim().split('\n').map(l => '   ' + l).join('\n') : '   (ingen)');
	} catch {
		console.log('   (ingen)');
	}
}

console.log('\nFant du noe her, finnes saken fra før. Les den før du lager en ny.');
