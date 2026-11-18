/**
 * «1 arrangement» / «2 arrangementer», «1 event» / «2 events».
 *
 * Telleren sto skrevet som `{n} {ord i flertall}` på flere steder, og ga
 * «1 arrangementer» i dagoverskriftene og i meta-beskrivelsen. Én funksjon,
 * så entall ikke må huskes hvert sted. Null er flertall på begge språk
 * («0 arrangementer», «0 events»).
 */
export function antallArrangementer(n: number, lang: 'no' | 'en' | string): string {
	const no = lang === 'no';
	const entall = n === 1;
	const ord = no ? (entall ? 'arrangement' : 'arrangementer') : entall ? 'event' : 'events';
	return `${n} ${ord}`;
}
