import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { seedEllerFeil, erIngenRadFunnet } from '../server/ikke-tilgjengelig';

afterEach(() => vi.restoreAllMocks());

describe('seedEllerFeil', () => {
	it('gir seed-dataene lokalt (dev) og logger ikke', () => {
		const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(seedEllerFeil(['seed'], 'forsiden', new Error('x'), true)).toEqual(['seed']);
		expect(logg).not.toHaveBeenCalled();
	});

	it('kaster 503 i produksjon og returnerer aldri seed-dataene', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		let fanget: any;
		try {
			seedEllerFeil(['seed'], 'forsiden', new Error('nede'), false);
		} catch (e) {
			fanget = e;
		}
		expect(fanget?.status).toBe(503);
	});

	it('logger sted og årsak som JSON i produksjon', () => {
		const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			seedEllerFeil([], 'samling:konserter', new Error('nede'), false);
		} catch {}
		expect(logg).toHaveBeenCalledTimes(1);
		const rad = JSON.parse(logg.mock.calls[0][0] as string);
		expect(rad).toMatchObject({ type: 'arrangementer_utilgjengelig', status: 503, sted: 'samling:konserter', message: 'nede' });
	});

	it('tar imot en streng som årsak (tom tabell)', () => {
		const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			seedEllerFeil([], 'forsiden', 'events-tabellen ga ingen rader', false);
		} catch {}
		expect(JSON.parse(logg.mock.calls[0][0] as string).message).toBe('events-tabellen ga ingen rader');
	});
});

describe('erIngenRadFunnet', () => {
	it('skiller «ingen rad» (PGRST116) fra andre feil', () => {
		expect(erIngenRadFunnet({ code: 'PGRST116' })).toBe(true);
		expect(erIngenRadFunnet({ code: '57014', message: 'timeout' })).toBe(false);
		expect(erIngenRadFunnet(new TypeError('fetch failed'))).toBe(false);
		expect(erIngenRadFunnet(null)).toBe(false);
	});
});

describe('sidene bruker seedEvents bare via seedEllerFeil', () => {
	const les = (fil: string) => readFileSync(resolve(process.cwd(), fil), 'utf8');
	for (const fil of ['src/routes/[lang]/+page.server.ts', 'src/routes/[lang]/[collection]/+page.server.ts']) {
		it(`${fil}: ingen direkte bruk av seedEvents i retur eller tilordning`, () => {
			const k = les(fil);
			expect(k).toContain('seedEllerFeil(seedEvents');
			// seedEvents skal stå som argument til seedEllerFeil, importen og ingenting annet
			const bruk = k.split(/\r?\n/).filter((l) => l.includes('seedEvents') && !l.includes('import') && !l.includes('seedEllerFeil(seedEvents'));
			expect(bruk).toEqual([]);
		});
	}

	it('arrangementssiden: seed bare i dev, og databasefeil gir 503, ikke 410', () => {
		const k = les('src/routes/[lang]/events/[slug]/+page.server.ts');
		expect(k).toMatch(/dev \? seedEvents\.find/);
		expect(k).toContain('erIngenRadFunnet(dbFeil)');
		expect(k).toContain('throw error(503');
		// 503-sjekken må komme før 410-grenen
		expect(k.indexOf('throw error(503')).toBeLessThan(k.indexOf('throw error(410'));
	});
});
