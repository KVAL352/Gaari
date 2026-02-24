import { generateOgImage } from '$lib/og/og-image';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const result = await generateOgImage({ origin: url.origin });

	return new Response(result.data as unknown as BodyInit, {
		headers: {
			'Content-Type': result.contentType,
			'Cache-Control': 'public, max-age=604800'
		}
	});
};
