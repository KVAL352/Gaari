import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';

/**
 * Generate an HMAC-SHA256 token for a newsletter subscriber's email.
 * Used to sign preference page URLs so only the email owner can access them.
 */
export function generatePreferenceToken(email: string): string {
	const secret = env.NEWSLETTER_SIGNING_SECRET;
	if (!secret) throw new Error('NEWSLETTER_SIGNING_SECRET is not set');
	return createHmac('sha256', secret)
		.update(email.toLowerCase().trim())
		.digest('hex');
}

/**
 * Verify that a preference token matches the given email.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyPreferenceToken(email: string, token: string): boolean {
	const expected = generatePreferenceToken(email);
	try {
		return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
	} catch {
		return false;
	}
}

/**
 * Build a signed preference URL for a subscriber.
 */
export function buildPreferenceUrl(email: string, lang: string, baseUrl = 'https://gaari.no'): string {
	const token = generatePreferenceToken(email);
	return `${baseUrl}/${lang}/nyhetsbrev/preferanser?email=${encodeURIComponent(email)}&token=${token}`;
}
