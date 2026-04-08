/**
 * Post generated carousel images to Instagram and Facebook via Meta Graph API.
 * Reads from social_posts table (populated by generate-posts.ts).
 *
 * Usage: cd scripts && npx tsx social/post-to-socials.ts [--dry-run]
 *
 * Env vars:
 *   META_ACCESS_TOKEN  — Page Access Token with instagram_content_publish + pages_manage_posts
 *   IG_USER_ID         — Instagram Business Account ID
 *   FB_PAGE_ID         — Facebook Page ID
 */
import { supabase } from '../lib/supabase.js';
import { getOsloNow, toOsloDateStr } from '../../src/lib/event-filters.js';

// ── Config ──

const META_TOKEN = process.env.META_ACCESS_TOKEN || process.env.IG_ACCESS_TOKEN || '';
const IG_USER_ID = process.env.IG_USER_ID || '';
const FB_PAGE_ID = process.env.FB_PAGE_ID || '';
const GRAPH_API = 'https://graph.facebook.com/v22.0';

/** Platform filter: --platform=ig or --platform=fb to post only one */
const PLATFORM_ARG = process.argv.find(a => a.startsWith('--platform='))?.split('=')[1] || 'all';
const POST_IG = PLATFORM_ARG === 'all' || PLATFORM_ARG === 'ig';
const POST_FB = PLATFORM_ARG === 'all' || PLATFORM_ARG === 'fb';

const POST_STORIES = PLATFORM_ARG === 'all' || PLATFORM_ARG === 'ig' || PLATFORM_ARG === 'stories';

const ENGLISH_SLUGS = new Set(['today-in-bergen', 'this-weekend']);

/** Max stories per day */
const MAX_STORIES_PER_DAY = 3;

/** Collections that get Stories (today's events only) */
const STORY_SLUGS = new Set(['i-kveld']);

/** Max posts per platform per day — keep low for new accounts to avoid rate limits */
const MAX_POSTS_PER_PLATFORM = 3;
const MAX_IG_POSTS_PER_DAY = 1;

/** Max slides per IG carousel — keeps API calls low to avoid rate limits on new accounts */
const MAX_IG_SLIDES = 5;

/** Daily slugs deprioritized when daily cap is hit (weekly specials take precedence) */
const DAILY_SLUGS = new Set(['i-kveld', 'today-in-bergen']);

/** Collections to post to Instagram (carousels) */
const INSTAGRAM_SLUGS = new Set([
	'denne-helgen',
	'i-kveld',
	'gratis',
	'today-in-bergen',
	'familiehelg',
	'konserter',
	'studentkveld',
	'this-weekend',
	'teater',
	'utstillinger',
	'mat-og-drikke',
]);

/** Collections to post to Facebook (album posts) */
const FACEBOOK_SLUGS = new Set([
	'denne-helgen',
	'i-kveld',
	'gratis',
	'today-in-bergen',
	'familiehelg',
	'konserter',
	'studentkveld',
	'this-weekend',
	'teater',
	'utstillinger',
	'mat-og-drikke',
]);

// ── Instagram Graph API ──

/** Track API usage from x-app-usage header (percentage values 0-100) */
let lastAppUsage = { call_count: 0, total_cputime: 0, total_time: 0 };

/** Retry a fetch-based API call with exponential backoff for transient Meta errors */
async function fetchWithRetry(
	url: string,
	init: RequestInit,
	label: string,
	maxRetries = 2
): Promise<any> {
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		const res = await fetch(url, init);

		// Parse x-app-usage header to track rate limit proximity
		const appUsage = res.headers.get('x-app-usage');
		if (appUsage) {
			try {
				lastAppUsage = JSON.parse(appUsage);
				const maxPct = Math.max(lastAppUsage.call_count, lastAppUsage.total_cputime, lastAppUsage.total_time);
				if (maxPct >= 80) {
					console.log(`  [warn] API usage at ${maxPct}% — approaching rate limit`);
				}
			} catch {}
		}

		const data = await res.json();
		if (!data.error) return data;

		const msg: string = data.error.message || '';
		const isTransient = msg.includes('unexpected error') || msg.includes('Please retry');
		const isRateLimit = msg.includes('request limit reached');

		if (isRateLimit) throw new Error(`${label}: ${msg}`);
		if (!isTransient || attempt === maxRetries) throw new Error(`${label}: ${msg}`);

		const wait = (attempt + 1) * 5000;
		console.log(`  [retry] ${label} attempt ${attempt + 1} failed (transient), waiting ${wait / 1000}s...`);
		await delay(wait);
	}
	throw new Error(`${label}: max retries exceeded`);
}

/** Check IG content publishing quota before attempting to post */
async function checkIgPublishingQuota(): Promise<{ canPost: boolean; used: number; total: number }> {
	if (!META_TOKEN || !IG_USER_ID) return { canPost: false, used: 0, total: 0 };
	try {
		const url = `${GRAPH_API}/${IG_USER_ID}/content_publishing_limit?fields=config,quota_usage&access_token=${encodeURIComponent(META_TOKEN)}`;
		const res = await fetch(url);
		const data = await res.json() as any;
		if (data.error) {
			console.log(`  [warn] Could not check IG quota: ${data.error.message}`);
			return { canPost: true, used: 0, total: 0 }; // optimistic fallback
		}
		const total = data.config?.quota_total ?? 100;
		const used = data.quota_usage ?? 0;
		console.log(`  IG publishing quota: ${used}/${total} used`);
		return { canPost: used < total, used, total };
	} catch (err: any) {
		console.log(`  [warn] IG quota check failed: ${err.message}`);
		return { canPost: true, used: 0, total: 0 };
	}
}

async function postToInstagram(imageUrls: string[], caption: string): Promise<string | null> {
	if (!META_TOKEN || !IG_USER_ID) {
		console.log('  [skip] Instagram: META_ACCESS_TOKEN or IG_USER_ID not set');
		return null;
	}
	if (imageUrls.length === 0) {
		console.log('  [skip] Instagram: no images');
		return null;
	}

	const baseUrl = `${GRAPH_API}/${IG_USER_ID}`;

	if (imageUrls.length === 1) {
		// Single image post
		const params = new URLSearchParams({
			image_url: imageUrls[0],
			caption,
			access_token: META_TOKEN
		});
		const data = await fetchWithRetry(`${baseUrl}/media`, { method: 'POST', body: params }, 'IG container');

		await pollMediaStatus(data.id);

		const pubParams = new URLSearchParams({ creation_id: data.id, access_token: META_TOKEN });
		const pubData = await fetchWithRetry(`${baseUrl}/media_publish`, { method: 'POST', body: pubParams }, 'IG publish');
		return pubData.id;
	}

	// Carousel (2+ images)
	const childIds: string[] = [];
	for (const url of imageUrls) {
		const params = new URLSearchParams({
			image_url: url,
			is_carousel_item: 'true',
			access_token: META_TOKEN
		});
		const data = await fetchWithRetry(`${baseUrl}/media`, { method: 'POST', body: params }, 'IG carousel child');
		childIds.push(data.id);
		await delay(3000);
	}

	// Wait for all children to be ready
	for (const childId of childIds) {
		await pollMediaStatus(childId);
	}

	// Create carousel container
	const carouselParams = new URLSearchParams({
		media_type: 'CAROUSEL',
		caption,
		children: childIds.join(','),
		access_token: META_TOKEN
	});
	const carouselData = await fetchWithRetry(
		`${baseUrl}/media`, { method: 'POST', body: carouselParams }, 'IG carousel'
	);

	await pollMediaStatus(carouselData.id);

	// Publish
	const pubParams = new URLSearchParams({ creation_id: carouselData.id, access_token: META_TOKEN });
	const pubData = await fetchWithRetry(
		`${baseUrl}/media_publish`, { method: 'POST', body: pubParams }, 'IG carousel publish'
	);
	return pubData.id;
}

async function pollMediaStatus(containerId: string, maxAttempts = 20): Promise<void> {
	for (let i = 0; i < maxAttempts; i++) {
		await delay(3000);
		const res = await fetch(
			`${GRAPH_API}/${containerId}?fields=status_code&access_token=${encodeURIComponent(META_TOKEN)}`
		);
		const data = await res.json();
		if (data.status_code === 'FINISHED') return;
		if (data.status_code === 'ERROR') throw new Error(`Media processing failed: ${JSON.stringify(data)}`);
	}
	throw new Error(`Media processing timeout for ${containerId}`);
}

// ── Facebook Graph API (direct, no Postiz) ──

async function postToFacebookAlbum(imageUrls: string[], message: string): Promise<string | null> {
	if (!META_TOKEN || !FB_PAGE_ID) {
		console.log('  [skip] Facebook: META_ACCESS_TOKEN or FB_PAGE_ID not set');
		return null;
	}

	if (imageUrls.length === 0) {
		console.log('  [skip] Facebook: no images');
		return null;
	}

	// Upload photos as unpublished, then attach to a feed post
	const photoIds: string[] = [];
	for (const url of imageUrls) {
		const params = new URLSearchParams({
			url,
			published: 'false',
			access_token: META_TOKEN
		});
		const res = await fetch(`${GRAPH_API}/${FB_PAGE_ID}/photos`, { method: 'POST', body: params });
		const data = await res.json() as any;
		if (data.error) throw new Error(`FB photo upload: ${data.error.message}`);
		photoIds.push(data.id);
		await delay(500);
	}

	// Create feed post with attached photos (multi-photo post)
	const params = new URLSearchParams({ message, access_token: META_TOKEN });
	for (let i = 0; i < photoIds.length; i++) {
		params.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: photoIds[i] }));
	}

	const res = await fetch(`${GRAPH_API}/${FB_PAGE_ID}/feed`, { method: 'POST', body: params });
	const data = await res.json() as any;
	if (data.error) throw new Error(`FB album post: ${data.error.message}`);
	return data.id;
}

// ── Instagram Stories ──

async function postStoryToInstagram(imageUrl: string): Promise<string | null> {
	if (!META_TOKEN || !IG_USER_ID) {
		console.log('  [skip] Story: META_ACCESS_TOKEN or IG_USER_ID not set');
		return null;
	}

	const baseUrl = `${GRAPH_API}/${IG_USER_ID}`;

	// Create story container
	const params = new URLSearchParams({
		image_url: imageUrl,
		media_type: 'STORIES',
		access_token: META_TOKEN
	});
	const data = await fetchWithRetry(`${baseUrl}/media`, { method: 'POST', body: params }, 'IG story container');

	await pollMediaStatus(data.id);

	// Publish
	const pubParams = new URLSearchParams({ creation_id: data.id, access_token: META_TOKEN });
	const pubData = await fetchWithRetry(`${baseUrl}/media_publish`, { method: 'POST', body: pubParams }, 'IG story publish');
	return pubData.id;
}

// ── Helpers ──

function delay(ms: number): Promise<void> {
	return new Promise(r => setTimeout(r, ms));
}

function buildFacebookPost(caption: string, slug: string, _eventCount: number): { message: string; link: string } {
	const isEn = ENGLISH_SLUGS.has(slug);
	const url = isEn
		? `https://gaari.no/en/${slug}?utm_source=facebook&utm_medium=social&utm_campaign=${slug}`
		: `https://gaari.no/no/${slug}?utm_source=facebook&utm_medium=social&utm_campaign=${slug}`;

	// Use the full IG caption (with venue @-handles, event list and hashtags)
	// but swap the IG collection URL for the FB UTM-tagged one. Even though FB
	// won't render @venuehandle as a clickable mention, the text is still
	// informative and matches the IG version for visual consistency.
	const fbCaption = caption.replace(
		/gaari\.no\/(no|en)\/[^\s?]+\?utm_source=instagram&utm_medium=social&utm_campaign=[^\s]+/g,
		url
	);

	return { message: fbCaption, link: url };
}

// ── Main ──

async function main() {
	const now = getOsloNow();
	const dateStr = toOsloDateStr(now);
	const dryRun = process.argv.includes('--dry-run');

	const platforms = POST_IG && POST_FB ? 'IG + FB' : POST_IG ? 'IG only' : 'FB only';
	console.log(`Social posting — ${dateStr} [${platforms}]${dryRun ? ' (DRY RUN)' : ''}\n`);

	// Fetch today's social posts
	const { data: posts, error } = await supabase
		.from('social_posts')
		.select('*')
		.eq('generated_date', dateStr)
		.gt('slide_count', 0);

	if (error) {
		console.error(`Supabase query failed: ${error.message}`);
		process.exit(1);
	}

	if (!posts || posts.length === 0) {
		console.log('No social posts for today.');
		return;
	}

	// Sort: weekly specials first, daily posts fill remaining slots
	posts.sort((a, b) => {
		const aDaily = DAILY_SLUGS.has(a.collection_slug) ? 1 : 0;
		const bDaily = DAILY_SLUGS.has(b.collection_slug) ? 1 : 0;
		return aDaily - bDaily;
	});

	console.log(`Found ${posts.length} generated posts: ${posts.map(p => p.collection_slug).join(', ')}`);
	console.log(`Daily cap: ${MAX_POSTS_PER_PLATFORM} per platform\n`);

	// Check IG publishing quota before attempting any posts
	let igQuotaBlocked = false;
	if (POST_IG) {
		const quota = await checkIgPublishingQuota();
		if (!quota.canPost) {
			console.log(`  IG quota exhausted (${quota.used}/${quota.total}) — skipping all IG posts\n`);
			igQuotaBlocked = true;
		}
	}

	let igPosted = 0, igFailed = 0, fbPosted = 0, fbFailed = 0;
	let igSkipped = 0, fbSkipped = 0;
	let storiesPosted = 0, storiesFailed = 0;

	for (const post of posts) {
		const slug = post.collection_slug;
		const imageUrls: string[] = post.image_urls || [];

		// ── Instagram ──
		if (POST_IG && INSTAGRAM_SLUGS.has(slug) && !post.instagram_id) {
			if (igQuotaBlocked || igPosted >= MAX_IG_POSTS_PER_DAY) {
				console.log(`--- ${slug} → Instagram [skipped, daily cap reached] ---`);
				igSkipped++;
			} else {
				const igSlides = imageUrls.slice(0, MAX_IG_SLIDES);
				const capNote = igSlides.length < imageUrls.length
					? ` (capped from ${imageUrls.length})`
					: '';
				console.log(`--- ${slug} → Instagram (${igSlides.length} slides${capNote}) ---`);
				try {
					if (dryRun) {
						console.log(`  [DRY RUN] Would post carousel\n`);
						igPosted++;
					} else {
						const igId = await postToInstagram(igSlides, post.caption);
						if (igId) {
							console.log(`  Posted: ${igId}`);
							await supabase
								.from('social_posts')
								.update({ instagram_id: igId, instagram_posted_at: new Date().toISOString() })
								.eq('id', post.id);
							igPosted++;
						}
					}
				} catch (err: any) {
					console.error(`  IG FAILED: ${err.message}`);
					igFailed++;
				}
				if (!dryRun) await delay(5000);
			}
		}

		// ── Facebook (album with images) ──
		if (POST_FB && FACEBOOK_SLUGS.has(slug) && !post.facebook_id) {
			if (fbPosted >= MAX_POSTS_PER_PLATFORM) {
				console.log(`--- ${slug} → Facebook [skipped, daily cap reached] ---`);
				fbSkipped++;
			} else {
				console.log(`--- ${slug} → Facebook (${imageUrls.length} images) ---`);
				try {
					const { message } = buildFacebookPost(post.caption, slug, post.event_count);
					if (dryRun) {
						console.log(`  [DRY RUN] Would post album with ${imageUrls.length} images\n`);
						fbPosted++;
					} else {
						const fbId = await postToFacebookAlbum(imageUrls, message);
						if (fbId) {
							console.log(`  Posted: ${fbId}`);
							await supabase
								.from('social_posts')
								.update({ facebook_id: fbId, facebook_posted_at: new Date().toISOString() })
								.eq('id', post.id);
							fbPosted++;
						}
					}
				} catch (err: any) {
					console.error(`  FB FAILED: ${err.message}`);
					fbFailed++;
				}
				if (!dryRun) await delay(2000);
			}
		}

		// ── Instagram Stories (1 per run, staggered through the day) ──
		const storyUrls: string[] = post.story_image_urls || [];
		const alreadyPosted: number = post.story_posted_count ?? 0;
		const nextStoryIdx = alreadyPosted;
		if (POST_STORIES && STORY_SLUGS.has(slug) && nextStoryIdx < storyUrls.length) {
			if (igQuotaBlocked) {
				console.log(`--- ${slug} → Story [skipped, IG quota exhausted] ---`);
			} else if (storiesPosted >= 1) {
				console.log(`--- ${slug} → Story [skipped, 1 story per run] ---`);
			} else {
				const storyUrl = storyUrls[nextStoryIdx];
				console.log(`--- ${slug} → Story ${nextStoryIdx + 1}/${storyUrls.length} ---`);
				try {
					if (dryRun) {
						console.log(`  [DRY RUN] Would post story ${nextStoryIdx + 1}`);
						storiesPosted++;
					} else {
						const storyId = await postStoryToInstagram(storyUrl);
						if (storyId) {
							console.log(`  Story posted: ${storyId}`);
							const { error: updateErr } = await supabase
								.from('social_posts')
								.update({
									story_posted_count: nextStoryIdx + 1,
									story_posted_at: new Date().toISOString()
								})
								.eq('id', post.id);
							if (updateErr) {
								console.error(`  Story update FAILED: ${updateErr.message}`);
								storiesFailed++;
							} else {
								storiesPosted++;
							}
						}
					}
				} catch (err: any) {
					console.error(`  Story FAILED: ${err.message}`);
					storiesFailed++;
				}
			}
		}
	}

	// Summary
	console.log(`\n=== Summary ===`);
	console.log(`  Instagram: ${igPosted} posted, ${igFailed} failed, ${igSkipped} skipped (cap)`);
	console.log(`  Stories:   ${storiesPosted} posted, ${storiesFailed} failed`);
	console.log(`  Facebook:  ${fbPosted} posted, ${fbFailed} failed, ${fbSkipped} skipped (cap)`);

	const summary = {
		date: dateStr,
		instagram: { posted: igPosted, failed: igFailed, skipped: igSkipped },
		stories: { posted: storiesPosted, failed: storiesFailed },
		facebook: { posted: fbPosted, failed: fbFailed, skipped: fbSkipped }
	};
	console.log('\n' + JSON.stringify(summary));

	if (igFailed + fbFailed > 0 && igPosted + fbPosted === 0) {
		process.exit(1);
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
