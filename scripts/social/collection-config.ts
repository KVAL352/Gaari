/**
 * Delt oppsett for samlesidene som brukes i Gåris egne kanaler.
 *
 * Konstantene her lå tidligere kopiert i hver enkelt generator. ENGLISH_SLUGS
 * fantes for eksempel fire steder, identisk, i generate-posts, generate-reels,
 * post-to-socials og post-to-bluesky. Å legge til en engelsk samleside krevde
 * dermed at man husket fire filer, og glemte man én, fikk innholdet norsk
 * tekst i én kanal og engelsk i en annen uten at noe sa fra.
 *
 * Samme resonnement som venue-policy.ts og consent.json: én definisjon,
 * mange lesere.
 */

/**
 * Samlesider som postes på engelsk.
 *
 * Merk at dette ikke er utledbart fra `collections.ts`. Alle samlesider har
 * både norsk og engelsk tittel; dette er et redaksjonelt valg om hvilke vi
 * faktisk poster om på engelsk.
 */
export const ENGLISH_SLUGS = new Set<string>(['today-in-bergen', 'this-weekend']);

/** Om en samleside skal postes på engelsk. */
export function erEngelsk(slug: string): boolean {
	return ENGLISH_SLUGS.has(slug);
}

/**
 * Færreste antall arrangementer med bilde før vi publiserer i det hele tatt.
 *
 * Var 5 i generate-posts, 5 i generate-reels og 4 i generate-week. Den siste
 * var neppe et bevisst valg, bare et tall som ble skrevet i en annen fil en
 * annen dag. Kjersti bestemte 2026-08-11 at alle tre skal være 5.
 *
 * Poenget med terskelen er å slippe å publisere noe tynt. En karusell med tre
 * arrangementer ser ut som at det ikke skjer noe i Bergen, og det er verre enn
 * å ikke poste den dagen.
 */
export const MIN_EVENTS_FOR_POST = 5;
