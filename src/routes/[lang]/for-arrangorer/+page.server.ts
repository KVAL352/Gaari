import { error, redirect } from '@sveltejs/kit';
import { handleContactSubmit } from './contact-action';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// Page not ready for public yet
	throw error(404, 'Not found');

	if (params.lang === 'en') {
		throw redirect(307, '/en/for-organizers');
	}
};

export const actions: Actions = {
	contact: handleContactSubmit
};
