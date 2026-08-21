import { createHmac, timingSafeEqual } from 'crypto';
import { ADMIN_SESSION_SECRET, ADMIN_PASSWORD } from '$env/static/private';

export const ADMIN_COOKIE = 'gaari_admin';

const ADMIN_LOGIN_PATH = '/admin/login';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Does this request mutate admin state, and therefore need a valid session?
 *
 * The admin +layout.server.ts load cannot answer this. SvelteKit runs
 * `handle` → action → load, so a form action has already written to the
 * database by the time the layout's auth check redirects. The check has to
 * happen in `handle`, and this is the rule it applies.
 *
 * Login is exempt — that is where a session is obtained.
 */
export function requiresAdminAuth(pathname: string, method: string): boolean {
	if (!pathname.startsWith('/admin')) return false;
	if (SAFE_METHODS.has(method.toUpperCase())) return false;
	return pathname !== ADMIN_LOGIN_PATH;
}

export function makeSessionToken(): string {
	return createHmac('sha256', ADMIN_SESSION_SECRET).update('admin_authenticated').digest('hex');
}

// Timing-safe password check. HMAC both sides first so the digests are always
// equal-length (timingSafeEqual throws on length mismatch, which would itself
// leak the password length). Constant-time regardless of how much matches.
export function verifyAdminPassword(input: string): boolean {
	const a = createHmac('sha256', ADMIN_SESSION_SECRET).update(input).digest();
	const b = createHmac('sha256', ADMIN_SESSION_SECRET).update(ADMIN_PASSWORD).digest();
	return timingSafeEqual(a, b);
}

export function isValidToken(token: string): boolean {
	const expected = makeSessionToken();
	try {
		return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
	} catch {
		return false;
	}
}
