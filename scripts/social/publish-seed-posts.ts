/**
 * Upload seed posts to Supabase Storage and publish to Instagram.
 * Reads from scripts/social/seed-posts/{collection}/slide-*.png + caption.txt
 *
 * Usage: cd scripts && npx tsx social/publish-seed-posts.ts [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { supabase } from '../lib/supabase.js';

// Track published posts to avoid duplicates
const PUBLISHED_FILE = resolve(import.meta.dirname, 'seed-posts/.published.json');

function loadPublished(): Record<string, { ig?: string; fb?: string }> {
	if (!existsSync(PUBLISHED_FILE)) return {};
	try { return JSON.parse(readFileSync(PUBLISHED_FILE, 'utf-8')); } catch { return {}; }
}

function savePublished(data: Record<string, { ig?: string; fb?: string }>): void {
	writeFileSync(PUBLISHED_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const SEED_DIR = resolve(import.meta.dirname, 'seed-posts');
const GRAPH_API = 'https://graph.facebook.com/v22.0';

const META_TOKEN = process.env.META_ACCESS_TOKEN || '';
const IG_USER_ID = process.env.IG_USER_ID || '';
const FB_PAGE_ID = process.env.FB_PAGE_ID || '';

function delay(ms: number): Promise<void> {
	return new Promise(r => setTimeout(r, ms));
}

async function uploadToStorage(path: string, buffer: Buffer): Promise<string> {
	const { error } = await supabase.storage
		.from('social-posts')
		.upload(path, buffer, { contentType: 'image/png', upsert: true });
	if (error) throw new Error(`Upload failed (${path}): ${error.message}`);
	const { data } = supabase.storage.from('social-posts').getPublicUrl(path);
	return data.publicUrl;
}

async function pollMediaStatus(containerId: string, maxAttempts = 20): Promise<void> {
	for (let i = 0; i < maxAttempts; i++) {
		await delay(3000);
		const res = await fetch(
			`${GRAPH_API}/${containerId}?fields=status_code&access_token=${encodeURIComponent(META_TOKEN)}`
		);
		const data = await res.json();
		if (data.status_code === 'FINISHED') return;
		if (data.status_code === 'ERROR') throw new Error(`Media failed: ${JSON.stringify(data)}`);
	}
	throw new Error(`Timeout for ${containerId}`);
}

async function postCarouselToInstagram(imageUrls: string[], caption: string): Promise<string> {
	const baseUrl = `${GRAPH_API}/${IG_USER_ID}`;

	// Create children
	const childIds: string[] = [];
	for (const url of imageUrls) {
		const params = new URLSearchParams({
			image_url: url,
			is_carousel_item: 'true',
			access_token: META_TOKEN
		});
		const res = await fetch(`${baseUrl}/media`, { method: 'POST', body: params });
		const data = await res.json();
		if (data.error) throw new Error(`Child: ${data.error.message}`);
		childIds.push(data.id);
		await delay(1500);
	}

	// Poll all children
	for (const id of childIds) {
		await pollMediaStatus(id);
	}

	// Create carousel
	const params = new URLSearchParams({
		media_type: 'CAROUSEL',
		caption,
		children: childIds.join(','),
		access_token: META_TOKEN
	});
	const res = await fetch(`${baseUrl}/media`, { method: 'POST', body: params });
	const data = await res.json();
	if (data.error) throw new Error(`Carousel: ${data.error.message}`);

	await pollMediaStatus(data.id);

	// Publish
	const pubParams = new URLSearchParams({ creation_id: data.id, access_token: META_TOKEN });
	const pubRes = await fetch(`${baseUrl}/media_publish`, { method: 'POST', body: pubParams });
	const pubData = await pubRes.json();
	if (pubData.error) throw new Error(`Publish: ${pubData.error.message}`);
	return pubData.id;
}

async function postToFacebookAlbum(imageUrls: string[], message: string): Promise<string> {
	// Upload photos as unpublished
	const photoIds: string[] = [];
	for (const url of imageUrls) {
		const params = new URLSearchParams({ url, published: 'false', access_token: META_TOKEN });
		const res = await fetch(`${GRAPH_API}/${FB_PAGE_ID}/photos`, { method: 'POST', body: params });
		const data = await res.json() as any;
		if (data.error) throw new Error(`FB photo: ${data.error.message}`);
		photoIds.push(data.id);
		await delay(500);
	}

	// Create feed post with attached photos
	const params = new URLSearchParams({ message, access_token: META_TOKEN });
	for (let i = 0; i < photoIds.length; i++) {
		params.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: photoIds[i] }));
	}
	const res = await fetch(`${GRAPH_API}/${FB_PAGE_ID}/feed`, { method: 'POST', body: params });
	const data = await res.json() as any;
	if (data.error) throw new Error(`FB album: ${data.error.message}`);
	return data.id;
}

async function main() {
	const dryRun = process.argv.includes('--dry-run');
	console.log(`Publish seed posts${dryRun ? ' (DRY RUN)' : ''}\n`);

	if (!dryRun && (!META_TOKEN || !IG_USER_ID)) {
		console.error('META_ACCESS_TOKEN and IG_USER_ID required. Set in .env');
		process.exit(1);
	}

	// Accept specific collections via --only flag: npx tsx publish-seed-posts.ts --only denne-helgen gratis
	const allCollections = readdirSync(SEED_DIR).filter(d =>
		existsSync(resolve(SEED_DIR, d, 'caption.txt'))
	);
	const onlyIdx = process.argv.indexOf('--only');
	let collections: string[];
	if (onlyIdx >= 0) {
		collections = process.argv.slice(onlyIdx + 1).filter(a => !a.startsWith('--') && allCollections.includes(a));
	} else {
		collections = allCollections;
	}

	const published = loadPublished();

	// Filter out already-published collections (unless --force)
	const force = process.argv.includes('--force');
	if (!force) {
		const before = collections.length;
		collections = collections.filter(s => !published[s]?.ig);
		if (before !== collections.length) {
			console.log(`Skipping ${before - collections.length} already-published collections (use --force to repost)\n`);
		}
	}

	console.log(`Found ${collections.length} seed collections: ${collections.join(', ')}\n`);

	let igPosted = 0, fbPosted = 0, failed = 0;

	for (const slug of collections) {
		const dir = resolve(SEED_DIR, slug);
		const captionPath = resolve(dir, 'caption.txt');
		const caption = readFileSync(captionPath, 'utf-8');

		// Find slide PNGs
		const slides = readdirSync(dir)
			.filter(f => f.startsWith('slide-') && f.endsWith('.png'))
			.sort()
			.map(f => resolve(dir, f));

		if (slides.length < 2) {
			console.log(`[skip] ${slug}: only ${slides.length} slides`);
			continue;
		}

		console.log(`--- ${slug} (${slides.length} slides) ---`);

		try {
			// Upload slides to Supabase Storage
			const imageUrls: string[] = [];
			for (let i = 0; i < slides.length; i++) {
				const buf = readFileSync(slides[i]);
				const storagePath = `seed/${slug}/slide-${i + 1}.png`;
				if (dryRun) {
					imageUrls.push(`https://placeholder.com/${storagePath}`);
					console.log(`  [DRY RUN] Would upload ${storagePath}`);
				} else {
					const url = await uploadToStorage(storagePath, buf);
					imageUrls.push(url);
					console.log(`  Uploaded slide ${i + 1}/${slides.length}`);
				}
			}

			// Post to Instagram
			let igId: string | null = null;
			if (dryRun) {
				console.log(`  [DRY RUN] Would post carousel to IG (${imageUrls.length} slides)`);
				console.log(`  Caption: ${caption.split('\n')[0]}`);
				igPosted++;
			} else {
				igId = await postCarouselToInstagram(imageUrls, caption);
				console.log(`  IG posted: ${igId}`);
				igPosted++;
			}

			// Post to Facebook (album with images)
			let fbId: string | null = null;
			const isEn = ['today-in-bergen', 'this-weekend'].includes(slug);
			const link = isEn ? `https://gaari.no/en/${slug}` : `https://gaari.no/no/${slug}`;
			const title = caption.split('\n')[0]?.trim() || slug;
			const fbMessage = isEn
				? `${title}\n${link}\n\nSee all events on Gåri.`
				: `${title}\n${link}\n\nSe alle arrangementer på Gåri.`;

			if (FB_PAGE_ID && !dryRun) {
				console.log(`  Posting album to Facebook (${imageUrls.length} images)...`);
				fbId = await postToFacebookAlbum(imageUrls, fbMessage);
				console.log(`  FB posted: ${fbId}`);
				fbPosted++;
			} else if (dryRun) {
				console.log(`  [DRY RUN] Would post album to FB: ${title} (${imageUrls.length} images)`);
				fbPosted++;
			}

			// Track as published
			if (!dryRun && (igId || fbId)) {
				published[slug] = { ig: igId || undefined, fb: fbId || undefined };
				savePublished(published);
			}

			// Rate limit between posts (IG recommends 25 posts/day max)
			if (!dryRun) {
				console.log(`  Waiting 30s before next post...\n`);
				await delay(30000);
			} else {
				console.log('');
			}

		} catch (err: any) {
			console.error(`  FAILED: ${err.message}\n`);
			failed++;
		}
	}

	console.log(`\n=== Done ===`);
	console.log(`  IG: ${igPosted} posted`);
	console.log(`  FB: ${fbPosted} posted`);
	console.log(`  Failed: ${failed}`);
}

main().catch(console.error);
