import { describe, it, expect } from 'vitest';
import { isRedirect } from '@sveltejs/kit';
import { handle } from '../../hooks.server';

/**
 * Omdirigeringene fra andre verter (gåri.no, www, QR-klistremerket) til
 * gaari.no.
 *
 * SvelteKit 3 kaster en vanlig feil i stedet for å omdirigere når målet er en
 * annen vert og ikke står i `external`. Ingen test dekket dette da vi
 * oppgraderte, så alle 1 700 var grønne mens gåri.no ville gitt feilside.
 * Testene kaller den ekte hooken.
 */
function fakeEvent(host: string, pathname: string) {
	return {
		url: new URL(`https://${host}${pathname}`),
		request: new Request(`https://${host}${pathname}`, { headers: { host } }),
		cookies: { get: () => undefined },
		getClientAddress: () => '198.51.100.7'
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

async function fangOmdirigering(host: string, pathname: string) {
	try {
		await handle({
			event: fakeEvent(host, pathname),
			resolve: async () => new Response('nådde ruten')
		});
	} catch (e) {
		if (isRedirect(e)) return e;
		throw e;
	}
	throw new Error('ingen omdirigering');
}

describe('omdirigering til gaari.no fra andre verter', () => {
	it('sender www videre med 301 og beholder stien', async () => {
		const r = await fangOmdirigering('www.gaari.no', '/no/konserter?x=1');
		expect(r.status).toBe(301);
		expect(r.location).toBe('https://gaari.no/no/konserter?x=1');
	});

	it('sender IDN-domenet (gåri.no) videre med 301', async () => {
		const r = await fangOmdirigering('xn--gri-ula.no', '/en');
		expect(r.status).toBe(301);
		expect(r.location).toBe('https://gaari.no/en');
	});

	it('sender QR-klistremerket rett til gaari.no med UTM, uten mellomledd', async () => {
		const r = await fangOmdirigering('xn--gri-ula.no', '/qr');
		expect(r.status).toBe(302);
		expect(r.location).toMatch(/^https:\/\/gaari\.no\/no[^?]*\?utm_source=sticker&utm_medium=qr$/);
	});

	it('omdirigerer ikke på gaari.no selv', async () => {
		const res = await handle({
			event: fakeEvent('gaari.no', '/no/konserter'),
			resolve: async () => new Response('nådde ruten')
		});
		expect(await res.text()).toBe('nådde ruten');
	});
});
