/**
 * Utvalget til nyhetsbrevet: helgens arrangementer først.
 *
 * Brevet går torsdag, og uten helgevalg ble det stort sett torsdagens
 * arrangementer (Kristoffer, 22. okt 2026). Helg regnes som fredag til søndag,
 * det samme som `getWeekendDates` bruker på forsiden og i samlingssidene.
 */

interface UtvalgEvent {
	id: string;
	category: string;
	venue_name: string;
	date_start: string;
}

export interface Helg {
	start: string;
	end: string;
}

export function erIHelg(dateStart: string, helg: Helg): boolean {
	const dag = dateStart.slice(0, 10);
	return dag >= helg.start && dag <= helg.end;
}

/** Én fra hver dag om gangen, så fredagen ikke tar hele utvalget bare fordi den kommer først. */
function blandDager<T extends UtvalgEvent>(events: T[]): T[] {
	const perDag = new Map<string, T[]>();
	for (const e of events) {
		const dag = e.date_start.slice(0, 10);
		perDag.set(dag, [...(perDag.get(dag) ?? []), e]);
	}
	const koer = [...perDag.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
	const ut: T[] = [];
	for (let i = 0; koer.some(k => i < k.length); i++) {
		for (const k of koer) if (i < k.length) ut.push(k[i]);
	}
	return ut;
}

/** Maks to per kategori, resten som overflow. Rekkefølgen innen hver er uendret. */
function ettergiKategori<T extends UtvalgEvent>(events: T[]): T[] {
	const antall = new Map<string, number>();
	const diverse: T[] = [];
	const overflow: T[] = [];
	for (const e of events) {
		const n = antall.get(e.category) || 0;
		if (n < 2) {
			diverse.push(e);
			antall.set(e.category, n + 1);
		} else {
			overflow.push(e);
		}
	}
	return [...diverse, ...overflow];
}

/**
 * Rekkefølge: betalende arrangører først, så helgens arrangementer, så resten
 * av uka. Innen helgen og innen resten er det maks to per kategori før
 * overflow, slik at et blandet utvalg ikke blir ett sjanger.
 *
 * Resten av uka fyller bare opp når helgen ikke gir nok til å fylle brevet.
 */
export function velgUtvalg<T extends UtvalgEvent>(
	events: T[],
	promotedVenues: Set<string>,
	helg: Helg,
	maks: number
): { utvalg: T[]; promotedIds: Set<string> } {
	// Helgen først også her: en betalende arrangør skal helst vises med noe i helgen.
	const helgFirst = [...events.filter(e => erIHelg(e.date_start, helg)), ...events.filter(e => !erIHelg(e.date_start, helg))];

	const promotedPicks: T[] = [];
	const brukteSteder = new Set<string>();
	for (const e of helgFirst) {
		if (promotedVenues.has(e.venue_name) && !brukteSteder.has(e.venue_name)) {
			promotedPicks.push(e);
			brukteSteder.add(e.venue_name);
		}
	}
	const promotedIds = new Set(promotedPicks.map(e => e.id));
	const rest = events.filter(e => !promotedIds.has(e.id));

	const iHelg = ettergiKategori(blandDager(rest.filter(e => erIHelg(e.date_start, helg))));
	const resten = ettergiKategori(blandDager(rest.filter(e => !erIHelg(e.date_start, helg))));

	return { utvalg: [...promotedPicks, ...iHelg, ...resten].slice(0, maks), promotedIds };
}
