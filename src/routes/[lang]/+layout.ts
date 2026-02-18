import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ params }) => {
	if (params.lang !== 'no' && params.lang !== 'en') {
		error(404, 'Not found');
	}
	return { lang: params.lang as 'no' | 'en' };
};
