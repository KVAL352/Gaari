/**
 * Per-scraper tidsavbrudd.
 *
 * Pipelinefristen i scrape.ts sjekkes bare *mellom* scrapere. Uten et tak per
 * scraper kan én treg kilde bruke hele resten av budsjettet: løkka kommer aldri
 * tilbake til fristsjekken, GitHub dreper jobben på timeout-minutes, og dedup,
 * loggingen til scraper_runs, JSON-sammendraget og helsesjekken kjører aldri.
 * Utad ser dagen ut som om den aldri skjedde. Fem døgn på rad fra 26. august
 * 2026 endte slik. Taket er det som gjør fristen mulig å håndheve.
 *
 * Ligger i egen fil, ikke i scrape.ts, slik at testen kan kjøre uten å dra inn
 * hele pipelinen og alle scraperne.
 */

export class ScraperTimeoutError extends Error {
	constructor(name: string, ms: number) {
		super(`${name} passerte ${Math.round(ms / 1000)}s og ble forlatt`);
		this.name = 'ScraperTimeoutError';
	}
}

/**
 * Promise.race stopper ikke arbeidet, den slutter bare å vente på det. Det er
 * med vilje: en scraper som ikke tar imot et AbortSignal kan vi ikke avbryte,
 * men vi kan nekte å la den stoppe alle de andre. Den forlatte jobben rydder
 * seg selv — fetchHTML har sitt eget 15s-tak — og scrape.ts avslutter
 * prosessen eksplisitt til slutt i tilfelle noe likevel henger igjen.
 */
export function withTimeout<T>(work: Promise<T>, ms: number, name: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout>;
	const expiry = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new ScraperTimeoutError(name, ms)), ms);
	});
	return Promise.race([work, expiry]).finally(() => clearTimeout(timer)) as Promise<T>;
}
