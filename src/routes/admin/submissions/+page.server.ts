import { supabaseAdmin } from '$lib/server/supabase-admin';
import { sendRejectionEmail } from '$lib/server/email';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export interface SubmissionRow {
	id: string;
	slug: string;
	title_no: string;
	title_en: string | null;
	description_no: string;
	description_en: string | null;
	category: string;
	date_start: string;
	date_end: string | null;
	venue_name: string;
	address: string;
	bydel: string;
	price: string;
	ticket_url: string | null;
	image_url: string | null;
	submitter_email: string | null;
	created_at: string;
}

export const load: PageServerLoad = async () => {
	const { data: submissions, error } = await supabaseAdmin
		.from('events')
		.select('id, slug, title_no, title_en, description_no, description_en, category, date_start, date_end, venue_name, address, bydel, price, ticket_url, image_url, submitter_email, created_at')
		.eq('status', 'pending')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Failed to load pending submissions:', error);
		return { submissions: [] as SubmissionRow[] };
	}

	return { submissions: (submissions ?? []) as SubmissionRow[] };
};

export const actions: Actions = {
	approve: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();

		if (!id) {
			return fail(400, { error: 'id is required' });
		}

		const { error } = await supabaseAdmin
			.from('events')
			.update({ status: 'approved' })
			.eq('id', id);

		if (error) {
			console.error('Failed to approve submission:', error);
			return fail(500, { error: 'Database error: ' + error.message });
		}

		return { success: true };
	},

	reject: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const feedback = String(form.get('feedback') ?? '').trim();

		if (!id) {
			return fail(400, { error: 'id is required' });
		}

		// Fetch event details for cleanup and email
		const { data: event } = await supabaseAdmin
			.from('events')
			.select('image_url, slug, title_no, submitter_email')
			.eq('id', id)
			.single();

		// Send rejection email if submitter provided email and admin wrote feedback
		if (event?.submitter_email && feedback) {
			try {
				await sendRejectionEmail(event.submitter_email, event.title_no, feedback);
			} catch (err) {
				console.error('Failed to send rejection email:', err);
				// Continue with deletion even if email fails
			}
		}

		if (event?.image_url) {
			const path = `events/${event.slug}.jpg`;
			await supabaseAdmin.storage
				.from('event-images')
				.remove([path]);
		}

		const { error } = await supabaseAdmin
			.from('events')
			.delete()
			.eq('id', id);

		if (error) {
			console.error('Failed to reject submission:', error);
			return fail(500, { error: 'Database error: ' + error.message });
		}

		return { success: true };
	}
};
