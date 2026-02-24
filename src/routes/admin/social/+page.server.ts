import { supabase } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export interface SocialPost {
	id: string;
	collection_slug: string;
	generated_date: string;
	event_count: number;
	slide_count: number;
	image_urls: string[];
	caption: string;
	post_time: string | null;
	created_at: string;
}

export const load: PageServerLoad = async () => {
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
	const since = sevenDaysAgo.toISOString().slice(0, 10);

	const { data, error } = await supabase
		.from('social_posts')
		.select('*')
		.gte('generated_date', since)
		.order('generated_date', { ascending: false })
		.order('collection_slug', { ascending: true });

	if (error) {
		console.error('Failed to load social posts:', error);
		return { posts: [] as SocialPost[] };
	}

	return { posts: (data ?? []) as SocialPost[] };
};
