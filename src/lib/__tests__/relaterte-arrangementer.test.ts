import { describe, it, expect, vi, beforeEach } from 'vitest';

// «Flere i samme kategori» på arrangementssiden.
//
// Feilen dette fanger (funnet 18. nov 2026): spørringen hadde ikke noe
// datofilter og sorterte stigende, så hver side i en kategori fikk de fire
// ELDSTE radene. Det ble langvarige arrangementer som startet for måneder
// siden, med utdatert pristekst. Lokkeduene var heller ikke filtrert bort.
//
// Testen kjører den ekte load-funksjonen mot en liten minnebase, og ser på
// hvilke rader som kommer ut, ikke på hvilke metoder som ble kalt.

type Rad = Record<string, unknown>;
let rader: Rad[] = [];

function spørring(alle: Rad[]) {
	let r = [...alle];
	let enkelt = false;
	const q = {
		select: () => q,
		eq: (k: string, v: unknown) => ((r = r.filter((x) => x[k] === v)), q),
		neq: (k: string, v: unknown) => ((r = r.filter((x) => x[k] !== v)), q),
		gte: (k: string, v: string) => ((r = r.filter((x) => String(x[k]) >= v)), q),
		like: () => q,
		order: (k: string, o: { ascending: boolean }) => (
			(r = [...r].sort((a, b) => (String(a[k]) < String(b[k]) ? -1 : 1) * (o.ascending ? 1 : -1))),
			q
		),
		limit: (n: number) => ((r = r.slice(0, n)), q),
		single: () => ((enkelt = true), q),
		then: (ok: (v: unknown) => unknown, feil?: (e: unknown) => unknown) =>
			Promise.resolve(
				enkelt
					? r.length === 1
						? { data: r[0], error: null }
						: { data: null, error: new Error('ikke én rad') }
					: { data: r, error: null }
			).then(ok, feil)
	};
	return q;
}

vi.mock('#lib/server/supabase', () => ({
	supabase: { from: () => spørring(rader) }
}));
vi.mock('#lib/server/email', () => ({ notifyCorrection: () => Promise.resolve() }));

import { load } from '../../routes/[lang]/events/[slug]/+page.server';

const DAG = 24 * 60 * 60 * 1000;
const om = (dager: number) => new Date(Date.now() + dager * DAG).toISOString();

function rad(id: string, over: Partial<Rad> = {}): Rad {
	return {
		id,
		slug: id,
		title_no: id,
		category: 'culture',
		status: 'approved',
		is_canary: false,
		date_start: om(5),
		date_end: null,
		price: '',
		...over
	};
}

async function relaterte(slug: string): Promise<string[]> {
	const res = (await load({
		params: { slug, lang: 'no' },
		setHeaders: () => {}
	} as never)) as { related: Rad[] };
	return res.related.map((e) => String(e.id));
}

describe('relaterte arrangementer', () => {
	beforeEach(() => {
		rader = [
			rad('siden', { date_start: om(10) }),
			// Startet for tre måneder siden, varer ut året: skal IKKE komme først.
			rad('langvarig', { date_start: om(-80), date_end: om(40) }),
			rad('ferdig', { date_start: om(-3) }),
			rad('lokkedue', { date_start: om(1), is_canary: true }),
			rad('venter', { date_start: om(1), status: 'pending' }),
			rad('annen-kategori', { date_start: om(1), category: 'music' }),
			rad('k5', { date_start: om(5) }),
			rad('k2', { date_start: om(2) }),
			rad('k9', { date_start: om(9) }),
			rad('k3', { date_start: om(3) }),
			rad('k30', { date_start: om(30) })
		];
	});

	it('gir de fire neste som starter fra nå, i datoorden', async () => {
		expect(await relaterte('siden')).toEqual(['k2', 'k3', 'k5', 'k9']);
	});

	it('tar aldri med lokkeduer, ventende, andre kategorier eller siden selv', async () => {
		const ut = await relaterte('siden');
		for (const ikke of ['lokkedue', 'venter', 'annen-kategori', 'siden', 'langvarig', 'ferdig']) {
			expect(ut).not.toContain(ikke);
		}
	});

	it('gir færre enn fire når kategorien er tynn, ikke gamle rader for å fylle opp', async () => {
		rader = rader.filter((r) => !String(r.id).startsWith('k'));
		expect(await relaterte('siden')).toEqual([]);
	});
});
