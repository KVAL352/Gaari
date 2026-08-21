#!/usr/bin/env node
/**
 * Portvakt for ytelse: kjører Lighthouse mot et produksjonsbygg og bryter
 * bygget hvis en side ligger over noe i lighthouse-budget.json.
 *
 * Hvorfor en egen kjører og ikke bare `lighthouse --budget-path`:
 *
 *  1. Lighthouse rapporterer budsjettbrudd som en revisjon inne i rapporten,
 *     men avslutter med kode 0 uansett. Et budsjett som ikke stopper noe er
 *     en notis, ikke et krav.
 *  2. Én måling i CI svinger for mye til å være portvakt. Samme side kan gi et
 *     halvt sekunds forskjell i LCP mellom to kjøringer på samme maskin.
 *     Derfor kjøres hver side flere ganger og medianen per måltall brukes.
 *     Median, ikke snitt: én treg kjøring skal ikke kunne dra et grønt
 *     resultat over grensen, og heller ikke omvendt.
 *
 * lighthouse-budget.json er fasit. Verdiene leses derfra, de gjentas ikke her.
 *
 * Bruk:
 *   node scripts/lighthouse-budget-check.mjs --base http://localhost:4173
 *   node scripts/lighthouse-budget-check.mjs --runs 5 --no-fail   (bare måling)
 *
 * Avslutningskoder: 0 = innenfor, 1 = budsjettbrudd, 2 = kjøringen feilet.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Sidene som måles. Én av hver sidetype, fordi de er bygget ulikt: forsiden
 * laster flest kort og flest bilder, samlesiden er samme mal med et filter,
 * arrangementssiden er den eneste med ett stort bilde og strukturerte data,
 * og skjemaet er den eneste som laster skjemalogikk.
 *
 * Slugen aurora-grieghallen finnes i seed-dataene (src/lib/data/seed-events.ts),
 * som er det rutene faller tilbake på når Supabase-URL-en ikke svarer. Det er
 * med vilje: mot ekte data ville siden sluttet å svare så snart arrangementet
 * var over, og målingen ville vært avhengig av hva som tilfeldigvis lå i basen
 * den dagen. Samme begrunnelse som i playwright.config.ts.
 */
const SIDER = [
	{ navn: 'forside', sti: '/no' },
	{ navn: 'samleside', sti: '/no/denne-helgen' },
	{ navn: 'arrangementsside', sti: '/no/events/aurora-grieghallen' },
	{ navn: 'innsendingsskjema', sti: '/no/submit' },
	{ navn: 'forside (EN)', sti: '/en' }
];

const TIMING_NAVN = {
	'first-contentful-paint': 'FCP',
	'largest-contentful-paint': 'LCP',
	'total-blocking-time': 'TBT',
	'cumulative-layout-shift': 'CLS',
	'speed-index': 'SI'
};

// Typene Lighthouse deler forbruket inn i. Brukes til å rapportere det som
// ikke har en grense, slik at bildevekten er synlig uten å være portvakt.
const ALLE_RESSURSTYPER = [
	'total',
	'image',
	'script',
	'font',
	'document',
	'stylesheet',
	'media',
	'third-party',
	'other'
];

// Under denne marginen er resultatet grønt, men ikke trygt: det ligger innenfor
// støyen mellom to kjøringer, og vil før eller siden slå ut tilfeldig.
const NAER_GRENSEN = 0.1;

// Låst versjon. En ny Lighthouse-versjon kan flytte tallene uten at siden er
// endret, og da måler portvakten noe annet enn den gjorde i går.
const LIGHTHOUSE_VERSJON = 'lighthouse@13.4.1';

function parseArgs(argv) {
	const args = {
		base: 'http://localhost:4173',
		runs: 3,
		fail: true,
		outDir: null
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--base') args.base = argv[++i];
		else if (a === '--runs') args.runs = Number(argv[++i]);
		else if (a === '--out-dir') args.outDir = argv[++i];
		else if (a === '--no-fail') args.fail = false;
		else {
			console.error(
				'Bruk: node scripts/lighthouse-budget-check.mjs ' +
					'[--base URL] [--runs N] [--out-dir KATALOG] [--no-fail]'
			);
			process.exit(2);
		}
	}
	if (!Number.isInteger(args.runs) || args.runs < 1) {
		console.error('--runs må være et positivt heltall');
		process.exit(2);
	}
	if (args.runs < 3) {
		console.error(`Advarsel: ${args.runs} kjøring(er) per side er for få til å være portvakt.`);
	}
	return args;
}

/**
 * Budsjettfilen bruker Lighthouse sitt eget stimønster. Vi støtter delmengden
 * som faktisk er i bruk (`/*` og enkle jokertegn), og sier tydelig fra om noen
 * legger inn et mønster vi ikke tolker — i stedet for å la en regel gå
 * stilltiende ubrukt.
 */
function matchPath(pattern, path) {
	if (pattern === undefined || pattern === '/*') return true;
	const anchored = pattern.endsWith('$');
	const body = anchored ? pattern.slice(0, -1) : pattern;
	if (body.includes('?') || body.includes('[')) {
		throw new Error(
			`Stimønsteret ${pattern} i lighthouse-budget.json er ikke støttet av denne kjøreren.`
		);
	}
	const deler = body.split('*').map((s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&'));
	return new RegExp('^' + deler.join('.*') + (anchored ? '$' : '')).test(path);
}

function median(values) {
	const s = [...values].sort((a, b) => a - b);
	const mid = Math.floor(s.length / 2);
	return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Lighthouse startes som en vanlig node-prosess mot cli/index.js, ikke via npx.
 * npx er en .cmd på Windows, og Node nekter siden 20.12 å starte .cmd uten
 * skall — og med skall må argumentene siteres for hånd, som --chrome-flags
 * (med mellomrom) tåler dårlig. Denne veien oppfører seg likt begge steder.
 *
 * Pakken installeres med `npm install --no-save lighthouse@…` slik at den ikke
 * havner i package.json: den trengs bare når denne målingen kjøres.
 */
function finnLighthouseCli() {
	const kandidater = [
		process.env.LIGHTHOUSE_CLI,
		join(ROOT, 'node_modules', 'lighthouse', 'cli', 'index.js')
	].filter(Boolean);
	const funnet = kandidater.find((p) => existsSync(p));
	if (!funnet) {
		throw new Error(
			'Fant ikke Lighthouse. Installer den uten å legge den i package.json:\n' +
				`  npm install --no-save ${LIGHTHOUSE_VERSJON}\n` +
				'eller sett LIGHTHOUSE_CLI til stien til cli/index.js.'
		);
	}
	return funnet;
}

function runLighthouse(url, outPath, cli) {
	const res = spawnSync(
		process.execPath,
		[
			cli,
			url,
			'--output=json',
			`--output-path=${outPath}`,
			'--only-categories=performance',
			// Ingen --preset: standarden er mobil med simulert struping, som er
			// det tallene i budsjettet er satt etter. En portvakt må måle det
			// samme hver gang, så oppsettet står fast her og ikke i workflowen.
			'--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage',
			'--quiet'
		],
		{ cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
	);
	if (!existsSync(outPath)) {
		const utdrag = (res.stderr || res.stdout || '').trim().split('\n').slice(-15).join('\n');
		return {
			ok: false,
			error: [res.error?.message, utdrag, `avsluttet med kode ${res.status}`]
				.filter(Boolean)
				.join('\n')
		};
	}
	const report = JSON.parse(readFileSync(outPath, 'utf8'));
	if (report.runtimeError) {
		return { ok: false, error: `${report.runtimeError.code}: ${report.runtimeError.message}` };
	}
	return { ok: true, report };
}

function extract(report) {
	const timings = {};
	for (const id of Object.keys(TIMING_NAVN)) {
		const audit = report.audits?.[id];
		if (!audit || typeof audit.numericValue !== 'number') {
			throw new Error(
				`Rapporten mangler måltallet ${id}. Lighthouse-versjonen kan ha endret revisjons-ID-er.`
			);
		}
		timings[id] = audit.numericValue;
	}
	const items = report.audits?.['resource-summary']?.details?.items;
	if (!Array.isArray(items)) {
		throw new Error(
			'Rapporten mangler resource-summary. Lighthouse-versjonen kan ha endret rapportformatet.'
		);
	}
	const sizes = {};
	for (const item of items) sizes[item.resourceType] = item.transferSize;
	return { timings, sizes, score: report.categories?.performance?.score ?? 0 };
}

function fmt(id, value) {
	if (id === 'cumulative-layout-shift') return value.toFixed(3);
	if (id === 'kb') return `${Math.round(value)} KiB`;
	return `${Math.round(value)} ms`;
}

function maalPerSide(side, runs, regler, brudd, naer) {
	const rad = { side: side.navn, sti: side.sti, maalinger: [] };
	const poeng = Math.round(median(runs.map((r) => r.score * 100)));
	console.log(`\n${side.navn} — ${side.sti}   (ytelsespoeng, median: ${poeng})`);
	console.log('  måltall                        median     budsjett       margin');

	const vurder = (navn, medianVerdi, grense, verdier, fmtId) => {
		const margin = (grense - medianVerdi) / grense;
		const status = margin < 0 ? 'BRUDD' : margin < NAER_GRENSEN ? 'nær' : 'ok';
		const spredning = verdier.length > 1 ? `  [${verdier.map((v) => fmt(fmtId, v)).join(', ')}]` : '';
		const marginTekst =
			margin >= 0 ? `${Math.round(margin * 100)} % under` : `${Math.round(-margin * 100)} % OVER`;
		console.log(
			`  ${navn.padEnd(30)}${fmt(fmtId, medianVerdi).padStart(9)}${fmt(fmtId, grense).padStart(13)}` +
				`${marginTekst.padStart(13)}  ${status}${spredning}`
		);
		rad.maalinger.push({ navn, median: medianVerdi, budsjett: grense, verdier, status });
		const post = { side: side.navn, sti: side.sti, navn, medianVerdi, grense, fmtId };
		if (status === 'BRUDD') brudd.push(post);
		if (status === 'nær') naer.push(post);
	};

	for (const regel of regler) {
		for (const t of regel.timings || []) {
			const verdier = runs.map((r) => r.timings[t.metric]);
			if (verdier.some((v) => v === undefined)) {
				throw new Error(`Budsjettet nevner måltallet ${t.metric}, som ikke finnes i rapporten.`);
			}
			vurder(TIMING_NAVN[t.metric] || t.metric, median(verdier), t.budget, verdier, t.metric);
		}
		for (const s of regel.resourceSizes || []) {
			const verdier = runs.map((r) => (r.sizes[s.resourceType] ?? 0) / 1024);
			vurder(`${s.resourceType} (overført)`, median(verdier), s.budget, verdier, 'kb');
		}
	}

	/**
	 * Typer uten grense rapporteres, men stopper ingenting. Det gjelder først og
	 * fremst bilder: vi hot-lenker arrangørenes egne filer, så det er de som
	 * bestemmer størrelsen, og et budsjett på noe vi ikke er avsender for ville
	 * enten stått rødt permanent eller vært satt så løst at det ikke betydde noe.
	 * Tidsgrensene fanger fortsatt opp om bildene gjør siden treg. Tallet står
	 * her fordi det bør merkes om det vokser.
	 */
	const budsjetterte = new Set(regler.flatMap((r) => (r.resourceSizes || []).map((s) => s.resourceType)));
	const utenGrense = ALLE_RESSURSTYPER.filter((t) => !budsjetterte.has(t))
		.map((t) => ({ type: t, kib: median(runs.map((r) => (r.sizes[t] ?? 0) / 1024)) }))
		.filter((x) => x.kib >= 1);
	if (utenGrense.length) {
		console.log(
			'  uten grense, kun rapportert:  ' +
				utenGrense.map((x) => `${x.type} ${Math.round(x.kib)} KiB`).join(', ')
		);
		for (const x of utenGrense) {
			rad.maalinger.push({ navn: `${x.type} (uten grense)`, median: x.kib, budsjett: null, status: 'rapportert' });
		}
	}
	return rad;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const budget = JSON.parse(readFileSync(join(ROOT, 'lighthouse-budget.json'), 'utf8'));
	let outDir;
	if (args.outDir) {
		mkdirSync(args.outDir, { recursive: true });
		outDir = args.outDir;
	} else {
		outDir = mkdtempSync(join(tmpdir(), 'lh-'));
	}

	const cli = finnLighthouseCli();
	console.log(`Lighthouse-budsjett — ${args.runs} kjøringer per side, median per måltall`);
	console.log(`Mot: ${args.base}   (${LIGHTHOUSE_VERSJON}, ${cli})`);
	console.log(`Rapporter: ${outDir}\n`);

	const brudd = [];
	const naer = [];
	const summary = [];

	for (const side of SIDER) {
		const regler = budget.filter((b) => matchPath(b.path, side.sti));
		if (regler.length === 0) {
			console.log(`${side.navn} (${side.sti}) — ingen budsjettregel treffer, hoppes over\n`);
			continue;
		}

		const runs = [];
		const stem = side.sti.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'rot';
		for (let i = 1; i <= args.runs; i++) {
			const outPath = join(outDir, `${stem}-${i}.json`);
			process.stdout.write(`  ${side.navn}: kjøring ${i}/${args.runs} ... `);
			const t0 = Date.now();
			let res = runLighthouse(`${args.base}${side.sti}`, outPath, cli);
			if (!res.ok) {
				process.stdout.write('feilet, prøver én gang til ... ');
				res = runLighthouse(`${args.base}${side.sti}`, outPath, cli);
			}
			if (!res.ok) {
				console.log('feilet');
				console.error(`\nLighthouse klarte ikke å måle ${args.base}${side.sti}:\n${res.error}\n`);
				process.exit(2);
			}
			runs.push(extract(res.report));
			console.log(`${Math.round((Date.now() - t0) / 1000)} s`);
		}

		summary.push(maalPerSide(side, runs, regler, brudd, naer));
		console.log('');
	}

	writeFileSync(join(outDir, 'oppsummering.json'), JSON.stringify(summary, null, 2));

	console.log('─'.repeat(74));
	if (naer.length) {
		console.log(`\n${naer.length} måltall ligger mindre enn ${NAER_GRENSEN * 100} % fra grensen og vil svinge:`);
		for (const n of naer) {
			console.log(`  ${n.side}: ${n.navn} — ${fmt(n.fmtId, n.medianVerdi)} mot ${fmt(n.fmtId, n.grense)}`);
		}
	}
	if (brudd.length === 0) {
		console.log('\nAlle sider er innenfor budsjettet.');
		return 0;
	}
	console.log(`\n${brudd.length} budsjettbrudd:`);
	for (const b of brudd) {
		const over = Math.round(((b.medianVerdi - b.grense) / b.grense) * 100);
		console.log(
			`  ${b.side} (${b.sti}): ${b.navn} — ${fmt(b.fmtId, b.medianVerdi)} mot ` +
				`${fmt(b.fmtId, b.grense)}, ${over} % over`
		);
	}
	console.log(
		'\nGrensene i lighthouse-budget.json er et krav. Er bruddet ekte, er det siden\n' +
			'som skal rettes — ikke budsjettet som skal senkes.'
	);
	return args.fail ? 1 : 0;
}

main().then(
	(code) => process.exit(code),
	(err) => {
		console.error(`\n${err.stack || err.message}`);
		process.exit(2);
	}
);
