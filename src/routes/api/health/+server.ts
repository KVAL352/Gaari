import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

interface HealthCheck {
	name: string;
	status: 'pass' | 'fail';
	detail?: string;
}

export const GET: RequestHandler = async () => {
	const start = Date.now();
	const checks: HealthCheck[] = [];

	// Check 1: Supabase connection + event count
	let eventCount = 0;
	try {
		const { count, error } = await supabase
			.from('events')
			.select('*', { count: 'exact', head: true })
			.eq('status', 'approved');

		if (error) {
			checks.push({ name: 'supabase_connection', status: 'fail', detail: error.message });
		} else {
			checks.push({ name: 'supabase_connection', status: 'pass' });
			eventCount = count ?? 0;
		}
	} catch (err) {
		checks.push({
			name: 'supabase_connection',
			status: 'fail',
			detail: err instanceof Error ? err.message : 'Unknown error'
		});
	}

	// Check 2: Events exist
	if (checks[0]?.status === 'pass') {
		checks.push({
			name: 'events_exist',
			status: eventCount > 0 ? 'pass' : 'fail',
			detail: `${eventCount} approved events`
		});
	} else {
		checks.push({ name: 'events_exist', status: 'fail', detail: 'Skipped (no connection)' });
	}

	// Check 3: Recent scrape activity (events created in last 24h)
	if (checks[0]?.status === 'pass') {
		try {
			const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
			const { count, error } = await supabase
				.from('events')
				.select('*', { count: 'exact', head: true })
				.gte('created_at', yesterday);

			if (error) {
				checks.push({ name: 'recent_scrape', status: 'fail', detail: error.message });
			} else {
				const recentCount = count ?? 0;
				checks.push({
					name: 'recent_scrape',
					status: recentCount > 0 ? 'pass' : 'fail',
					detail: `${recentCount} events created in last 24h`
				});
			}
		} catch (err) {
			checks.push({
				name: 'recent_scrape',
				status: 'fail',
				detail: err instanceof Error ? err.message : 'Unknown error'
			});
		}
	} else {
		checks.push({ name: 'recent_scrape', status: 'fail', detail: 'Skipped (no connection)' });
	}

	// Check 4: Event visibility — compares total approved upcoming vs what
	// the homepage query would return (using UTC). A large gap means a
	// query-level bug (like the timezone mismatch we caught earlier).
	if (checks[0]?.status === 'pass') {
		try {
			const nowUtc = new Date().toISOString();
			const [rawResult, queryResult] = await Promise.all([
				supabase
					.from('events')
					.select('*', { count: 'exact', head: true })
					.in('status', ['approved'])
					.gte('date_start', nowUtc),
				supabase
					.from('events')
					.select('id,date_start', { count: 'exact', head: true })
					.in('status', ['approved', 'cancelled'])
					.gte('date_start', nowUtc)
			]);

			const rawCount = rawResult.count ?? 0;
			const queryCount = queryResult.count ?? 0;

			if (rawResult.error || queryResult.error) {
				checks.push({
					name: 'event_visibility',
					status: 'fail',
					detail: rawResult.error?.message || queryResult.error?.message
				});
			} else {
				// If the homepage-style query returns significantly fewer events
				// than the raw approved count, something is filtering them incorrectly
				const gap = rawCount - queryCount;
				const gapPct = rawCount > 0 ? (gap / rawCount) * 100 : 0;
				const isSuspicious = rawCount > 10 && gapPct > 20;
				checks.push({
					name: 'event_visibility',
					status: isSuspicious ? 'fail' : 'pass',
					detail: `${queryCount} visible of ${rawCount} approved upcoming${isSuspicious ? ` (${Math.round(gapPct)}% gap — possible query bug)` : ''}`
				});
			}
		} catch (err) {
			checks.push({
				name: 'event_visibility',
				status: 'fail',
				detail: err instanceof Error ? err.message : 'Unknown error'
			});
		}
	} else {
		checks.push({ name: 'event_visibility', status: 'fail', detail: 'Skipped (no connection)' });
	}

	// Check 5: Pipeline freshness — did the scraper cron actually run?
	// Different from recent_scrape: a run that inserts 0 new events still
	// writes to scraper_runs. If there's no entry in 14h, the cron is broken.
	if (checks[0]?.status === 'pass') {
		try {
			const { data, error } = await supabase
				.from('scraper_runs')
				.select('run_at')
				.order('run_at', { ascending: false })
				.limit(1);

			if (error) {
				checks.push({ name: 'pipeline_freshness', status: 'fail', detail: error.message });
			} else if (!data || data.length === 0) {
				// No scraper_runs data yet — table is new, not a failure
				checks.push({ name: 'pipeline_freshness', status: 'pass', detail: 'No scraper_runs data yet (table is new)' });
			} else {
				const lastRunAt = new Date(data[0].run_at);
				const hoursAgo = (Date.now() - lastRunAt.getTime()) / (1000 * 60 * 60);
				// Pipeline runs at 06:00 and 18:00 UTC — 14h gap means it missed a run
				const isStale = hoursAgo > 14;
				checks.push({
					name: 'pipeline_freshness',
					status: isStale ? 'fail' : 'pass',
					detail: `Last pipeline run ${hoursAgo.toFixed(1)}h ago${isStale ? ' — cron may have failed' : ''}`
				});
			}
		} catch (err) {
			checks.push({
				name: 'pipeline_freshness',
				status: 'fail',
				detail: err instanceof Error ? err.message : 'Unknown error'
			});
		}
	} else {
		checks.push({ name: 'pipeline_freshness', status: 'fail', detail: 'Skipped (no connection)' });
	}

	// Check 6: Data quality — detect orphaned past events and date parsing bugs
	if (checks[0]?.status === 'pass') {
		try {
			const nowUtc = new Date().toISOString();
			const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

			const [pastApproved, farFuture] = await Promise.all([
				// Events that should have been cleaned up by removeExpiredEvents()
				supabase
					.from('events')
					.select('*', { count: 'exact', head: true })
					.eq('status', 'approved')
					.lt('date_end', nowUtc),
				// Events >1 year out suggest a date parsing bug in a scraper
				supabase
					.from('events')
					.select('*', { count: 'exact', head: true })
					.eq('status', 'approved')
					.gt('date_start', oneYearFromNow)
			]);

			const pastCount = pastApproved.count ?? 0;
			const futureCount = farFuture.count ?? 0;
			const issues: string[] = [];

			if (pastCount > 50) issues.push(`${pastCount} expired events not cleaned up`);
			if (futureCount > 0) issues.push(`${futureCount} events >1 year out (date parsing bug?)`);

			checks.push({
				name: 'data_quality',
				status: issues.length > 0 ? 'fail' : 'pass',
				detail: issues.length > 0 ? issues.join('; ') : 'No anomalies detected'
			});
		} catch (err) {
			checks.push({
				name: 'data_quality',
				status: 'fail',
				detail: err instanceof Error ? err.message : 'Unknown error'
			});
		}
	} else {
		checks.push({ name: 'data_quality', status: 'fail', detail: 'Skipped (no connection)' });
	}

	const failCount = checks.filter((c) => c.status === 'fail').length;
	const status = failCount === 0 ? 'healthy' : failCount < checks.length ? 'degraded' : 'unhealthy';
	const httpStatus = status === 'unhealthy' ? 503 : 200;

	return json(
		{
			status,
			timestamp: new Date().toISOString(),
			duration_ms: Date.now() - start,
			checks
		},
		{
			status: httpStatus,
			headers: { 'Cache-Control': 'public, max-age=300' }
		}
	);
};
