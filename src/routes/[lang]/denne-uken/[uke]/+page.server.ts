import { error } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const weekParam = params.uke; // format: "2026-16" (year-week)
	const match = weekParam.match(/^(\d{4})-(\d{1,2})$/);
	if (!match) throw error(404, 'Invalid week format');

	const year = parseInt(match[1]);
	const week = parseInt(match[2]);
	if (week < 1 || week > 53) throw error(404, 'Invalid week number');

	// Calculate Monday and Sunday of the given ISO week
	const jan4 = new Date(year, 0, 4);
	const dayOfWeek = jan4.getDay() || 7;
	const monday = new Date(jan4);
	monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);

	const startStr = monday.toISOString().slice(0, 10);
	const endStr = sunday.toISOString().slice(0, 10);

	const { data: events } = await supabase
		.from('events')
		.select('*')
		.in('status', ['approved'])
		.gte('date_start', startStr)
		.lte('date_start', endStr)
		.order('date_start', { ascending: true })
		.limit(200);

	return {
		events: events || [],
		week,
		year,
		startDate: startStr,
		endDate: endStr
	};
};
