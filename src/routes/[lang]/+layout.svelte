<script lang="ts">
	import { page } from '$app/stores';
	import { lang, setLang } from '$lib/i18n';
	import type { Lang } from '$lib/types';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import BackToTop from '$lib/components/BackToTop.svelte';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: { lang: Lang }; children: Snippet } = $props();

	// Set lang store synchronously so it's correct during SSR.
	// $effect only runs client-side, so without this, $lang defaults to 'no'
	// and all EN pages render Norwegian meta tags/JSON-LD in the SSR HTML.
	setLang(data.lang);

	// SEO: hreflang + OG URL — always use gaari.no as the canonical base
	let pathWithoutLang = $derived($page.url.pathname.replace(/^\/(no|en)/, ''));
	const baseUrl = 'https://gaari.no';

	// Collection pages with paired slugs (e.g. denne-helgen ↔ this-weekend) provide hreflangPaths
	let hreflangNb = $derived(($page.data as any).hreflangPaths?.no ? `${baseUrl}${($page.data as any).hreflangPaths.no}` : `${baseUrl}/no${pathWithoutLang}`);
	let hreflangEn = $derived(($page.data as any).hreflangPaths?.en ? `${baseUrl}${($page.data as any).hreflangPaths.en}` : `${baseUrl}/en${pathWithoutLang}`);

	// Keep $effect for client-side navigation (SPA-style route changes)
	$effect(() => {
		const urlLang = $page.params.lang as Lang;
		if (urlLang === 'no' || urlLang === 'en') {
			setLang(urlLang);
			if (typeof document !== 'undefined') {
				document.documentElement.lang = urlLang === 'no' ? 'nb' : 'en';
			}
		}
	});
</script>

<svelte:head>
	<title>Gåri</title>

	<!-- Open Graph defaults (pages override og:title and og:description) -->
	<meta property="og:site_name" content="Gåri" />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content={$lang === 'no' ? 'nb_NO' : 'en_US'} />
	<meta property="og:locale:alternate" content={$lang === 'no' ? 'en_US' : 'nb_NO'} />
	<meta property="og:url" content={`${baseUrl}/${$lang}${pathWithoutLang}`} />

	<!-- hreflang for bilingual SEO -->
	<link rel="alternate" hreflang="nb" href={hreflangNb} />
	<link rel="alternate" hreflang="en" href={hreflangEn} />
	<link rel="alternate" hreflang="x-default" href={hreflangNb} />

	<!-- Default twitter card (pages can override with more specific cards) -->
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />
	<main id="events" class="flex-1">
		{@render children()}
	</main>
	<Footer />
	<BackToTop />
</div>
