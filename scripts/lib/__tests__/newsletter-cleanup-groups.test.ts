import { describe, it, expect, afterEach } from 'vitest';
import { velgSlettbare, ryddGrupper } from '../../newsletter-cleanup-groups.js';
import { lagMlFetch, mailerliteBase, MAILERLITE_PROD_BASE } from '../mailerlite.js';
import { startFakeMailerLite, type FakeMailerLite, type FakeSubscriber } from '../../sandbox/fake-mailerlite.js';

/**
 * Nyhetsbrevet laget én MailerLite-gruppe per profil per uke og slettet
 * ingen. 20. oktober 2026 var det 963 grupper, 961 av dem `newsletter-*`.
 * Oppryddingen skal ta de gamle og ingenting annet, og stoppe hvis sletting
 * viser seg å ta abonnentene med seg.
 */

const DAG = 86_400_000;
const NAA = Date.UTC(2026, 9, 20, 12);
const navn = (ms: number, profil = 'no-all') => `newsletter-${ms}-Gåri uke 42 ${profil}`;

describe('velgSlettbare', () => {
	it('tar bare newsletter-grupper eldre enn 7 dager, eldste først', () => {
		const valgt = velgSlettbare([
			{ id: '1', name: navn(NAA - 8 * DAG) },
			{ id: '2', name: navn(NAA - 6 * DAG) },
			{ id: '3', name: navn(NAA - 30 * DAG) },
			{ id: '4', name: 'Nyhetsbrev-abonnenter' },
			{ id: '5', name: 'newsletter-manuell' },
			{ id: '6', name: `kopi av ${navn(NAA - 30 * DAG)}` }
		], NAA);
		expect(valgt.map((g) => g.id)).toEqual(['3', '1']);
	});

	it('lar en gruppe fra i dag stå', () => {
		expect(velgSlettbare([{ id: '1', name: navn(NAA - 60_000) }], NAA)).toEqual([]);
	});
});

describe('mailerliteBase', () => {
	it('bruker alltid ekte adresse utenfor sandkassemodus, uansett variabel', () => {
		expect(mailerliteBase({ MAILERLITE_BASE_URL: 'http://127.0.0.1:1/api' })).toBe(MAILERLITE_PROD_BASE);
	});

	it('nekter sandkassemodus mot en adresse som ikke er lokal', () => {
		expect(() => mailerliteBase({
			NEWSLETTER_SANDBOX: '1', MAILERLITE_API_KEY: 'sandbox', MAILERLITE_BASE_URL: MAILERLITE_PROD_BASE
		})).toThrow(/127\.0\.0\.1/);
		expect(() => mailerliteBase({
			NEWSLETTER_SANDBOX: '1', MAILERLITE_API_KEY: 'sandbox', MAILERLITE_BASE_URL: 'http://127.0.0.1.evil.example/api'
		})).toThrow();
	});

	it('nekter sandkassemodus med en ekte nøkkel', () => {
		expect(() => mailerliteBase({
			NEWSLETTER_SANDBOX: '1', MAILERLITE_API_KEY: 'eyJ-ekte', MAILERLITE_BASE_URL: 'http://127.0.0.1:1/api'
		})).toThrow(/sandbox/);
	});

	it('godtar lokal adresse med sandkassenøkkel', () => {
		expect(mailerliteBase({
			NEWSLETTER_SANDBOX: '1', MAILERLITE_API_KEY: 'sandbox', MAILERLITE_BASE_URL: 'http://127.0.0.1:4321/api/'
		})).toBe('http://127.0.0.1:4321/api');
	});
});

describe('ryddGrupper mot falsk MailerLite', () => {
	let fake: FakeMailerLite | undefined;
	afterEach(async () => {
		await fake?.close();
		fake = undefined;
	});

	const abonnenter: FakeSubscriber[] = Array.from({ length: 150 }, (_, i) => ({
		id: String(i), email: `test${i}@example.invalid`, status: 'active', fields: {}
	}));

	// Som kontoen 20. okt: 961 midlertidige grupper over ca. 32 uker, pluss 2 andre.
	function somKontoen() {
		const grupper: { name: string; members?: string[] }[] = [];
		for (let i = 0; i < 961; i++) {
			const alder = 1 + Math.floor(i / 30) * 7; // 30 grupper per uke, nyeste fra i går
			grupper.push({ name: navn(NAA - alder * DAG - i * 1000), members: [abonnenter[i % 150].email] });
		}
		grupper.push({ name: 'Nyhetsbrev-abonnenter', members: abonnenter.map((a) => a.email) });
		grupper.push({ name: 'Testgruppe' });
		return grupper;
	}

	const stille = () => {};
	const utenVent = (_ms: number) => Promise.resolve();

	it('visning sletter ingenting', async () => {
		fake = await startFakeMailerLite({ subscribers: abonnenter, groups: somKontoen(), ratePerMinute: 0 });
		const r = await ryddGrupper({ mlFetch: lagMlFetch(fake.url, 'sandbox', utenVent), naaMs: NAA, apply: false, logg: stille });
		expect(r.funnet).toBe(961);
		expect(r.slettbare).toBe(931); // de 30 fra siste uke står
		expect(fake.groups.size).toBe(963);
		expect(fake.calls.some((c) => c.method === 'DELETE')).toBe(false);
	});

	it('--max 1 sletter bare den eldste', async () => {
		fake = await startFakeMailerLite({ subscribers: abonnenter, groups: somKontoen(), ratePerMinute: 0 });
		const alleNewsletter = [...fake.groups.values()].filter((g) => g.name.startsWith('newsletter-'));
		const forventet = alleNewsletter.reduce((a, b) => (a.name < b.name ? a : b));
		const r = await ryddGrupper({ mlFetch: lagMlFetch(fake.url, 'sandbox', utenVent), naaMs: NAA, apply: true, max: 1, logg: stille });
		expect(r.slettet).toBe(1);
		expect(fake.groups.size).toBe(962);
		expect(fake.groups.has(forventet.id)).toBe(false);
	});

	it('full opprydding lar ukas grupper og de andre gruppene stå', async () => {
		fake = await startFakeMailerLite({ subscribers: abonnenter, groups: somKontoen(), ratePerMinute: 0 });
		const r = await ryddGrupper({ mlFetch: lagMlFetch(fake.url, 'sandbox', utenVent), naaMs: NAA, apply: true, logg: stille });
		expect(r).toMatchObject({ slettet: 931, feilet: 0, abonnenterFor: 150, abonnenterEtter: 150 });
		const igjen = [...fake.groups.values()].map((g) => g.name);
		expect(igjen).toHaveLength(32);
		expect(igjen).toContain('Nyhetsbrev-abonnenter');
		expect(igjen).toContain('Testgruppe');
	});

	it('stopper etter første sletting hvis abonnenter forsvinner med gruppa', async () => {
		fake = await startFakeMailerLite({
			subscribers: abonnenter, groups: somKontoen(), ratePerMinute: 0, deleteRemovesSubscribers: true
		});
		const r = await ryddGrupper({ mlFetch: lagMlFetch(fake.url, 'sandbox', utenVent), naaMs: NAA, apply: true, logg: stille });
		expect(r.slettet).toBe(1);
		expect(r.stoppet).toMatch(/150 til 149/);
		expect(fake.groups.size).toBe(962);
	});

	it('teller feil uten å gi opp resten', async () => {
		fake = await startFakeMailerLite({
			subscribers: abonnenter, groups: somKontoen(), ratePerMinute: 0, failOn: { 'DELETE /groups/:id': 500 }
		});
		const r = await ryddGrupper({ mlFetch: lagMlFetch(fake.url, 'sandbox', utenVent), naaMs: NAA, apply: true, max: 3, logg: stille });
		expect(r).toMatchObject({ slettet: 0, feilet: 3 });
	});

	// Vinduet er 300 ms i stedet for et minutt, og ventingen tilsvarende kort.
	const kortVent = () => new Promise<void>((r) => setTimeout(r, 350));

	it('bremser før rate limit-grensen, og når alle', async () => {
		fake = await startFakeMailerLite({ subscribers: abonnenter, groups: somKontoen(), ratePerMinute: 50, rateWindowMs: 300 });
		let ventet = 0;
		const vent = () => { ventet++; return kortVent(); };
		const r = await ryddGrupper({ mlFetch: lagMlFetch(fake.url, 'sandbox', vent), naaMs: NAA, apply: true, max: 60, logg: stille });
		expect(r).toMatchObject({ slettet: 60, feilet: 0 });
		expect(ventet).toBeGreaterThan(0);
	});

	it('venter og prøver igjen ved 429, og når alle', async () => {
		fake = await startFakeMailerLite({
			subscribers: abonnenter, groups: somKontoen(), ratePerMinute: 50, rateWindowMs: 300, rateHeader: false
		});
		const r = await ryddGrupper({ mlFetch: lagMlFetch(fake.url, 'sandbox', kortVent), naaMs: NAA, apply: true, max: 60, logg: stille });
		expect(r).toMatchObject({ slettet: 60, feilet: 0 });
		expect(fake.calls.some((c) => c.status === 429)).toBe(true);
	});
});
