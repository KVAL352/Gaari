import { describe, it, expect } from 'vitest';
import { requiresAdminAuth } from '../server/admin-auth';
import { handle } from '../../hooks.server';

/**
 * Locks the fix for the audit finding of 2026-08-21.
 *
 * The admin area was guarded only by +layout.server.ts. SvelteKit runs
 * `handle` → action → load, so a form action POSTed without a session had
 * already written to the database before the layout redirected to login. The
 * guard now lives in `handle`, and this is the rule it applies.
 */
describe('requiresAdminAuth', () => {
	it('demands a session for every mutating admin request', () => {
		for (const path of [
			'/admin/submissions',
			'/admin/optouts',
			'/admin/promotions',
			'/admin/corrections',
			'/admin/innsendelser',
			'/admin/calendar',
			'/admin/social'
		]) {
			expect(requiresAdminAuth(path, 'POST'), `${path} must be guarded`).toBe(true);
		}
	});

	it('covers admin pages that do not exist yet', () => {
		// The whole point of guarding in hooks: a new admin route is protected
		// without anyone remembering to add a check to it.
		expect(requiresAdminAuth('/admin/some-future-page', 'POST')).toBe(true);
		expect(requiresAdminAuth('/admin/a/b/c', 'DELETE')).toBe(true);
	});

	it('guards every mutating verb, not just POST', () => {
		for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'post', 'delete']) {
			expect(requiresAdminAuth('/admin/promotions', method)).toBe(true);
		}
	});

	it('leaves reads to the layout load, which already redirects', () => {
		for (const method of ['GET', 'HEAD', 'OPTIONS']) {
			expect(requiresAdminAuth('/admin/submissions', method)).toBe(false);
		}
	});

	it('exempts login, which is where a session is obtained', () => {
		expect(requiresAdminAuth('/admin/login', 'POST')).toBe(false);
	});

	it('does not touch the public site', () => {
		for (const path of ['/no/submit', '/api/remind', '/en', '/api/notify-submission']) {
			expect(requiresAdminAuth(path, 'POST')).toBe(false);
		}
	});
});

/**
 * The rule above is only worth anything if `handle` actually applies it.
 * These call the real hook, so removing the guard from hooks.server.ts fails
 * here even though requiresAdminAuth itself still passes its own tests.
 */
describe('hooks.handle admin guard', () => {
	function fakeEvent(pathname: string, method: string, cookie?: string) {
		return {
			url: new URL(`https://gaari.no${pathname}`),
			request: new Request(`https://gaari.no${pathname}`, {
				method,
				headers: { host: 'gaari.no' }
			}),
			cookies: { get: (name: string) => (name === 'gaari_admin' ? cookie : undefined) },
			getClientAddress: () => '198.51.100.7',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any;
	}

	const resolved = () => new Response('reached the route', { status: 200 });

	it('rejects an unauthenticated admin POST before the route runs', async () => {
		let routeRan = false;
		const res = await handle({
			event: fakeEvent('/admin/submissions', 'POST'),
			resolve: () => {
				routeRan = true;
				return resolved();
			}
		});

		expect(res.status).toBe(403);
		expect(routeRan, 'the action must not execute').toBe(false);
	});

	it('rejects a forged session cookie', async () => {
		const res = await handle({
			event: fakeEvent('/admin/optouts', 'POST', 'not-a-real-token'),
			resolve: resolved
		});
		expect(res.status).toBe(403);
	});

	it('lets the login POST through to be rate limited and checked', async () => {
		const res = await handle({
			event: fakeEvent('/admin/login', 'POST'),
			resolve: resolved
		});
		expect(res.status).not.toBe(403);
	});
});
