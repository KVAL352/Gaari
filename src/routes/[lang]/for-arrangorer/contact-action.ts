import { fail } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { notifyInquiry } from '$lib/server/email';
import type { RequestEvent } from '@sveltejs/kit';

export async function handleContactSubmit({ request }: RequestEvent) {
	const fd = await request.formData();

	// Honeypot — bots fill this hidden field, real users don't
	if (fd.get('website')) {
		return { success: true };
	}

	const name = fd.get('name') as string;
	const organization = fd.get('organization') as string;
	const email = fd.get('email') as string;
	const message = (fd.get('message') as string) || null;

	if (!name || !organization || !email) {
		return fail(400, { contactError: true });
	}

	const { error } = await supabase.from('organizer_inquiries').insert({
		name,
		organization,
		email,
		message
	});

	if (error) return fail(500, { contactError: true });

	notifyInquiry({ name, organization, email, message }).catch((err) =>
		console.error('Failed to send inquiry notification:', err)
	);

	return { success: true };
}
