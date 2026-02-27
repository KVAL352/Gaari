import { supabase } from '$lib/server/supabase';
import { supabaseAdmin } from '$lib/server/supabase-admin';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export interface CalendarItem {
	id: string;
	title: string;
	description: string | null;
	due_date: string;
	status: 'pending' | 'in_progress' | 'done' | 'skipped';
	category: 'milestone' | 'deadline' | 'task' | 'recurring' | 'meeting';
	created_at: string;
	updated_at: string;
}

export const load: PageServerLoad = async () => {
	const { data, error } = await supabase
		.from('project_calendar')
		.select('*')
		.order('due_date', { ascending: true });

	if (error) {
		console.error('Failed to load calendar:', error);
		return { items: [] as CalendarItem[] };
	}

	return { items: (data ?? []) as CalendarItem[] };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim() || null;
		const due_date = String(form.get('due_date') ?? '').trim();
		const category = String(form.get('category') ?? 'task');

		if (!title || !due_date) {
			return fail(400, { error: 'Tittel og dato er påkrevd' });
		}

		const { error } = await supabaseAdmin.from('project_calendar').insert({
			title,
			description,
			due_date,
			category,
			status: 'pending'
		});

		if (error) {
			console.error('Failed to create calendar item:', error);
			return fail(500, { error: 'Database error: ' + error.message });
		}

		return { success: true };
	},

	updateStatus: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const status = String(form.get('status') ?? '').trim();

		if (!id || !status) {
			return fail(400, { error: 'id and status required' });
		}

		const { error } = await supabaseAdmin
			.from('project_calendar')
			.update({ status, updated_at: new Date().toISOString() })
			.eq('id', id);

		if (error) {
			console.error('Failed to update calendar item:', error);
			return fail(500, { error: 'Database error: ' + error.message });
		}

		return { success: true };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();

		if (!id) {
			return fail(400, { error: 'id required' });
		}

		const { error } = await supabaseAdmin
			.from('project_calendar')
			.delete()
			.eq('id', id);

		if (error) {
			console.error('Failed to delete calendar item:', error);
			return fail(500, { error: 'Database error: ' + error.message });
		}

		return { success: true };
	}
};
