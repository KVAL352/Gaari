/**
 * Hva en utstilling er. Én fasit for samlingen «utstillinger» og for
 * 14-dagersgrensen i hentingen av arrangementer (hent-arrangementer.ts):
 * pågående utstillinger har gammel date_start og skulle falt ut av grensen,
 * men er nettopp det samlingen skal vise.
 *
 * Egen liten fil fordi forsiden ikke skal dra med seg hele collections.ts.
 */

// Exhibition / gallery filter — only true exhibition venues or exhibition-keyword titles
export const EXHIBITION_VENUE_RE = /\b(KODE|Bergen Kunsthall|Bymuseet|Museum Vest|BEK|Bryggens Museum|Håkonshallen|Schøtstuene|Rosenkrantztårnet|Permanenten|Lysverket|Stenersen|Rasmus Meyer|Gamle Bergen|Damsgård|Hordamuseet|Norsk Trikotasjemuseum|Norges Fiskerimuseum|Vil[\s-]?Vite)\b/i;
export const EXHIBITION_TITLE_RE = /\b([a-zæøå]*utstilling|åpning|vernissage|exhibition|kunstutstilling|gallerivandring|kunstvandring|book\s*fair|art\s*book|kunstvisning|samling)\b/i;
export const NON_EXHIBITION_TITLE_RE = /\b(kafé|kafe|café|cafe|spillkveld|padling|paddl|vinsmaking|matkurs|matklubb|trylleshow|quiz|nabolagsk|brunsj|frokost|lunsj|middag|konsert|jazz|disko|klubb|pub|bar|drop[\s-]?in|familiesøndag|familielørdag|verksted|workshop|forelesning|debatt|foredrag|panel|filmkveld|kinokveld|litteratur|forfatterkveld|babysang|yoga|trening|svømming|løpetur|hiketur|fjelltur|kor(et)?)\b/i;

export interface UtstillingsRad {
	category?: string | null;
	title_no?: string | null;
	venue_name?: string | null;
}

/** Samme regel som samlingen «utstillinger» bruker for å si at en rad er en utstilling. */
export function erUtstilling(e: UtstillingsRad): boolean {
	if (e.category !== 'culture') return false;
	// Defensive title filter — exclude clearly non-exhibition activities that
	// occasionally get tagged as 'culture' (cafés, paddling, wine tasting, film nights, etc.)
	const title = e.title_no || '';
	if (NON_EXHIBITION_TITLE_RE.test(title)) return false;
	// Only include events that are either at a recognised exhibition venue
	// OR whose title clearly signals an exhibition / opening / vernissage.
	// Linjeskift og ekstra mellomrom i venue_name skal ikke hindre treff (Rasmus Meyer hadde linjeskift).
	const venue = (e.venue_name || '').replace(/\s+/g, ' ');
	return EXHIBITION_VENUE_RE.test(venue) || EXHIBITION_TITLE_RE.test(title);
}
