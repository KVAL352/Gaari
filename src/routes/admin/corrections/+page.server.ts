import { supabaseAdmin } from '$lib/server/supabase-admin';
import { sendCorrectionAppliedEmail, sendCorrectionRejectedEmail } from '$lib/server/email';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const ALLOWED_FIELDS = [
	'title_no', 'title_en', 'description_no', 'description_en',
	'venue_name', 'address', 'bydel', 'price', 'ticket_url',
	'category', 'date_start', 'date_end', 'image_url', 'age_group', 'language'
];

export interface CorrectionRow {
	id: string;
	event_id: string;
	field: string;
	suggested_value: string;
	reason: string | null;
	email: string | null;
	status: string;
	created_at: string;
	event_title: string;
	event_slug: string;
	current_value: string | null;
}

export const load: PageServerLoad = async () => {
	const { data: suggestions, error } = await supabaseAdmin
		.from('edit_suggestions')
		.select('*')
		.eq('status', 'pending')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Failed to load corrections:', error);
		return { corrections: [] as CorrectionRow[] };
	}

	if (!suggestions || suggestions.length === 0) {
		return { corrections: [] as CorrectionRow[] };
	}

	// Batch-fetch related events
	const eventIds = [...new Set(suggestions.map((s: { event_id: string }) => s.event_id))];

	const { data: fullEvents } = await supabaseAdmin
		.from('events')
		.select('*')
		.in('id', eventIds);

	const fullEventMap = new Map(
		(fullEvents ?? []).map((e: Record<string, unknown>) => [e.id as string, e])
	);

	const corrections: CorrectionRow[] = suggestions.map((s: Record<string, unknown>) => {
		const fullEvent = fullEventMap.get(s.event_id as string);
		return {
			id: s.id as string,
			event_id: s.event_id as string,
			field: s.field as string,
			suggested_value: s.suggested_value as string,
			reason: s.reason as string | null,
			email: s.email as string | null,
			status: s.status as string,
			created_at: s.created_at as string,
			event_title: fullEvent ? String(fullEvent.title_no ?? '(slettet arrangement)') : '(slettet arrangement)',
			event_slug: fullEvent ? String(fullEvent.slug ?? '') : '',
			current_value: fullEvent ? String(fullEvent[s.field as string] ?? '') : null
		};
	});

	return { corrections };
};

export const actions: Actions = {
	apply: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();

		if (!id) {
			return fail(400, { error: 'id is required' });
		}

		const { data: correction } = await supabaseAdmin
			.from('edit_suggestions')
			.select('event_id, field, suggested_value, email')
			.eq('id', id)
			.single();

		if (!correction) {
			return fail(404, { error: 'Correction not found' });
		}

		if (!ALLOWED_FIELDS.includes(correction.field)) {
			return fail(400, { error: 'Invalid field: ' + correction.field });
		}

		const { error: updateError } = await supabaseAdmin
			.from('events')
			.update({ [correction.field]: correction.suggested_value })
			.eq('id', correction.event_id);

		if (updateError) {
			console.error('Failed to apply correction:', updateError);
			return fail(500, { error: 'Database error: ' + updateError.message });
		}

		const { error: statusError } = await supabaseAdmin
			.from('edit_suggestions')
			.update({ status: 'applied' })
			.eq('id', id);

		if (statusError) {
			console.error('Failed to update correction status:', statusError);
		}

		if (correction.email) {
			const { data: event } = await supabaseAdmin
				.from('events')
				.select('title_no')
				.eq('id', correction.event_id)
				.single();

			try {
				await sendCorrectionAppliedEmail(
					correction.email,
					event?.title_no ?? 'arrangementet'
				);
			} catch (err) {
				console.error('Failed to send correction applied email:', err);
			}
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

		const { data: correction } = await supabaseAdmin
			.from('edit_suggestions')
			.select('email, event_id')
			.eq('id', id)
			.single();

		if (correction?.email && feedback) {
			const { data: event } = await supabaseAdmin
				.from('events')
				.select('title_no')
				.eq('id', correction.event_id)
				.single();

			try {
				await sendCorrectionRejectedEmail(
					correction.email,
					event?.title_no ?? 'arrangementet',
					feedback
				);
			} catch (err) {
				console.error('Failed to send correction rejected email:', err);
			}
		}

		const { error } = await supabaseAdmin
			.from('edit_suggestions')
			.update({ status: 'rejected' })
			.eq('id', id);

		if (error) {
			console.error('Failed to reject correction:', error);
			return fail(500, { error: 'Database error: ' + error.message });
		}

		return { success: true };
	}
};
