import { error } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { getCollection } from '$lib/collections';
import type { RequestHandler } from './$types';

const BUCKET = 'social-media';

/**
 * Same-origin proxy for the reel MP4 stored in Supabase. iOS Safari only allows
 * the long-press "Save to Photos" gesture for videos served from the same origin
 * as the embedding page, even when the upstream serves Access-Control-Allow-Origin:*.
 *
 * Forwards Range headers so the video element can seek and so iOS streams in
 * chunks rather than buffering the whole file at once.
 */
export const GET: RequestHandler = async ({ params, url, request, fetch }) => {
	const { date, slug } = params;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw error(404, 'Not found');
	if (!getCollection(slug)) throw error(404, 'Not found');

	const forceDownload = url.searchParams.has('download');

	const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${date}/${slug}/reel.mp4`);
	const upstream = urlData.publicUrl;

	const headers: Record<string, string> = {};
	const range = request.headers.get('range');
	if (range) headers['range'] = range;

	const upstreamRes = await fetch(upstream, { headers });
	if (!upstreamRes.ok && upstreamRes.status !== 206) {
		throw error(upstreamRes.status, 'Upstream fetch failed');
	}

	const respHeaders = new Headers();
	const passthrough = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];
	for (const h of passthrough) {
		const v = upstreamRes.headers.get(h);
		if (v) respHeaders.set(h, v);
	}
	respHeaders.set('content-type', 'video/mp4');
	respHeaders.set('cache-control', 'private, max-age=300');

	if (forceDownload) {
		// Setting Content-Disposition: attachment makes iOS Safari route the file
		// to Safari Downloads instead of inline playback. From Downloads the user
		// can share -> Save to Photos via the Files app.
		respHeaders.set('content-disposition', `attachment; filename="reel-${slug}.mp4"`);
	}

	return new Response(upstreamRes.body, {
		status: upstreamRes.status,
		headers: respHeaders
	});
};
