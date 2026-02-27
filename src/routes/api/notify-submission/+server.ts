import { json } from '@sveltejs/kit';
import { notifySubmission, notifyInquiry } from '$lib/server/email';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const data = await request.json();
	const { type } = data;

	try {
		if (type === 'event') {
			notifySubmission({
				title: data.title || 'Unknown',
				venue: data.venue || 'Unknown',
				dateStart: data.dateStart || '',
				ticketUrl: data.ticketUrl || null,
				submitterEmail: data.submitterEmail || null
			}).catch((err) => console.error('Failed to send submission notification:', err));
		} else if (type === 'website') {
			notifyInquiry({
				name: data.name || '',
				organization: data.organization || '',
				email: data.email || '',
				message: data.message || null
			}).catch((err) => console.error('Failed to send website submission notification:', err));
		}
	} catch (err) {
		console.error('Notification error:', err);
	}

	return json({ ok: true });
};
