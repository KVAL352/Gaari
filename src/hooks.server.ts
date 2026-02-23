import type { Handle, HandleServerError } from '@sveltejs/kit';

// ── Rate limiting (in-memory, per-IP) ──

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // max submissions per window

// Clean stale entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, val] of rateLimitMap) {
		if (now > val.resetAt) rateLimitMap.delete(key);
	}
}, 300_000);

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);

	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
		return false;
	}

	entry.count++;
	return entry.count > RATE_LIMIT_MAX;
}

// ── Security headers ──

const securityHeaders: Record<string, string> = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'X-XSS-Protection': '1; mode=block',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

// CSP: allow self, inline scripts/styles (SvelteKit needs these), and any HTTPS images
const csp = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline'",
	"font-src 'self'",
	"img-src 'self' data: https:",
	"connect-src 'self' https://*.supabase.co",
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"form-action 'self'"
].join('; ');

// Rate-limited paths (POST-like operations happen client-side, but we can
// rate-limit page loads to these form pages as a basic defense)
const RATE_LIMITED_PATHS = ['/submit', '/datainnsamling'];

function shouldRateLimit(pathname: string): boolean {
	return RATE_LIMITED_PATHS.some(p => pathname.endsWith(p));
}

// ── Structured error logging (parsed by Vercel's log system) ──

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const err = error instanceof Error ? error : new Error(String(error));
	const stack = err.stack?.split('\n').slice(0, 5).join('\n');

	console.error(
		JSON.stringify({
			type: 'server_error',
			timestamp: new Date().toISOString(),
			status,
			message: err.message,
			stack,
			url: event.url.pathname,
			method: event.request.method,
			userAgent: event.request.headers.get('user-agent') ?? undefined
		})
	);

	return { message: 'An unexpected error occurred. Please try again later.' };
};

export const handle: Handle = async ({ event, resolve }) => {
	// Rate limit form pages (skip during prerendering — no client address available)
	if (shouldRateLimit(event.url.pathname)) {
		try {
			const ip = event.getClientAddress();
			if (isRateLimited(ip)) {
				return new Response('Too many requests. Please try again later.', {
					status: 429,
					headers: { 'Retry-After': '60' }
				});
			}
		} catch {
			// getClientAddress() throws during prerendering — skip rate limiting
		}
	}

	const response = await resolve(event);

	// Apply security headers to all responses
	for (const [header, value] of Object.entries(securityHeaders)) {
		response.headers.set(header, value);
	}
	response.headers.set('Content-Security-Policy', csp);

	return response;
};
