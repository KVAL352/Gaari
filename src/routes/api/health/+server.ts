import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';
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
