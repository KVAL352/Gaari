import { describe, it, expect, vi } from 'vitest';

// vi.hoisted fordi vi.mock heises over alt annet. En vanlig const her ville
// vært udefinert når fabrikken kjører.
const spor = vi.hoisted(() => ({
	tabell: '',
	eq: [] as Array<[string, unknown]>,
	/** Radene range() serverer på første side. Tom liste gir tom base. */
	rader: [] as Array<Record<string, unknown>>,
	/** Stier sendt til storage.remove(). */
	fjernet: [] as string[],
	/** Id-er sendt til .delete().in(). */
	slettet: [] as string[]
}));

// Mock supabase and venues before importing dedup
vi.mock('../supabase.js', () => ({
	supabase: {
		from: (tabell: string) => {
			spor.tabell = tabell;
			// Kjeden returnerer seg selv, så rekkefølgen på select/eq/order ikke
			// gjør mocken skjør. range() serverer første side og så ingenting,
			// slik at pagineringen i hentDedupKandidater() avslutter.
			const kjede: Record<string, unknown> = {
				select: () => kjede,
				eq: (kolonne: string, verdi: unknown) => {
					spor.eq.push([kolonne, verdi]);
					return kjede;
				},
				order: () => kjede,
				range: (fra: number) => ({ data: fra === 0 ? spor.rader : [], error: null }),
				delete: () => ({
					in: (_kolonne: string, ider: string[]) => {
						spor.slettet.push(...ider);
						return { error: null };
					}
				})
			};
			return kjede;
		},
		storage: {
			from: () => ({
				remove: (stier: string[]) => {
					spor.fjernet.push(...stier);
					return { error: null };
				}
			})
		}
	}
}));

vi.mock('../venues.js', () => ({
	isAggregatorUrl: (url: string) => {
		const aggregators = ['bergenlive.no', 'barnasnorge.no'];
		return aggregators.some((d) => url.includes(d));
	}
}));

import {
	titlesMatch,
	scoreEvent,
	sammeSted,
	titlerMatcherPaaSammeSted,
	hentDedupKandidater,
	deduplicate,
	type EventRow
} from '../dedup.js';
import { normalizeTitle } from '../utils.js';
import fs from 'fs';
import path from 'path';

describe('hentDedupKandidater', () => {
	it('henter bare publiserte arrangementer', async () => {
		spor.tabell = '';
		spor.eq.length = 0;

		await hentDedupKandidater();

		expect(spor.tabell).toBe('events');
		expect(
			spor.eq,
			'Uten status-filteret sletter dedup innsendinger som ligger til gjennomgang'
		).toContainEqual(['status', 'approved']);
	});

	/**
	 * Tørrkjøringen hadde sin egen kopi av spørringen fram til 24. august 2026.
	 * Da status-filteret kom inn i dedup.ts, ville kopien fortsatt lest pending
	 * -radene, og skriptet ville vist par som kjøringen aldri kunne slettet.
	 * Et skript som lyver om konsekvensen er verre enn ikke å ha det.
	 */
	it('tørrkjøringen henter ikke rader på egen hånd', () => {
		const sti = path.join(import.meta.dirname, '..', '..', 'dedup-dryrun.ts');
		const kode = fs.readFileSync(sti, 'utf-8');

		expect(
			kode.includes("from('events')"),
			'dedup-dryrun.ts må bruke hentDedupKandidater(), ikke sin egen spørring'
		).toBe(false);
		expect(kode).toContain('hentDedupKandidater');
	});
});

describe('deduplicate rydder bildene', () => {
	const BOETTE = 'https://rilwtpluofguyjpzdezi.supabase.co/storage/v1/object/public/event-images/';

	function nullstill(rader: Array<Record<string, unknown>>) {
		spor.rader = rader;
		spor.fjernet = [];
		spor.slettet = [];
		spor.eq = [];
	}

	/**
	 * Dedup var den tredje sletteveien som fjernet raden og lot fila staa igjen.
	 * Bildefiksen 23. august tettet /admin og innsendingsflyten, og dagen etter
	 * lagde dedup et nytt foreldreloest bilde av Kjoett Festival-innsendingen.
	 */
	it('sletter det opplastede bildet til taperen', async () => {
		nullstill([
			{
				id: 'beholdes',
				title_no: 'Kjøtt Festival (18+) — Bergen Kjøtt',
				date_start: '2026-10-23T17:00:00+00:00',
				source: 'bergenkjott',
				venue_name: 'Bergen Kjøtt',
				image_url: 'https://static1.squarespace.com/kjott.jpg',
				ticket_url: 'https://www.bergenkjott.org/kalendar/kjottfestival23okt',
				description_no: null
			},
			{
				id: 'slettes',
				title_no: 'Kjøtt Festival',
				date_start: '2026-10-23T16:00:00+00:00',
				source: 'ticketco',
				venue_name: 'Bergen Kjøtt',
				image_url: BOETTE + 'events/kjott-festival-mt646a0j.png',
				ticket_url: 'https://stiftelsenbergenkjott.ticketco.events/no/nb/e/kjott_festival',
				description_no: null
			}
		]);

		const antall = await deduplicate();

		expect(antall).toBe(1);
		expect(spor.slettet).toEqual(['slettes']);
		expect(
			spor.fjernet,
			'uten dette blir fila liggende i boetta uten et arrangement som peker paa den'
		).toEqual(['events/kjott-festival-mt646a0j.png']);
	});

	/**
	 * fallback/ er DELTE reservebilder per arrangoer. Ett slettet fellesbilde
	 * ville fjernet bildet for alle andre arrangementer som peker paa det.
	 */
	it('roerer ikke fallback-bilder eller hot-linkede bilder', async () => {
		nullstill([
			{
				id: 'beholdes',
				title_no: 'Kjøtt Festival (18+) — Bergen Kjøtt',
				date_start: '2026-10-23T17:00:00+00:00',
				source: 'bergenkjott',
				venue_name: 'Bergen Kjøtt',
				image_url: BOETTE + 'fellesbilde.jpg',
				ticket_url: 'https://www.bergenkjott.org/kalendar/kjottfestival23okt',
				description_no: null
			},
			{
				id: 'slettes',
				title_no: 'Kjøtt Festival',
				date_start: '2026-10-23T16:00:00+00:00',
				source: 'ticketco',
				venue_name: 'Bergen Kjøtt',
				image_url: BOETTE + 'fallback/bergenkjott.jpg',
				ticket_url: 'https://stiftelsenbergenkjott.ticketco.events/no/nb/e/kjott_festival',
				description_no: null
			}
		]);

		const antall = await deduplicate();

		expect(antall).toBe(1);
		expect(spor.slettet).toEqual(['slettes']);
		expect(spor.fjernet).toEqual([]);
	});
});

describe('titlesMatch', () => {
	it('matches exact same strings', () => {
		expect(titlesMatch('konsert på grieghallen', 'konsert på grieghallen')).toBe(true);
	});

	it('exact match works even for short titles', () => {
		// Exact equality check fires before the length guard
		expect(titlesMatch('abc', 'abc')).toBe(true);
	});

	it('rejects short titles for fuzzy matching (< 5 chars)', () => {
		// Non-exact short titles are rejected
		expect(titlesMatch('abcd', 'abcde')).toBe(false);
	});

	it('matches when one contains the other with adequate length ratio', () => {
		// "grieghallenkonsert" (18) contains "grieghallen" (11) → ratio 11/18 = 0.61 > 0.6
		expect(titlesMatch('grieghallenkonsert', 'grieghallen')).toBe(true);
	});

	it('rejects containment when length ratio is too low', () => {
		// "abcdefghijklmnopqrst" (20) contains "abcdef" (6) → ratio 6/20 = 0.3 < 0.6
		expect(titlesMatch('abcdefghijklmnopqrst', 'abcdef')).toBe(false);
	});

	it('matches 90% prefix overlap with similar length', () => {
		// Two strings that share a 90% prefix and are within 1.3x length
		const a = 'abcdefghijk'; // 11 chars
		const b = 'abcdefghijx'; // 11 chars, 90% prefix = "abcdefghij" (10 chars)
		// a includes b's 90% prefix "abcdefghij"? yes
		// length ratio: 11/11 = 1.0 <= 1.3
		expect(titlesMatch(a, b)).toBe(true);
	});

	it('rejects prefix overlap when length ratio exceeds 1.3', () => {
		const short = 'abcdefgh'; // 8 chars
		const long = 'abcdefghabcdefgh'; // 16 chars, ratio 16/8 = 2.0 > 1.3
		expect(titlesMatch(short, long)).toBe(false);
	});

	it('matches same event with different venue suffixes via shared prefix', () => {
		// "Litterær lunsj på Bergen offentlige bibliotek" vs "Litterær lunsj med KODE"
		const a = normalizeTitle('Litterær lunsj på Bergen offentlige bibliotek');
		const b = normalizeTitle('Litterær lunsj med KODE');
		expect(titlesMatch(a, b)).toBe(true);
	});

	it('lar delt prefiks matche når kildene er forskjellige', () => {
		// Uendret oppførsel: to kilder som melder samme arrangement.
		const a = normalizeTitle('Litterær lunsj på Bergen offentlige bibliotek');
		const b = normalizeTitle('Litterær lunsj med KODE');
		expect(titlesMatch(a, b, 'bergenbibliotek', 'ticketco')).toBe(true);
	});

	it('blokkerer delt prefiks når begge kommer fra samme kilde', () => {
		// «Barnas kulturhus:» er 15 tegn normalisert og bærer treffet alene, enda
		// dette er to forskjellige verksteder samme dag. Kilden skiller dem.
		const a = normalizeTitle('Barnas kulturhus: Skrøneverksted og Kunstpilotverksteder');
		const b = normalizeTitle('Barnas kulturhus: Psst!');
		expect(titlesMatch(a, b)).toBe(true); // uten kilder: gammel oppførsel
		expect(titlesMatch(a, b, 'bergenkommune', 'bergenkommune')).toBe(false);
	});

	it('lar samme kilde matche når den ene tittelen er innholdt i den andre', () => {
		// Vernet gjelder bare delt-prefiks-testen. «|| Hulen» hengt på samme
		// tittel er et ekte duplikat, og begge kommer fra ticketco.
		const a = normalizeTitle('Den Store Heavy Metal Festen XXV || Hulen');
		const b = normalizeTitle('Den Store Heavy Metal Festen XXV');
		expect(titlesMatch(a, b, 'ticketco', 'ticketco')).toBe(true);
	});

	it('rejects different events that share a short prefix', () => {
		// "Lørdag på museet: Dinosaurer" vs "Lørdag på museet: Sjøpirater"
		// Different activities — should NOT match
		const a = normalizeTitle('Lørdag på museet: Dinosaurer');
		const b = normalizeTitle('Lørdag på museet: Sjøpirater');
		expect(titlesMatch(a, b)).toBe(false);
	});

	it('does not match completely different titles', () => {
		expect(titlesMatch('konsert grieghallen', 'fotball brann stadion')).toBe(false);
	});

	it('works with normalized titles (real-world scenario)', () => {
		const a = normalizeTitle('Bergenfest 2026 — Dagpass Lørdag');
		const b = normalizeTitle('Bergenfest - Dagpass lørdag');
		// After normalization, years and special chars removed
		expect(titlesMatch(a, b)).toBe(true);
	});
});

describe('scoreEvent', () => {
	const baseEvent: EventRow = {
		id: '1',
		title_no: 'Test',
		date_start: '2026-03-15T19:00:00',
		source: 'bergenlive',
		venue_name: null,
		image_url: null,
		ticket_url: null,
		description_no: null
	};

	it('gives base score from SOURCE_RANK', () => {
		expect(scoreEvent(baseEvent)).toBe(3); // bergenlive = 3
	});

	it('adds 2 for image_url', () => {
		expect(scoreEvent({ ...baseEvent, image_url: 'https://example.com/img.jpg' })).toBe(5);
	});

	it('adds 2 for non-aggregator ticket_url', () => {
		expect(
			scoreEvent({ ...baseEvent, ticket_url: 'https://ticketco.events/something' })
		).toBe(5);
	});

	it('does NOT add ticket bonus for aggregator URLs', () => {
		expect(
			scoreEvent({ ...baseEvent, ticket_url: 'https://bergenlive.no/event/123' })
		).toBe(3);
	});

	it('adds 1 for description longer than 50 chars', () => {
		const longDesc = 'A'.repeat(51);
		expect(scoreEvent({ ...baseEvent, description_no: longDesc })).toBe(4);
	});

	it('does not add description bonus for short descriptions', () => {
		expect(scoreEvent({ ...baseEvent, description_no: 'Short' })).toBe(3);
	});

	it('returns 0 for unknown source', () => {
		expect(scoreEvent({ ...baseEvent, source: 'unknownsource' })).toBe(0);
	});

	it('accumulates all bonuses', () => {
		const fullEvent: EventRow = {
			...baseEvent,
			image_url: 'https://example.com/img.jpg',
			ticket_url: 'https://ticketco.events/buy',
			description_no: 'A'.repeat(60)
		};
		// 3 (bergenlive) + 2 (image) + 2 (ticket) + 1 (description) = 8
		expect(scoreEvent(fullEvent)).toBe(8);
	});
});

describe('sammeSted', () => {
	it('godtar at to kilder skriver navnet ulikt', () => {
		expect(sammeSted('Landmark', 'Landmark Bergen Kunsthall')).toBe(true);
	});

	it('bryr seg ikke om store bokstaver og tegnsetting', () => {
		expect(sammeSted('Cornerteateret ', 'cornerteateret')).toBe(true);
	});

	it('lar ikke et kort navn matche inni et annet', () => {
		// Uten startkravet ville «Bergen» truffet «Bergen Kjøtt».
		expect(sammeSted('Kjøtt', 'Bergen Kjøtt')).toBe(false);
	});

	it('teller aldri generiske stedsnavn som treff', () => {
		// Billettplattformene setter «Bergen» når arrangøren ikke fylte ut noe.
		expect(sammeSted('Bergen', 'Bergen')).toBe(false);
	});

	it('returnerer false når stedet mangler', () => {
		expect(sammeSted(null, 'Hulen')).toBe(false);
	});
});

describe('titlerMatcherPaaSammeSted', () => {
	it('finner samme konsert skrevet ulikt av to kilder', () => {
		expect(
			titlerMatcherPaaSammeSted(
				'Perfect Sounds Forever:Ryan Davis & the Roadhouse Band',
				'Ryan Davis & the Roadhouse Band (US) + Styrofoam Winos',
				'kunsthall',
				'ticketco'
			)
		).toBe(true);
	});

	it('nekter når begge kommer fra samme kilde', () => {
		// To visninger av samme film samme dag. Kilden vet at de er forskjellige.
		expect(
			titlerMatcherPaaSammeSted(
				'Mandagsfilmen matiné: Elskling',
				'Mandagsfilmen: Elskling',
				'bergenbibliotek',
				'bergenbibliotek'
			)
		).toBe(false);
	});

	it('krever mer enn ett felles ord', () => {
		expect(titlerMatcherPaaSammeSted('Konsert med Kari', 'Konsert med Ola', 'a', 'b')).toBe(false);
	});

	it('lar ikke ukedag og maaned alene utgjoere treffet', () => {
		// Begge ender likt fordi datoen er lik. Titlene er ellers ulike.
		expect(
			titlerMatcherPaaSammeSted(
				'Språktrening Loddefjord bibliotek — torsdag 3. september',
				'Språkkafé / Language café — torsdag 3. september',
				'loddefjord',
				'bergenbibliotek'
			)
		).toBe(false);
	});

	it('lar ikke et langt program sluke et kort arrangement', () => {
		expect(
			titlerMatcherPaaSammeSted(
				'Jazz',
				'Jazz, blues, folkemusikk og viser gjennom hele helgen',
				'a',
				'b'
			)
		).toBe(false);
	});
});
