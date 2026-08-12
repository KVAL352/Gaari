import { describe, it, expect, vi } from 'vitest';
import { byggRapport, type GapEvent } from '../consent-gap.js';
import { load, type ConsentFile } from '../consent-doc.js';

// Samme grunn som i bildesamtykke.test.ts: utils.ts drar med seg supabase.ts,
// og CI installerer bare rot-avhengighetene.
vi.mock('../supabase.js', () => ({ supabase: {} }));

import { PROMO_APPROVED_SOURCES } from '../utils.js';

/**
 * Rapporten skal svare på ett spørsmål: hvem koster det oss mest å ikke ha
 * spurt. Feilen som gjør den verdiløs er at den regner noen som godkjent som
 * koden ikke regner som godkjent. Da ser hullet mindre ut enn det er, og vi
 * spør feil arrangør først.
 */
function kilde(over: Partial<ConsentFile['kilder'][number]> & { slug: string }) {
	return {
		navn: over.slug,
		kontakt: null,
		epost: null,
		dato: '2026-01-01',
		grunnlag: 'dokumentert' as const,
		omfang: ['visning'],
		bevis: 'Avtaler',
		merknad: null,
		vurderesInnen: '2028-01-01',
		...over
	};
}

const fil = (kilder: ReturnType<typeof kilde>[]): ConsentFile => ({ kilder, avslag: [] });

const ev = (source: string | null, medBilde: boolean): GapEvent => ({
	source,
	image_url: medBilde ? 'https://eksempel.no/bilde.jpg' : null
});

describe('consent-gap', () => {
	it('bruker samme regel for promotering som koden selv', () => {
		const data = load();
		const rapport = byggRapport(
			data.kilder.map((k) => ev(k.slug, true)),
			data
		);
		const iRapporten = rapport.harAlleredeJa.map((r) => r.slug).sort();
		expect(
			iRapporten,
			'Rapporten og PROMO_APPROVED_SOURCES er ute av takt. Da viser gap-kommandoen ' +
				'et annet hull enn det generatoren faktisk møter.'
		).toEqual([...PROMO_APPROVED_SOURCES].sort());
	});

	it('teller bare arrangementer som har et bilde', () => {
		const data = fil([kilde({ slug: 'et-sted' })]);
		const r = byggRapport([ev('et-sted', true), ev('et-sted', false), ev('et-sted', false)], data);
		expect(r.totalt).toBe(3);
		expect(r.medBilde).toBe(1);
		expect(r.spør[0]).toMatchObject({ slug: 'et-sted', antall: 3, medBilde: 1 });
	});

	it('regner et ja til visning alene som et hull, ikke som samtykke', () => {
		const data = fil([kilde({ slug: 'bare-visning', omfang: ['visning'] })]);
		const r = byggRapport([ev('bare-visning', true)], data);
		expect(r.promoterbare).toBe(0);
		expect(r.laste).toBe(1);
		expect(r.spør.map((x) => x.slug)).toEqual(['bare-visning']);
	});

	it('nekter å regne hot-link-varsel som promoteringsgrunnlag', () => {
		// Fila skal aldri se slik ut; nyKilde() nekter å lage den. Testen finnes
		// fordi rapporten ikke får lov å være mildere enn utils.ts hvis noen
		// likevel redigerer JSON-en for hånd.
		const data = fil([kilde({ slug: 'varslet', grunnlag: 'hotlink', omfang: ['visning', 'some'] })]);
		const r = byggRapport([ev('varslet', true)], data);
		expect(r.promoterbare).toBe(0);
		expect(r.spør.map((x) => x.slug)).toEqual(['varslet']);
	});

	it('skiller aggregatorer ut, siden de ikke kan samtykke for andre', () => {
		const data = fil([kilde({ slug: 'ticketco', grunnlag: 'hotlink' })]);
		const r = byggRapport([ev('ticketco', true)], data);
		expect(r.spør).toEqual([]);
		expect(r.aggregatorer.map((x) => x.slug)).toEqual(['ticketco']);
	});

	it('viser kilder som mangler en samtykkerad helt', () => {
		const r = byggRapport([ev('ukjent-kilde', true)], fil([]));
		expect(r.utenforRegisteret.map((x) => x.slug)).toEqual(['ukjent-kilde']);
		expect(r.laste).toBe(1);
	});

	it('sorterer etter hva som står på spill, ikke etter navn', () => {
		const data = fil([kilde({ slug: 'aaa' }), kilde({ slug: 'zzz' })]);
		const events = [...Array(3)].map(() => ev('zzz', true)).concat(ev('aaa', true));
		expect(byggRapport(events, data).spør.map((x) => x.slug)).toEqual(['zzz', 'aaa']);
	});

	it('tar med kilder som har ja men ingen kommende arrangementer', () => {
		const data = fil([kilde({ slug: 'stille', omfang: ['visning', 'some'] })]);
		const r = byggRapport([], data);
		expect(r.harAlleredeJa.map((x) => x.slug)).toEqual(['stille']);
		expect(r.promoterbare).toBe(0);
	});

	it('lar hvert bilde havne i nøyaktig én bøtte', () => {
		const data = load();
		const events = data.kilder.map((k) => ev(k.slug, true)).concat(ev('ukjent', true), ev('ticketco', true));
		const r = byggRapport(events, data);
		expect(r.promoterbare + r.laste).toBe(r.medBilde);
	});
});
