import { json } from '@sveltejs/kit';
import { notifySubmission, notifyInquiry } from '$lib/server/email';
import type { RequestHandler } from './$types';

const MAX_FIELD_LENGTH = 500;

function truncate(value: unknown, max = MAX_FIELD_LENGTH): string {
	const str = String(value ?? '').trim();
	return str.length > max ? str.slice(0, max) : str;
}

export const POST: RequestHandler = async ({ request }) => {
	let data: Record<string, unknown>;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const { type } = data;

	if (type !== 'event' && type !== 'website') {
		return json({ error: 'Invalid type' }, { status: 400 });
	}

	try {
		if (type === 'event') {
			const title = truncate(data.title) || 'Unknown';
			const venue = truncate(data.venue) || 'Unknown';

			if (!title && !venue) {
				return json({ error: 'Missing required fields' }, { status: 400 });
			}

			notifySubmission({
				title,
				venue,
				dateStart: truncate(data.dateStart),
				ticketUrl: data.ticketUrl ? truncate(data.ticketUrl) : null,
				submitterEmail: data.submitterEmail ? truncate(data.submitterEmail) : null
			}).catch((err) => console.error('Failed to send submission notification:', err));
		} else {
			const name = truncate(data.name);
			const organization = truncate(data.organization);
			const email = truncate(data.email);

			if (!name || !email) {
				return json({ error: 'Missing required fields' }, { status: 400 });
			}

			notifyInquiry({
				name,
				organization,
				email,
				message: data.message ? truncate(data.message, 2000) : null
			}).catch((err) => console.error('Failed to send website submission notification:', err));
		}
	} catch (err) {
		console.error('Notification error:', err);
	}

	return json({ ok: true });
};
