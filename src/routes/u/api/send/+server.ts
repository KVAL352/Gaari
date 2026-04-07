import type { RequestHandler } from './$types';

const UMAMI_ENDPOINT = 'https://api-gateway.umami.dev/api/send';

/**
 * Proxy for Umami beacon — replaces the vercel.json rewrite so that
 * we can explicitly forward the client IP via X-Forwarded-For.
 *
 * Background: Vercel rewrites to external URLs do not always preserve
 * X-Forwarded-For correctly, causing Umami to geolocate visitors as
 * the Vercel edge region (Stockholm = arn1, hence the bogus 80% SE
 * country share in analytics).
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const body = await request.text();

	// Build forwarded headers — preserve essential metadata, drop
	// hop-by-hop headers, and explicitly set the client IP.
	let clientIp: string;
	try {
		clientIp = getClientAddress();
	} catch {
		clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
	}

	const forwarded = new Headers();
	forwarded.set('content-type', request.headers.get('content-type') ?? 'application/json');
	const ua = request.headers.get('user-agent');
	if (ua) forwarded.set('user-agent', ua);
	const lang = request.headers.get('accept-language');
	if (lang) forwarded.set('accept-language', lang);
	if (clientIp) {
		forwarded.set('x-forwarded-for', clientIp);
		forwarded.set('x-real-ip', clientIp);
	}

	const upstream = await fetch(UMAMI_ENDPOINT, {
		method: 'POST',
		headers: forwarded,
		body
	});

	return new Response(upstream.body, {
		status: upstream.status,
		headers: {
			'content-type': upstream.headers.get('content-type') ?? 'application/json',
			'cache-control': 'no-store'
		}
	});
};
