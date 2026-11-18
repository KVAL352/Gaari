// Datotillegget på titler som går igjen («Manneklubben — onsdag 18. november»).
//
// Ett sted, fordi to deler må være enige om hvordan det ser ut:
// - `scripts/lib/enrich-titles.ts` legger det PÅ, så like titler skilles i lister.
// - arrangementssiden tar det AV i <title> og meta-beskrivelsen, som har sin
//   egen dato med årstall fra `formatMetaDate`. Ellers står datoen to ganger.

export const NO_DAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
export const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** True hvis siste « — »-ledd begynner med et ukedagsnavn (norsk eller engelsk). */
export function hasDateSuffix(title: string): boolean {
	if (!title.includes(' — ')) return false;
	const tail = (title.split(' — ').pop() || '').toLowerCase();
	return NO_DAYS.some((d) => tail.startsWith(d)) || EN_DAYS.some((d) => tail.startsWith(d.toLowerCase()));
}

/** Tittelen uten datotillegget. Uendret hvis den ikke har noe. */
export function stripDateSuffix(title: string): string {
	if (!hasDateSuffix(title)) return title.trim();
	return title.split(' — ').slice(0, -1).join(' — ').trim();
}
