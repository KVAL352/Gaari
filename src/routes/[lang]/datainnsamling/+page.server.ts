import { fail } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import type { Actions } from './$types';

export const actions: Actions = {
	optout: async ({ request }) => {
		const fd = await request.formData();

		// Honeypot — bots fill this hidden field, real users don't
		if (fd.get('website')) {
			return { success: true };
		}

		const organization = String(fd.get('organization') ?? '').slice(0, 200);
		const domain = String(fd.get('domain') ?? '').slice(0, 200);
		const email = String(fd.get('email') ?? '').slice(0, 254);
		const reason = fd.get('reason') ? String(fd.get('reason')).slice(0, 1000) : null;

		if (!organization || !domain || !email) {
			return fail(400, { optoutError: true });
		}

		const { error } = await supabase.from('opt_out_requests').insert({
			organization,
			domain: domain.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
			contact_email: email,
			reason
		});

		if (error) return fail(500, { optoutError: true });

		// No immediate email notification — inquiries appear in the daily digest
		// and are reviewed via /admin/optouts

		return { success: true };
	}
};
