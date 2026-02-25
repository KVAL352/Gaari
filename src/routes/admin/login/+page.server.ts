import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { ADMIN_PASSWORD } from '$env/static/private';
import { ADMIN_COOKIE, makeSessionToken } from '$lib/server/admin-auth';
import type { Actions } from './$types';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const password = String(form.get('password') ?? '');

		if (password !== ADMIN_PASSWORD) {
			return fail(401, { error: 'Feil passord' });
		}

		cookies.set(ADMIN_COOKIE, makeSessionToken(), {
			path: '/admin',
			httpOnly: true,
			sameSite: 'strict',
			secure: !dev,
			maxAge: COOKIE_MAX_AGE
		});

		redirect(303, '/admin/promotions');
	}
};
