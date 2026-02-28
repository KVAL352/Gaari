import { supabaseAdmin } from '$lib/server/supabase-admin';
import { sendOptOutRejectedEmail } from '$lib/server/email';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export interface OptOutRow {
	id: string;
	organization: string;
	domain: string;
	contact_email: string;
	reason: string | null;
	status: string;
	created_at: string;
	affected_event_count: number;
}

export const load: PageServerLoad = async () => {
	const { data: requests, error } = await supabaseAdmin
		.from('opt_out_requests')
		.select('*')
		.eq('status', 'pending')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Failed to load opt-out requests:', error);
		return { optouts: [] as OptOutRow[] };
	}

	if (!requests || requests.length === 0) {
		return { optouts: [] as OptOutRow[] };
	}

	const optouts: OptOutRow[] = await Promise.all(
		requests.map(async (r: Record<string, unknown>) => {
			const domain = r.domain as string;
			const { count } = await supabaseAdmin
				.from('events')
				.select('id', { count: 'exact', head: true })
				.ilike('source_url', `%${domain}%`)
				.eq('status', 'approved');

			return {
				id: r.id as string,
				organization: r.organization as string,
				domain: r.domain as string,
				contact_email: r.contact_email as string,
				reason: r.reason as string | null,
				status: r.status as string,
				created_at: r.created_at as string,
				affected_event_count: count ?? 0
			};
		})
	);

	return { optouts };
};

export const actions: Actions = {
	approve: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();

		if (!id) {
			return fail(400, { error: 'id is required' });
		}

		const { error } = await supabaseAdmin
			.from('opt_out_requests')
			.update({ status: 'approved' })
			.eq('id', id);

		if (error) {
			console.error('Failed to approve opt-out:', error);
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

		const { data: optout } = await supabaseAdmin
			.from('opt_out_requests')
			.select('contact_email, organization')
			.eq('id', id)
			.single();

		if (optout?.contact_email && feedback) {
			try {
				await sendOptOutRejectedEmail(optout.contact_email, optout.organization, feedback);
			} catch (err) {
				console.error('Failed to send opt-out rejection email:', err);
			}
		}

		const { error } = await supabaseAdmin
			.from('opt_out_requests')
			.update({ status: 'rejected' })
			.eq('id', id);

		if (error) {
			console.error('Failed to reject opt-out:', error);
			return fail(500, { error: 'Database error: ' + error.message });
		}

		return { success: true };
	}
};
