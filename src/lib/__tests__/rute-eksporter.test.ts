import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * SvelteKit tillater bare bestemte eksporter fra rutefiler. Alt annet stopper
 * `npm run build` med «Invalid export».
 *
 * HVORFOR DENNE TESTEN FINNES
 *
 * 2. september 2026 ble to hjelpefunksjoner eksportert fra
 * `api/track-click/+server.ts` for aa kunne testes. Master brakk, og CI og
 * Lighthouse ble roede. Det som IKKE fanget det:
 *
 *   - `npx svelte-check --threshold error`  0 feil
 *   - hele testsuiten, 1 439 tester         alle groenne
 *   - `.githooks/pre-push`, som kjoerer testene, slapp pushen gjennom
 *
 * Valideringen finnes bare i byggesteget, og `npm run build` fullfoerer ikke
 * paa Windows: Vercel-adapteren feiler paa `EPERM ... symlink`. Feilen naadde
 * derfor helt fram til utrullingen. Jf.
 * [[pattern_server_ts_taaler_bare_handlere]].
 *
 * FASIT LESES FRA SVELTEKIT SELV
 *
 * Listene hentes ut av `@sveltejs/kit/src/utils/exports.js` i stedet for aa
 * skrives av her. En kopi ville glidd fra originalen ved neste oppgradering, og
 * da ville testen enten sluppet gjennom noe ulovlig eller stoppet noe lovlig.
 * Jf. [[pattern_single_source_of_truth]]. Endrer SvelteKit filnavnet, feiler
 * testen hoeylytt her i stedet for stille i produksjon.
 */
const ROT = path.resolve(__dirname, '../../..');
const KIT_EXPORTS = path.join(ROT, 'node_modules/@sveltejs/kit/src/utils/exports.js');

/** Plukker ut `const <navn> = new Set([...])` fra SvelteKits egen fil. */
function lesSett(kilde: string, navn: string): string[] {
	const m = kilde.match(new RegExp(`const ${navn} = new Set\\(\\[([\\s\\S]*?)\\]\\)`));
	if (!m) throw new Error(`Fant ikke ${navn} i ${KIT_EXPORTS} — har SvelteKit endret seg?`);
	const egne = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
	// «...valid_layout_exports» arver fra et annet sett.
	const arvet = [...m[1].matchAll(/\.\.\.(\w+)/g)].flatMap((x) => lesSett(kilde, x[1]));
	return [...new Set([...arvet, ...egne])];
}

const kitKilde = fs.readFileSync(KIT_EXPORTS, 'utf-8');

const LOVLIG: Record<string, string[]> = {
	'+server': lesSett(kitKilde, 'valid_server_exports'),
	'+page.server': lesSett(kitKilde, 'valid_page_server_exports'),
	'+layout.server': lesSett(kitKilde, 'valid_layout_server_exports'),
	'+page': lesSett(kitKilde, 'valid_page_exports'),
	'+layout': lesSett(kitKilde, 'valid_layout_exports'),
};

/** Alle rutefiler under src/routes, rekursivt. */
function finnRutefiler(dir: string): string[] {
	const ut: string[] = [];
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) ut.push(...finnRutefiler(p));
		else if (/^\+(server|page(\.server)?|layout(\.server)?)\.ts$/.test(e.name)) ut.push(p);
	}
	return ut;
}

/** Toppnivaa-eksporter i en TypeScript-fil, uten aa kjoere den. */
function eksporter(kode: string): string[] {
	const funn: string[] = [];
	// export const/let/var/function/async function/class <navn>
	for (const m of kode.matchAll(
		/^export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm
	)) {
		funn.push(m[1]);
	}
	// export { a, b as c }  — men ikke «export type { … }»
	for (const m of kode.matchAll(/^export\s+(?!type\b)\{([^}]+)\}/gm)) {
		for (const del of m[1].split(',')) {
			const bit = del.trim();
			if (!bit || bit.startsWith('type ')) continue;
			funn.push((bit.split(/\s+as\s+/).pop() ?? bit).trim());
		}
	}
	return funn;
}

const filer = finnRutefiler(path.join(ROT, 'src/routes'));

describe('rutefiler eksporterer bare det SvelteKit tillater', () => {
	it('finner faktisk rutefiler aa sjekke', () => {
		// En tom liste ville gjort hele testen til et alibi:
		// «ingenting feilet» fordi ingenting ble sjekket.
		expect(filer.length).toBeGreaterThan(5);
	});

	it.each(filer.map((f) => [path.relative(ROT, f).replace(/\\/g, '/'), f]))(
		'%s',
		(_navn, fil) => {
			const type = path.basename(fil).replace(/\.ts$/, '');
			const lovlig = LOVLIG[type];
			expect(lovlig, `ukjent rutetype: ${type}`).toBeDefined();

			const ulovlige = eksporter(fs.readFileSync(fil, 'utf-8')).filter(
				// Understrek-prefiks er alltid lov.
				(e) => !e.startsWith('_') && !lovlig.includes(e)
			);

			expect(
				ulovlige,
				`${path.relative(ROT, fil)} eksporterer ${ulovlige.join(', ')}. ` +
					`Det brekker «npm run build». Lovlig her: ${lovlig.join(', ')}. ` +
					`Skal noe kunne testes, flytt det til src/lib/ i stedet.`
			).toEqual([]);
		}
	);
});
