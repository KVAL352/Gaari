import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { SKIP_LOG_IPS } from '$env/static/private';
import type { RequestHandler } from './$types';

const skipIps = new Set((SKIP_LOG_IPS ?? '').split(',').map(s => s.trim()).filter(Boolean));

const VALID_CONTEXTS = new Set(['promoted', 'organic', 'direct', 'newsletter', 'social']);

// In-memory rate limit: max RATE_LIMIT requests per RATE_WINDOW_MS per IP.
// Prevents runaway client bugs and trivial spam without logging the IP.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();

function allowRate(ip: string): boolean {
	if (!ip) return true;
	const now = Date.now();
	const cutoff = now - RATE_WINDOW_MS;
	const bucket = (rateBuckets.get(ip) ?? []).filter(t => t > cutoff);
	if (bucket.length >= RATE_LIMIT) {
		rateBuckets.set(ip, bucket);
		return false;
	}
	bucket.push(now);
	rateBuckets.set(ip, bucket);
	return true;
}

function sanitizeSourcePage(raw: unknown): string | null {
	if (typeof raw !== 'string' || raw.length === 0) return null;
	if (raw.length > 200) return null;
	// Strip query string and hash — we only want the path for aggregation.
	const pathOnly = raw.split('?')[0].split('#')[0];
	if (!pathOnly.startsWith('/')) return null;
	return pathOnly;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		let clientIp = '';
		try { clientIp = getClientAddress(); } catch { /* prerender context */ }
		if (skipIps.has(clientIp)) return json({ ok: true });
		if (!allowRate(clientIp)) return json({ ok: false }, { status: 429 });

		const body = await request.json();
		// Backwards-compat: old callers send `{venue, slug}`.
		const venue_name = body.venue_name ?? body.venue;
		const event_slug = body.event_slug ?? body.slug;
		if (!venue_name || !event_slug) return json({ ok: false }, { status: 400 });

		const placement_context = VALID_CONTEXTS.has(body.placement_context)
			? body.placement_context
			: null;
		const placement_id = typeof body.placement_id === 'string' && body.placement_id.length > 0
			? body.placement_id
			: null;
		const source_page = sanitizeSourcePage(body.source_page);

		await supabase
			.from('venue_clicks')
			.insert({
				venue_name,
				event_slug,
				clicked_at: new Date().toISOString(),
				placement_context,
				placement_id,
				source_page
			});

		return json({ ok: true });
	} catch {
		return json({ ok: true }); // fail silently — don't block user
	}
};
