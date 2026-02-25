import { redirect } from '@sveltejs/kit';
import { ADMIN_COOKIE } from '$lib/server/admin-auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	cookies.delete(ADMIN_COOKIE, { path: '/admin' });
	redirect(303, '/admin/login');
};
