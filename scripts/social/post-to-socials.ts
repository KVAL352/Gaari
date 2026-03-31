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

const ENGLISH_SLUGS = new Set(['today-in-bergen', 'this-weekend']);

/** Collections to post to Instagram (carousels) */
const INSTAGRAM_SLUGS = new Set([
	'denne-helgen',
	'gratis',
	'familiehelg',
	'konserter',
	'teater',
	'utstillinger',
	'mat-og-drikke',
]);

/** Collections to post to Facebook (link posts) */
const FACEBOOK_SLUGS = new Set([
	'denne-helgen',
	'gratis',
	'familiehelg',
	'konserter',
	'teater',
	'utstillinger',
	'mat-og-drikke',
]);

// ── Instagram Graph API ──

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
		const res = await fetch(`${baseUrl}/media`, { method: 'POST', body: params });
		const data = await res.json();
		if (data.error) throw new Error(`IG container: ${data.error.message}`);

		await pollMediaStatus(data.id);

		const pubParams = new URLSearchParams({ creation_id: data.id, access_token: META_TOKEN });
		const pubRes = await fetch(`${baseUrl}/media_publish`, { method: 'POST', body: pubParams });
		const pubData = await pubRes.json();
		if (pubData.error) throw new Error(`IG publish: ${pubData.error.message}`);
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
		const res = await fetch(`${baseUrl}/media`, { method: 'POST', body: params });
		const data = await res.json();
		if (data.error) throw new Error(`IG carousel child: ${data.error.message}`);
		childIds.push(data.id);
		await delay(1000);
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
	const carouselRes = await fetch(`${baseUrl}/media`, { method: 'POST', body: carouselParams });
	const carouselData = await carouselRes.json();
	if (carouselData.error) throw new Error(`IG carousel: ${carouselData.error.message}`);

	await pollMediaStatus(carouselData.id);

	// Publish
	const pubParams = new URLSearchParams({ creation_id: carouselData.id, access_token: META_TOKEN });
	const pubRes = await fetch(`${baseUrl}/media_publish`, { method: 'POST', body: pubParams });
	const pubData = await pubRes.json();
	if (pubData.error) throw new Error(`IG carousel publish: ${pubData.error.message}`);
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

// ── Helpers ──

function delay(ms: number): Promise<void> {
	return new Promise(r => setTimeout(r, ms));
}

function buildFacebookPost(caption: string, slug: string, eventCount: number): { message: string; link: string } {
	const isEn = ENGLISH_SLUGS.has(slug);
	const url = isEn
		? `https://gaari.no/en/${slug}?utm_source=facebook&utm_medium=social&utm_campaign=${slug}`
		: `https://gaari.no/no/${slug}?utm_source=facebook&utm_medium=social&utm_campaign=${slug}`;
	const title = caption.split('\n')[0]?.trim() || slug;

	const message = isEn
		? `${title}\n${url}\n\n${eventCount} events in Bergen. See all on Gåri.`
		: `${title}\n${url}\n\n${eventCount} arrangementer i Bergen. Se alle på Gåri.`;

	return { message, link: url };
}

// ── Main ──

async function main() {
	const now = getOsloNow();
	const dateStr = toOsloDateStr(now);
	const dryRun = process.argv.includes('--dry-run');

	console.log(`Social posting — ${dateStr}${dryRun ? ' (DRY RUN)' : ''}\n`);

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

	console.log(`Found ${posts.length} generated posts: ${posts.map(p => p.collection_slug).join(', ')}\n`);

	let igPosted = 0, igFailed = 0, fbPosted = 0, fbFailed = 0;

	for (const post of posts) {
		const slug = post.collection_slug;
		const imageUrls: string[] = post.image_urls || [];

		// ── Instagram ──
		if (INSTAGRAM_SLUGS.has(slug) && !post.instagram_id) {
			console.log(`--- ${slug} → Instagram (${imageUrls.length} slides) ---`);
			try {
				if (dryRun) {
					console.log(`  [DRY RUN] Would post carousel\n`);
					igPosted++;
				} else {
					const igId = await postToInstagram(imageUrls, post.caption);
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
			if (!dryRun) await delay(2000);
		}

		// ── Facebook (album with images) ──
		if (FACEBOOK_SLUGS.has(slug) && !post.facebook_id) {
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

	// Summary
	console.log(`\n=== Summary ===`);
	console.log(`  Instagram: ${igPosted} posted, ${igFailed} failed`);
	console.log(`  Facebook:  ${fbPosted} posted, ${fbFailed} failed`);

	const summary = {
		date: dateStr,
		instagram: { posted: igPosted, failed: igFailed },
		facebook: { posted: fbPosted, failed: fbFailed }
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
