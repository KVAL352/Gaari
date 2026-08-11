import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { load, render, DOC_PATH } from '../consent-doc.js';

// utils.ts importerer supabase.ts, som trenger dotenv fra scripts/package.json.
// CI installerer bare rot-avhengighetene, så uten denne mocken feiler suiten
// med ERR_MODULE_NOT_FOUND i CI, men går grønt lokalt der scripts/node_modules
// finnes. Samme mønster som scripts/lib/__tests__/utils.test.ts.
vi.mock('../supabase.js', () => ({ supabase: {} }));

import { IMAGE_APPROVED_SOURCES, PROMO_APPROVED_SOURCES } from '../utils.js';

/**
 * Bildesamtykke er tre ting som må si det samme: fasiten i consent.json,
 * allowlistene koden faktisk bruker, og dokumentet vi ville vist fram hvis
 * noen krevde å vite hvorfor et bilde lå på gaari.no.
 *
 * Etter omleggingen 2026-08-11 er de to siste avledet fra den første, så de
 * kan ikke lenger si ulike ting ved et uhell. Det som fortsatt kan gå galt er
 * at noen glemmer å regenerere dokumentet, eller redigerer det for hånd. Det
 * er hovedsaken disse testene vokter.
 */
const data = load();

describe('bildesamtykke', () => {
	it('har et dokument som er i takt med fasiten', () => {
		const påDisk = readFileSync(DOC_PATH, 'utf8');
		expect(
			påDisk === render(data),
			'docs/bildesamtykke.md er utdatert eller redigert for hånd. ' +
				'Kjør: npx tsx scripts/consent.ts sync'
		).toBe(true);
	});

	it('gir aldri SoMe-tillatelse uten skriftlig grunnlag', () => {
		const utenSkriftlig = data.kilder
			.filter((k) => k.omfang.includes('some') && k.grunnlag !== 'skriftlig')
			.map((k) => k.slug);
		expect(
			utenSkriftlig,
			'Aktiv promotering krever eksplisitt skriftlig ja, arkivert i Avtaler. ' +
				'Hot-link-varsel og API-vilkår er ikke samtykke.'
		).toEqual([]);
	});

	it('holder promo-listen som en delmengde av visningslisten', () => {
		const kunPromo = [...PROMO_APPROVED_SOURCES].filter((s) => !IMAGE_APPROVED_SOURCES.has(s));
		expect(
			kunPromo,
			'Disse er godkjent for SoMe, men ikke for visning på gaari.no. Det er alltid ' +
				'en feil: vi kan ikke dele et bilde utad som vi ikke engang har lov å vise selv.'
		).toEqual([]);
	});

	it('bygger allowlistene fra fasiten og ingen andre steder', () => {
		const visning = data.kilder.filter((k) => k.omfang.includes('visning')).map((k) => k.slug);
		expect([...IMAGE_APPROVED_SOURCES].sort()).toEqual([...visning].sort());
	});

	it('har ingen kilde oppført to ganger', () => {
		const slugs = data.kilder.map((k) => k.slug);
		const duplikater = slugs.filter((s, i) => slugs.indexOf(s) !== i);
		expect(duplikater, 'Samme kilde står flere ganger i consent.json.').toEqual([]);
	});

	it('kan vise til et bevis for hver eneste kilde', () => {
		const utenBevis = data.kilder.filter((k) => !k.bevis?.trim()).map((k) => k.slug);
		expect(
			utenBevis,
			'Uten en henvisning til hvor tillatelsen ligger er oppføringen bare en påstand.'
		).toEqual([]);
	});

	it('har en dato for ny vurdering på hver kilde', () => {
		const utenFrist = data.kilder
			.filter((k) => !/^\d{4}-\d{2}-\d{2}$/.test(k.vurderesInnen ?? ''))
			.map((k) => k.slug);
		expect(
			utenFrist,
			'Et samtykke uten utløp blir aldri sjekket på nytt, og folk bytter jobb.'
		).toEqual([]);
	});
});
