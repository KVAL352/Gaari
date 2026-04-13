import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { venue, slug } = await request.json();
		if (!venue || !slug) return json({ ok: false }, { status: 400 });

		await supabase
			.from('venue_clicks')
			.insert({ venue_name: venue, event_slug: slug, clicked_at: new Date().toISOString() });

		return json({ ok: true });
	} catch {
		return json({ ok: true }); // fail silently — don't block user
	}
};
