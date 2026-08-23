import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

import {
	normalizeUrl,
	parseSitemapUrls,
	parseLastmod,
	isSitemapIndex,
	diffAgainstBaseline,
	checkSource,
	checkAllSources,
	worthReporting,
	type WatchedSource
} from '../source-watch.js';

/**
 * Kildevakten roerer aldri basen og har bare én I/O-vei: sitemap-henting.
 * Den mates derfor med oppdiktede sitemaps her. Ingen av testene gaar paa nett.
 *
 * Fixturen under er den ekte sitemap-en til homiescoffee.com slik den saa ut
 * 23. august 2026, med bildeoppfoeringene beholdt. Nettopp de bildene er
 * grunnen til at tellingen kan gaa galt: naive teller ville sagt seks sider.
 */
const HOMIES_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
	<url>
		<loc>https://homiescoffee.com</loc>
		<lastmod>2026-05-14</lastmod>
		<changefreq>daily</changefreq>
		<priority>1.0</priority>
		<image:image>
			<image:loc>https://homiescoffee.com/assets/images/image01.jpg</image:loc>
		</image:image>
		<image:image>
			<image:loc>https://homiescoffee.com/assets/images/image02.jpg</image:loc>
		</image:image>
		<image:image>
			<image:loc>https://homiescoffee.com/assets/images/image09.jpg</image:loc>
		</image:image>
	</url>
</urlset>`;

/** Samme side, men de har lagt ut et program. Dette er dagen vi venter paa. */
const HOMIES_MED_PROGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
	<url><loc>https://homiescoffee.com</loc><lastmod>2026-10-02</lastmod></url>
	<url><loc>https://homiescoffee.com/events</loc><lastmod>2026-10-02</lastmod></url>
</urlset>`;

const KILDE: WatchedSource = {
	id: 'homies',
	name: 'Homies Coffee',
	homepage: 'https://homiescoffee.com/',
	sitemap: 'https://homiescoffee.com/sitemap.xml',
	baselineUrls: ['https://homiescoffee.com'],
	note: 'test',
	reminder: '2026-10-01'
};

function fakeFetch(body: string, ok = true, status = 200): typeof fetch {
	return vi.fn(async () => ({
		ok,
		status,
		text: async () => body
	})) as unknown as typeof fetch;
}

describe('parsing av sitemap', () => {
	it('teller sider, ikke bilder', () => {
		// Fixturen har 1 side og 3 bilder. Bildene ligger i image:-navnerommet.
		expect(parseSitemapUrls(HOMIES_SITEMAP)).toEqual(['https://homiescoffee.com']);
	});

	it('fjerner duplikater og sorterer', () => {
		const xml = `<urlset>
			<url><loc>https://x.no/b</loc></url>
			<url><loc>https://x.no/a</loc></url>
			<url><loc>https://x.no/b</loc></url>
		</urlset>`;
		expect(parseSitemapUrls(xml)).toEqual(['https://x.no/a', 'https://x.no/b']);
	});

	it('taaler en tom sitemap', () => {
		expect(parseSitemapUrls('<urlset></urlset>')).toEqual([]);
	});

	it('plukker nyeste lastmod', () => {
		const xml = `<urlset>
			<url><loc>https://x.no/a</loc><lastmod>2026-01-02</lastmod></url>
			<url><loc>https://x.no/b</loc><lastmod>2026-07-30</lastmod></url>
		</urlset>`;
		expect(parseLastmod(xml)).toBe('2026-07-30');
		expect(parseLastmod('<urlset><url><loc>https://x.no</loc></url></urlset>')).toBeNull();
	});

	it('kjenner igjen en sitemapindex', () => {
		expect(isSitemapIndex('<sitemapindex xmlns="x"><sitemap></sitemap></sitemapindex>')).toBe(true);
		expect(isSitemapIndex(HOMIES_SITEMAP)).toBe(false);
	});
});

describe('normalisering', () => {
	it('regner adresse med og uten skraastrek som samme', () => {
		expect(normalizeUrl('https://x.no/')).toBe(normalizeUrl('https://x.no'));
		expect(normalizeUrl('  https://x.no//  ')).toBe('https://x.no');
	});

	it('varsler ikke naar kilden bare bytter skraastrekstil', async () => {
		const xml = '<urlset><url><loc>https://homiescoffee.com/</loc></url></urlset>';
		const res = await checkSource(KILDE, fakeFetch(xml));
		expect(res.status).toBe('unchanged');
	});
});

describe('diff mot fasit', () => {
	it('finner nye og fjernede adresser', () => {
		const d = diffAgainstBaseline(
			{ ...KILDE, baselineUrls: ['https://x.no', 'https://x.no/gammel'] },
			['https://x.no', 'https://x.no/ny']
		);
		expect(d.added).toEqual(['https://x.no/ny']);
		expect(d.removed).toEqual(['https://x.no/gammel']);
	});
});

describe('checkSource', () => {
	it('er stille naar ingenting har endret seg', async () => {
		const res = await checkSource(KILDE, fakeFetch(HOMIES_SITEMAP));
		expect(res.status).toBe('unchanged');
		expect(res.added).toEqual([]);
		expect(res.currentCount).toBe(1);
		expect(res.baselineCount).toBe(1);
		expect(res.lastmod).toBe('2026-05-14');
	});

	it('slaar ut naar en programside dukker opp', async () => {
		const res = await checkSource(KILDE, fakeFetch(HOMIES_MED_PROGRAM));
		expect(res.status).toBe('changed');
		expect(res.added).toEqual(['https://homiescoffee.com/events']);
		expect(res.removed).toEqual([]);
		expect(res.currentCount).toBe(2);
	});

	it('slaar ut naar sitemap blir en index', async () => {
		const xml = `<sitemapindex><sitemap><loc>https://homiescoffee.com</loc></sitemap></sitemapindex>`;
		const res = await checkSource(KILDE, fakeFetch(xml));
		expect(res.status).toBe('changed');
		expect(res.isSitemapIndex).toBe(true);
	});

	it('rapporterer HTTP-feil som unreachable i stedet for aa kaste', async () => {
		const res = await checkSource(KILDE, fakeFetch('', false, 404));
		expect(res.status).toBe('unreachable');
		expect(res.error).toContain('404');
	});

	it('rapporterer nettverksfeil som unreachable i stedet for aa kaste', async () => {
		const doedFetch = vi.fn(async () => {
			throw new Error('getaddrinfo ENOTFOUND');
		}) as unknown as typeof fetch;
		const res = await checkSource(KILDE, doedFetch);
		expect(res.status).toBe('unreachable');
		expect(res.error).toContain('ENOTFOUND');
	});

	it('sender hoeflig User-Agent', async () => {
		const f = fakeFetch(HOMIES_SITEMAP);
		await checkSource(KILDE, f);
		const [, init] = (f as any).mock.calls[0];
		expect(init.headers['User-Agent']).toContain('Gaari-Bergen-Events');
	});
});

describe('checkAllSources', () => {
	it('sjekker alle kilder og lar én daarlig kilde staa alene', async () => {
		let n = 0;
		const f = vi.fn(async () => {
			n++;
			if (n === 1) throw new Error('nede');
			return { ok: true, status: 200, text: async () => HOMIES_SITEMAP };
		}) as unknown as typeof fetch;

		const res = await checkAllSources([{ ...KILDE, id: 'a' }, { ...KILDE, id: 'b' }], {
			fetchImpl: f,
			delayMs: 0
		});

		expect(res).toHaveLength(2);
		expect(res[0].status).toBe('unreachable');
		expect(res[1].status).toBe('unchanged');
	});
});

describe('worthReporting', () => {
	it('slipper bare gjennom det som ikke er uendret', async () => {
		const uendret = await checkSource(KILDE, fakeFetch(HOMIES_SITEMAP));
		const endret = await checkSource(KILDE, fakeFetch(HOMIES_MED_PROGRAM));
		const nede = await checkSource(KILDE, fakeFetch('', false, 500));
		expect(worthReporting([uendret, endret, nede]).map((r) => r.status)).toEqual([
			'changed',
			'unreachable'
		]);
	});
});

describe('source-watch.json', () => {
	const KONFIG = path.join(import.meta.dirname, '..', '..', 'source-watch.json');

	it('har gyldig struktur', () => {
		const kilder: WatchedSource[] = JSON.parse(fs.readFileSync(KONFIG, 'utf-8'));
		expect(Array.isArray(kilder)).toBe(true);
		expect(kilder.length).toBeGreaterThan(0);

		const ider = new Set<string>();
		for (const k of kilder) {
			expect(k.id, `Tom id: ${JSON.stringify(k)}`).toBeTruthy();
			expect(ider.has(k.id), `Duplikat id: ${k.id}`).toBe(false);
			ider.add(k.id);
			expect(k.name?.length, `Tomt navn for ${k.id}`).toBeGreaterThan(0);
			expect(k.note?.length, `Tom note for ${k.id}`).toBeGreaterThan(0);
			expect(k.sitemap, `Ugyldig sitemap for ${k.id}`).toMatch(/^https:\/\//);
			expect(k.homepage, `Ugyldig homepage for ${k.id}`).toMatch(/^https:\/\//);
			expect(Array.isArray(k.baselineUrls), `baselineUrls maa vaere liste: ${k.id}`).toBe(true);
			if (k.reminder) expect(k.reminder).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});

	it('har fasit som allerede er normalisert, saa vakten ikke varsler paa seg selv', () => {
		const kilder: WatchedSource[] = JSON.parse(fs.readFileSync(KONFIG, 'utf-8'));
		for (const k of kilder) {
			for (const u of k.baselineUrls) {
				expect(normalizeUrl(u), `baselineUrls for ${k.id} er ikke normalisert`).toBe(u);
			}
		}
	});
});
