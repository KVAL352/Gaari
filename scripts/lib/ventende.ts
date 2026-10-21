/**
 * Køene som venter på et menneske, definert ett sted.
 *
 * Digesten talte `organizer_inquiries` med status `pending`, men raden får
 * `new`. Tallet var derfor alltid 0, og den eldste henvendelsen hadde ligget
 * ubesvart siden 13. april da det ble oppdaget 21. oktober 2026. Statusen står
 * nå her, og testen sjekker at admin-ops.ts teller den samme.
 */

export type KoNokkel = 'corrections' | 'submissions' | 'optouts' | 'inquiries';

export interface Ko {
	nokkel: KoNokkel;
	tabell: string;
	status: string;
	etikett: string;
	url: string;
}

export const KOER: readonly Ko[] = [
	{ nokkel: 'corrections', tabell: 'edit_suggestions', status: 'pending', etikett: 'Rettelser', url: '/admin/corrections' },
	{ nokkel: 'submissions', tabell: 'events', status: 'pending', etikett: 'Arrangementer', url: '/admin/submissions' },
	{ nokkel: 'optouts', tabell: 'opt_out_requests', status: 'pending', etikett: 'Datahenvendelser', url: '/admin/optouts' },
	{ nokkel: 'inquiries', tabell: 'organizer_inquiries', status: 'new', etikett: 'Henvendelser', url: '/admin/innsendelser' }
];

/**
 * Alt som ligger i en kø løftes opp under «Trenger oppmerksomhet», også det
 * som kom i går. Varselet ved ankomst går til innboksen og drukner der, så
 * digesten er stedet der ingenting skal kunne bli liggende. Alderen vises ved
 * siden av, slik at det eldste ses først.
 */
export const MAKS_VENTEDAGER = 0;

/** Hele døgn siden `createdAt`, eller null når køen er tom. */
export function ventedager(createdAt: string | null, naa: Date): number | null {
	if (!createdAt) return null;
	return Math.floor((naa.getTime() - new Date(createdAt).getTime()) / 86_400_000);
}

export function harVentetForLenge(dager: number | null): boolean {
	return dager !== null && dager >= MAKS_VENTEDAGER;
}
