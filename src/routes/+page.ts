import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	// Root → /no default; Accept-Language redirect handled in hooks.server.ts
	redirect(302, '/no');
};
