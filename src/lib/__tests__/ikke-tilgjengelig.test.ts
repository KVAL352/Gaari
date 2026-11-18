import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { seedEllerFeil, erIngenRadFunnet, erTestmodus } from '../server/ikke-tilgjengelig';

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

	// SvelteKit legger headere fra setHeaders på ALLE svar fra siden, også 503.
	// Satt før hentingen ville s-maxage=3600 fulgt en 503 og latt CDN-en cache den.
	for (const fil of ['src/routes/[lang]/+page.server.ts', 'src/routes/[lang]/[collection]/+page.server.ts']) {
		it(`${fil}: cache-header settes etter hentingen, ikke før`, () => {
			const k = les(fil);
			const hent = k.search(/hentKommendeArrangementer(<[^>]*>)?\(/);
			const header = k.indexOf('setHeaders({');
			expect(hent).toBeGreaterThan(-1);
			expect(header).toBeGreaterThan(hent);
		});
	}

	it('arrangementssiden: seed bare når seedTillatt, og databasefeil gir 503, ikke 410', () => {
		const k = les('src/routes/[lang]/events/[slug]/+page.server.ts');
		expect(k).toMatch(/seedTillatt \? seedEvents\.find/);
		expect(k).toContain('erIngenRadFunnet(dbFeil)');
		expect(k).toContain('throw error(503');
		// 503-sjekken må komme før 410-grenen
		expect(k.indexOf('throw error(503')).toBeLessThan(k.indexOf('throw error(410'));
	});
});

describe('erTestmodus: seed-data utenfor dev, bare i Lighthouse-målingen', () => {
	const invalid = 'https://supabase.invalid';

	it('slår inn med riktig flagg og en .invalid-adresse', () => {
		expect(erTestmodus('lighthouse-ci', invalid)).toBe(true);
		expect(erTestmodus('lighthouse-ci', ' https://x.supabase.invalid ')).toBe(true);
	});

	it('slår aldri inn mot en ekte Supabase-adresse, selv med flagget satt', () => {
		expect(erTestmodus('lighthouse-ci', 'https://abcd.supabase.co')).toBe(false);
		expect(erTestmodus('lighthouse-ci', 'https://invalid.example.com')).toBe(false);
	});

	it('slår ikke inn uten riktig flagg, selv mot .invalid', () => {
		expect(erTestmodus(undefined, invalid)).toBe(false);
		expect(erTestmodus('', invalid)).toBe(false);
		expect(erTestmodus('true', invalid)).toBe(false);
	});

	it('tåler manglende eller ugyldig adresse', () => {
		expect(erTestmodus('lighthouse-ci', undefined)).toBe(false);
		expect(erTestmodus('lighthouse-ci', 'ikke en url')).toBe(false);
	});
});

describe('seed-tillatt.ts og Lighthouse-arbeidsflyten henger sammen', () => {
	const les = (fil: string) => readFileSync(resolve(process.cwd(), fil), 'utf8');

	it('seedTillatt er dev eller erTestmodus, ingenting annet', () => {
		const k = les('src/lib/server/seed-tillatt.ts');
		expect(k).toMatch(/dev \|\| erTestmodus\(GAARI_TESTMODUS, PUBLIC_SUPABASE_URL\)/);
	});

	it('bare lighthouse.yml setter flagget', () => {
		expect(les('.github/workflows/lighthouse.yml')).toContain('GAARI_TESTMODUS=lighthouse-ci');
		for (const f of ['ci.yml', 'scrape.yml', 'newsletter.yml', 'notify.yml']) {
			let k = '';
			try { k = les(`.github/workflows/${f}`); } catch {}
			expect(k).not.toContain('GAARI_TESTMODUS');
		}
	});
});
