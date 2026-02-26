import { generateCollectionOgImage } from '$lib/og/og-image';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const result = await generateCollectionOgImage({
		origin: url.origin,
		title: 'For organizers',
		subtitle: 'Visible in AI search'
	});

	return new Response(result.data as unknown as BodyInit, {
		headers: {
			'Content-Type': result.contentType,
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
