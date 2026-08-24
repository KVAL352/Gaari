import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
	load,
	loadOffentlig,
	loadPrivat,
	render,
	nyKilde,
	settInn,
	standardFrist,
	DOC_PATH,
	CONSENT_PATH
} from '../consent-doc.js';

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

	it('gir aldri SoMe-tillatelse uten dokumentert grunnlag', () => {
		const utenDokumentasjon = data.kilder
			.filter((k) => k.omfang.includes('some') && k.grunnlag !== 'dokumentert')
			.map((k) => k.slug);
		expect(
			utenDokumentasjon,
			'Aktiv promotering krever et dokumentert ja, enten som e-post i Avtaler eller ' +
				'som lydopptak. Hot-link-varsel og API-vilkår er ikke samtykke.'
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

	it('nekter SoMe uten dokumentert grunnlag også når noen registrerer en ny kilde', () => {
		expect(() =>
			nyKilde({
				slug: 'test',
				navn: 'Test',
				dato: '2026-08-11',
				grunnlag: 'hotlink',
				omfang: ['visning', 'some'],
				bevis: 'Avtaler'
			})
		).toThrow(/krever grunnlag dokumentert/);
	});

	it('nekter omfang uten visning', () => {
		expect(() =>
			nyKilde({ slug: 'test', navn: 'Test', dato: '2026-08-11', omfang: ['some'], bevis: 'Avtaler' })
		).toThrow(/må alltid inkludere visning/);
	});

	it('nekter en oppføring uten bevis', () => {
		expect(() =>
			nyKilde({ slug: 'test', navn: 'Test', dato: '2026-08-11', omfang: ['visning'], bevis: '  ' })
		).toThrow(/Mangler bevis/);
	});

	it('nekter å overskrive en eksisterende kilde uten at man ber om det', () => {
		const kilde = nyKilde({
			slug: 'akvariet',
			navn: 'Akvariet',
			dato: '2026-08-11',
			omfang: ['visning'],
			bevis: 'Avtaler'
		});
		expect(() => settInn(data, kilde)).toThrow(/finnes allerede/);
		expect(settInn(data, kilde, true).kilder).toHaveLength(data.kilder.length);
	});

	it('setter toårsfrist, også over skuddår', () => {
		expect(standardFrist('2026-08-11')).toBe('2028-08-11');
		expect(standardFrist('2026-02-29')).toBe('2028-02-29');
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

/**
 * Repoet er offentlig. Fram til 2026-08-13 lå 18 navngitte kontakter, 8
 * e-postadresser og 6 ordrette sitater fra privat korrespondanse i fasiten, og
 * dermed på nett. Delingen fjernet dem, men uten en test er det ingenting som
 * hindrer at neste oppføring legger dem tilbake.
 *
 * Disse testene leser filene på disk med vilje, ikke den sammenslåtte modellen.
 * Det er nettopp det som havner i en commit som er interessant her.
 */
describe('ingen personopplysninger i det som committes', () => {
	const EPOST = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
	const råJson = readFileSync(CONSENT_PATH, 'utf8');
	const råDok = readFileSync(DOC_PATH, 'utf8');
	const offentlig = loadOffentlig();

	it('den offentlige fasiten har ingen e-postadresser', () => {
		expect(råJson.match(EPOST) ?? [], 'scripts/lib/consent.json lekker e-post.').toEqual([]);
	});

	it('det offentlige dokumentet har ingen e-postadresser', () => {
		expect(råDok.match(EPOST) ?? [], 'docs/bildesamtykke.md lekker e-post.').toEqual([]);
	});

	it('den offentlige fasiten har ingen kontakt-, epost- eller merknadsfelt', () => {
		const lekker = offentlig.kilder
			.filter((k) => 'kontakt' in k || 'epost' in k || 'merknad' in k)
			.map((k) => k.slug);
		expect(
			lekker,
			'Personopplysninger hører i private/consent-private.json. Kjør: npx tsx scripts/consent.ts sync'
		).toEqual([]);
	});

	it('avslagene er uten kontaktperson og uten sitat', () => {
		const lekker = offentlig.avslag.filter((a) => 'kontakt' in a || 'sitat' in a).map((a) => a.navn);
		expect(lekker, 'Sitater fra privat korrespondanse hører i private/.').toEqual([]);
	});

	it('ingen kontaktnavn fra den private halvdelen dukker opp i dokumentet', () => {
		// Går bare når private/ finnes, altså på eierens maskin. I CI er det
		// ingenting å sammenligne med, og da er testen triviell.
		const priv = loadPrivat();
		const navn = Object.values(priv.kilder)
			.map((p) => p.kontakt)
			.filter((n): n is string => !!n);
		const funnet = navn.filter((n) => råDok.includes(n) || råJson.includes(n));
		expect(funnet, 'Et navn fra korrespondansen har havnet i en offentlig fil.').toEqual([]);
	});

	it('dokumentet er identisk med og uten den private halvdelen', () => {
		// Kjernen i at CI kan kjøre uten private/. Ville render() lest et privat
		// felt, ville dokumentet sett ulikt ut på de to maskinene, og
		// «er dokumentet i takt med fasiten» ville feilet tilfeldig i CI.
		const utenPrivat = render(offentlig);
		const medPrivat = render(load());
		expect(medPrivat).toBe(utenPrivat);
	});
});
