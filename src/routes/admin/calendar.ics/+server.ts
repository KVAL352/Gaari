import { supabase } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

function escapeICS(text: string): string {
	return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toICSDate(dateStr: string): string {
	// Convert YYYY-MM-DD to YYYYMMDD (all-day event)
	return dateStr.replace(/-/g, '');
}

// Stable UID from item id
function makeUID(id: string): string {
	return `${id}@gaari.no`;
}

const STATUS_PREFIX: Record<string, string> = {
	done: '[FERDIG] ',
	in_progress: '[PAGAR] ',
	skipped: '[HOPPET OVER] ',
	pending: ''
};

const CATEGORY_MAP: Record<string, string> = {
	milestone: 'MILEPAEL',
	deadline: 'FRIST',
	task: 'OPPGAVE',
	recurring: 'GJENTAKENDE',
	meeting: 'MOTE'
};

export const GET: RequestHandler = async () => {
	const { data: items, error } = await supabase
		.from('project_calendar')
		.select('*')
		.order('due_date', { ascending: true });

	if (error) {
		return new Response('Calendar unavailable', { status: 500 });
	}

	const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

	const events = (items ?? []).map((item) => {
		const prefix = STATUS_PREFIX[item.status] ?? '';
		const summary = escapeICS(`${prefix}${item.title}`);
		const description = item.description ? escapeICS(item.description) : '';
		const category = CATEGORY_MAP[item.category] ?? 'OPPGAVE';
		const dtstart = toICSDate(item.due_date);
		// All-day event: DTEND is the next day
		const endDate = new Date(item.due_date + 'T00:00:00');
		endDate.setDate(endDate.getDate() + 1);
		const dtend = endDate.toISOString().slice(0, 10).replace(/-/g, '');

		return [
			'BEGIN:VEVENT',
			`UID:${makeUID(item.id)}`,
			`DTSTAMP:${now}`,
			`DTSTART;VALUE=DATE:${dtstart}`,
			`DTEND;VALUE=DATE:${dtend}`,
			`SUMMARY:${summary}`,
			...(description ? [`DESCRIPTION:${description}`] : []),
			`CATEGORIES:${category}`,
			...(item.status === 'done' ? ['STATUS:COMPLETED'] : []),
			...(item.category === 'deadline' ? ['PRIORITY:1'] : []),
			'END:VEVENT'
		].join('\r\n');
	});

	const calendar = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Gaari//Project Calendar//NO',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'X-WR-CALNAME:Gåri Prosjekt',
		'X-WR-TIMEZONE:Europe/Oslo',
		'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
		'',
		events.join('\r\n'),
		'',
		'END:VCALENDAR'
	].join('\r\n');

	return new Response(calendar, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': 'inline; filename="gaari-project.ics"',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
