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

/*
 * DELETE er fjernet 2026-09-01 etter sikkerhetsrevisjonen.
 *
 * Endepunktet var uautentisert, saa `DELETE /api/posting-status?week=…`
 * slettet en hel uke med SoMe-avkryssing for hvem som helst som kjente
 * adressen. Ingen persondata og ingen penger, men den korrumperte en logg
 * Kjersti stoler paa, og den gjorde det stille.
 *
 * «Nullstill alt»-knappen i /r/week/ er fjernet i samme slengen. Uten
 * endepunktet ville den toemt skjermen mens basen beholdt hakene, som ville
 * kommet tilbake ved neste lasting.
 *
 * GET og POST staar igjen, og er fortsatt uautentiserte. De er
 * ratebegrenset fra samme dato, men det gjoer misbruk tregere, ikke umulig.
 * Kjersti vurderer om selve /r/week/-sida skal loeses paa en annen maate.
 */
