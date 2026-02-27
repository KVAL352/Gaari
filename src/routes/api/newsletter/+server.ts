import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const data = await request.formData();
	const email = data.get('email')?.toString().trim();

	if (!email) {
		return json({ error: 'Email is required' }, { status: 400 });
	}

	if (!env.MAILERLITE_API_KEY) {
		console.error('MAILERLITE_API_KEY is not set');
		return json({ error: 'Newsletter service unavailable' }, { status: 500 });
	}

	// Extract optional preference fields (from EventDiscovery filter state)
	const fields: Record<string, string> = {};
	const audience = data.get('audience')?.toString().trim();
	const categories = data.get('categories')?.toString().trim();
	const bydelPref = data.get('bydel')?.toString().trim();
	const price = data.get('price')?.toString().trim();
	const langPref = data.get('lang')?.toString().trim();

	if (audience) fields.preference_audience = audience;
	if (categories) fields.preference_categories = categories;
	if (bydelPref) fields.preference_bydel = bydelPref;
	if (price) fields.preference_price = price;
	if (langPref) fields.preference_lang = langPref;

	const body: Record<string, unknown> = { email };
	if (Object.keys(fields).length > 0) body.fields = fields;

	const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${env.MAILERLITE_API_KEY}`,
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		const body = await res.json().catch(() => null);
		// MailerLite returns 422 for already-subscribed — treat as success
		if (res.status === 422) {
			return json({ success: true, alreadySubscribed: true });
		}
		console.error('MailerLite error:', res.status, body);
		return json({ error: 'Subscription failed' }, { status: 500 });
	}

	return json({ success: true });
};
