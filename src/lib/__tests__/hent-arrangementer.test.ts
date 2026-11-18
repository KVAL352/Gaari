import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hentKommendeArrangementer, PAGE } from '../server/hent-arrangementer';

type Rad = { id: number; date_start: string; is_canary: boolean; status: string };

/**
 * Falsk Supabase-klient som oppfører seg som den ekte på det testen trenger:
 * filtrerer på `eq`/`in`, sorterer på alle `order`-kall i rekkefølge og skjærer
 * ut `range`. `or` og `gte` er bevisst ikke modellert (alle rader er kommende),
 * men kallene registreres så testen ser at de er med.
 */
function falskKlient(rader: Rad[], opts: { glemCanaryFraSide2?: boolean } = {}) {
	const kall: string[] = [];
	return {
		kall,
		client: {
			from(_tabell: string) {
				const eq: Record<string, unknown> = {};
				const ordre: string[] = [];
				let inn: [string, string[]] | null = null;
				const b: any = {
					select: () => b,
					in: (k: string, v: string[]) => ((inn = [k, v]), b),
					eq: (k: string, v: unknown) => ((eq[k] = v), b),
					gte: () => b,
					or: () => b,
					order: (k: string) => (ordre.push(k), b),
					range: (fra: number, til: number) => {
						kall.push(`range ${fra}-${til} eq=${JSON.stringify(eq)} order=${ordre.join(',')}`);
						let r = rader.filter((x) => (inn ? inn[1].includes((x as any)[inn[0]]) : true));
						const bryterFilter = opts.glemCanaryFraSide2 && fra > 0;
						if (!bryterFilter) {
							r = r.filter((x) => Object.entries(eq).every(([k, v]) => (x as any)[k] === v));
						}
						for (const k of [...ordre].reverse()) {
							r = [...r].sort((a: any, c: any) => (a[k] < c[k] ? -1 : a[k] > c[k] ? 1 : 0));
						}
						return Promise.resolve({ data: r.slice(fra, til + 1), error: null });
					}
				};
				return b;
			}
		} as any
	};
}

// 2 300 vanlige rader med LIK date_start (sorterer ikke unikt på dato alene),
// pluss en lokkedue på rad 1 500 og en til på rad 2 100 i sorteringen.
function lagRader(): Rad[] {
	const r: Rad[] = [];
	for (let i = 1; i <= 2300; i++) {
		r.push({ id: i, date_start: '2026-12-01T10:00:00Z', is_canary: i === 1500 || i === 2100, status: 'approved' });
	}
	return r;
}

describe('hentKommendeArrangementer', () => {
	it('henter alle sider, ikke bare to', async () => {
		const { client } = falskKlient(lagRader());
		const ut = await hentKommendeArrangementer<Rad>(client, '*', 'x', 'y');
		expect(ut.length).toBe(2300 - 2);
	});

	it('slipper aldri en lokkedue gjennom, heller ikke etter rad 1 000', async () => {
		const { client } = falskKlient(lagRader());
		const ut = await hentKommendeArrangementer<Rad>(client, '*', 'x', 'y');
		expect(ut.some((x) => x.is_canary)).toBe(false);
	});

	it('har canary-filter i hver omgang og sorterer på date_start + id', async () => {
		const { client, kall } = falskKlient(lagRader());
		await hentKommendeArrangementer<Rad>(client, '*', 'x', 'y');
		expect(kall.length).toBe(3);
		for (const k of kall) {
			expect(k).toContain('"is_canary":false');
			expect(k).toContain('order=date_start,id');
		}
	});

	it('gir ingen dubletter og ingen hull når mange rader har lik date_start', async () => {
		const { client } = falskKlient(lagRader());
		const ut = await hentKommendeArrangementer<Rad>(client, '*', 'x', 'y');
		const ider = ut.map((x) => x.id);
		expect(new Set(ider).size).toBe(ider.length);
	});

	it('stopper når siste side er full og neste er tom (nøyaktig PAGE rader)', async () => {
		const rader = lagRader().slice(0, PAGE).map((x) => ({ ...x, is_canary: false }));
		const { client, kall } = falskKlient(rader);
		const ut = await hentKommendeArrangementer<Rad>(client, '*', 'x', 'y');
		expect(ut.length).toBe(PAGE);
		expect(kall.length).toBe(2);
	});

	it('kaster videre en databasefeil', async () => {
		const client: any = {
			from: () => {
				const b: any = new Proxy({}, { get: (_t, p) => (p === 'range' ? () => Promise.resolve({ data: null, error: new Error('nede') }) : () => b) });
				return b;
			}
		};
		await expect(hentKommendeArrangementer(client, '*', 'x', 'y')).rejects.toThrow('nede');
	});

	it('mutasjonssjekk: en klient som glemmer canary-filteret på side 2 gir lokkeduer (testen kan feile)', async () => {
		const { client } = falskKlient(lagRader(), { glemCanaryFraSide2: true });
		const ut = await hentKommendeArrangementer<Rad>(client, '*', 'x', 'y');
		expect(ut.some((x) => x.is_canary)).toBe(true);
	});
});

describe('forsiden og samlingssidene bruker den felles hentingen', () => {
	for (const fil of ['src/routes/[lang]/+page.server.ts', 'src/routes/[lang]/[collection]/+page.server.ts']) {
		it(`${fil} henter via hentKommendeArrangementer og spør ikke events selv`, () => {
			const kilde = readFileSync(resolve(process.cwd(), fil), 'utf8');
			expect(kilde).toContain('hentKommendeArrangementer');
			expect(kilde).not.toMatch(/\.from\(\s*['"]events['"]\s*\)/);
		});
	}
});
