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
 * Men det gir en blindsone. Seed har 25 arrangementer, produksjon har over
 * 2 000. Budsjettet måler dokumentet til 25 KiB mens forsiden i drift er
 * 1,7 MB, og rundt 90 % av den er arrangementsdata serialisert inn i HTML-en
 * for at filtrene skal virke i nettleseren. Portvakten var grønn mens den
 * største ytelsesposten på nettstedet vokste fritt, fordi den aldri så den.
 *
 * HVORFOR PER ARRANGEMENT OG IKKE ET ABSOLUTT TALL
 *
 * Første utgave låste absolutte tall. Den holdt i fem dager. 31. august sto
 * innhentingen stille i seks døgn, ble reparert, og la inn rundt 150
 * arrangementer på én dag. Da sprakk grensa — ikke fordi vi hadde begynt å
 * sende mer per arrangement, men fordi det var flere av dem.
 *
 * En grense som må skrus opp hver gang katalogen vokser, måler ingenting. Den
 * lærer bare den som skrur å skru. Derfor er den sperrende målingen nå
 * **bytes per serialisert arrangement**. Den fanger det vi faktisk kan gjøre
 * noe med: at hver rad drar med seg mer til nettleseren, for eksempel når et
 * nytt felt legges til i `fields` i +page.server.ts.
 *
 * De absolutte takene står igjen som en sikring for brukeropplevelsen, satt
 * romslig. De skal fange en side som løper løpsk, ikke vanlig vekst.
 *
 * GZIP, IKKE BROTLI. Vercel serverer brotli til nettlesere, og PageSpeed
 * rapporterte 304 KiB for den samme sida vi her målte til 346. Det er ikke en
 * motsigelse, det er to komprimeringer. Første utgave av dette skriptet satte
 * grensa fra PSI-tallet og feilet umiddelbart mot sin egen måling.
 * Sammenlign aldri de to.
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
 * Målt 31. august 2026 med 2 000 serialiserte arrangementer på forsiden:
 *
 *   /no  312 KiB gzip / 1 695 KiB rå  →  0,156 og 0,847 per arrangement
 *   /en  428 KiB gzip / 2 100 KiB rå  →  0,214 og 1,050 per arrangement
 *
 * Grensene under ligger rundt 12 % over det. De låser dagens nivå, de er ikke
 * et mål.
 *
 * /en ER LEGITIMT STØRRE ENN /no. Den sender begge språkene: `title_no` og
 * `description_no` må være med også på den engelske sida, fordi filtrene og
 * fritekstsøket i EventDiscovery og +page.svelte er bygget på norske ord
 * (ungdom, klubb, familie, «hulen»). Droppes de norske feltene på /en, går
 * ikke sida i stykker — den slutter bare stille å filtrere riktig. Det er en
 * verre feil enn 200 KiB.
 *
 * Den store posten, at hele katalogen sendes til nettleseren for at filtrene
 * skal være øyeblikkelige, står åpen i docs/SEO-ARBEIDSFLYT.md. Løses den,
 * skal tallene ned, ikke opp.
 */
const GRENSER = [
	{ sti: '/no', perGz: 0.18, perRaa: 0.95, gzipKiB: 600, raaKiB: 3000 },
	{ sti: '/en', perGz: 0.24, perRaa: 1.18, gzipKiB: 700, raaKiB: 3500 },
	{ sti: '/no/denne-helgen', perGz: 0.45, perRaa: 2.9, gzipKiB: 120, raaKiB: 700 },
];

/**
 * Antall serialiserte arrangementer i HTML-en.
 *
 * `date_start` står én gang per arrangement i nyttelasten. Kontrollert 31.
 * august 2026: date_start, title_no og venue_name ga alle nøyaktig samme tall
 * på /no. `slug` ble vraket — den teller også samlingslenkene i bunnteksten.
 *
 * Finner den ingen, er noe grunnleggende endret i serialiseringen. Da skal
 * sjekken si feil, ikke dele på null og melde grønt.
 */
function tellArrangementer(html) {
	return (html.match(/date_start/g) ?? []).length;
}

let brudd = 0;
console.log(`Dokumentstørrelse mot ${BASE}\n`);
console.log('sti                    arr.   gzip/arr (grense)    rå/arr (grense)      totalt');

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

	const raa = Buffer.byteLength(html) / 1024;
	const gz = gzipSync(Buffer.from(html)).length / 1024;
	const antall = tellArrangementer(html);

	if (antall === 0) {
		console.log(
			`${g.sti.padEnd(22)} fant ingen arrangementer i HTML-en — er serialiseringen endret?`
		);
		brudd++;
		continue;
	}

	const perGz = gz / antall;
	const perRaa = raa / antall;
	const over = perGz > g.perGz || perRaa > g.perRaa || gz > g.gzipKiB || raa > g.raaKiB;
	if (over) brudd++;

	console.log(
		`${g.sti.padEnd(22)} ${String(antall).padStart(4)}   ` +
			`${perGz.toFixed(3)}${perGz > g.perGz ? ' OVER' : '    '} (${g.perGz.toFixed(2)})   ` +
			`${perRaa.toFixed(3)}${perRaa > g.perRaa ? ' OVER' : '    '} (${g.perRaa.toFixed(2)})   ` +
			`${Math.round(gz)}/${Math.round(raa)} KiB${gz > g.gzipKiB || raa > g.raaKiB ? ' OVER TAK' : ''}`
	);
}

// Verdikten skal alltid si sannheten. --no-fail slår av exit-koden, ikke
// dommen: tidligere hoppet flagget over hele FEIL-grenen, slik at skriptet
// skrev «VERDIKT: OK — ingen sider over grensen» rett under en linje som sa
// OVER. Det er nøyaktig den feilklassen resten av sperrene her finnes for.
if (brudd > 0) {
	console.log(`\nVERDIKT: FEIL — ${brudd} side(r) over grensen.`);
	console.log('Grensene måler bytes per arrangement. Vokser tallet, sender vi mer per rad.');
	if (!INGEN_DOM) process.exit(1);
} else {
	console.log('\nVERDIKT: OK — ingen sider over grensen.');
}
