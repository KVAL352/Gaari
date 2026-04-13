import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, eventSlug, eventTitle, eventDate, venueName } = await request.json();

		if (!email || !eventSlug || !eventDate) {
			return json({ ok: false, error: 'missing_fields' }, { status: 400 });
		}

		// Basic email validation
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return json({ ok: false, error: 'invalid_email' }, { status: 400 });
		}

		const { error } = await supabase
			.from('event_reminders')
			.upsert(
				{
					email,
					event_slug: eventSlug,
					event_title: eventTitle || '',
					event_date: eventDate,
					venue_name: venueName || ''
				},
				{ onConflict: 'email,event_slug' }
			);

		if (error) {
			console.error('Reminder insert error:', error.message);
			return json({ ok: false, error: 'db_error' }, { status: 500 });
		}

		return json({ ok: true });
	} catch {
		return json({ ok: false, error: 'server_error' }, { status: 500 });
	}
};
