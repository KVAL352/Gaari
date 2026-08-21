import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ params, data }) => {
	if (params.lang !== 'no' && params.lang !== 'en') {
		error(404, 'Not found');
	}
	// `data` fra +layout.server.ts videreføres eksplisitt. Uten spredningen
	// forsvinner bunntekstlenkene, fordi det er returverdien herfra som blir
	// `data` i +layout.svelte.
	return { ...data, lang: params.lang as 'no' | 'en' };
};
