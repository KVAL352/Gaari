import { describe, it, expect, vi } from 'vitest';
import { fetchAllRows } from '../utils.js';

/**
 * Låser fiksen for feilklassen som traff tre ganger på fem dager: dedup
 * (20. august), nyhetsbrevtallet (21. august) og sitemapen (24. august).
 *
 * Felles for alle tre: Supabase kuttet svaret på 1000 rader uten å si fra,
 * og resultatet så plausibelt ut. Testene her sier at fetchAllRows henter
 * videre til den ser en kort side — og at den heller kaster enn å levere et
 * halvt svar, siden et delvis svar er farligere enn ingen.
 */

/** Bygger en falsk spørring over `total` rader, med Supabases 1000-tak. */
function fakeTable(total: number) {
	const calls: [number, number][] = [];
	const build = (from: number, to: number) => {
		calls.push([from, to]);
		const size = Math.min(to - from + 1, 1000);
		const rows = [];
		for (let i = from; i < Math.min(from + size, total); i++) rows.push({ id: i });
		return Promise.resolve({ data: rows, error: null });
	};
	return { build, calls };
}

describe('fetchAllRows', () => {
	it('henter alt når resultatet er større enn 1000', async () => {
		const { build, calls } = fakeTable(1949);
		const rows = await fetchAllRows<{ id: number }>(build);

		expect(rows).toHaveLength(1949);
		expect(calls).toHaveLength(2);
		expect(calls[0]).toEqual([0, 999]);
		expect(calls[1]).toEqual([1000, 1999]);
		// Ingen rad hoppet over eller talt to ganger.
		expect(new Set(rows.map((r) => r.id)).size).toBe(1949);
	});

	it('stopper etter én side når alt får plass', async () => {
		const { build, calls } = fakeTable(42);
		const rows = await fetchAllRows<{ id: number }>(build);

		expect(rows).toHaveLength(42);
		expect(calls).toHaveLength(1);
	});

	it('gjør ett kall for et tomt resultat, ikke null', async () => {
		const { build, calls } = fakeTable(0);
		expect(await fetchAllRows(build)).toEqual([]);
		expect(calls).toHaveLength(1);
	});

	it('spør om en side til når siste side er nøyaktig full', async () => {
		// 2000 rader: side 2 er full, så den kan ikke vite at det er slutt.
		const { build, calls } = fakeTable(2000);
		const rows = await fetchAllRows<{ id: number }>(build);

		expect(rows).toHaveLength(2000);
		expect(calls).toHaveLength(3);
	});

	it('kaster ved feil framfor å levere et halvt svar', async () => {
		let n = 0;
		const build = () => {
			n++;
			if (n === 2) return Promise.resolve({ data: null, error: { message: 'tilkobling brutt' } });
			return Promise.resolve({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null });
		};

		await expect(fetchAllRows(build, 'testen')).rejects.toThrow(/testen.*side 1.*tilkobling brutt/);
	});

	it('stopper på sidegrensen i stedet for å løpe evig', async () => {
		const advarsel = vi.spyOn(console, 'warn').mockImplementation(() => {});
		// Alltid full side: uten grensen ville dette aldri stoppet.
		const build = () =>
			Promise.resolve({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null });

		const rows = await fetchAllRows(build, 'uendelig');

		expect(rows).toHaveLength(100_000);
		expect(advarsel).toHaveBeenCalledWith(expect.stringContaining('sidegrensen'));
		advarsel.mockRestore();
	});
});
