#!/usr/bin/env node
/**
 * Mål HTML-størrelsen på de ekte sidene i drift.
 *
 * HVORFOR EN TIL, NÅR VI HAR LIGHTHOUSE-BUDSJETTET
 *
 * Ytelsesbudsjettet kjører mot `vite preview` med en Supabase-URL som ikke
 * finnes, slik at sidene faller tilbake på seed-dataene. Det er et bevisst og
 * riktig valg: målingene blir like hver kjøring, og svinger ikke med hva som
 * tilfeldigvis lå i basen.
 *
 * Men det gir en blindsone. Seed har 25 arrangementer. Produksjon har 1 967.
 * Budsjettet måler dokumentet til 25 KiB mens forsiden i drift er 1,7 MB —
 * 89,7 % av den er arrangementsdata serialisert inn i HTML-en for at filtrene
 * skal virke i nettleseren.
 *
 * Portvakten var altså grønn mens den største ytelsesposten på nettstedet
 * vokste fritt, fordi den aldri så den.
 *
 * Denne måler produksjon i stedet. Den er ikke deterministisk — tallet svinger
 * med hvor mange arrangementer som ligger inne — og derfor er grensene satt
 * som et SPERREHÅNDTAK: de låser dagens nivå og hindrer at det blir verre.
 * De er ikke et mål. Dagens nivå er for høyt, og står som åpen sak i
 * docs/SEO-ARBEIDSFLYT.md.
 *
 * Bruk:
 *   node scripts/dokumentstoerrelse-check.mjs
 *   node scripts/dokumentstoerrelse-check.mjs --base https://gaari.no --no-fail
 */
import { gzipSync } from 'node:zlib';

const args = process.argv.slice(2);
const flagg = (n, standard) => {
	const i = args.indexOf(n);
	return i >= 0 ? args[i + 1] : standard;
};
const BASE = flagg('--base', 'https://gaari.no');
const INGEN_DOM = args.includes('--no-fail');

/**
 * Grensene er dagens nivå rundet opp, ikke et mål.
 *
 * Målt 26. august 2026 med 1 967 arrangementer i basen: /no lå på 346 KiB
 * gzip og 1 694 KiB rå. Vokser katalogen mye, må tallene justeres — men da
 * skal noen ta stilling til det, ikke bare skru dem opp for å få grønt.
 *
 * GZIP, IKKE BROTLI. Vercel serverer brotli til nettlesere, og PageSpeed
 * rapporterte 304 KiB for den samme sida vi her måler til 346. Det er ikke
 * en motsigelse — det er to komprimeringer. Første utgave av dette skriptet
 * satte grensa fra PSI-tallet og feilet umiddelbart mot sin egen måling.
 * Sammenlign aldri de to.
 */
const GRENSER = [
	{ sti: '/no', gzipKiB: 360, raaKiB: 1800 },
	{ sti: '/en', gzipKiB: 360, raaKiB: 1800 },
	{ sti: '/no/denne-helgen', gzipKiB: 60, raaKiB: 320 },
];

let brudd = 0;
console.log(`Dokumentstørrelse mot ${BASE}\n`);
console.log('sti                    gzip KiB  (grense)     rå KiB  (grense)');

for (const g of GRENSER) {
	let html;
	try {
		const res = await fetch(`${BASE}${g.sti}`, {
			headers: { 'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)' },
		});
		if (!res.ok) {
			console.log(`${g.sti.padEnd(22)} HTTP ${res.status}`);
			brudd++;
			continue;
		}
		html = await res.text();
	} catch (e) {
		console.log(`${g.sti.padEnd(22)} kunne ikke hentes: ${e.message?.slice(0, 50)}`);
		brudd++;
		continue;
	}

	const raa = Math.round(Buffer.byteLength(html) / 1024);
	const gz = Math.round(gzipSync(Buffer.from(html)).length / 1024);
	const overGz = gz > g.gzipKiB;
	const overRaa = raa > g.raaKiB;
	if (overGz || overRaa) brudd++;

	console.log(
		`${g.sti.padEnd(22)} ${String(gz).padStart(8)}${overGz ? ' OVER' : '    '} (${String(g.gzipKiB).padStart(4)})` +
			` ${String(raa).padStart(10)}${overRaa ? ' OVER' : '    '} (${String(g.raaKiB).padStart(4)})`
	);
}

if (brudd > 0 && !INGEN_DOM) {
	console.error(`\nVERDIKT: FEIL — ${brudd} side(r) over grensen.`);
	console.error('Grensene låser dagens nivå. Er økningen ønsket, må tallene endres bevisst.');
	process.exit(1);
}
console.log(`\nVERDIKT: OK — ingen sider over grensen.`);
