/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		// SvelteKit 3 leser ikke lenger svelte.config.js; konfigen bor her.
		// `$lib` er fjernet i kit 3 til fordel for `#lib`. Aliaset holder de
		// over 100 importene våre i live til de skrives om.
		sveltekit({
			adapter: adapter(),
			preprocess: vitePreprocess(),
			alias: {
				$lib: 'src/lib'
			}
		})
	],
	build: {
		/**
		 * Kildekart i produksjon.
		 *
		 * Lighthouse flagget «Manglende kildekart for stor foersteparts
		 * JavaScript-kode» 26. august 2026. Uten dem er en feilmelding fra
		 * drift en linje i minifisert kode, og Lighthouse kan ikke peke paa
		 * hvilken modul som bruker tida — vi hadde én chunk paa 1 911 ms
		 * skriptevaluering uten aa kunne se hva den inneholdt.
		 *
		 * Normalt er innvendingen at kildekart avslo/rer kildekoden. Den
		 * gjelder ikke her: repoet er offentlig. Vi gir bort noe alle alt kan
		 * lese, og faar brukbare feilmeldinger tilbake.
		 *
		 * Kartene lastes bare ned naar noen aapner utviklerverktoeyet, saa de
		 * koster ingenting for vanlige besoekende.
		 */
		sourcemap: true
	},
	test: {
		include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']
	}
});
