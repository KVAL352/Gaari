/**
 * Scraper health analysis — queries scraper_runs history and classifies
 * each scraper as healthy, warning, broken, or dormant.
 *
 * Used by the daily digest to surface scraper issues.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ScraperHealthStatus {
	name: string;
	status: 'healthy' | 'warning' | 'broken' | 'dormant';
	reason: string;
	lastFound: number;
	avgFound: number;
	consecutiveZeros: number;
	lastErrored: boolean;
	lastErrorMessage?: string;
	lastRunAt?: string;
}

// Seasonal scrapers that legitimately return 0 outside their season
const SEASONAL_SCRAPERS = new Set([
	'festspillene',
	'bergenfest',
	'beyondthegates',
	'vvv',
]);

interface RunRow {
	scraper_name: string;
	found: number;
	inserted: number;
	errored: boolean;
	error_message: string | null;
	skipped: boolean;
	run_at: string;
}

export async function analyzeScraperHealth(
	supabase: SupabaseClient
): Promise<ScraperHealthStatus[]> {
	const fourteenDaysAgo = new Date();
	fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

	const { data: runs, error } = await supabase
		.from('scraper_runs')
		.select('scraper_name, found, inserted, errored, error_message, skipped, run_at')
		.gte('run_at', fourteenDaysAgo.toISOString())
		.order('run_at', { ascending: false });

	if (error || !runs || runs.length === 0) return [];

	return classifyScrapers(runs as RunRow[]);
}

/**
 * Pure classification logic — separated from DB query for testability.
 */
export function classifyScrapers(runs: RunRow[]): ScraperHealthStatus[] {
	// Group by scraper name
	const byName = new Map<string, RunRow[]>();
	for (const run of runs) {
		const arr = byName.get(run.scraper_name) || [];
		arr.push(run);
		byName.set(run.scraper_name, arr);
	}

	const results: ScraperHealthStatus[] = [];

	for (const [name, scraperRuns] of byName) {
		// Filter out skipped runs (deadline cutoff)
		const realRuns = scraperRuns.filter(r => !r.skipped);
		if (realRuns.length === 0) continue;

		const latest = realRuns[0]; // most recent (ordered DESC)
		const avgFound = realRuns.reduce((s, r) => s + r.found, 0) / realRuns.length;

		// Count consecutive zeros from most recent run backward
		let consecutiveZeros = 0;
		for (const run of realRuns) {
			if (run.found === 0 && !run.errored) consecutiveZeros++;
			else break;
		}

		// Count consecutive errors
		let consecutiveErrors = 0;
		for (const run of realRuns) {
			if (run.errored) consecutiveErrors++;
			else break;
		}

		let status: ScraperHealthStatus['status'] = 'healthy';
		let reason = '';

		// Rule 1: Consecutive errors
		if (consecutiveErrors >= 3) {
			status = 'broken';
			reason = `${consecutiveErrors} consecutive errors. Last: ${latest.error_message?.slice(0, 100) || 'unknown'}`;
		} else if (latest.errored) {
			status = 'warning';
			reason = `Error on last run: ${latest.error_message?.slice(0, 100) || 'unknown'}`;
		}

		// Rule 2: Sudden drop to zero for a normally-active scraper
		else if (latest.found === 0 && avgFound >= 2) {
			if (SEASONAL_SCRAPERS.has(name)) {
				status = 'dormant';
				reason = `Seasonal scraper — 0 events found (avg: ${avgFound.toFixed(1)})`;
			} else if (consecutiveZeros >= 6) {
				status = 'broken';
				reason = `0 events found for ${consecutiveZeros} consecutive runs (avg was ${avgFound.toFixed(1)})`;
			} else if (consecutiveZeros >= 2) {
				status = 'warning';
				reason = `0 events for ${consecutiveZeros} runs (avg: ${avgFound.toFixed(1)})`;
			}
		}

		// Rule 3: Significant drop (found < 30% of average)
		else if (avgFound >= 5 && latest.found > 0 && latest.found < avgFound * 0.3) {
			status = 'warning';
			reason = `Found ${latest.found} events (avg: ${avgFound.toFixed(1)}) — significant drop`;
		}

		// Rule 4: Auto-dormant — all zeros for 14+ days without errors
		else if (realRuns.length >= 20 && realRuns.every(r => r.found === 0 && !r.errored)) {
			status = 'dormant';
			reason = 'No events found in 14+ days — likely seasonal or source inactive';
		}

		results.push({
			name,
			status,
			reason,
			lastFound: latest.found,
			avgFound: Math.round(avgFound * 10) / 10,
			consecutiveZeros,
			lastErrored: latest.errored,
			lastErrorMessage: latest.error_message || undefined,
			lastRunAt: latest.run_at,
		});
	}

	// Sort: broken first, then warning, then dormant, then healthy
	const statusOrder = { broken: 0, warning: 1, dormant: 2, healthy: 3 };
	results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

	return results;
}
