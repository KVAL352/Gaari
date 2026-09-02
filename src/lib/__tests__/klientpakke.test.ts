/**
 * Komponenter skal ikke dra samlingskatalogen inn i klientpakken.
 *
 * HVORFOR DENNE FINNES
 *
 * `collections.ts` er rundt 4 000 linjer: redaksjonell tekst, FAQ-er og
 * filterfunksjoner for hver eneste samling. Footer.svelte har hatt en
 * kommentar siden mai om at den ikke skal importere derfra, fordi importen
 * dro hele katalogen (70 kB komprimert) inn paa alle sider.
 *
 * 2. september 2026 gjorde jeg presis det likevel. `collectionHref()` laa i
 * collections.ts, og jeg importerte den i fem komponenter for aa fikse
 * lenkene til de engelske aliassidene. Resultatet:
 *
 *   forside (/no):  script 211 KiB mot budsjettet paa 200 — 6 % over
 *   /no/submit:     script 225 KiB — 12 % over
 *   forside (/en):  script 211 KiB — 6 % over
 *
 * Ingenting annet fanget det. svelte-check ga 0 feil, alle 1 493 tester var
 * groenne, og pre-push-hooken slapp det gjennom. Bare Lighthouse-budsjettet
 * i CI ble roedt — altsaa etter at det var pushet til master.
 *
 * Adresselogikken bor naa i `collection-urls.ts`, som ikke importerer
 * katalogen. Denne testen sier fra i CI foer budsjettet gjoer det.
 *
 * Se [[pattern_liten_funksjon_stor_tabell]].
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Alle .svelte-filer under src/. */
function svelteFiler(katalog: string, samlet: string[] = []): string[] {
	for (const navn of readdirSync(katalog)) {
		const sti = join(katalog, navn);
		if (statSync(sti).isDirectory()) svelteFiler(sti, samlet);
		else if (navn.endsWith('.svelte')) samlet.push(sti);
	}
	return samlet;
}

describe('klientpakke', () => {
	const filer = svelteFiler('src');

	it('finner komponentene i det hele tatt', () => {
		// Uten denne ville en feil sti gjort testen under gronn og verdiloes:
		// null filer aa sjekke gir null brudd. Jf.
		// [[pattern_ingenting_ser_ut_som_suksess]].
		expect(filer.length).toBeGreaterThan(20);
	});

	it('importerer ingen .svelte-fil $lib/collections', () => {
		// Trenger du en adresse, importer fra $lib/collection-urls.
		// Trenger du selve katalogen, hent den i +page.server.ts og send den
		// inn som prop — slik Footer.svelte alt gjoer med lenkene sine.
		const brudd = filer.filter((f) =>
			/import\s[^;]*from\s+['"]\$lib\/collections['"]/.test(readFileSync(f, 'utf-8'))
		);
		expect(brudd).toEqual([]);
	});

	it('holder collection-urls.ts fri for katalogen', () => {
		const kilde = readFileSync('src/lib/collection-urls.ts', 'utf-8');
		expect(/from\s+['"]\.\/collections['"]/.test(kilde)).toBe(false);
		// Bare typeimporten fra ./types skal staa igjen.
		const importer = [...kilde.matchAll(/^import\s.*$/gm)].map((m) => m[0]);
		expect(importer).toEqual(["import type { Lang } from './types';"]);
	});
});
