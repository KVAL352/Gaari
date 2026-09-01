import { json } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { supabase } from '$lib/server/supabase';
import { sendReminderConfirmation } from '$lib/server/email';
import type { RequestHandler } from './$types';

/**
 * Påmelding til påminnelse om et arrangement. Dobbel opt-in siden 1. september
 * 2026.
 *
 * Tidligere skrev dette endepunktet en hvilken som helst adresse rett inn i
 * event_reminders, og `scripts/send-reminders.ts` sendte til den dagen før
 * arrangementet. Sikkerhetsrevisjonen fant at Gåri dermed kunne brukes til å
 * plage noen med e-post de aldri hadde bedt om: en angriper trengte bare
 * adressen deres og en arrangementslenke.
 *
 * Nå skrives raden med `confirmed_at = null` og et tilfeldig token, og
 * utsendingen plukker bare bekreftede rader. Adressen brukes til nøyaktig én
 * ting før bekreftelsen, nemlig å sende bekreftelseslenka dit.
 *
 * SVARET ER LIKT UANSETT. Det røper ikke om adressen alt var påmeldt, og
 * heller ikke om e-posten faktisk gikk. Ellers ville endepunktet blitt et
 * verktøy for å finne ut hvem som er påmeldt hva.
 */
export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const { email, eventSlug, eventTitle, eventDate, venueName } = await request.json();

		if (!email || !eventSlug || !eventDate) {
			return json({ ok: false, error: 'missing_fields' }, { status: 400 });
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return json({ ok: false, error: 'invalid_email' }, { status: 400 });
		}

		const token = randomBytes(32).toString('base64url');

		const { error } = await supabase.from('event_reminders').upsert(
			{
				email,
				event_slug: eventSlug,
				event_title: eventTitle || '',
				event_date: eventDate,
				venue_name: venueName || '',
				confirm_token: token,
				confirmed_at: null
			},
			{ onConflict: 'email,event_slug' }
		);

		if (error) {
			console.error('Reminder insert error:', error.message);
			return json({ ok: false, error: 'db_error' }, { status: 500 });
		}

		try {
			await sendReminderConfirmation(
				email,
				eventTitle || 'arrangementet',
				`${url.origin}/api/remind/confirm?token=${token}`
			);
		} catch (e) {
			// Raden ligger inne som ubekreftet og blir aldri sendt, saa en feilet
			// e-post er ikke farlig. Den logges, men svaret er likt uansett.
			console.error('Reminder confirmation email failed:', e);
		}

		return json({ ok: true });
	} catch {
		return json({ ok: false, error: 'server_error' }, { status: 500 });
	}
};
