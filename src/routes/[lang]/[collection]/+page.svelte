<script lang="ts">
	import { page } from '$app/stores';
	import { lang, t } from '$lib/i18n';
	import { getCanonicalUrl, generateCollectionJsonLd, generateBreadcrumbJsonLd, generateFaqJsonLdFromItems } from '$lib/seo';
	import { getCollection, type Collection } from '$lib/collections';
	import { getOsloNow, getWeekendDates } from '$lib/event-filters';
	import EventGrid from '$lib/components/EventGrid.svelte';
	import LoadMore from '$lib/components/LoadMore.svelte';
	import NewsletterCTA from '$lib/components/NewsletterCTA.svelte';

	let { data } = $props();

	const PAGE_SIZE = 12;
	let pageNum = $derived(Number($page.url.searchParams.get('page') || '1'));
	let displayedEvents = $derived(data.events.slice(0, pageNum * PAGE_SIZE));

	// Use server-provided lang for SSR-critical values (JSON-LD, meta tags).
	// $lang store only syncs via $effect (client-only), so it defaults to 'no' during SSR.
	let ssrLang = $derived(data.lang);
	let baseTitle = $derived(data.collection.title[ssrLang]);
	let year = new Date().getFullYear();
	let title = $derived(data.collection.seasonal ? `${baseTitle} ${year}` : baseTitle);
	let descriptionBase = $derived(data.collection.description[ssrLang]);
	let description = $derived(data.collection.seasonal ? `${descriptionBase.replace(/\.$/, '')} ${year}.` : descriptionBase);
	let canonicalUrl = $derived(getCanonicalUrl(`/${ssrLang}/${data.collection.slug}`));
	let collectionJsonLd = $derived(
		generateCollectionJsonLd(data.collection, ssrLang, canonicalUrl, data.events)
	);

	let breadcrumbJsonLd = $derived(generateBreadcrumbJsonLd([
		{ name: 'Gåri', url: getCanonicalUrl(`/${ssrLang}`) },
		{ name: title }
	]));

	let editorial = $derived(data.collection.editorial?.[ssrLang] ?? []);
	let faqItems = $derived(data.collection.faq?.[ssrLang] ?? []);
	let faqJsonLd = $derived(faqItems.length > 0 ? generateFaqJsonLdFromItems(faqItems) : null);
	let quickAnswerBase = $derived(data.collection.quickAnswer?.[ssrLang] ?? '');
	let quickAnswer = $derived(
		quickAnswerBase && data.events.length > 0
			? `${quickAnswerBase} ${ssrLang === 'no' ? `Akkurat nå: ${data.events.length} arrangementer.` : `Right now: ${data.events.length} events.`}`
			: quickAnswerBase
	);

	// Dynamic date hint for time-sensitive collections (SEO: shows freshness)
	let dateHint = $derived.by(() => {
		const slug = data.collection.slug;
		const now = getOsloNow();
		const locale = ssrLang === 'no' ? 'nb-NO' : 'en-GB';
		const fmt = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
		const fmtShort = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric' });

		if (slug === 'denne-helgen' || slug === 'this-weekend' || slug === 'familiehelg') {
			const { start, end } = getWeekendDates(now);
			const s = new Date(start + 'T12:00:00');
			const e = new Date(end + 'T12:00:00');
			return `${fmtShort(s)}.–${fmt(e)}`;
		}
		if (slug === 'i-dag' || slug === 'today-in-bergen') {
			return fmt(now);
		}
		if (slug === 'i-kveld' || slug === 'studentkveld') {
			return fmt(now);
		}
		return '';
	});

	let relatedCollections: Collection[] = $derived(
		(data.collection.relatedSlugs ?? [])
			.map((slug: string) => getCollection(slug))
			.filter((c: Collection | undefined): c is Collection => c != null)
	);

	let nextPageHref = $derived(`?page=${pageNum + 1}`);

	// Track social media click-through
	$effect(() => {
		if (typeof window === 'undefined' || !window.umami) return;
		const params = new URLSearchParams(window.location.search);
		const source = params.get('utm_source');
		if (source === 'facebook' || source === 'instagram' || source === 'sticker') {
			umami.track('social-click', { source, slug: data.collection.slug, campaign: params.get('utm_campaign') || '' });
		}
	});

	// Scroll depth tracking
	let scrollSentinel: HTMLDivElement | undefined = $state();
	let scrollTracked = false;
	$effect(() => {
		if (!scrollSentinel || typeof window === 'undefined' || !window.umami) return;
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting && !scrollTracked) {
				scrollTracked = true;
				umami.track('collection-scroll', { slug: data.collection.slug, depth: '100' });
				observer.disconnect();
			}
		}, { threshold: 0.1 });
		observer.observe(scrollSentinel);
		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>{title} — Gåri</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content={`${title} — Gåri`} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={`${$page.url.origin}/og/c/${data.collection.slug}.png${ssrLang === 'en' ? '?lang=en' : ''}`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={`${title} — Gåri`} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={`${$page.url.origin}/og/c/${data.collection.slug}.png${ssrLang === 'en' ? '?lang=en' : ''}`} />
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + collectionJsonLd + '</scr' + 'ipt>'}
	{@html '<script type="application/ld+json">' + breadcrumbJsonLd + '</scr' + 'ipt>'}
	{#if faqJsonLd}{@html '<script type="application/ld+json">' + faqJsonLd + '</scr' + 'ipt>'}{/if}
</svelte:head>

<!-- Hero section -->
<section class="mx-auto max-w-7xl px-4 pb-2 pt-8 sm:pt-12">
	<h1 class="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl" style="font-family: var(--font-display)">
		{title}
	</h1>
	{#if dateHint}
		<p class="mt-1 text-lg font-medium text-[var(--color-text-secondary)]">{dateHint}</p>
	{/if}
	<p class="mt-2 text-[var(--color-text-secondary)]">
		{description}
	</p>
	<p class="mt-1 text-sm text-[var(--color-text-muted)]">
		{data.events.length} {$t('events')} · {$lang === 'no' ? 'Oppdatert' : 'Updated'} {new Date().toLocaleDateString($lang === 'no' ? 'nb-NO' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
	</p>
	{#if quickAnswer}
	<p class="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)]">{quickAnswer}</p>
	{/if}
	{#if editorial.length > 0}
	<details class="mt-2 max-w-2xl">
		<summary class="cursor-pointer text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
			{$lang === 'no' ? 'Les mer' : 'Read more'}
		</summary>
		<div class="mt-2 space-y-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
			<p>{editorial[0]}</p>
		</div>
	</details>
	{/if}
</section>

<div class="mx-auto max-w-7xl px-4 py-6" aria-live="polite" aria-atomic="true">
	{#if data.events.length === 0}
		<div class="px-4 py-10">
			<div class="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 max-w-lg">
				{#if data.collection.offSeasonHint?.[ssrLang]}
					<p class="mb-4 text-[var(--color-text-secondary)]">{data.collection.offSeasonHint[ssrLang]}</p>
				{:else}
					<p class="mb-4 text-[var(--color-text-secondary)]">{$t('noResultsMessage')}</p>
				{/if}
				<a
					href="/{$lang}"
					class="inline-block rounded-xl bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
				>
					{$t('seeAllEvents')}
				</a>
			</div>
			{#if relatedCollections.length > 0}
			<nav aria-label={ssrLang === 'no' ? 'Relaterte samlinger' : 'Related collections'}>
				<h2 class="mb-3 text-base font-semibold text-[var(--color-text-primary)]">
					{ssrLang === 'no' ? 'Utforsk i mellomtiden' : 'Explore in the meantime'}
				</h2>
				<ul class="flex flex-wrap gap-2">
					{#each relatedCollections as related (related.slug)}
					<li>
						<a
							href="/{ssrLang}/{related.slug}"
							class="inline-block rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
						>
							{related.title[ssrLang]}
						</a>
					</li>
					{/each}
				</ul>
			</nav>
			{/if}
		</div>
	{:else}
		<EventGrid events={displayedEvents} promotedEventIds={data.promotedEventIds} />
		<LoadMore shown={displayedEvents.length} total={data.events.length} href={nextPageHref} />

		{#if relatedCollections.length > 0}
		<nav class="mt-10" aria-label={ssrLang === 'no' ? 'Utforsk flere samlinger' : 'Explore more collections'}>
			<h2 class="mb-3 text-base font-semibold text-[var(--color-text-primary)]">
				{ssrLang === 'no' ? 'Utforsk mer' : 'Explore more'}
			</h2>
			<ul class="flex flex-wrap gap-2">
				{#each relatedCollections as related (related.slug)}
				<li>
					<a
						href="/{ssrLang}/{related.slug}"
						class="inline-block rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
					>
						{related.title[ssrLang]}
					</a>
				</li>
				{/each}
			</ul>
		</nav>
		{/if}

		<div class="mt-6 text-center">
			<a
				href="/{$lang}"
				class="text-sm font-medium text-[var(--color-text-secondary)] underline transition-colors hover:text-[var(--color-text-primary)]"
			>
				{$t('seeAllEvents')}
			</a>
		</div>
	{/if}
</div>

<!-- Newsletter CTA -->
<div class="mx-auto max-w-7xl px-4 pt-4">
	<NewsletterCTA
		id="collection"
		variant="card"
		heading={data.collection.newsletterHeading}
	/>
</div>

<div bind:this={scrollSentinel}></div>
{#if editorial.length > 1 || faqItems.length > 0 || relatedCollections.length > 0}
<section class="mx-auto max-w-7xl px-4 pb-16 pt-8 border-t border-[var(--color-border)]">
	<div class="max-w-2xl">
		{#if editorial.length > 1}
		<div class="mb-10 space-y-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
			{#each editorial.slice(1) as para, i (i)}
			<p>{para}</p>
			{/each}
		</div>
		{/if}

		{#if faqItems.length > 0}
		<div class="space-y-6">
			{#each faqItems as item (item.q)}
			<div>
				<h2 class="mb-1 text-base font-semibold text-[var(--color-text-primary)]">{item.q}</h2>
				<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.a}</p>
			</div>
			{/each}
		</div>
		{/if}

		{#if relatedCollections.length > 0}
		<nav class="mt-10" aria-label={ssrLang === 'no' ? 'Relaterte samlinger' : 'Related collections'}>
			<h2 class="mb-3 text-base font-semibold text-[var(--color-text-primary)]">
				{ssrLang === 'no' ? 'Utforsk også' : 'Also explore'}
			</h2>
			<ul class="flex flex-wrap gap-2">
				{#each relatedCollections as related (related.slug)}
				<li>
					<a
						href="/{ssrLang}/{related.slug}"
						class="inline-block rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
					>
						{related.title[ssrLang]}
					</a>
				</li>
				{/each}
			</ul>
		</nav>
		{/if}
	</div>
</section>
{/if}
