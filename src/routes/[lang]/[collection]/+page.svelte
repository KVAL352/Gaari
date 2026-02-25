<script lang="ts">
	import { page } from '$app/stores';
	import { lang, t } from '$lib/i18n';
	import { getCanonicalUrl, generateCollectionJsonLd } from '$lib/seo';
	import EventGrid from '$lib/components/EventGrid.svelte';
	import LoadMore from '$lib/components/LoadMore.svelte';

	let { data } = $props();

	const PAGE_SIZE = 12;
	let pageNum = $derived(Number($page.url.searchParams.get('page') || '1'));
	let displayedEvents = $derived(data.events.slice(0, pageNum * PAGE_SIZE));

	let title = $derived(data.collection.title[$lang]);
	let description = $derived(data.collection.description[$lang]);
	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/${data.collection.slug}`));
	let collectionJsonLd = $derived(
		generateCollectionJsonLd(data.collection, $lang, canonicalUrl, data.events.length)
	);

	let nextPageHref = $derived(`?page=${pageNum + 1}`);
</script>

<svelte:head>
	<title>{title} — Gåri</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content={`${title} — Gåri`} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={`${$page.url.origin}/og/c/${data.collection.slug}.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={`${title} — Gåri`} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={`${$page.url.origin}/og/c/${data.collection.slug}.png`} />
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + collectionJsonLd + '</scr' + 'ipt>'}
</svelte:head>

<!-- Hero section -->
<section class="mx-auto max-w-7xl px-4 pb-2 pt-8 sm:pt-12">
	<h1 class="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl" style="font-family: var(--font-display)">
		{title}
	</h1>
	<p class="mt-2 text-[var(--color-text-secondary)]">
		{description}
	</p>
	<p class="mt-1 text-sm text-[var(--color-text-muted)]">
		{data.events.length} {$t('events')}
	</p>
</section>

<div class="mx-auto max-w-7xl px-4 py-6" aria-live="polite" aria-atomic="true">
	{#if data.events.length === 0}
		<div class="flex flex-col items-center px-4 py-16 text-center">
			<p class="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">{$t('noResults')}</p>
			<p class="mb-6 text-[var(--color-text-secondary)]">{$t('noResultsMessage')}</p>
			<a
				href="/{$lang}"
				class="rounded-xl bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
			>
				{$t('seeAllEvents')}
			</a>
		</div>
	{:else}
		<EventGrid events={displayedEvents} />
		<LoadMore shown={displayedEvents.length} total={data.events.length} href={nextPageHref} />

		<div class="mt-8 text-center">
			<a
				href="/{$lang}"
				class="text-sm font-medium text-[var(--color-text-secondary)] underline transition-colors hover:text-[var(--color-text-primary)]"
			>
				{$t('seeAllEvents')}
			</a>
		</div>
	{/if}
</div>
