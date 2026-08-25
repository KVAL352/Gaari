import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { supabaseAdmin } from '$lib/server/supabase-admin';
import { PUBLIC_EVENT_COLUMNS } from '$lib/server/event-columns';
import type { RequestHandler } from './$types';

/**
 * Operatørsjekken. Hentes av morgen- og health-skillene, og av ingen andre.
 *
 * To klienter, med vilje.
 *
 * `supabaseAdmin` gjør tellingene. RLS-migrasjonen 21. august ga anon lesetilgang
 * til 29 navngitte kolonner i `events` og ingenting i `opt_out_requests`,
 * `edit_suggestions` og `organizer_inquiries`. Denne fila fortsatte å spørre med
 * `select('*')` mot anon-klienten, og Postgres avviser hele spørringen når én
 * kolonne mangler i grantet. Resultatet var at alle åtte sjekkene meldte «fail»
 * fra 21. til 25. august mens siden gikk helt fint. Overvåkningen var altså den
 * eneste som var syk, og fordi UptimeRobot bare poller `/api/health`, sa
 * ingenting fra. To røde cron-jobber fikk stå i tre og fire dager.
 *
 * `supabase` (anon) brukes bare i `public_read`, og det er hele poenget med den
 * sjekken: den går den veien de besøkende går. Uten den ville en fremtidig
 * innstramming av grantet gjort siden tom uten at noe her lyste rødt.
 *
 * Endepunktet er åpent, så svaret oppgir ikke radtall for tabellene med
 * henvendelser og opt-outs. Summen holder til kvotevarsling.
 */

interface HealthCheck {
	name: string;
	status: 'pass' | 'fail';
	detail?: string;
}

export const GET: RequestHandler = async () => {
	const start = Date.now();
	const checks: HealthCheck[] = [];

	// Check 1: Supabase connection + event count
	let connected = false;
	let eventCount = 0;
	try {
		const { count, error } = await supabaseAdmin
			.from('events')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'approved');

		if (error) {
			checks.push({ name: 'supabase_connection', status: 'fail', detail: error.message });
		} else {
			checks.push({ name: 'supabase_connection', status: 'pass' });
			connected = true;
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
	if (connected) {
		checks.push({
			name: 'events_exist',
			status: eventCount > 0 ? 'pass' : 'fail',
			detail: `${eventCount} approved events`
		});
	} else {
		checks.push({ name: 'events_exist', status: 'fail', detail: 'Skipped (no connection)' });
	}

	// Check 3: Kan en besøkende faktisk lese arrangementene?
	// Går med anon-nøkkelen og ber om nøyaktig de kolonnene grantet skal dekke.
	// Driver PUBLIC_EVENT_COLUMNS fra migrasjonen, feiler dette med 42501, og da
	// er forsiden tom for alle andre enn oss.
	try {
		const { data, error } = await supabase
			.from('events')
			.select(PUBLIC_EVENT_COLUMNS)
			.eq('status', 'approved')
			.limit(1);

		if (error) {
			checks.push({
				name: 'public_read',
				status: 'fail',
				detail: `anon kan ikke lese events: ${error.message}`
			});
		} else {
			checks.push({
				name: 'public_read',
				status: data && data.length > 0 ? 'pass' : 'fail',
				detail: data && data.length > 0 ? 'anon leser de offentlige kolonnene' : 'anon fikk 0 rader'
			});
		}
	} catch (err) {
		checks.push({
			name: 'public_read',
			status: 'fail',
			detail: err instanceof Error ? err.message : 'Unknown error'
		});
	}

	// Check 4: Recent scrape activity (events created in last 24h)
	if (connected) {
		try {
			const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
			const { count, error } = await supabaseAdmin
				.from('events')
				.select('id', { count: 'exact', head: true })
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

	// Check 5: Event visibility — compares total approved upcoming vs what
	// the homepage query would return (using UTC). A large gap means a
	// query-level bug (like the timezone mismatch we caught earlier).
	if (connected) {
		try {
			const nowUtc = new Date().toISOString();
			const [rawResult, queryResult] = await Promise.all([
				supabaseAdmin
					.from('events')
					.select('id', { count: 'exact', head: true })
					.in('status', ['approved'])
					.gte('date_start', nowUtc),
				supabaseAdmin
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
					detail: `${queryCount} visible of ${rawCount} approved upcoming${isSuspicious ? ` (${Math.round(gapPct)}% gap, possible query bug)` : ''}`
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

	// Check 6: Pipeline freshness — did the scraper cron actually run?
	// Different from recent_scrape: a run that inserts 0 new events still
	// writes to scraper_runs. If there's no entry in 14h, the cron is broken.
	if (connected) {
		try {
			const { data, error } = await supabaseAdmin
				.from('scraper_runs')
				.select('run_at')
				.order('run_at', { ascending: false })
				.limit(1);

			if (error) {
				checks.push({ name: 'pipeline_freshness', status: 'fail', detail: error.message });
			} else if (!data || data.length === 0) {
				// No scraper_runs data yet — table is new, not a failure
				checks.push({
					name: 'pipeline_freshness',
					status: 'pass',
					detail: 'No scraper_runs data yet (table is new)'
				});
			} else {
				const lastRunAt = new Date(data[0].run_at);
				const hoursAgo = (Date.now() - lastRunAt.getTime()) / (1000 * 60 * 60);
				// Pipeline runs at 06:00 and 18:00 UTC — 14h gap means it missed a run
				const isStale = hoursAgo > 14;
				checks.push({
					name: 'pipeline_freshness',
					status: isStale ? 'fail' : 'pass',
					detail: `Last pipeline run ${hoursAgo.toFixed(1)}h ago${isStale ? ', cron may have failed' : ''}`
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

	// Check 7: Image URL health — sample 20 events with image_url, HEAD-check for 404s
	if (connected) {
		try {
			const { data: sample, error: imgError } = await supabaseAdmin
				.from('events')
				.select('image_url')
				.eq('status', 'approved')
				.not('image_url', 'is', null)
				.gte('date_start', new Date().toISOString())
				.order('date_start', { ascending: true })
				.limit(20);

			if (imgError) {
				checks.push({ name: 'image_health', status: 'fail', detail: imgError.message });
			} else if (!sample || sample.length === 0) {
				checks.push({ name: 'image_health', status: 'pass', detail: 'No events with images to check' });
			} else {
				const results = await Promise.allSettled(
					sample.map(async (e) => {
						// HEAD first (cheap). Some servers (e.g. Plone/Zope on bergenbibliotek.no)
						// return 500 on HEAD for endpoints that work fine on GET, so fall back to
						// a Range GET before flagging the URL as broken.
						const head = await fetch(e.image_url!, {
							method: 'HEAD',
							signal: AbortSignal.timeout(5000)
						});
						if (head.ok) return head;
						const get = await fetch(e.image_url!, {
							method: 'GET',
							headers: { Range: 'bytes=0-1023' },
							signal: AbortSignal.timeout(5000)
						});
						const ct = get.headers.get('content-type') ?? '';
						if (get.ok && ct.startsWith('image/')) return get;
						return head; // return the original failure for status classification
					})
				);
				const broken = results.filter(
					(r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status >= 400)
				).length;
				const brokenPct = (broken / sample.length) * 100;
				checks.push({
					name: 'image_health',
					status: brokenPct > 25 ? 'fail' : 'pass',
					detail: `${broken}/${sample.length} broken image URLs${brokenPct > 25 ? ` (${Math.round(brokenPct)}%, too many broken)` : ''}`
				});
			}
		} catch (err) {
			checks.push({
				name: 'image_health',
				status: 'fail',
				detail: err instanceof Error ? err.message : 'Unknown error'
			});
		}
	} else {
		checks.push({ name: 'image_health', status: 'fail', detail: 'Skipped (no connection)' });
	}

	// Check 8: Database size — row counts for key tables to spot quota issues.
	// Endepunktet er åpent, så bare totalen og arrangementstallet står i svaret.
	// Hvor mange henvendelser og opt-outs som ligger inne er forretningsdata og
	// hører ikke hjemme i et svar hvem som helst kan hente.
	if (connected) {
		try {
			const [events, optOuts, editSugs, promotions, inquiries] = await Promise.all([
				supabaseAdmin.from('events').select('id', { count: 'exact', head: true }),
				supabaseAdmin.from('opt_out_requests').select('id', { count: 'exact', head: true }),
				supabaseAdmin.from('edit_suggestions').select('id', { count: 'exact', head: true }),
				supabaseAdmin.from('promoted_placements').select('id', { count: 'exact', head: true }),
				supabaseAdmin.from('organizer_inquiries').select('id', { count: 'exact', head: true })
			]);

			const feilet = [events, optOuts, editSugs, promotions, inquiries].find((r) => r.error);
			if (feilet?.error) {
				checks.push({ name: 'database_size', status: 'fail', detail: feilet.error.message });
			} else {
				const totalRows =
					(events.count ?? 0) +
					(optOuts.count ?? 0) +
					(editSugs.count ?? 0) +
					(promotions.count ?? 0) +
					(inquiries.count ?? 0);

				// Supabase free tier: 500MB / ~500k rows is a sensible early warning
				checks.push({
					name: 'database_size',
					status: totalRows > 500_000 ? 'fail' : 'pass',
					detail: `${totalRows} total rows (events: ${events.count ?? 0})`
				});
			}
		} catch (err) {
			checks.push({
				name: 'database_size',
				status: 'fail',
				detail: err instanceof Error ? err.message : 'Unknown error'
			});
		}
	} else {
		checks.push({ name: 'database_size', status: 'fail', detail: 'Skipped (no connection)' });
	}

	// Check 9: Data quality — detect orphaned past events and date parsing bugs
	if (connected) {
		try {
			const nowUtc = new Date().toISOString();
			// 2 years — venues like Grieghallen legitimately sell tickets 1+ year ahead
			const twoYearsFromNow = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

			const [pastApproved, farFuture] = await Promise.all([
				// Events that should have been cleaned up by removeExpiredEvents()
				supabaseAdmin
					.from('events')
					.select('id', { count: 'exact', head: true })
					.eq('status', 'approved')
					.lt('date_end', nowUtc),
				// Events >2 years out suggest a date parsing bug in a scraper
				supabaseAdmin
					.from('events')
					.select('id', { count: 'exact', head: true })
					.eq('status', 'approved')
					.gt('date_start', twoYearsFromNow)
			]);

			const pastCount = pastApproved.count ?? 0;
			const futureCount = farFuture.count ?? 0;
			const issues: string[] = [];

			if (pastCount > 50) issues.push(`${pastCount} expired events not cleaned up`);
			if (futureCount > 0) issues.push(`${futureCount} events >2 years out (date parsing bug?)`);

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
			headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
		}
	);
};
