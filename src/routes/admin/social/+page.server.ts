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
	instagram_id: string | null;
	instagram_posted_at: string | null;
	facebook_id: string | null;
	facebook_posted_at: string | null;
}

export interface SocialInsight {
	id: string;
	platform: 'ig' | 'fb';
	platform_id: string;
	social_post_id: string | null;
	posted_at: string;
	caption: string | null;
	permalink: string | null;
	metrics: Record<string, number>;
	fetched_at: string;
}

export const load: PageServerLoad = async () => {
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
	const since = sevenDaysAgo.toISOString().slice(0, 10);

	const [postsResult, insightsResult] = await Promise.all([
		supabase
			.from('social_posts')
			.select('*')
			.gte('generated_date', since)
			.order('generated_date', { ascending: false })
			.order('collection_slug', { ascending: true }),
		supabase
			.from('social_insights')
			.select('*')
			.gte('posted_at', new Date(Date.now() - 30 * 86400000).toISOString())
			.order('posted_at', { ascending: false })
			.limit(50)
	]);

	if (postsResult.error) {
		console.error('Failed to load social posts:', postsResult.error);
	}
	if (insightsResult.error) {
		console.error('Failed to load social insights:', insightsResult.error);
	}

	return {
		posts: (postsResult.data ?? []) as SocialPost[],
		insights: (insightsResult.data ?? []) as SocialInsight[]
	};
};
