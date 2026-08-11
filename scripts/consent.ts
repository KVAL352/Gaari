/**
 * Bildesamtykke-verktøy.
 *
 *   npx tsx scripts/consent.ts sync    regenererer docs/bildesamtykke.md
 *   npx tsx scripts/consent.ts check   feiler hvis dokumentet er utdatert
 *   npx tsx scripts/consent.ts due     viser samtykker som skal vurderes på nytt
 *
 * Fasiten er scripts/lib/consent.json. Dokumentet er avledet og skal aldri
 * redigeres for hånd. Allowlistene i lib/utils.ts leses fra samme fil, så de
 * tre kan ikke lenger si ulike ting.
 *
 * Selve logikken ligger i lib/consent-doc.ts, slik at testen kan bruke den
 * uten å starte dette programmet.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { load, render, DOC_PATH } from './lib/consent-doc.js';

const cmd = process.argv[2];
const data = load();

if (cmd === 'sync') {
	writeFileSync(DOC_PATH, render(data), 'utf8');
	console.log(`docs/bildesamtykke.md regenerert: ${data.kilder.length} kilder, ${data.avslag.length} avslag`);
} else if (cmd === 'check') {
	if (readFileSync(DOC_PATH, 'utf8') !== render(data)) {
		console.error('docs/bildesamtykke.md er utdatert. Kjor: npx tsx scripts/consent.ts sync');
		process.exit(1);
	}
	console.log('docs/bildesamtykke.md er oppdatert.');
} else if (cmd === 'due') {
	// Dato kan sendes inn, slik at kommandoen kan kjores reproduserbart.
	const today = process.argv[3] || new Date().toISOString().slice(0, 10);
	const due = data.kilder.filter((k) => k.vurderesInnen <= today);
	if (!due.length) {
		console.log(`Ingen samtykker forfaller per ${today}.`);
	} else {
		console.log(`${due.length} samtykker bor vurderes pa nytt per ${today}:`);
		for (const k of due) console.log(`  ${k.slug} (${k.navn}), sist bekreftet ${k.dato}`);
	}
} else {
	console.log('Bruk: npx tsx scripts/consent.ts <sync|check|due>');
	process.exit(1);
}
