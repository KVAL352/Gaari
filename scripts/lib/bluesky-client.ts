import { AtpAgent, RichText } from '@atproto/api';
import { Resvg } from '@resvg/resvg-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env') });

const BLUESKY_MAX_BLOB = 976_000; // ~976KB, Bluesky limit

const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE || 'gaari.no';
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

let agent: AtpAgent | null = null;

/** Lazy-init Bluesky agent (avoids top-level env var crash in GHA). */
export async function getAgent(): Promise<AtpAgent> {
	if (agent) return agent;

	if (!BLUESKY_APP_PASSWORD) {
		throw new Error('Missing BLUESKY_APP_PASSWORD env var');
	}

	agent = new AtpAgent({ service: 'https://bsky.social' });
	await agent.login({ identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD });
	return agent;
}

/**
 * Downscale a PNG buffer by re-rendering at a smaller size using Resvg.
 * Wraps the PNG in an SVG <image> element at the target width.
 */
function downscalePng(pngBuffer: Buffer, originalWidth: number, targetWidth: number): Buffer {
	const ratio = targetWidth / originalWidth;
	const targetHeight = Math.round(originalWidth * ratio); // square images
	const b64 = pngBuffer.toString('base64');
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}">
		<image href="data:image/png;base64,${b64}" width="${targetWidth}" height="${targetHeight}"/>
	</svg>`;
	const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: targetWidth } });
	const rendered = resvg.render();
	return Buffer.from(rendered.asPng());
}

/** Compress a PNG to fit under Bluesky's blob size limit by downscaling. */
function compressForBluesky(pngBuffer: Buffer, originalWidth: number = 1080): Buffer {
	if (pngBuffer.length <= BLUESKY_MAX_BLOB) return pngBuffer;

	// Try progressively smaller sizes
	const scales = [810, 720, 540];
	for (const width of scales) {
		const smaller = downscalePng(pngBuffer, originalWidth, width);
		if (smaller.length <= BLUESKY_MAX_BLOB) return smaller;
	}

	// Last resort: 360px
	return downscalePng(pngBuffer, originalWidth, 360);
}

/** Upload an image buffer as a blob, returns the blob ref for embedding. */
export async function uploadImage(
	imageBuffer: Buffer,
	mimeType: string = 'image/png'
): Promise<{ $type: string; ref: any; mimeType: string; size: number }> {
	const compressed = compressForBluesky(imageBuffer);
	const bsky = await getAgent();
	const response = await bsky.uploadBlob(compressed, { encoding: mimeType });
	return response.data.blob;
}

/** Post text with up to 4 images (Bluesky limit). */
export async function postWithImages(
	text: string,
	images: Array<{ buffer: Buffer; alt: string }>,
	linkUrl?: string
): Promise<{ uri: string; cid: string }> {
	const bsky = await getAgent();

	// Build rich text to detect facets (links, mentions, hashtags)
	const rt = new RichText({ text });
	await rt.detectFacets(bsky);

	// Upload images (max 4)
	const imageBlobs = [];
	for (const img of images.slice(0, 4)) {
		const blob = await uploadImage(img.buffer);
		imageBlobs.push({ image: blob, alt: img.alt, aspectRatio: { width: 1, height: 1 } });
	}

	const record: Record<string, unknown> = {
		$type: 'app.bsky.feed.post',
		text: rt.text,
		facets: rt.facets,
		createdAt: new Date().toISOString()
	};

	if (imageBlobs.length > 0) {
		record.embed = {
			$type: 'app.bsky.embed.images',
			images: imageBlobs
		};
	}

	// Add link card if no images and a URL is provided
	if (imageBlobs.length === 0 && linkUrl) {
		record.embed = {
			$type: 'app.bsky.embed.external',
			external: {
				uri: linkUrl,
				title: '',
				description: ''
			}
		};
	}

	const response = await bsky.post(record);
	return response;
}

/** Post text only (no images). */
export async function postText(text: string): Promise<{ uri: string; cid: string }> {
	return postWithImages(text, []);
}
