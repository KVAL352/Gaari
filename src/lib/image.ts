import { dev } from '$app/environment';

const ALLOWED_WIDTHS = [400, 600, 800, 1200];

function snapWidth(w: number): number {
	let best = ALLOWED_WIDTHS[0];
	for (const size of ALLOWED_WIDTHS) {
		if (size >= w) return size;
		best = size;
	}
	return best;
}

export function optimizedSrc(url: string, width: number, quality = 75): string {
	if (dev) return url;
	const w = snapWidth(width);
	const safeUrl = url.replace(/^http:\/\//, 'https://');
	return `/_vercel/image?url=${encodeURIComponent(safeUrl)}&w=${w}&q=${quality}`;
}

export function optimizedSrcset(url: string, widths: number[], quality = 75): string {
	if (dev) return '';
	const safeUrl = url.replace(/^http:\/\//, 'https://');
	return widths
		.map(w => {
			const snapped = snapWidth(w);
			return `/_vercel/image?url=${encodeURIComponent(safeUrl)}&w=${snapped}&q=${quality} ${snapped}w`;
		})
		.join(', ');
}
