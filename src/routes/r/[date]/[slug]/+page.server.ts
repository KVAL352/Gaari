import { error } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import { getCollection } from '$lib/collections';
import type { PageServerLoad } from './$types';

const BUCKET = 'social-media';

export const load: PageServerLoad = async ({ params }) => {
	const { date, slug } = params;

	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw error(404, 'Not found');

	const collection = getCollection(slug);
	if (!collection) throw error(404, 'Not found');

	const mp4Path = `${date}/${slug}/reel.mp4`;
	const captionPath = `${date}/${slug}/caption.txt`;

	const { data: mp4Url } = supabase.storage.from(BUCKET).getPublicUrl(mp4Path);
	const { data: capUrl } = supabase.storage.from(BUCKET).getPublicUrl(captionPath);

	// Verify the MP4 actually exists before rendering the page
	const head = await fetch(mp4Url.publicUrl, { method: 'HEAD' });
	if (!head.ok) throw error(404, 'Reel not found');

	// Caption is best-effort — empty string if missing
	let caption = '';
	try {
		const capRes = await fetch(capUrl.publicUrl);
		if (capRes.ok) caption = await capRes.text();
	} catch {
		/* ignore */
	}

	const isEnglish = ['today-in-bergen', 'this-weekend', 'free-things-to-do-bergen'].includes(slug);
	const lang = isEnglish ? 'en' : 'no';
	const title = isEnglish ? collection.title.en : collection.title.no;

	return {
		date,
		slug,
		mp4Url: mp4Url.publicUrl,
		caption,
		collectionTitle: title,
		lang
	};
};
