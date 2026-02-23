import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			images: {
				sizes: [400, 600, 800, 1200],
				domains: [],
				remotePatterns: [{ protocol: 'https', hostname: '**' }],
				formats: ['image/avif', 'image/webp'],
				minimumCacheTTL: 86400
			}
		}),
		alias: {
			$components: 'src/lib/components',
			$lib: 'src/lib'
		}
	}
};

export default config;
