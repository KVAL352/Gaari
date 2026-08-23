import { describe, it, expect, vi, beforeEach } from 'vitest';
import { B2B_PAGES_PUBLIC } from '$lib/b2b-visibility';

// Skjemahandlingen henter inn Supabase og e-postutsending paa modulnivaa.
// Begge stubbes, slik at testen kan slaa fast at INGEN av dem blir roert.
const insert = vi.fn(() => Promise.resolve({ error: null }));
const notifyInquiry = vi.fn((_inquiry: unknown) => Promise.resolve());

vi.mock('$lib/server/supabase', () => ({
	supabase: { from: () => ({ insert }) }
}));
vi.mock('$lib/server/email', () => ({
	notifyInquiry: (inquiry: unknown) => notifyInquiry(inquiry)
}));

import { handleContactSubmit } from '../../routes/[lang]/for-arrangorer/contact-action';

function requestWith(fields: Record<string, string>) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.set(k, v);
	return { request: { formData: () => Promise.resolve(fd) } } as never;
}

describe('B2B-sidene er skjult', () => {
	beforeEach(() => {
		insert.mockClear();
		notifyInquiry.mockClear();
	});

	it('flagget staar av', () => {
		// Ryker denne, er sidene slaatt paa med vilje. Da skal resten av
		// testene under snus, ikke slettes.
		expect(B2B_PAGES_PUBLIC).toBe(false);
	});

	it('kontaktskjemaet svarer 404 og skriver ingenting', async () => {
		// Regresjonen dette fanger: sperren laa i load, men SvelteKit kjoerer
		// actions FOER load. En POST til ?/contact gikk rett gjennom og skrev
		// til organizer_inquiries selv om siden var skjult.
		await expect(
			handleContactSubmit(
				requestWith({ name: 'Test', organization: 'Testhuset', email: 'test@example.com' })
			)
		).rejects.toMatchObject({ status: 404 });

		expect(insert).not.toHaveBeenCalled();
		expect(notifyInquiry).not.toHaveBeenCalled();
	});

	it('sperren gaar foran honeypot-sjekken', async () => {
		// Honeypot-grenen returnerer { success: true } uten aa skrive noe. Den
		// maa ikke kunne brukes til aa faa et 200-svar fra en skjult rute.
		await expect(handleContactSubmit(requestWith({ website: 'bot' }))).rejects.toMatchObject({
			status: 404
		});
	});
});
