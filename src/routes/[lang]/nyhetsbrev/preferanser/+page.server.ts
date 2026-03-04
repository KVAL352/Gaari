import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { verifyPreferenceToken } from '$lib/server/newsletter-auth';
import type { PageServerLoad, Actions } from './$types';

const ML_BASE = 'https://connect.mailerlite.com/api';

async function mlFetch(path: string, options: RequestInit = {}) {
	return fetch(`${ML_BASE}${path}`, {
		...options,
		headers: {
			'Authorization': `Bearer ${env.MAILERLITE_API_KEY}`,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			...options.headers
		}
	});
}

export const load: PageServerLoad = async ({ url }) => {
	const email = url.searchParams.get('email')?.trim() || '';
	const token = url.searchParams.get('token') || '';

	if (!email) {
		return { email: '', preferences: null, invalidToken: false };
	}

	// Require valid HMAC token to access preferences
	if (!token || !verifyPreferenceToken(email, token)) {
		return { email: '', preferences: null, invalidToken: true };
	}

	if (!env.MAILERLITE_API_KEY) {
		return { email, preferences: null, invalidToken: false };
	}

	try {
		const res = await mlFetch(`/subscribers/${encodeURIComponent(email)}`);
		if (!res.ok) {
			return { email, preferences: null, invalidToken: false };
		}

		const json = await res.json();
		const fields = json.data?.fields || {};

		return {
			email,
			preferences: {
				audience: fields.preference_audience || '',
				categories: fields.preference_categories || '',
				bydel: fields.preference_bydel || '',
				price: fields.preference_price || '',
				lang: fields.preference_lang || 'no'
			},
			invalidToken: false
		};
	} catch {
		return { email, preferences: null, invalidToken: false };
	}
};

export const actions: Actions = {
	update: async ({ request }) => {
		const fd = await request.formData();
		const email = fd.get('email')?.toString().trim();
		const token = fd.get('token')?.toString().trim();

		if (!email) {
			return fail(400, { error: true });
		}

		// Verify HMAC token on update too (prevents forged form submissions)
		if (!token || !verifyPreferenceToken(email, token)) {
			return fail(403, { error: true });
		}

		if (!env.MAILERLITE_API_KEY) {
			return fail(500, { error: true });
		}

		const audience = fd.get('audience')?.toString().trim() || '';
		const categories = fd.get('categories')?.toString().trim() || '';
		const bydel = fd.get('bydel')?.toString().trim() || '';
		const price = fd.get('price')?.toString().trim() || '';
		const lang = fd.get('preference_lang')?.toString().trim() || 'no';

		const res = await mlFetch('/subscribers', {
			method: 'POST',
			body: JSON.stringify({
				email,
				fields: {
					preference_audience: audience,
					preference_categories: categories,
					preference_bydel: bydel,
					preference_price: price,
					preference_lang: lang
				}
			})
		});

		if (!res.ok && res.status !== 422) {
			console.error('MailerLite update failed:', res.status, await res.text());
			return fail(500, { error: true });
		}

		return { success: true };
	}
};
