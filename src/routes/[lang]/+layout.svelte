<script lang="ts">
	import { page } from '$app/stores';
	import { lang, setLang, detectLanguage } from '$lib/i18n';
	import type { Lang } from '$lib/types';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import BackToTop from '$lib/components/BackToTop.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	// SEO: hreflang + OG URL
	let pathWithoutLang = $derived($page.url.pathname.replace(/^\/(no|en)/, ''));
	let baseUrl = $derived($page.url.origin);

	// Sync lang store with URL param + update html lang attribute
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
	<meta property="og:image" content={`${baseUrl}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	<!-- hreflang for bilingual SEO -->
	<link rel="alternate" hreflang="nb" href={`${baseUrl}/no${pathWithoutLang}`} />
	<link rel="alternate" hreflang="en" href={`${baseUrl}/en${pathWithoutLang}`} />
	<link rel="alternate" hreflang="x-default" href={`${baseUrl}/no${pathWithoutLang}`} />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />
	<main id="events" class="flex-1">
		{@render children()}
	</main>
	<Footer />
	<BackToTop />
</div>
