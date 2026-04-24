import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

// Lightweight liveness probe — hit every 5 min by UptimeRobot.
// Comprehensive audit lives at /api/health/deep (daily-cron / manual use).
export const GET: RequestHandler = async () => {
	const start = Date.now();
	try {
		const { error } = await supabase
			.from('events')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'approved');
		if (error) throw error;
		return json(
			{ status: 'healthy', timestamp: new Date().toISOString(), duration_ms: Date.now() - start },
			{ status: 200, headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
		);
	} catch (err) {
		return json(
			{
				status: 'unhealthy',
				timestamp: new Date().toISOString(),
				duration_ms: Date.now() - start,
				error: err instanceof Error ? err.message : 'Unknown error'
			},
			{ status: 503, headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
		);
	}
};
