import type { RequestHandler } from './$types';

const UMAMI_ENDPOINT = 'https://api-gateway.umami.dev/api/send';

export const POST: RequestHandler = async (event) => {
	let clientIp: string;
	try {
		clientIp = event.getClientAddress();
	} catch {
		clientIp = '127.0.0.1';
	}

	const body = await event.request.text();
	const headers = new Headers({
		'Content-Type': 'application/json',
		'X-Forwarded-For': clientIp,
		'X-Real-IP': clientIp
	});

	// Forward relevant headers from the original request
	const ua = event.request.headers.get('user-agent');
	if (ua) headers.set('User-Agent', ua);
	const origin = event.request.headers.get('origin');
	if (origin) headers.set('Origin', origin);
	const referer = event.request.headers.get('referer');
	if (referer) headers.set('Referer', referer);

	try {
		const response = await fetch(UMAMI_ENDPOINT, {
			method: 'POST',
			headers,
			body
		});

		return new Response(response.body, {
			status: response.status,
			headers: {
				'Content-Type': response.headers.get('Content-Type') || 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		});
	} catch {
		return new Response('{"ok":true}', {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
