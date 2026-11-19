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

/**
 * Tallet en samlingsside skal oppgi: det siden faktisk viser.
 *
 * En hubside (festivaler) viser kort til undersamlingene, ikke arrangementer.
 * Da er tallet summen kortene viser. Hubbens egne arrangementer vises aldri,
 * og ga «10 arrangementer akkurat nå» mens kortene til sammen viste 69.
 */
export function antallSomVises(
	events: readonly unknown[],
	hubItems?: readonly { eventCount: number }[] | null
): number {
	if (hubItems && hubItems.length > 0) {
		return hubItems.reduce((sum, item) => sum + item.eventCount, 0);
	}
	return events.length;
}
