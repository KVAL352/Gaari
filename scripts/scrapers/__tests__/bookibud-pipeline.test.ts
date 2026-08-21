import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Feeden 21. august 2026 hadde ingen avlysninger, ingen utsolgte og ingen
 * flerdagsarrangementer. Tre grener i scraperen var altsaa skrevet uten at noe
 * data hadde vaert innom dem. Paginering var den fjerde: den virket, men bare
 * fordi feeden tilfeldigvis hadde tre sider den dagen.
 *
 * Her mates scrape() med en oppdiktet feed, slik at grenene faktisk kjoerer.
 * insertEvent og deleteEventByUrl er mocket — dette skal aldri roere basen.
 */
const insertEvent = vi.fn(async () => true);
const deleteEventByUrl = vi.fn(async () => true);
const eventExists = vi.fn(async () => false);

vi.mock('../../lib/utils.js', async (original) => {
	const ekte = await original<typeof import('../../lib/utils.js')>();
	return {
		...ekte,
		// Bare I/O-en byttes ut. makeSlug og bergenOffset er rene og beholdes.
		insertEvent: (...a: unknown[]) => insertEvent(...(a as [])),
		deleteEventByUrl: (...a: unknown[]) => deleteEventByUrl(...(a as [])),
		eventExists: (...a: unknown[]) => eventExists(...(a as [])),
		delay: async () => {}
	};
});

vi.mock('../../lib/ai-descriptions.js', () => ({
	generateDescription: async () => ({ no: 'no-tekst', en: 'en-tekst', title_en: 'en-tittel' })
}));

const { scrape } = await import('../bookibud.js');

const BASE = {
	venueName: 'Bergen Street Food',
	address: { street: 'Christies gate 13', zip: '5015', city: 'Bergen', country: 'Norway' },
	organizer: { id: 'o1', name: 'Bergen Street Food', linkname: 'bergen-street-food' },
	images: [{ role: 'COVER', original: 'https://eksempel.test/bilde.webp' }],
	category: null,
	isCancelled: false,
	isSoldOut: false,
	isFree: true,
	priceFrom: null
};

function rad(over: Record<string, unknown>) {
	return { ...BASE, ...over };
}

/** Serverer radene sidevis, slik API-et gjoer. */
function serverFeed(rader: unknown[], sideStorrelse = 25, oppgittTotal?: number) {
	const totalPages = Math.max(1, Math.ceil(rader.length / sideStorrelse));
	return vi.fn(async (url: string) => {
		const side = Number(new URL(url).searchParams.get('page') ?? '1');
		const data = rader.slice((side - 1) * sideStorrelse, side * sideStorrelse);
		return {
			ok: true,
			status: 200,
			json: async () => ({
				data,
				page: side,
				pageSize: sideStorrelse,
				total: oppgittTotal ?? rader.length,
				totalPages
			})
		};
	});
}

function lagtInn() {
	return insertEvent.mock.calls.map((c) => c[0] as Record<string, unknown>);
}

beforeEach(() => {
	insertEvent.mockClear();
	deleteEventByUrl.mockClear();
	eventExists.mockClear();
	process.env.BOOKIBUD_API_KEY = 'test-noekkel-brukes-aldri-mot-et-ekte-endepunkt';
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('bookibud — paginering', () => {
	it('henter alle sidene, ikke bare den foerste', async () => {
		const rader = Array.from({ length: 7 }, (_, i) =>
			rad({
				id: `e${i}:2026-09-0${i + 1}`,
				eventId: `e${i}`,
				title: `Arrangement ${i}`,
				day: `2026-09-0${i + 1}`,
				url: `https://bookibud.com/x/event/a${i}?date=2026-09-0${i + 1}`,
				start: `2026-09-0${i + 1}T19:00:00+02:00`
			})
		);
		const fetchMock = serverFeed(rader, 3); // 3 sider: 3 + 3 + 1
		vi.stubGlobal('fetch', fetchMock);

		const res = await scrape();

		expect(fetchMock).toHaveBeenCalledTimes(3);
		const sider = fetchMock.mock.calls.map((c) => new URL(c[0] as string).searchParams.get('page'));
		expect(sider).toEqual(['1', '2', '3']);
		expect(res.found).toBe(7);
		expect(res.inserted).toBe(7);
	});

	it('sier fra naar antallet ikke stemmer med total', async () => {
		const advarsel = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const rader = [
			rad({
				id: 'e1:2026-09-05',
				eventId: 'e1',
				title: 'Ett arrangement',
				day: '2026-09-05',
				url: 'https://bookibud.com/x/event/a1?date=2026-09-05',
				start: '2026-09-05T19:00:00+02:00'
			})
		];
		// API-et paastaar 9, men leverer 1. Uten advarselen ser det ut som en hel henting.
		vi.stubGlobal('fetch', serverFeed(rader, 25, 9));

		await scrape();

		expect(advarsel.mock.calls.flat().join(' ')).toContain('API-et oppgir 9');
		advarsel.mockRestore();
	});
});

describe('bookibud — flerdagsarrangementer', () => {
	const flerdagers = [
		rad({
			id: 'f1:2026-09-10',
			eventId: 'f1',
			title: 'Tredagersfestival',
			day: '2026-09-10',
			url: 'https://bookibud.com/x/event/fest?date=2026-09-10',
			start: '2026-09-10T18:00:00+02:00',
			end: '2026-09-10T23:00:00+02:00'
		}),
		rad({
			id: 'f1:2026-09-12',
			eventId: 'f1',
			title: 'Tredagersfestival',
			day: '2026-09-12',
			url: 'https://bookibud.com/x/event/fest?date=2026-09-12',
			start: '2026-09-12T18:00:00+02:00',
			end: '2026-09-12T23:00:00+02:00'
		})
	];

	it('blir EN rad, ikke to duplikater', async () => {
		vi.stubGlobal('fetch', serverFeed(flerdagers));
		const res = await scrape();

		expect(res.found).toBe(1);
		expect(insertEvent).toHaveBeenCalledTimes(1);
	});

	it('faar date_end fra den siste dagen', async () => {
		vi.stubGlobal('fetch', serverFeed(flerdagers));
		await scrape();

		const e = lagtInn()[0];
		expect(e.date_start).toBe(new Date('2026-09-10T18:00:00+02:00').toISOString());
		expect(e.date_end).toBe(new Date('2026-09-12T23:00:00+02:00').toISOString());
	});

	it('lar date_end staa tom paa endagsarrangementer', async () => {
		// En nattklubb som stenger 03:00 ville ellers ligge ute dagen etter.
		vi.stubGlobal(
			'fetch',
			serverFeed([
				rad({
					id: 'n1:2026-09-11',
					eventId: 'n1',
					title: 'Nattklubb',
					day: '2026-09-11',
					url: 'https://bookibud.com/x/event/natt?date=2026-09-11',
					start: '2026-09-11T22:30:00+02:00',
					end: '2026-09-12T03:00:00+02:00',
					category: 'Club Night'
				})
			])
		);
		await scrape();

		expect(lagtInn()[0].date_end).toBeUndefined();
	});
});

describe('bookibud — avlysning og utsolgt', () => {
	it('sletter et avlyst arrangement i stedet for aa legge det inn', async () => {
		vi.stubGlobal(
			'fetch',
			serverFeed([
				rad({
					id: 'a1:2026-09-20',
					eventId: 'a1',
					title: 'Avlyst konsert',
					day: '2026-09-20',
					url: 'https://bookibud.com/x/event/avlyst?date=2026-09-20',
					start: '2026-09-20T19:00:00+02:00',
					isCancelled: true
				})
			])
		);
		await scrape();

		expect(deleteEventByUrl).toHaveBeenCalledWith(
			'https://bookibud.com/x/event/avlyst?date=2026-09-20'
		);
		expect(insertEvent).not.toHaveBeenCalled();
	});

	it('sletter et utsolgt arrangement', async () => {
		vi.stubGlobal(
			'fetch',
			serverFeed([
				rad({
					id: 'u1:2026-09-21',
					eventId: 'u1',
					title: 'Utsolgt show',
					day: '2026-09-21',
					url: 'https://bookibud.com/x/event/utsolgt?date=2026-09-21',
					start: '2026-09-21T19:00:00+02:00',
					isSoldOut: true
				})
			])
		);
		await scrape();

		expect(deleteEventByUrl).toHaveBeenCalledTimes(1);
		expect(insertEvent).not.toHaveBeenCalled();
	});

	it('bruker foerste dag som ikke er avlyst naar bare noen dager er det', async () => {
		vi.stubGlobal(
			'fetch',
			serverFeed([
				rad({
					id: 'p1:2026-09-22',
					eventId: 'p1',
					title: 'Serie',
					day: '2026-09-22',
					url: 'https://bookibud.com/x/event/serie?date=2026-09-22',
					start: '2026-09-22T19:00:00+02:00',
					isCancelled: true
				}),
				rad({
					id: 'p1:2026-09-23',
					eventId: 'p1',
					title: 'Serie',
					day: '2026-09-23',
					url: 'https://bookibud.com/x/event/serie?date=2026-09-23',
					start: '2026-09-23T19:00:00+02:00'
				})
			])
		);
		await scrape();

		expect(deleteEventByUrl).not.toHaveBeenCalled();
		const e = lagtInn()[0];
		expect(e.source_url).toBe('https://bookibud.com/x/event/serie?date=2026-09-23');
		expect(e.date_start).toBe(new Date('2026-09-23T19:00:00+02:00').toISOString());
	});
});

describe('bookibud — feltene som havner i basen', () => {
	it('setter ticket_url bare naar arrangementet koster noe', async () => {
		vi.stubGlobal(
			'fetch',
			serverFeed([
				rad({
					id: 'g1:2026-09-24',
					eventId: 'g1',
					title: 'Gratis quiz',
					day: '2026-09-24',
					url: 'https://bookibud.com/x/event/quiz?date=2026-09-24',
					start: '2026-09-24T19:00:00+02:00',
					isFree: true
				}),
				rad({
					id: 'b1:2026-09-25',
					eventId: 'b1',
					title: 'Betalt show',
					day: '2026-09-25',
					url: 'https://bookibud.com/x/event/show?date=2026-09-25',
					start: '2026-09-25T19:00:00+02:00',
					isFree: false,
					priceFrom: { amount: 14200, currency: 'NOK' }
				})
			])
		);
		await stille(scrape);

		const [gratis, betalt] = lagtInn();
		expect(gratis.price).toBe('Gratis');
		expect(gratis.ticket_url).toBeUndefined();
		expect(betalt.price).toBe('142 kr');
		expect(betalt.ticket_url).toBe('https://bookibud.com/x/event/show?date=2026-09-25');
	});

	it('hopper over rader uten eventId, tittel eller url', async () => {
		vi.stubGlobal(
			'fetch',
			serverFeed([
				rad({ id: 'x:1', eventId: '', title: 'Uten id', day: '2026-09-26', url: 'https://a.test/1', start: '2026-09-26T19:00:00+02:00' }),
				rad({ id: 'x:2', eventId: 'e2', title: '   ', day: '2026-09-26', url: 'https://a.test/2', start: '2026-09-26T19:00:00+02:00' }),
				rad({ id: 'x:3', eventId: 'e3', title: 'Uten url', day: '2026-09-26', url: '', start: '2026-09-26T19:00:00+02:00' }),
				rad({
					id: 'x:4',
					eventId: 'e4',
					title: 'Den eneste gyldige',
					day: '2026-09-26',
					url: 'https://bookibud.com/x/event/ok?date=2026-09-26',
					start: '2026-09-26T19:00:00+02:00'
				})
			])
		);
		const res = await scrape();

		expect(res.found).toBe(1);
		expect(lagtInn()[0].title_no).toBe('Den eneste gyldige');
	});
});

/** Demper console.log fra scraperen naar en test ellers ville druknet i utskrift. */
async function stille<T>(fn: () => Promise<T>): Promise<T> {
	const logg = vi.spyOn(console, 'log').mockImplementation(() => {});
	try {
		return await fn();
	} finally {
		logg.mockRestore();
	}
}
