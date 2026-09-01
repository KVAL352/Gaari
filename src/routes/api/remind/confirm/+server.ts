import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

/**
 * Bekreftelseslenka fra e-posten. Setter `confirmed_at`, og først da er
 * adressen faktisk påmeldt.
 *
 * Tokenet er 32 tilfeldige byte og er eneste nøkkel. Det er med vilje: en
 * lenke som bare krever et gjettbart id-felt ville latt hvem som helst
 * bekrefte en annens påmelding, og da var vi like langt.
 *
 * Tokenet nulles etter bruk, så lenka virker én gang. En videresendt e-post
 * kan dermed ikke brukes til å melde noen på igjen etter at de har meldt seg
 * av.
 *
 * Svaret er en omdirigering til en side, ikke JSON, fordi lenka klikkes i en
 * e-postklient av et menneske.
 */
export const GET: RequestHandler = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!token) redirect(303, '/no/paminnelse?status=ugyldig');

	const { data, error } = await supabase
		.from('event_reminders')
		.update({ confirmed_at: new Date().toISOString(), confirm_token: null })
		.eq('confirm_token', token)
		.is('confirmed_at', null)
		.select('event_slug');

	if (error) {
		console.error('Reminder confirm error:', error.message);
		redirect(303, '/no/paminnelse?status=feil');
	}

	// Ingen rad traff. Enten er tokenet brukt fra før, eller det er oppdiktet.
	// De to skilles ikke i svaret, for da kunne noen prøve seg fram.
	if (!data || data.length === 0) redirect(303, '/no/paminnelse?status=ugyldig');

	redirect(303, `/no/paminnelse?status=ok&arrangement=${encodeURIComponent(data[0].event_slug)}`);
};
