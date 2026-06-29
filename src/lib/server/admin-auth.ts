import { createHmac, timingSafeEqual } from 'crypto';
import { ADMIN_SESSION_SECRET, ADMIN_PASSWORD } from '$env/static/private';

export const ADMIN_COOKIE = 'gaari_admin';

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
