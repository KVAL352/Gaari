/**
 * Portvakter for inndata til `/api/track-click`.
 *
 * Endepunktet er aapent, saa kroppen kommer fra nettleseren og kan inneholde
 * hva som helst. Begge funksjonene her staar mellom den kroppen og en kolonne
 * i `venue_clicks`.
 *
 * LIGGER I EGEN FIL MED VILJE. De laa foerst i `+server.ts`, men SvelteKit
 * tillater bare bestemte eksporter fra en `+server.ts` (GET, POST, … eller
 * navn som starter med `_`). Alt annet stopper `npm run build` med
 * «Invalid export». Verken `svelte-check` eller `vitest` fanger det — bare
 * selve byggingen — saa feilen naar helt fram til utrullingen. Skal funksjonene
 * kunne testes, maa de bo utenfor ruta.
 */

/**
 * Vertsnavnet en utgaaende lenke peker paa, uten `www.`.
 *
 * Bare domenet lagres. Sti og spoerrestreng kastes, fordi rapporteringen bare
 * grupperer paa domene og en full adresse kan baere sporingsparametre.
 */
export function sanitizeDestination(raw: unknown): string | null {
	if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2000) return null;
	try {
		const u = new URL(raw);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
		const host = u.hostname.replace(/^www\./, '').toLowerCase();
		return host.length > 0 && host.length <= 255 ? host : null;
	} catch {
		return null;
	}
}

/** Stien paa gaari.no klikket kom fra, uten spoerrestreng og anker. */
export function sanitizeSourcePage(raw: unknown): string | null {
	if (typeof raw !== 'string' || raw.length === 0) return null;
	if (raw.length > 200) return null;
	// Strip query string and hash — we only want the path for aggregation.
	const pathOnly = raw.split('?')[0].split('#')[0];
	if (!pathOnly.startsWith('/')) return null;
	return pathOnly;
}
