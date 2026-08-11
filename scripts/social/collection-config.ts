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
