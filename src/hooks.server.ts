import type { Handle, HandleServerError } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

// ── Rate limiting (in-memory, per-IP) ──

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

// Separate rate limit maps for different tiers
const formRateLimitMap = new Map<string, RateLimitEntry>();
const apiRateLimitMap = new Map<string, RateLimitEntry>();
const loginRateLimitMap = new Map<string, RateLimitEntry>();

// Rate limit configs
const FORM_LIMIT = { window: 60_000, max: 5 }; // 5/min for form pages
const API_LIMIT = { window: 60_000, max: 3 }; // 3/min for API endpoints
const LOGIN_LIMIT = { window: 300_000, max: 3 }; // 3/5min for admin login

// Clean stale entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const map of [formRateLimitMap, apiRateLimitMap, loginRateLimitMap]) {
		for (const [key, val] of map) {
			if (now > val.resetAt) map.delete(key);
		}
	}
}, 300_000);

function isRateLimited(
	map: Map<string, RateLimitEntry>,
	ip: string,
	config: { window: number; max: number }
): boolean {
	const now = Date.now();
	const entry = map.get(ip);

	if (!entry || now > entry.resetAt) {
		map.set(ip, { count: 1, resetAt: now + config.window });
		return false;
	}

	entry.count++;
	return entry.count > config.max;
}

// ── AI referral detection (server-side) ──
// AI platforms often strip document.referrer client-side (noreferrer, redirects).
// Capture the HTTP Referer header server-side and pass it via a short-lived cookie.
const AI_REFERRER_DOMAINS = [
	'chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'claude.ai',
	'gemini.google.com', 'copilot.microsoft.com', 'deepseek.com',
	'you.com', 'phind.com', 'meta.ai'
];

function detectAiReferrer(referer: string | null): string | null {
	if (!referer) return null;
	for (const domain of AI_REFERRER_DOMAINS) {
		if (referer.includes(domain)) return domain;
	}
	return null;
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

// CSP: allow self, inline scripts/styles (SvelteKit needs these), Supabase images + media
const csp = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline'",
	"font-src 'self'",
	"img-src 'self' data: https:",
	"media-src 'self' https://*.supabase.co",
	"connect-src 'self' https://*.supabase.co",
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"report-uri /api/csp-report"
].join('; ');

// Rate-limited path groups
const FORM_PATHS = ['/submit', '/datainnsamling'];
const API_PATHS = ['/api/newsletter', '/api/notify-submission'];
const LOGIN_PATH = '/admin/login';

function getRateLimitTier(pathname: string, method: string): 'form' | 'api' | 'login' | null {
	if (pathname.endsWith(LOGIN_PATH) && method === 'POST') return 'login';
	if (API_PATHS.some((p) => pathname === p) && method === 'POST') return 'api';
	if (FORM_PATHS.some((p) => pathname.endsWith(p))) return 'form';
	return null;
}

// ── Structured error logging (parsed by Vercel's log system) ──

export const handleError: HandleServerError = ({ error, event, status }) => {
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
	const host = event.request.headers.get('host')?.replace(/:\d+$/, '') ?? '';

	// Handle /qr directly on non-canonical domains (gåri.no) to avoid
	// double-redirect chain that triggers Safari's fraud warning
	if (event.url.pathname === '/qr' && host && host !== 'gaari.no' && host !== 'localhost') {
		const oslo = new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' });
		const osloDate = new Date(oslo);
		const day = osloDate.getDay();
		const hour = osloDate.getHours();

		let collection: string;
		if (day === 0 || day === 5 || day === 6) {
			collection = 'denne-helgen';
		} else if (hour >= 16) {
			collection = 'i-kveld';
		} else {
			collection = 'i-dag';
		}

		redirect(302, `https://gaari.no/no/${collection}?utm_source=sticker&utm_medium=qr`);
	}

	// Root URL: 302 redirect based on Accept-Language (not 301 — destination varies per user)
	if (event.url.pathname === '/' && (host === 'gaari.no' || host === 'localhost')) {
		const acceptLang = event.request.headers.get('accept-language') ?? '';
		const prefersEnglish = /^en\b/i.test(acceptLang) && !/^(no|nb|nn)\b/i.test(acceptLang);
		redirect(302, prefersEnglish ? '/en' : '/no');
	}

	// 301-redirect non-canonical domains (gåri.no, www) to gaari.no
	if (host && host !== 'gaari.no' && host !== 'localhost') {
		const url = new URL(event.request.url);
		url.host = 'gaari.no';
		url.port = '';
		redirect(301, url.toString());
	}

	const tier = getRateLimitTier(event.url.pathname, event.request.method);

	// Apply rate limiting based on tier (skip during prerendering)
	if (tier) {
		try {
			const ip = event.getClientAddress();
			const maps = { form: formRateLimitMap, api: apiRateLimitMap, login: loginRateLimitMap };
			const configs = { form: FORM_LIMIT, api: API_LIMIT, login: LOGIN_LIMIT };
			const retryAfter = String(Math.ceil(configs[tier].window / 1000));

			if (isRateLimited(maps[tier], ip, configs[tier])) {
				return new Response('Too many requests. Please try again later.', {
					status: 429,
					headers: { 'Retry-After': retryAfter }
				});
			}
		} catch {
			// getClientAddress() throws during prerendering — skip rate limiting
		}
	}

	const response = await resolve(event, {
		// Set <html lang> based on URL so SSR HTML has the correct language attribute
		transformPageChunk: ({ html }) => {
			const langMatch = event.url.pathname.match(/^\/(en)\b/);
			return langMatch ? html.replace('lang="nb"', 'lang="en"') : html;
		}
	});

	// Apply security headers to all responses
	for (const [header, value] of Object.entries(securityHeaders)) {
		response.headers.set(header, value);
	}
	response.headers.set('Content-Security-Policy', csp);

	// Set ai_ref cookie when visitor arrives from an AI search platform
	const referer = event.request.headers.get('referer');
	const aiSource = detectAiReferrer(referer);
	if (aiSource) {
		response.headers.append(
			'Set-Cookie',
			`ai_ref=${aiSource}; Path=/; Max-Age=30; SameSite=Lax; Secure`
		);
	}

	return response;
};
