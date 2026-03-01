import { describe, it, expect } from 'vitest';
import { classifyScrapers, type ScraperHealthStatus } from '../scraper-health.js';

// Helper to create run rows (most recent first)
function makeRuns(
	name: string,
	runs: Array<{ found: number; errored?: boolean; errorMsg?: string; daysAgo?: number }>
) {
	const now = Date.now();
	return runs.map((r, i) => ({
		scraper_name: name,
		found: r.found,
		inserted: 0,
		errored: r.errored ?? false,
		error_message: r.errorMsg ?? null,
		skipped: false,
		// Each run 12h apart (2 runs/day), most recent first
		run_at: new Date(now - (r.daysAgo ?? i * 0.5) * 86400000).toISOString(),
	}));
}

function findScraper(results: ScraperHealthStatus[], name: string) {
	return results.find(r => r.name === name);
}

describe('classifyScrapers', () => {
	it('returns empty array for no data', () => {
		expect(classifyScrapers([])).toEqual([]);
	});

	it('classifies a healthy scraper', () => {
		const runs = makeRuns('bergenbibliotek', [
			{ found: 12 }, { found: 10 }, { found: 11 }, { found: 9 },
		]);
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'bergenbibliotek')!;
		expect(s.status).toBe('healthy');
		expect(s.consecutiveZeros).toBe(0);
	});

	it('classifies warning after 2 consecutive zeros when avg is high', () => {
		const runs = makeRuns('bergenbibliotek', [
			{ found: 0 }, { found: 0 }, { found: 12 }, { found: 10 }, { found: 11 },
		]);
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'bergenbibliotek')!;
		expect(s.status).toBe('warning');
		expect(s.consecutiveZeros).toBe(2);
		expect(s.reason).toContain('0 events for 2 runs');
	});

	it('classifies broken after 6 consecutive zeros', () => {
		const runs = makeRuns('bergenbibliotek', [
			{ found: 0 }, { found: 0 }, { found: 0 },
			{ found: 0 }, { found: 0 }, { found: 0 },
			{ found: 12 }, { found: 10 },
		]);
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'bergenbibliotek')!;
		expect(s.status).toBe('broken');
		expect(s.consecutiveZeros).toBe(6);
	});

	it('classifies seasonal scraper as dormant instead of broken', () => {
		const runs = makeRuns('festspillene', [
			{ found: 0 }, { found: 0 }, { found: 0 },
			{ found: 0 }, { found: 0 }, { found: 0 },
			{ found: 15 }, { found: 12 },
		]);
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'festspillene')!;
		expect(s.status).toBe('dormant');
		expect(s.reason).toContain('Seasonal');
	});

	it('classifies warning on last-run error', () => {
		const runs = makeRuns('kunsthall', [
			{ found: 0, errored: true, errorMsg: 'HTTP 503' },
			{ found: 5 }, { found: 6 },
		]);
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'kunsthall')!;
		expect(s.status).toBe('warning');
		expect(s.reason).toContain('Error on last run');
		expect(s.lastErrored).toBe(true);
	});

	it('classifies broken after 3 consecutive errors', () => {
		const runs = makeRuns('bergenbibliotek', [
			{ found: 0, errored: true, errorMsg: 'timeout' },
			{ found: 0, errored: true, errorMsg: 'timeout' },
			{ found: 0, errored: true, errorMsg: 'timeout' },
			{ found: 10 },
		]);
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'bergenbibliotek')!;
		expect(s.status).toBe('broken');
		expect(s.reason).toContain('3 consecutive errors');
	});

	it('classifies warning on significant drop (< 30% of avg)', () => {
		const runs = makeRuns('ticketco', [
			{ found: 2 }, { found: 20 }, { found: 18 }, { found: 22 }, { found: 19 },
		]);
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'ticketco')!;
		expect(s.status).toBe('warning');
		expect(s.reason).toContain('significant drop');
	});

	it('does not flag a significant drop when avg is low', () => {
		// avg < 5, so the 30% rule doesn't apply
		const runs = makeRuns('brettspill', [
			{ found: 1 }, { found: 3 }, { found: 4 }, { found: 3 },
		]);
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'brettspill')!;
		expect(s.status).toBe('healthy');
	});

	it('auto-detects dormant for non-seasonal scraper with 20+ zero runs', () => {
		const runs = makeRuns('someVenue', Array.from({ length: 22 }, () => ({ found: 0 })));
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'someVenue')!;
		expect(s.status).toBe('dormant');
		expect(s.reason).toContain('14+ days');
	});

	it('ignores skipped runs in calculations', () => {
		const now = Date.now();
		const runs = [
			{ scraper_name: 'visitbergen', found: 0, inserted: 0, errored: false, error_message: null, skipped: true, run_at: new Date(now).toISOString() },
			{ scraper_name: 'visitbergen', found: 0, inserted: 0, errored: false, error_message: null, skipped: true, run_at: new Date(now - 43200000).toISOString() },
			{ scraper_name: 'visitbergen', found: 15, inserted: 3, errored: false, error_message: null, skipped: false, run_at: new Date(now - 86400000).toISOString() },
		];
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'visitbergen')!;
		// Only the non-skipped run counts, found=15, so healthy
		expect(s.status).toBe('healthy');
		expect(s.lastFound).toBe(15);
	});

	it('handles a brand new scraper with only 1 run', () => {
		const runs = makeRuns('newScraper', [{ found: 5 }]);
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'newScraper')!;
		expect(s.status).toBe('healthy');
	});

	it('new scraper with 1 zero run is not flagged (avg < 2)', () => {
		const runs = makeRuns('newScraper', [{ found: 0 }]);
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'newScraper')!;
		// avg is 0, which is < 2, so the zero-drop rule doesn't fire
		expect(s.status).toBe('healthy');
	});

	it('sorts results: broken > warning > dormant > healthy', () => {
		const runs = [
			...makeRuns('healthy1', [{ found: 10 }, { found: 12 }]),
			...makeRuns('warning1', [{ found: 0, errored: true, errorMsg: 'err' }, { found: 5 }]),
			...makeRuns('broken1', [
				{ found: 0, errored: true, errorMsg: 'x' },
				{ found: 0, errored: true, errorMsg: 'x' },
				{ found: 0, errored: true, errorMsg: 'x' },
				{ found: 10 },
			]),
			...makeRuns('festspillene', [{ found: 0 }, { found: 0 }, { found: 5 }]),
		];
		const results = classifyScrapers(runs);
		const statuses = results.map(r => r.status);
		expect(statuses[0]).toBe('broken');
		expect(statuses[statuses.length - 1]).toBe('healthy');
	});

	it('calculates avgFound correctly', () => {
		const runs = makeRuns('test', [
			{ found: 10 }, { found: 20 }, { found: 30 },
		]);
		const results = classifyScrapers(runs);
		const s = findScraper(results, 'test')!;
		expect(s.avgFound).toBe(20);
	});

	it('handles mixed scrapers correctly', () => {
		const runs = [
			...makeRuns('scraper_a', [{ found: 10 }, { found: 12 }]),
			...makeRuns('scraper_b', [{ found: 0 }, { found: 0 }, { found: 8 }]),
		];
		const results = classifyScrapers(runs);
		expect(findScraper(results, 'scraper_a')!.status).toBe('healthy');
		expect(findScraper(results, 'scraper_b')!.status).toBe('warning');
	});
});
