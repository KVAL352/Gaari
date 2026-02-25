import { redirect } from '@sveltejs/kit';
import { ADMIN_COOKIE, isValidToken } from '$lib/server/admin-auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	if (url.pathname === '/admin/login') return {};

	const token = cookies.get(ADMIN_COOKIE);
	if (!token || !isValidToken(token)) {
		redirect(303, '/admin/login');
	}
};
