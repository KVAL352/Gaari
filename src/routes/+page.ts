import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	// Detect language on server — default to Norwegian
	// Client-side detection happens in the [lang] layout
	redirect(307, '/no');
};
