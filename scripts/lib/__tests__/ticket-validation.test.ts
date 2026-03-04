import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('cheerio', () => {
	// cheerio is in scripts/package.json, not root — mock it for CI
	return {
		load: (html: string) => {
			const metaTags = [...html.matchAll(/<meta\s+([^>]*)\/?\s*>/gi)].map((m) => {
				const attrs: Record<string, string> = {};
				for (const [, key, val] of m[1].matchAll(/(\w+)="([^"]*)"/g)) {
					attrs[key] = val;
				}
				return attrs;
			});
			return (selector: string) => {
				const sm = selector.match(/meta\[(\w+)="([^"]+)"\]/);
				if (!sm) return { attr: () => '' };
				const found = metaTags.find((t) => t[sm[1]] === sm[2]);
				return { attr: (name: string) => found?.[name] || '' };
			};
		},
	};
});

import { validateTicketUrl } from '../ticket-validation.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
	mockFetch.mockReset();
});

describe('validateTicketUrl', () => {
	describe('Hoopla validation', () => {
		it('returns expired for noindex events', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve(`
					<html><head>
						<meta name="robots" content="noindex" />
						<meta property="event:start_time" content="2026-02-12T17:00:00+01:00" />
					</head></html>
				`),
			});

			const result = await validateTicketUrl(
				'https://vestnorskfilm.hoopla.no/event/113324392',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('expired');
		});

		it('returns date_mismatch when platform date differs by >1 day', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve(`
					<html><head>
						<meta property="event:start_time" content="2026-02-12T17:00:00+01:00" />
					</head></html>
				`),
			});

			const result = await validateTicketUrl(
				'https://example.hoopla.no/event/123',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('date_mismatch');
		});

		it('returns valid when dates match', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve(`
					<html><head>
						<meta property="event:start_time" content="2026-03-03T18:00:00+01:00" />
					</head></html>
				`),
			});

			const result = await validateTicketUrl(
				'https://example.hoopla.no/event/456',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('valid');
		});

		it('returns valid when dates are within 1 day', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve(`
					<html><head>
						<meta property="event:start_time" content="2026-03-03T23:00:00+01:00" />
					</head></html>
				`),
			});

			const result = await validateTicketUrl(
				'https://example.hoopla.no/event/789',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('valid');
		});

		it('returns unknown on fetch error', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			const result = await validateTicketUrl(
				'https://example.hoopla.no/event/000',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('unknown');
		});

		it('returns unknown on non-ok response', async () => {
			mockFetch.mockResolvedValue({ ok: false, status: 500 });

			const result = await validateTicketUrl(
				'https://example.hoopla.no/event/000',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('unknown');
		});

		it('returns valid when no meta tags found', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve('<html><head></head><body>No meta</body></html>'),
			});

			const result = await validateTicketUrl(
				'https://example.hoopla.no/event/999',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('valid');
		});

		it('uses Googlebot user-agent for Hoopla', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve('<html><head></head></html>'),
			});

			await validateTicketUrl(
				'https://example.hoopla.no/event/123',
				'2026-03-03T17:00:00'
			);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://example.hoopla.no/event/123',
				expect.objectContaining({
					headers: { 'User-Agent': 'Googlebot' },
				})
			);
		});
	});

	describe('TicketCo validation', () => {
		it('returns expired on 404', async () => {
			mockFetch.mockResolvedValue({ status: 404 });

			const result = await validateTicketUrl(
				'https://hulen.ticketco.events/no/nb/e/some-event',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('expired');
		});

		it('returns expired on 410 Gone', async () => {
			mockFetch.mockResolvedValue({ status: 410 });

			const result = await validateTicketUrl(
				'https://hulen.ticketco.events/no/nb/e/some-event',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('expired');
		});

		it('returns valid on 200', async () => {
			mockFetch.mockResolvedValue({ status: 200 });

			const result = await validateTicketUrl(
				'https://hulen.ticketco.events/no/nb/e/some-event',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('valid');
		});

		it('uses HEAD method', async () => {
			mockFetch.mockResolvedValue({ status: 200 });

			await validateTicketUrl(
				'https://hulen.ticketco.events/no/nb/e/some-event',
				'2026-03-03T17:00:00'
			);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://hulen.ticketco.events/no/nb/e/some-event',
				expect.objectContaining({ method: 'HEAD' })
			);
		});
	});

	describe('Eventbrite validation', () => {
		it('returns expired on 404', async () => {
			mockFetch.mockResolvedValue({ status: 404 });

			const result = await validateTicketUrl(
				'https://www.eventbrite.com/e/some-event-123',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('expired');
		});

		it('returns valid on 200', async () => {
			mockFetch.mockResolvedValue({ status: 200 });

			const result = await validateTicketUrl(
				'https://www.eventbrite.com/e/some-event-123',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('valid');
		});
	});

	describe('Billetto validation', () => {
		it('returns expired on 404 for billetto.no', async () => {
			mockFetch.mockResolvedValue({ status: 404 });

			const result = await validateTicketUrl(
				'https://billetto.no/e/some-event',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('expired');
		});

		it('returns expired on 404 for billetto.com', async () => {
			mockFetch.mockResolvedValue({ status: 404 });

			const result = await validateTicketUrl(
				'https://billetto.com/e/some-event',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('expired');
		});
	});

	describe('unknown platforms', () => {
		it('returns unknown for unrecognized domains', async () => {
			const result = await validateTicketUrl(
				'https://random-venue.no/events/123',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('unknown');
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('returns unknown for invalid URLs', async () => {
			const result = await validateTicketUrl(
				'not-a-url',
				'2026-03-03T17:00:00'
			);
			expect(result).toBe('unknown');
		});
	});
});
