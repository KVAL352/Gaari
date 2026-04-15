/**
 * Fetch engagement metrics for all Instagram and Facebook posts.
 * Discovers ALL posts from the account (automated + manual), stores in social_insights.
 *
 * Usage: cd scripts && npx tsx social/fetch-social-insights.ts [--dry-run]
 *
 * Env vars:
 *   META_ACCESS_TOKEN, IG_USER_ID, FB_PAGE_ID,
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config';
import { supabase } from '../lib/supabase.js';
import { getPageToken } from '../lib/meta-api.js';

const META_TOKEN = process.env.META_ACCESS_TOKEN || process.env.IG_ACCESS_TOKEN || '';
const IG_USER_ID = process.env.IG_USER_ID || '';
const FB_PAGE_ID = process.env.FB_PAGE_ID || '';
const GRAPH_API = 'https://graph.facebook.com/v22.0';
const GRAPH_API_RE = /^https:\/\/graph\.facebook\.com\/v[\d.]+/;
const DRY_RUN = process.argv.includes('--dry-run');

/** How many days back to discover posts */
const LOOKBACK_DAYS = 30;

/** Metrics to request for IG media */
const IG_MEDIA_FIELDS = 'id,caption,permalink,timestamp,media_type,like_count,comments_count';
const IG_INSIGHTS_METRICS = 'reach,saved,shares';

/** Metrics to request for FB posts */
const FB_POST_FIELDS = 'id,message,permalink_url,created_time,shares,reactions.summary(true),comments.summary(true)';

// ── Helpers ──

function delay(ms: number): Promise<void> {
	return new Promise(r => setTimeout(r, ms));
}

async function graphGet(path: string): Promise<any> {
	const sep = path.includes('?') ? '&' : '?';
	const url = `${GRAPH_API}${path}${sep}access_token=${encodeURIComponent(META_TOKEN)}`;
	const res = await fetch(url);
	const data = await res.json();
	if (data.error) throw new Error(`Graph API ${path}: ${data.error.message}`);
	return data;
}

// ── Instagram ──

interface IgPost {
	id: string;
	caption?: string;
	permalink?: string;
	timestamp: string;
	media_type: string;
	like_count?: number;
	comments_count?: number;
}

async function fetchIgPosts(): Promise<IgPost[]> {
	if (!META_TOKEN || !IG_USER_ID) {
		console.log('  [skip] Instagram: no credentials');
		return [];
	}

	console.log('Fetching Instagram posts...');
	const since = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 86400;
	const posts: IgPost[] = [];
	let url = `/${IG_USER_ID}/media?fields=${IG_MEDIA_FIELDS}&limit=50`;

	while (url && posts.length < 200) {
		const data = await graphGet(url);
		for (const post of data.data || []) {
			const ts = Math.floor(new Date(post.timestamp).getTime() / 1000);
			if (ts < since) { url = ''; break; }
			posts.push(post);
		}
		url = data.paging?.next ? data.paging.next.replace(GRAPH_API_RE, '') : '';
		if (url) await delay(500);
	}

	console.log(`  Found ${posts.length} IG posts (last ${LOOKBACK_DAYS} days)`);
	return posts;
}

async function fetchIgInsights(mediaId: string, mediaType: string): Promise<Record<string, number>> {
	// Stories and reels have different metric sets; skip insights for now if not IMAGE/CAROUSEL_ALBUM/VIDEO
	const supported = ['IMAGE', 'CAROUSEL_ALBUM', 'VIDEO'];
	if (!supported.includes(mediaType)) return {};

	try {
		const data = await graphGet(`/${mediaId}/insights?metric=${IG_INSIGHTS_METRICS}`);
		const metrics: Record<string, number> = {};
		for (const item of data.data || []) {
			metrics[item.name] = item.values?.[0]?.value ?? 0;
		}
		return metrics;
	} catch (err: any) {
		// Some older posts may not have insights available
		if (err.message.includes('not enough data') || err.message.includes('Unsupported')) {
			return {};
		}
		console.log(`  [warn] IG insights for ${mediaId}: ${err.message}`);
		return {};
	}
}

// ── Facebook ──

interface FbPost {
	id: string;
	message?: string;
	permalink_url?: string;
	created_time: string;
	shares?: { count: number };
	reactions?: { summary: { total_count: number } };
	comments?: { summary: { total_count: number } };
}

async function graphGetWithToken(path: string, token: string): Promise<any> {
	const sep = path.includes('?') ? '&' : '?';
	const url = `${GRAPH_API}${path}${sep}access_token=${encodeURIComponent(token)}`;
	const res = await fetch(url);
	const data = await res.json();
	if (data.error) throw new Error(`Graph API ${path}: ${data.error.message}`);
	return data;
}

async function fetchFbPosts(): Promise<FbPost[]> {
	if (!META_TOKEN || !FB_PAGE_ID) {
		console.log('  [skip] Facebook: no credentials');
		return [];
	}

	console.log('Fetching Facebook posts...');
	const pageToken = await getPageToken();
	const since = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 86400;
	const posts: FbPost[] = [];
	let url = `/${FB_PAGE_ID}/posts?fields=${FB_POST_FIELDS}&limit=50&since=${since}`;

	while (url && posts.length < 200) {
		const data = await graphGetWithToken(url, pageToken);
		if (!data.data?.length) break;
		posts.push(...data.data);
		url = data.paging?.next ? data.paging.next.replace(GRAPH_API_RE, '') : '';
		if (url) await delay(500);
	}

	console.log(`  Found ${posts.length} FB posts (last ${LOOKBACK_DAYS} days)`);
	return posts;
}

function extractFbMetrics(post: FbPost): Record<string, number> {
	return {
		reactions: post.reactions?.summary?.total_count ?? 0,
		comments: post.comments?.summary?.total_count ?? 0,
		shares: post.shares?.count ?? 0,
	};
}

// ── Match with social_posts ──

async function findSocialPostId(platform: 'ig' | 'fb', platformId: string): Promise<string | null> {
	const col = platform === 'ig' ? 'instagram_id' : 'facebook_id';
	const { data } = await supabase
		.from('social_posts')
		.select('id')
		.eq(col, platformId)
		.limit(1)
		.single();
	return data?.id ?? null;
}

// ── Upsert to social_insights ──

async function upsertInsight(row: {
	platform: 'ig' | 'fb';
	platform_id: string;
	social_post_id: string | null;
	posted_at: string;
	caption: string | null;
	permalink: string | null;
	metrics: Record<string, number>;
}) {
	const { error } = await supabase
		.from('social_insights')
		.upsert({
			...row,
			fetched_at: new Date().toISOString(),
		}, { onConflict: 'platform,platform_id' });

	if (error) {
		console.error(`  [error] Upsert ${row.platform} ${row.platform_id}: ${error.message}`);
	}
}

// ── Main ──

async function main() {
	console.log(`\nSocial Insights — fetching engagement data${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

	let igCount = 0, fbCount = 0;

	// ── Instagram ──
	const igPosts = await fetchIgPosts();
	for (const post of igPosts) {
		const insights = await fetchIgInsights(post.id, post.media_type);
		const metrics = {
			likes: post.like_count ?? 0,
			comments: post.comments_count ?? 0,
			...insights,
		};

		if (DRY_RUN) {
			console.log(`  [DRY] IG ${post.id}: ${JSON.stringify(metrics)}`);
		} else {
			const socialPostId = await findSocialPostId('ig', post.id);
			await upsertInsight({
				platform: 'ig',
				platform_id: post.id,
				social_post_id: socialPostId,
				posted_at: post.timestamp,
				caption: post.caption ?? null,
				permalink: post.permalink ?? null,
				metrics,
			});
		}
		igCount++;
		await delay(300);
	}

	// ── Facebook ──
	const fbPosts = await fetchFbPosts();
	for (const post of fbPosts) {
		const metrics = extractFbMetrics(post);

		if (DRY_RUN) {
			console.log(`  [DRY] FB ${post.id}: ${JSON.stringify(metrics)}`);
		} else {
			const socialPostId = await findSocialPostId('fb', post.id);
			await upsertInsight({
				platform: 'fb',
				platform_id: post.id,
				social_post_id: socialPostId,
				posted_at: post.created_time,
				caption: post.message ?? null,
				permalink: post.permalink_url ?? null,
				metrics,
			});
		}
		fbCount++;
		await delay(300);
	}

	// Summary
	console.log(`\n=== Summary ===`);
	console.log(`  Instagram: ${igCount} posts processed`);
	console.log(`  Facebook:  ${fbCount} posts processed`);

	if (igCount + fbCount === 0) {
		console.log('  No posts found — check credentials');
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
