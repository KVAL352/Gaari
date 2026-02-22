import { generateOgImage } from '$lib/og/og-image';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const png = await generateOgImage({ origin: url.origin });

	return new Response(png as unknown as BodyInit, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=604800'
		}
	});
};
