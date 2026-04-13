import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

/** GET /api/posting-status?week=2026-04-14 — returns { [taskKey]: true } */
export const GET: RequestHandler = async ({ url }) => {
	const week = url.searchParams.get('week');
	if (!week) return json({});

	const { data } = await supabase
		.from('social_posting_status')
		.select('task_key, done')
		.eq('week_start', week)
		.eq('done', true);

	const result: Record<string, boolean> = {};
	for (const row of data || []) result[row.task_key] = true;
	return json(result);
};

/** POST /api/posting-status — toggle a task { week, key, done } */
export const POST: RequestHandler = async ({ request }) => {
	const { week, key, done } = await request.json();
	if (!week || !key) return json({ ok: false }, { status: 400 });

	if (done) {
		await supabase
			.from('social_posting_status')
			.upsert({ week_start: week, task_key: key, done: true, updated_at: new Date().toISOString() });
	} else {
		await supabase
			.from('social_posting_status')
			.delete()
			.eq('week_start', week)
			.eq('task_key', key);
	}

	return json({ ok: true });
};

/** DELETE /api/posting-status?week=2026-04-14 — reset entire week */
export const DELETE: RequestHandler = async ({ url }) => {
	const week = url.searchParams.get('week');
	if (!week) return json({ ok: false }, { status: 400 });

	await supabase
		.from('social_posting_status')
		.delete()
		.eq('week_start', week);

	return json({ ok: true });
};
