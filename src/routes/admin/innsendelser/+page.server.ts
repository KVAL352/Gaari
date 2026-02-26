import { supabaseAdmin } from '$lib/server/supabase-admin';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export interface InquiryRow {
	id: string;
	name: string;
	organization: string;
	email: string;
	message: string | null;
	status: 'new' | 'contacted' | 'converted' | 'declined';
	notes: string | null;
	created_at: string;
}

export const load: PageServerLoad = async () => {
	const { data: inquiries, error } = await supabaseAdmin
		.from('organizer_inquiries')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Failed to load organizer inquiries:', error);
		return { inquiries: [] as InquiryRow[] };
	}

	return { inquiries: (inquiries ?? []) as InquiryRow[] };
};

export const actions: Actions = {
	updateStatus: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const status = String(form.get('status') ?? '').trim();

		if (!id || !status) {
			return fail(400, { error: 'id and status are required' });
		}

		const validStatuses = ['new', 'contacted', 'converted', 'declined'];
		if (!validStatuses.includes(status)) {
			return fail(400, { error: 'Invalid status' });
		}

		const { error } = await supabaseAdmin
			.from('organizer_inquiries')
			.update({ status })
			.eq('id', id);

		if (error) {
			console.error('Failed to update inquiry status:', error);
			return fail(500, { error: 'Database error: ' + error.message });
		}

		return { success: true };
	},

	updateNotes: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim() || null;

		if (!id) {
			return fail(400, { error: 'id is required' });
		}

		const { error } = await supabaseAdmin
			.from('organizer_inquiries')
			.update({ notes })
			.eq('id', id);

		if (error) {
			console.error('Failed to update inquiry notes:', error);
			return fail(500, { error: 'Database error: ' + error.message });
		}

		return { success: true };
	}
};
