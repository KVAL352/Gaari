import { error } from '@sveltejs/kit';
import { getCollection } from '$lib/collections';
import { generateCollectionOgImage } from '$lib/og/og-image';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const collection = getCollection(params.collection);
	if (!collection) {
		throw error(404, 'Collection not found');
	}

	const result = await generateCollectionOgImage({
		origin: url.origin,
		title: collection.title.no,
		subtitle: collection.ogSubtitle.no
	});

	return new Response(result.data as unknown as BodyInit, {
		headers: {
			'Content-Type': result.contentType,
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
