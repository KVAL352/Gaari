/**
 * Image helpers.
 *
 * Vercel Image Optimization is disabled (free-tier quota exhausted).
 * These functions now pass through the original URL.
 * To re-enable, restore the /_vercel/image proxy logic.
 */

export function optimizedSrc(url: string, _width?: number, _quality?: number): string {
	return url.replace(/^http:\/\//, 'https://');
}

export function optimizedSrcset(_url: string, _widths: number[], _quality?: number): string {
	return '';
}
