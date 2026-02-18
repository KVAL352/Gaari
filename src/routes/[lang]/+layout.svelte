<script lang="ts">
	import { page } from '$app/stores';
	import { lang, setLang, detectLanguage } from '$lib/i18n';
	import type { Lang } from '$lib/types';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import BackToTop from '$lib/components/BackToTop.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	// Sync lang store with URL param
	$effect(() => {
		const urlLang = $page.params.lang as Lang;
		if (urlLang === 'no' || urlLang === 'en') {
			setLang(urlLang);
		}
	});
</script>

<svelte:head>
	<html lang={$lang === 'no' ? 'nb' : 'en'}></html>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />
	<main id="events" class="flex-1">
		{@render children()}
	</main>
	<Footer />
	<BackToTop />
</div>
