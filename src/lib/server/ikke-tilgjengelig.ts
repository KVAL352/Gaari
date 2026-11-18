import { error } from '@sveltejs/kit';

/**
 * Hva sidene gjør når arrangementene ikke kan hentes.
 *
 * `seedEvents` er ti utviklingsrader. De finnes så sidene kan kjøres uten
 * database lokalt. I produksjon var de et stille unntak: en feil mot Supabase
 * ga en forside med noen få oppdiktede arrangementer, HTTP 200, cachet i en
 * time, og ingen merket noe. Nå gir produksjon 503 med en forklaring til
 * besøkende, og feilen logges (app-feil logges ikke av handleError i
 * hooks.server.ts, så vi gjør det her). 5xx caches ikke av Vercel ISR (ikke
 * verifisert her); en tidligere god kopi blir stående.
 *
 * `dev` sendes inn i stedet for å importeres, så funksjonen kan testes uten
 * SvelteKit-runtime.
 */
/**
 * Når seed-data er lov utenfor `dev`: bare i Lighthouse-målingen, og bare når
 * Supabase-adressen er den reserverte `.invalid`-adressen som aldri kan slås
 * opp. Begge må stemme. Produksjon har en ekte adresse, så et uhell med
 * flagget kan ikke gi en falsk forside med HTTP 200 igjen.
 */
export const TESTMODUS_FLAGG = 'lighthouse-ci';
export function erTestmodus(flagg: string | undefined, supabaseUrl: string | undefined): boolean {
	if (flagg !== TESTMODUS_FLAGG) return false;
	try {
		return new URL((supabaseUrl ?? '').trim()).hostname.endsWith('.invalid');
	} catch {
		return false;
	}
}

export function seedEllerFeil<T>(seed: T, sted: string, aarsak: unknown, dev: boolean): T {
	if (dev) return seed;
	loggIkkeTilgjengelig(sted, aarsak);
	throw error(503, 'Arrangementene kan ikke vises akkurat nå');
}

export function loggIkkeTilgjengelig(sted: string, aarsak: unknown): void {
	const melding = aarsak instanceof Error ? aarsak.message : typeof aarsak === 'string' ? aarsak : JSON.stringify(aarsak);
	console.error(
		JSON.stringify({
			type: 'arrangementer_utilgjengelig',
			timestamp: new Date().toISOString(),
			status: 503,
			sted,
			message: melding
		})
	);
}

/** Supabase `.single()` uten treff: raden finnes ikke, databasen svarer. */
export function erIngenRadFunnet(err: unknown): boolean {
	return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'PGRST116';
}
