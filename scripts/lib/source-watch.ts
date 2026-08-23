/**
 * Kildevakt — overvaaker steder som ennaa ikke har noe aa scrape.
 *
 * Noen steder er aapenbart relevante for Gaari, men har ikke publisert et
 * program ennaa. Homies Coffee (august 2026) er typisk: en ettsides
 * ventelisteside der sitemap bare inneholder forsiden. Det finnes ingenting aa
 * hente, men den dagen de legger ut en programside vil vi vite det.
 *
 * En paaminnelse i reminders.json fanger det samme, men bare paa en fast dato.
 * Denne vakten sjekker hver dag, og fanger det naar det faktisk skjer.
 *
 * MEKANIKKEN: hver kilde har en fasit i source-watch.json — settet med
 * sideadresser sitemap inneholdt da vi undersoekte den. Endres settet, har
 * kilden publisert eller fjernet noe, og digesten sier fra hvilke adresser som
 * kom til. Vakten skriver ikke tilbake til fila. Det er med vilje: den skal
 * fortsette aa mase hver dag helt til et menneske har sett paa endringen og
 * oppdatert fasiten. En vakt som stilner seg selv, har vi ingen nytte av.
 *
 * Se `docs/next-scrapers.md`, seksjonen «Venter paa kilden».
 */

const USER_AGENT = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';
const REQUEST_TIMEOUT_MS = 15_000;

/** Rate limiting, jf. CLAUDE.md: 1-1.5s mellom forespoersler. */
export const DELAY_BETWEEN_SOURCES_MS = 1500;

export interface WatchedSource {
	/** Kort id, brukt i logg og tester. */
	id: string;
	name: string;
	homepage: string;
	sitemap: string;
	/**
	 * Sideadressene sitemap inneholdt da kilden ble undersoekt. Fasiten.
	 * Bildeoppfoeringer teller ikke med, bare sider.
	 */
	baselineUrls: string[];
	/** Hvorfor vi foelger med, og hva som skal skje naar noe endrer seg. */
	note: string;
	/** Datoen paaminnelsen i reminders.json staar til, hvis den finnes. */
	reminder?: string;
}

export type WatchStatus = 'unchanged' | 'changed' | 'unreachable';

export interface WatchResult {
	id: string;
	name: string;
	homepage: string;
	status: WatchStatus;
	/** Adresser som ikke fantes i fasiten. Dette er signalet vi venter paa. */
	added: string[];
	/** Adresser som er borte. Ofte harmloest, men verdt aa se. */
	removed: string[];
	currentCount: number;
	baselineCount: number;
	/** Nyeste lastmod i sitemap. Kontekst, ikke et varsel i seg selv. */
	lastmod: string | null;
	/** Satt naar sitemap er en sitemapindex, altsaa at kilden har vokst. */
	isSitemapIndex: boolean;
	error?: string;
	note: string;
	reminder?: string;
}

/**
 * Fjerner etterfoelgende skraastrek og whitespace slik at
 * `https://x.no` og `https://x.no/` regnes som samme adresse. Uten dette ville
 * vakten varslet om en endring hver gang kilden byttet sitemap-generator.
 */
export function normalizeUrl(url: string): string {
	return url.trim().replace(/\/+$/, '');
}

/**
 * Henter sideadressene ut av en sitemap.
 *
 * Bildeoppfoeringer ligger i sitt eget navnerom som `<image:loc>`, og treffes
 * derfor ikke av `<loc>`. Homies sin sitemap har én side og fem bilder; teller
 * man `<loc>` blir svaret 1, som er riktig.
 */
export function parseSitemapUrls(xml: string): string[] {
	const treff = xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g);
	const urls = [...treff].map((m) => normalizeUrl(m[1]));
	return [...new Set(urls)].sort();
}

/** Nyeste `<lastmod>` i sitemap, eller null om ingen finnes. */
export function parseLastmod(xml: string): string | null {
	const treff = [...xml.matchAll(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/g)].map((m) => m[1].trim());
	if (treff.length === 0) return null;
	return treff.sort().at(-1) ?? null;
}

/** En sitemapindex peker til andre sitemaps. Dukker den opp, har kilden vokst. */
export function isSitemapIndex(xml: string): boolean {
	return /<sitemapindex[\s>]/i.test(xml);
}

/**
 * Sammenligner et ferskt sitemap mot fasiten. Ren funksjon, uten nett.
 */
export function diffAgainstBaseline(
	source: WatchedSource,
	currentUrls: string[]
): { added: string[]; removed: string[] } {
	const fasit = new Set(source.baselineUrls.map(normalizeUrl));
	const naa = new Set(currentUrls.map(normalizeUrl));
	return {
		added: [...naa].filter((u) => !fasit.has(u)).sort(),
		removed: [...fasit].filter((u) => !naa.has(u)).sort()
	};
}

async function hentSitemap(url: string, fetchImpl: typeof fetch): Promise<string> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const res = await fetchImpl(url, {
			headers: { 'User-Agent': USER_AGENT },
			signal: controller.signal
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.text();
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Sjekker én kilde. Kaster aldri: et nettverksproblem hos en kaffebar skal
 * ikke velte den daglige digesten, saa feilen rapporteres som `unreachable`.
 */
export async function checkSource(
	source: WatchedSource,
	fetchImpl: typeof fetch = fetch
): Promise<WatchResult> {
	const base = {
		id: source.id,
		name: source.name,
		homepage: source.homepage,
		note: source.note,
		reminder: source.reminder,
		baselineCount: source.baselineUrls.length
	};

	try {
		const xml = await hentSitemap(source.sitemap, fetchImpl);
		const urls = parseSitemapUrls(xml);
		const { added, removed } = diffAgainstBaseline(source, urls);
		const index = isSitemapIndex(xml);

		return {
			...base,
			status: added.length > 0 || removed.length > 0 || index ? 'changed' : 'unchanged',
			added,
			removed,
			currentCount: urls.length,
			lastmod: parseLastmod(xml),
			isSitemapIndex: index
		};
	} catch (err: any) {
		return {
			...base,
			status: 'unreachable',
			added: [],
			removed: [],
			currentCount: 0,
			lastmod: null,
			isSitemapIndex: false,
			error: err?.name === 'AbortError' ? `Tidsavbrudd etter ${REQUEST_TIMEOUT_MS} ms` : String(err?.message ?? err)
		};
	}
}

/**
 * Sjekker alle kilder, én av gangen med pause mellom. Sekvensielt med vilje:
 * listen er kort, og hoeflig trafikk er viktigere enn fart her.
 */
export async function checkAllSources(
	sources: WatchedSource[],
	opts: { fetchImpl?: typeof fetch; delayMs?: number } = {}
): Promise<WatchResult[]> {
	const fetchImpl = opts.fetchImpl ?? fetch;
	const delayMs = opts.delayMs ?? DELAY_BETWEEN_SOURCES_MS;
	const resultater: WatchResult[] = [];

	for (const [i, source] of sources.entries()) {
		if (i > 0 && delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
		resultater.push(await checkSource(source, fetchImpl));
	}

	return resultater;
}

/** Bare det digesten skal si fra om. Uendrede kilder er ikke nyheter. */
export function worthReporting(results: WatchResult[]): WatchResult[] {
	return results.filter((r) => r.status !== 'unchanged');
}
