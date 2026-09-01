/**
 * Lenker som er de samme, bortsett fra sporingsparameteren.
 *
 * HVORFOR DENNE FINNES
 *
 * Bookibud la henvisningskoden vaar (`marketing=gaari`) paa partnernoekkelen
 * 25. august 2026, og den kom da inn i `url`-feltet i feeden. Men
 * `eventExists()` slaar opp paa noeyaktig source_url, saa for et arrangement
 * som alt laa inne, fant den ingenting da lenken endret seg — og scraperen
 * hoppet over raden i stedet for aa oppdatere den.
 *
 * Resultatet: 43 av 82 bookibud-rader pekte fortsatt paa lenken uten
 * henvisningskode 1. september. De sender klikk til Bookibud uten at salget
 * krediteres Gaari, og under kickback-avtalen som er under forhandling er det
 * direkte tapte penger. Rader opprettet 21. august hadde ingen kode, rader fra
 * 28. august og senere hadde den — en helt ren korrelasjon.
 *
 * Samme laerdom som [[pattern_regler_gjelder_bare_framover]]: en regel som
 * bare gjelder ved innlegging, rydder ikke det som alt ligger der.
 *
 * Funksjonene her sammenligner to lenker uten sporingsparametrene, slik at
 * scraperen kjenner igjen raden og kan oppdatere lenken i stedet for aa hoppe
 * over den eller lage en ny.
 */

/**
 * Parametre som identifiserer hvem som sendte trafikken, ikke hvilket
 * arrangement det er. To lenker som bare skiller seg paa disse, peker paa det
 * samme.
 */
const SPORINGSPARAMETRE = new Set([
	'marketing',
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_content',
	'utm_term',
	'ref',
	'referrer',
	'partner',
	'fbclid',
	'gclid',
]);

/** Lenka uten sporingsparametre, med resten i uendret rekkefoelge. */
export function utenSporing(url: string): string {
	try {
		const u = new URL(url);
		for (const n of [...u.searchParams.keys()]) {
			if (SPORINGSPARAMETRE.has(n.toLowerCase())) u.searchParams.delete(n);
		}
		return u.toString();
	} catch {
		// Ikke en gyldig URL. Da er sammenligning paa raa streng det beste vi har,
		// og det er tryggere enn aa kaste: en scraper skal ikke stoppe av dette.
		return url;
	}
}

/** Peker de to lenkene paa det samme, naar sporingen holdes utenfor? */
export function sammeUtenSporing(a: string, b: string): boolean {
	return utenSporing(a) === utenSporing(b);
}
