/**
 * Hvem får være med i Gåris egne kanaler, og hvor ofte.
 *
 * Regelen lå tidligere bare i generate-posts.ts. generate-reels.ts hadde den
 * ikke i det hele tatt, så Akvariet, som alltid skal være begrenset, kunne gå
 * fritt i ukens reels. Samme feiltype som samtykkeregisteret hadde: en regel
 * håndhevet ett sted og stille fraværende et annet.
 *
 * Derfor bor listen og vurderingen her, og begge generatorene leser fra samme
 * sted. Skal en tredje kanal bygges senere, importerer den herfra og arver
 * regelen i stedet for å gjenskape den.
 *
 * MERK: dette er en kommersiell regel, ikke en juridisk. Bildesamtykke er en
 * annen ting og styres av scripts/lib/consent.json. Et arrangement må passere
 * begge: samtykke sier om vi har lov, denne sier om vi vil.
 */
import { supabase } from '../lib/supabase.js';
import { DEDUP_PAIRS } from './dedup.js';

/**
 * Venues som hardt begrenses til én visning per uke inntil de betaler.
 *
 * Akvariet er B2B-prospekt med høy eksponeringsverdi. Vi gir ikke bort det vi
 * prøver å selge. Blir de Partner-kunde, faller begrensningen bort automatisk,
 * fordi partnerstatus hentes fra promoted_placements og ikke fra denne fila.
 */
export const CAPPED_VENUES = new Set<string>(['Akvariet i Bergen']);

/** Mandag denne uken, i Oslo-tid, som ÅÅÅÅ-MM-DD. */
export function mandagDenneUken(now = new Date()): string {
	const oslo = new Date(now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' }));
	const ukedag = oslo.getDay(); // 0 = søndag
	oslo.setDate(oslo.getDate() - (ukedag === 0 ? 6 : ukedag - 1));
	return oslo.toISOString().slice(0, 10);
}

/**
 * Venue-navn som har vært publisert siden mandag, med antall.
 *
 * Leser `social_posts`, som både karuseller og reels skriver til, så tellingen
 * går på tvers av kanaler. Det er poenget: «én gang i uken» skal bety én gang
 * totalt, ikke én gang per format.
 *
 * Parede samlinger som denne-helgen og this-weekend teller ikke mot hverandre,
 * siden de er samme innhold på to språk.
 */
export async function ukensVenueNavn(currentSlug: string): Promise<Map<string, number>> {
	const paret = DEDUP_PAIRS[currentSlug];
	const utelat = [currentSlug, ...(paret ? [paret] : [])];

	const { data: posts } = await supabase
		.from('social_posts')
		.select('collection_slug, event_ids')
		.gte('generated_date', mandagDenneUken())
		.not('event_ids', 'is', null);

	if (!posts) return new Map();

	const eventIds: string[] = [];
	for (const post of posts) {
		if (utelat.includes(post.collection_slug)) continue;
		if (Array.isArray(post.event_ids)) eventIds.push(...post.event_ids);
	}
	if (eventIds.length === 0) return new Map();

	const { data: events } = await supabase.from('events').select('venue_name').in('id', eventIds);

	const antall = new Map<string, number>();
	for (const e of events ?? []) antall.set(e.venue_name, (antall.get(e.venue_name) ?? 0) + 1);
	return antall;
}

export type PartnerVenue = {
	venue_name: string;
	/** Andel av plassene de er garantert, fra promoted_placements. */
	slot_share: number;
};

/**
 * Aktive Partner-kunder med rett til plass i sosiale medier.
 *
 * Kun Partner-nivået gir SoMe-plassering. Basis og Standard er nettside og
 * nyhetsbrev. Hentes fra promoted_placements, ikke fra en liste i koden, så en
 * kunde som slutter å betale mister fordelen automatisk.
 */
export async function hentPartnere(): Promise<PartnerVenue[]> {
	const iDag = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' }).slice(0, 10);
	const { data } = await supabase
		.from('promoted_placements')
		.select('venue_name, tier, slot_share')
		.eq('active', true)
		.eq('tier', 'partner')
		.lte('start_date', iDag)
		.or(`end_date.is.null,end_date.gte.${iDag}`);

	return (data ?? []).map((d: { venue_name: string; slot_share: number }) => ({
		venue_name: d.venue_name,
		slot_share: d.slot_share
	}));
}

export type VenueVurdering = {
	/** Venues som ikke skal med i det hele tatt denne uken. */
	blokkert: Set<string>;
	/** Venues som er sett denne uken og bør vike for dem som ikke er det. */
	nedprioritert: Set<string>;
	/** Betalende partnere. Unntatt fra begge deler. */
	partnere: Set<string>;
};

/**
 * Avgjør hvilke venues som er blokkert eller bør vike, gitt hva som allerede er
 * publisert denne uken.
 *
 * `ukensVenues` er venue-navn som allerede har vært ute siden mandag. Den
 * hentes ulikt i de to generatorene, siden de lagrer historikk forskjellig, så
 * den sendes inn i stedet for å hentes her.
 */
export async function vurderVenues(ukensVenues: Iterable<string>): Promise<VenueVurdering> {
	const partnerVenues = await hentPartnere();
	const partnere = new Set<string>(partnerVenues.map((p) => p.venue_name));

	const blokkert = new Set<string>();
	const nedprioritert = new Set<string>();

	for (const venue of ukensVenues) {
		if (partnere.has(venue)) continue;
		if (CAPPED_VENUES.has(venue)) blokkert.add(venue);
		else nedprioritert.add(venue);
	}

	return { blokkert, nedprioritert, partnere };
}

/**
 * Filtrerer bort arrangementer fra blokkerte venues.
 *
 * Egen funksjon fordi det er dette steget generate-reels.ts manglet. En
 * generator som glemmer å kalle den vil fortsatt kompilere, men da fanges det
 * av venue-policy.test.ts, som sjekker at hver publiserende generator
 * importerer herfra.
 */
export function fjernBlokkerte<T extends { venue_name: string }>(
	events: T[],
	blokkert: Set<string>
): T[] {
	if (blokkert.size === 0) return events;
	return events.filter((e) => !blokkert.has(e.venue_name));
}
