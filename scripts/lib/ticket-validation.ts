import * as cheerio from 'cheerio';

const VALIDATION_TIMEOUT = 3000;
const USER_AGENT_BOT = 'Googlebot';
const USER_AGENT_NORMAL = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';

export type ValidationResult = 'valid' | 'expired' | 'date_mismatch' | 'unknown';

/**
 * Validate a ticket URL against the actual ticket platform.
 * Validates ticket URLs against actual ticket platforms to detect
 * stale/expired listings or date mismatches.
 */
export async function validateTicketUrl(
	ticketUrl: string,
	expectedDateStart: string
): Promise<ValidationResult> {
	try {
		const url = new URL(ticketUrl);
		const hostname = url.hostname.toLowerCase();

		if (hostname.endsWith('.hoopla.no')) {
			return validateHoopla(ticketUrl, expectedDateStart);
		}

		if (hostname.endsWith('.ticketco.events')) {
			return validateViaHead(ticketUrl);
		}

		if (hostname.includes('eventbrite.com') || hostname.includes('eventbrite.no')) {
			return validateViaHead(ticketUrl);
		}

		if (hostname.includes('billetto.no') || hostname.includes('billetto.com')) {
			return validateViaHead(ticketUrl);
		}

		return 'unknown';
	} catch {
		return 'unknown';
	}
}

/**
 * Hoopla validation: fetch event page with Googlebot UA (bypasses queue-it),
 * check for noindex (expired) and compare event date with expected date.
 */
async function validateHoopla(ticketUrl: string, expectedDateStart: string): Promise<ValidationResult> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);

		const res = await fetch(ticketUrl, {
			headers: { 'User-Agent': USER_AGENT_BOT },
			signal: controller.signal,
			redirect: 'follow',
		});
		clearTimeout(timeout);

		if (!res.ok) return 'unknown';

		const html = await res.text();
		const $ = cheerio.load(html);

		// Check for noindex — Hoopla marks expired events with this
		const robotsMeta = $('meta[name="robots"]').attr('content') || '';
		if (robotsMeta.includes('noindex')) {
			return 'expired';
		}

		// Extract event date from meta tag
		const eventStartMeta = $('meta[property="event:start_time"]').attr('content');
		if (eventStartMeta) {
			const platformDate = new Date(eventStartMeta);
			const expectedDate = new Date(expectedDateStart);

			if (!isNaN(platformDate.getTime()) && !isNaN(expectedDate.getTime())) {
				const diffMs = Math.abs(platformDate.getTime() - expectedDate.getTime());
				const diffDays = diffMs / (1000 * 60 * 60 * 24);

				if (diffDays > 1) {
					return 'date_mismatch';
				}
			}
		}

		return 'valid';
	} catch {
		return 'unknown';
	}
}

/**
 * Simple HEAD request validation for platforms that return 404 for expired events.
 */
async function validateViaHead(ticketUrl: string): Promise<ValidationResult> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);

		const res = await fetch(ticketUrl, {
			method: 'HEAD',
			headers: { 'User-Agent': USER_AGENT_NORMAL },
			signal: controller.signal,
			redirect: 'follow',
		});
		clearTimeout(timeout);

		if (res.status === 404 || res.status === 410) {
			return 'expired';
		}

		return 'valid';
	} catch {
		return 'unknown';
	}
}
