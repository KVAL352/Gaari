import { redirect } from '@sveltejs/kit';
import { handleContactSubmit } from '../for-arrangorer/contact-action';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (params.lang === 'no') {
		throw redirect(307, '/no/for-arrangorer');
	}
};

export const actions: Actions = {
	contact: handleContactSubmit
};
