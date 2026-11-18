import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hentKommendeArrangementer, PAGE } from '../server/hent-arrangementer';

type Rad = {
	id: number;
	date_start: string;
	date_end?: string | null;
	is_canary: boolean;
	status: string;
	category?: string;
	title_no?: string;
	venue_name?: string;
};

const NAA = '2026-11-18T10:00:00Z';
const GULV = '2026-11-04T10:00:00Z';

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
				const gte: [string, string][] = [];
				const lt: [string, string][] = [];
				const b: any = {
					select: () => b,
					in: (k: string, v: string[]) => ((inn = [k, v]), b),
					eq: (k: string, v: unknown) => ((eq[k] = v), b),
					gte: (k: string, v: string) => (gte.push([k, v]), b),
					lt: (k: string, v: string) => (lt.push([k, v]), b),
					or: () => b,
					order: (k: string) => (ordre.push(k), b),
					range: (fra: number, til: number) => {
						kall.push(`range ${fra}-${til} gte=${JSON.stringify(gte)} lt=${JSON.stringify(lt)} eq=${JSON.stringify(eq)} order=${ordre.join(',')}`);
						let r = rader.filter((x) => (inn ? inn[1].includes((x as any)[inn[0]]) : true));
						r = r.filter((x: any) => gte.every(([k, v]) => x[k] != null && x[k] >= v) && lt.every(([k, v]) => x[k] != null && x[k] < v));
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
		const ut = await hentKommendeArrangementer<Rad>(client, '*', NAA, GULV);
		expect(ut.length).toBe(2300 - 2);
	});

	it('slipper aldri en lokkedue gjennom, heller ikke etter rad 1 000', async () => {
		const { client } = falskKlient(lagRader());
		const ut = await hentKommendeArrangementer<Rad>(client, '*', NAA, GULV);
		expect(ut.some((x) => x.is_canary)).toBe(false);
	});

	it('har canary-filter i hver omgang og sorterer på date_start + id', async () => {
		const { client, kall } = falskKlient(lagRader());
		await hentKommendeArrangementer<Rad>(client, '*', NAA, GULV);
		expect(kall.length).toBe(4); // 3 sider med vanlige + 1 med utstillinger
		for (const k of kall) {
			expect(k).toContain('"is_canary":false');
			expect(k).toContain('order=date_start,id');
		}
	});

	it('gir ingen dubletter og ingen hull når mange rader har lik date_start', async () => {
		const { client } = falskKlient(lagRader());
		const ut = await hentKommendeArrangementer<Rad>(client, '*', NAA, GULV);
		const ider = ut.map((x) => x.id);
		expect(new Set(ider).size).toBe(ider.length);
	});

	it('stopper når siste side er full og neste er tom (nøyaktig PAGE rader)', async () => {
		const rader = lagRader().slice(0, PAGE).map((x) => ({ ...x, is_canary: false }));
		const { client, kall } = falskKlient(rader);
		const ut = await hentKommendeArrangementer<Rad>(client, '*', NAA, GULV);
		expect(ut.length).toBe(PAGE);
		expect(kall.length).toBe(3); // 2 vanlige (full side, så tom) + 1 med utstillinger
	});

	it('kaster videre en databasefeil', async () => {
		const client: any = {
			from: () => {
				const b: any = new Proxy({}, { get: (_t, p) => (p === 'range' ? () => Promise.resolve({ data: null, error: new Error('nede') }) : () => b) });
				return b;
			}
		};
		await expect(hentKommendeArrangementer(client, '*', NAA, GULV)).rejects.toThrow('nede');
	});

	it('mutasjonssjekk: en klient som glemmer canary-filteret på side 2 gir lokkeduer (testen kan feile)', async () => {
		const { client } = falskKlient(lagRader(), { glemCanaryFraSide2: true });
		const ut = await hentKommendeArrangementer<Rad>(client, '*', NAA, GULV);
		expect(ut.some((x) => x.is_canary)).toBe(true);
	});
});

describe('pågående utstillinger forbi 14-dagersgrensen', () => {
	const gammel = '2026-10-09T09:00:00Z'; // før GULV
	const utst = (id: number, o: Partial<Rad>): Rad => ({
		id, date_start: gammel, date_end: '2027-01-03T00:00:00Z', is_canary: false, status: 'approved',
		category: 'culture', title_no: 'Sung Hwan Kim', venue_name: 'Bergen Kunsthall – Sal I - IV', ...o
	});

	it('tar med en pågående utstilling som startet før grensen', async () => {
		const { client } = falskKlient([utst(1, {})]);
		const ut = await hentKommendeArrangementer<Rad>(client, '*', NAA, GULV);
		expect(ut.map((x) => x.id)).toEqual([1]);
	});

	it('tar IKKE med pågående rader som ikke er utstillinger (kurs, klubber)', async () => {
		const { client } = falskKlient([
			utst(1, { title_no: 'Åpen sone', venue_name: 'Fysak Slettebakken' }),
			utst(2, { category: 'family', title_no: 'Utstilling for barn', venue_name: 'Fløyen' }),
			utst(3, { title_no: 'Quiz', venue_name: 'Rasmus Meyer' })
		]);
		const ut = await hentKommendeArrangementer<Rad>(client, '*', NAA, GULV);
		expect(ut).toEqual([]);
	});

	it('tar IKKE med en utstilling som er over (sluttdato før nå) eller mangler sluttdato', async () => {
		const { client } = falskKlient([
			utst(1, { date_end: '2026-11-10T00:00:00Z' }),
			utst(2, { date_end: null })
		]);
		const ut = await hentKommendeArrangementer<Rad>(client, '*', NAA, GULV);
		expect(ut).toEqual([]);
	});

	it('tar IKKE med en lokkedue som ser ut som en utstilling', async () => {
		const { client } = falskKlient([utst(1, { is_canary: true })]);
		const ut = await hentKommendeArrangementer<Rad>(client, '*', NAA, GULV);
		expect(ut).toEqual([]);
	});

	it('gir ingen dublett når utstillingen også starter etter grensen', async () => {
		const { client } = falskKlient([utst(1, { date_start: '2026-11-10T09:00:00Z' })]);
		const ut = await hentKommendeArrangementer<Rad>(client, '*', NAA, GULV);
		expect(ut.map((x) => x.id)).toEqual([1]);
	});
});

describe('feltlistene har det utstillingsregelen trenger', () => {
	for (const fil of ['src/routes/[lang]/+page.server.ts', 'src/routes/[lang]/[collection]/+page.server.ts']) {
		it(`${fil} henter category, title_no og venue_name`, () => {
			const kilde = readFileSync(resolve(process.cwd(), fil), 'utf8');
			const m = kilde.match(/const (?:fields|collFields) = '([^']+)'/);
			expect(m).not.toBeNull();
			const felt = m![1].split(',');
			for (const f of ['category', 'title_no', 'venue_name']) expect(felt).toContain(f);
		});
	}
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
