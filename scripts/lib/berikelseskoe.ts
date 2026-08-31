/**
 * Rekkefoelgen paa koeen til berikelsen.
 *
 * HVORFOR DENNE FINNES
 *
 * descriptions.yml tok koeen som «de foerste 300 sortert paa id» blant rader
 * med beskrivelse under 170 tegn. Rader den ikke klarte aa forbedre fikk ingen
 * markering, saa de laa foerst i koeen igjen neste dag, og dagen etter.
 *
 * Kjoeringen 30. august 2026 behandlet 300 rader og forbedret 72. De 228 andre
 * var rader uten omtale paa kildesida (122), rader der resultatet ikke ble
 * bedre (52), og sider som ikke lot seg hente (54). Alle 228 blokkerte de
 * samme plassene dagen etter. Med rundt 80 nye arrangementer i doegnet vokste
 * koeen paa 1 022 sakte i stedet for aa toemmes, mens jobben var groenn hver
 * dag.
 *
 * Ligger i egen fil fordi backfill-descriptions-from-source.ts kaller main()
 * ved import. En test kan derfor ikke importere derfra uten aa starte jobben.
 */

export interface KoeRad {
	description_tried_at: string | null;
}

/**
 * Aldri forsoekt foerst, deretter de som ble forsoekt for lengst siden.
 *
 * Ingen hard sperre etter N forsoek, med vilje: en arrangoer kan legge ut
 * omtalen senere, og da skal raden kunne hentes inn igjen. Rekkefoelgen
 * nedprioriterer den, den utelukker den ikke.
 *
 * Sorterer en kopi. Kallstedet leser `aldriForsoekt` av samme liste, og en
 * sortering paa stedet har bitt oss foer.
 */
export function sorterBerikelseskoe<T extends KoeRad>(rader: T[]): T[] {
	return [...rader].sort((a, b) => {
		if (!a.description_tried_at && !b.description_tried_at) return 0;
		if (!a.description_tried_at) return -1;
		if (!b.description_tried_at) return 1;
		return a.description_tried_at < b.description_tried_at ? -1
			: a.description_tried_at > b.description_tried_at ? 1 : 0;
	});
}
