import { fail } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { notifyOptOut } from '$lib/server/email';
import type { Actions } from './$types';

export const actions: Actions = {
	optout: async ({ request }) => {
		const fd = await request.formData();

		// Honeypot — bots fill this hidden field, real users don't
		if (fd.get('website')) {
			return { success: true };
		}

		const organization = fd.get('organization') as string;
		const domain = fd.get('domain') as string;
		const email = fd.get('email') as string;
		const reason = (fd.get('reason') as string) || null;

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

		const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
		notifyOptOut({ organization, domain: cleanDomain, contactEmail: email, reason }).catch((err) =>
			console.error('Failed to send opt-out notification:', err)
		);

		return { success: true };
	}
};
