import { error } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { getCollection } from '$lib/collections';
import type { RequestHandler } from './$types';

const BUCKET = 'social-media';

/**
 * Same-origin proxy for an individual story PNG. Same rationale as the video
 * proxy: iOS Safari needs the file served from gaari.no for the download
 * gesture (and Content-Disposition: attachment) to land in Safari Downloads.
 */
export const GET: RequestHandler = async ({ params, url, fetch }) => {
	const { date, slug, n } = params;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw error(404, 'Not found');
	if (!getCollection(slug)) throw error(404, 'Not found');
	const idx = Number(n);
	if (!Number.isInteger(idx) || idx < 1 || idx > 99) throw error(404, 'Not found');

	const forceDownload = url.searchParams.has('download');

	const { data: urlData } = supabase.storage
		.from(BUCKET)
		.getPublicUrl(`${date}/${slug}/story-${idx}.png`);

	const upstream = await fetch(urlData.publicUrl);
	if (!upstream.ok) throw error(upstream.status, 'Story not found');

	const headers = new Headers();
	headers.set('content-type', 'image/png');
	const len = upstream.headers.get('content-length');
	if (len) headers.set('content-length', len);
	headers.set('cache-control', 'private, max-age=300');
	if (forceDownload) {
		headers.set('content-disposition', `attachment; filename="story-${slug}-${idx}.png"`);
	}

	return new Response(upstream.body, {
		status: 200,
		headers
	});
};
