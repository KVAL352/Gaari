import { createHmac, timingSafeEqual } from 'crypto';
import { ADMIN_SESSION_SECRET } from '$env/static/private';

export const ADMIN_COOKIE = 'gaari_admin';

export function makeSessionToken(): string {
	return createHmac('sha256', ADMIN_SESSION_SECRET).update('admin_authenticated').digest('hex');
}

export function isValidToken(token: string): boolean {
	const expected = makeSessionToken();
	try {
		return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
	} catch {
		return false;
	}
}
