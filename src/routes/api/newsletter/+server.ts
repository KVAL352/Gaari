import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

// Basic email format validation (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321

// Allowed preference values (whitelist)
const VALID_AUDIENCES = ['', 'familie', 'ungdom', 'voksen', 'student', '18+', 'turist'];
const VALID_PRICE = ['', 'free', 'paid'];
const VALID_LANG = ['', 'no', 'en'];

function isValidPreference(value: string, allowed: string[]): boolean {
	return allowed.includes(value);
}

export const POST: RequestHandler = async ({ request }) => {
	const data = await request.formData();
	const email = data.get('email')?.toString().trim();

	if (!email) {
		return json({ error: 'Email is required' }, { status: 400 });
	}

	if (email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
		return json({ error: 'Invalid email format' }, { status: 400 });
	}

	if (!env.MAILERLITE_API_KEY) {
		console.error('MAILERLITE_API_KEY is not set');
		return json({ error: 'Newsletter service unavailable' }, { status: 500 });
	}

	// Extract and validate optional preference fields
	const fields: Record<string, string> = {};
	const audience = data.get('audience')?.toString().trim() ?? '';
	const categories = data.get('categories')?.toString().trim() ?? '';
	const bydelPref = data.get('bydel')?.toString().trim() ?? '';
	const price = data.get('price')?.toString().trim() ?? '';
	const langPref = data.get('lang')?.toString().trim() ?? '';

	// Validate against whitelists (silently ignore invalid values)
	if (audience && isValidPreference(audience, VALID_AUDIENCES)) fields.preference_audience = audience;
	if (categories && categories.length <= 200) fields.preference_categories = categories;
	if (bydelPref && bydelPref.length <= 100) fields.preference_bydel = bydelPref;
	if (price && isValidPreference(price, VALID_PRICE)) fields.preference_price = price;
	if (langPref && isValidPreference(langPref, VALID_LANG)) fields.preference_lang = langPref;

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

	// Send welcome email via Resend (fire-and-forget)
	if (env.RESEND_API_KEY) {
		const isEn = langPref === 'en';
		fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'Gåri <noreply@gaari.no>',
				to: [email],
				reply_to: 'post@gaari.no',
				subject: isEn
					? 'Welcome to the Gåri newsletter!'
					: 'Velkommen til Gåri-nyhetsbrevet!',
				text: isEn
					? 'Hi!\n\nThanks for signing up. You\'ll receive weekly updates about what\'s happening in Bergen — concerts, exhibitions, food, family events and more.\n\nThe newsletter is sent every Thursday.\n\nBest,\nGåri\nhttps://gaari.no'
					: 'Hei!\n\nTakk for at du meldte deg på. Du får ukentlige oppdateringer om hva som skjer i Bergen — konserter, utstillinger, mat, familie og mer.\n\nNyhetsbrevet sendes ut hver torsdag.\n\nHilsen Gåri\nhttps://gaari.no'
			})
		}).catch((err) => console.error('Welcome email failed:', err));
	}

	return json({ success: true });
};
