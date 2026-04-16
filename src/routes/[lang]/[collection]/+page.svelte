<script lang="ts">
	import { page } from '$app/stores';
	import { lang, t } from '$lib/i18n';
	import { getCanonicalUrl, generateCollectionJsonLd, generateBreadcrumbJsonLd, generateFaqJsonLdFromItems, safeJsonLd } from '$lib/seo';
	import { getCollection, type Collection } from '$lib/collections';
	import { getOsloNow, getWeekendDates } from '$lib/event-filters';
	import EventGrid from '$lib/components/EventGrid.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import LoadMore from '$lib/components/LoadMore.svelte';
	import NewsletterCTA from '$lib/components/NewsletterCTA.svelte';
	import ImagePlaceholder from '$lib/components/ImagePlaceholder.svelte';
	import { groupEventsByDate } from '$lib/utils';
	import type { Category, Bydel } from '$lib/types';

	let { data } = $props();

	// ── Client-side filters ──
	const CATEGORY_COLLECTIONS = new Set(['music', 'culture', 'theatre', 'family', 'food', 'festival', 'sports', 'nightlife', 'workshop', 'student', 'tours']);
	const BYDEL_COLLECTIONS = new Set(['sentrum', 'bergenhus', 'fana', 'ytrebygda', 'laksevag', 'fyllingsdalen', 'asane', 'arna']);

	let filterCategory = $state<Category | ''>('');
	let filterBydel = $state<Bydel | ''>('');
	let filterPrice = $state('');

	// Determine which filters to hide based on collection type
	let hideFields = $derived.by(() => {
		const id = data.collection.id;
		const hide: string[] = ['audience'];
		if (CATEGORY_COLLECTIONS.has(id)) hide.push('category');
		if (BYDEL_COLLECTIONS.has(id)) hide.push('bydel');
		return hide;
	});

	let showFilters = $derived(!data.hubItems?.length && data.events.length > 3);

	let filteredEvents = $derived.by(() => {
		let events = data.events;
		if (filterCategory) events = events.filter(e => e.category === filterCategory);
		if (filterBydel) events = events.filter(e => e.bydel === filterBydel);
		if (filterPrice === 'free') events = events.filter(e => !e.price || e.price === '0' || String(e.price).toLowerCase().includes('gratis') || String(e.price).toLowerCase().includes('free'));
		if (filterPrice === 'paid') events = events.filter(e => e.price && e.price !== '0' && !String(e.price).toLowerCase().includes('gratis') && !String(e.price).toLowerCase().includes('free'));
		return events;
	});

	function handleFilterChange(key: string, value: string) {
		if (key === 'category') filterCategory = value as Category | '';
		if (key === 'bydel') filterBydel = value as Bydel | '';
		if (key === 'price') filterPrice = value;
	}

	function handleClearAll() {
		filterCategory = '';
		filterBydel = '';
		filterPrice = '';
	}

	// Pagination: complete days when possible, with an event cap to keep DOM under ~1500.
	// Baseline ~95 DOM + ~38 per card → 25 events ≈ 1045 DOM, 35 events ≈ 1425 DOM.
	const EVENTS_PER_PAGE = 25;
	let pageNum = $derived(Number($page.url.searchParams.get('page') || '1'));

	// Use server-provided lang for SSR-critical values (JSON-LD, meta tags).
	// $lang store only syncs via $effect (client-only), so it defaults to 'no' during SSR.
	let ssrLang = $derived(data.lang);
	let baseTitle = $derived(data.collection.title[ssrLang]);
	let year = new Date().getFullYear();
	let title = $derived(data.collection.seasonal ? `${baseTitle} ${year}` : baseTitle);
	let descriptionBase = $derived(data.collection.description[ssrLang]);
	// Dynamic meta description with event count for freshness signal
	let description = $derived.by(() => {
		const count = data.events.length;
		const base = data.collection.seasonal ? `${descriptionBase.replace(/\.$/, '')} ${year}.` : descriptionBase;
		if (count > 0) {
			const countStr = ssrLang === 'no' ? `${count} arrangementer akkurat nå.` : `${count} events right now.`;
			// Append count if it fits within 160 chars
			return (base + ' ' + countStr).length <= 165 ? base + ' ' + countStr : base;
		}
		return base;
	});
	let canonicalUrl = $derived(getCanonicalUrl(`/${ssrLang}/${data.collection.slug}`));
	let collectionJsonLd = $derived(
		generateCollectionJsonLd(data.collection, ssrLang, canonicalUrl, data.events)
	);

	let breadcrumbJsonLd = $derived(generateBreadcrumbJsonLd([
		{ name: 'Gåri', url: getCanonicalUrl(`/${ssrLang}`) },
		{ name: title }
	]));

	let editorial = $derived(data.collection.editorial?.[ssrLang] ?? []);

	// Article JSON-LD for editorial content — AI engines cite Article schema more than CollectionPage
	let articleJsonLd = $derived(editorial.length > 0 ? safeJsonLd({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: title,
		description: descriptionBase,
		url: canonicalUrl,
		dateModified: new Date().toISOString().slice(0, 10),
		author: { '@type': 'Organization', name: 'Gåri', url: 'https://gaari.no' },
		publisher: { '@type': 'Organization', name: 'Gåri', url: 'https://gaari.no' },
		inLanguage: ssrLang === 'no' ? 'nb' : 'en',
		articleBody: editorial.join(' '),
		about: { '@type': 'City', name: 'Bergen', sameAs: 'https://www.wikidata.org/wiki/Q26693' }
	}) : null);

	let faqItems = $derived(data.collection.faq?.[ssrLang] ?? []);
	// FAQPage schema removed — Google restricted FAQ rich results to govt/health sites (Aug 2023).
	// FAQ content is still rendered on-page for users and AI crawlers.
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

	// Range for multi-day event expansion on time-window collections
	let dateRange = $derived.by(() => {
		const slug = data.collection.slug;
		const now = getOsloNow();
		if (slug === 'denne-helgen' || slug === 'this-weekend' || slug === 'familiehelg') {
			const { start, end } = getWeekendDates(now);
			return { from: start, to: end };
		}
		if (slug === 'i-dag' || slug === 'today-in-bergen' || slug === 'i-kveld' || slug === 'tonight' || slug === 'studentkveld') {
			const today = now.toISOString().slice(0, 10);
			return { from: today, to: today };
		}
		return { from: undefined, to: undefined };
	});

	let groupedByDate = $derived(
		Array.from(groupEventsByDate(filteredEvents, dateRange.from, dateRange.to).entries())
			.sort(([a], [b]) => a.localeCompare(b))
	);
	let totalDays = $derived(groupedByDate.length);

	// Days to show on current page: accumulate complete days up to EVENTS_PER_PAGE * pageNum,
	// minimum 1 day per page so a busy single day doesn't block pagination.
	let visibleDays = $derived.by(() => {
		const target = EVENTS_PER_PAGE * pageNum;
		let events = 0;
		let days = 0;
		for (const [, dayEvents] of groupedByDate) {
			days++;
			events += dayEvents.length;
			if (events >= target) break;
		}
		return Math.max(days, pageNum);
	});

	let venueCount = $derived(new Set(filteredEvents.map(e => e.venue_name).filter(Boolean)).size);

	let relatedCollections: Collection[] = $derived(
		(data.collection.relatedSlugs ?? [])
			.map((slug: string) => getCollection(slug))
			.filter((c: Collection | undefined): c is Collection => c != null)
	);

	let nextPageHref = $derived(`?page=${pageNum + 1}`);

	// Hub layout: group sub-collections by month
	const monthNamesNo = ['', 'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
	const monthNamesEn = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	let hubGrouped = $derived.by(() => {
		if (!data.hubItems?.length) return [];
		const names = ssrLang === 'no' ? monthNamesNo : monthNamesEn;
		const groups = new Map<string, typeof data.hubItems>();
		for (const item of data.hubItems) {
			const label = item.month > 0 && item.month <= 12 ? names[item.month] : (ssrLang === 'no' ? 'Kommende' : 'Upcoming');
			const existing = groups.get(label) ?? [];
			existing.push(item);
			groups.set(label, existing);
		}
		return [...groups.entries()];
	});

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
	{#if data.events.length === 0 && !data.collection.seasonal && !data.collection.offSeasonHint}
	<meta name="robots" content="noindex, follow" />
	{/if}
	<meta property="og:title" content={`${title} — Gåri`} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={`${$page.url.origin}/og/c/${data.collection.slug}.png${ssrLang === 'en' ? '?lang=en' : ''}`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="article:modified_time" content={new Date().toISOString()} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={`${title} — Gåri`} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={`${$page.url.origin}/og/c/${data.collection.slug}.png${ssrLang === 'en' ? '?lang=en' : ''}`} />
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + collectionJsonLd + '</scr' + 'ipt>'}
	{@html '<script type="application/ld+json">' + breadcrumbJsonLd + '</scr' + 'ipt>'}
	{#if articleJsonLd}{@html '<script type="application/ld+json">' + articleJsonLd + '</scr' + 'ipt>'}{/if}
</svelte:head>

<!-- Hero section -->
<section class="mx-auto max-w-7xl px-4 pb-4 pt-8 sm:pt-12">
	<div class="border-l-4 border-[var(--color-accent)] pl-3">
		<h1 class="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl" style="font-family: var(--font-display)">
			{title}
		</h1>
		{#if dateHint}
			<p class="mt-1 text-lg font-medium text-[var(--color-text-secondary)]">{dateHint}</p>
		{/if}
	</div>
	<p class="mt-3 max-w-2xl text-[var(--color-text-secondary)]">
		{description}
	</p>
	{#if quickAnswer}
	<p class="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)]">{quickAnswer}</p>
	{/if}
	<p class="mt-2 flex flex-wrap gap-x-2 text-xs text-[var(--color-text-muted)]">
		<span>{filteredEvents.length} {$t('events')}{venueCount > 1 ? ` ${$lang === 'no' ? 'fra' : 'from'} ${venueCount} ${$lang === 'no' ? 'scener' : 'venues'}` : ''}</span>
		<span>· {$lang === 'no' ? 'Sist sjekket' : 'Last checked'} {new Date().toLocaleDateString($lang === 'no' ? 'nb-NO' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
	</p>
</section>

{#if showFilters}
<FilterBar
	category={filterCategory}
	bydel={filterBydel}
	price={filterPrice}
	hideFields={hideFields}
	onFilterChange={handleFilterChange}
	onClearAll={handleClearAll}
/>
{/if}

{#if hubGrouped.length > 0}
<!-- Hub layout: festival directory grouped by month -->
<div class="mx-auto max-w-7xl px-4 py-6">
	{#each hubGrouped as [month, items] (month)}
	<section class="mb-8">
		<div class="mb-2 flex items-center gap-3 border-l-4 border-[var(--color-text-primary)] pl-3.5 md:mb-5">
			<h2 class="text-lg font-semibold text-[var(--color-text-primary)]" style="font-family: var(--font-display)">
				{month}
			</h2>
		</div>
		<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each items as item (item.slug)}
			<li class="group list-none h-full">
				<a
					href="/{ssrLang}/{item.slug}"
					class="hub-card relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-sm no-underline"
				>
					<div class="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface)]">
						{#if item.imageUrl}
						<img
							src={item.imageUrl}
							alt={item.title[ssrLang]}
							loading="lazy"
							class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
						/>
						{:else}
						<ImagePlaceholder category="festival" size={64} />
						{/if}
						{#if item.eventCount > 0}
						<span class="absolute left-2 top-2 rounded-full bg-[var(--color-accent)] px-2.5 py-0.5 text-xs font-semibold text-white">
							{item.eventCount} {ssrLang === 'no' ? 'arr.' : 'events'}
						</span>
						{/if}
					</div>
					<div class="flex flex-1 flex-col p-4">
						<h3 class="mb-1 line-clamp-2 text-lg font-semibold leading-tight text-[var(--color-text-primary)]">
							{item.title[ssrLang]}
						</h3>
						<p class="mb-1 text-sm text-[var(--color-text-secondary)]">
							{item.dateHint[ssrLang]}
						</p>
						<p class="mb-2 line-clamp-2 text-xs text-[var(--color-text-muted)]">
							{item.description[ssrLang]}
						</p>
						<span class="mt-auto text-sm font-medium text-[var(--color-accent)]">
							{item.eventCount > 0
								? (ssrLang === 'no' ? 'Se program →' : 'See programme →')
								: (ssrLang === 'no' ? 'Programmet kommer →' : 'Programme coming soon →')}
						</span>
					</div>
				</a>
			</li>
			{/each}
		</ul>
	</section>
	{/each}
</div>
{:else}
<div class="mx-auto max-w-7xl px-4 py-6" aria-live="polite" aria-atomic="true">
	{#if data.events.length === 0}
		<div class="py-10">
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
		<EventGrid events={filteredEvents} promotedEventIds={data.promotedEventIds} showNewsletterCta studentContext={data.collection.slug === 'studentkveld'} rangeFrom={dateRange.from} rangeTo={dateRange.to} maxDays={visibleDays} />
		<LoadMore shown={Math.min(visibleDays, totalDays)} total={totalDays} href={nextPageHref} unitLabel={$lang === 'no' ? 'dager' : 'days'} />

	{/if}
</div>
{/if}

<!-- Newsletter CTA -->
<div id="newsletter-cta" class="mx-auto max-w-7xl px-4 pt-8">
	<NewsletterCTA
		id="collection"
		variant="card"
		heading={data.collection.newsletterHeading}
	/>
</div>

<div bind:this={scrollSentinel}></div>
{#if editorial.length > 0 || faqItems.length > 0 || relatedCollections.length > 0}
<section class="mx-auto max-w-7xl px-4 pb-16 pt-8 border-t border-[var(--color-border)]">
	<div class="max-w-2xl">
		{#if editorial.length > 0}
		<h2 class="mb-4 text-lg font-semibold text-[var(--color-text-primary)]" style="font-family: var(--font-display)">
			{$lang === 'no' ? `Om ${baseTitle.toLowerCase()}` : `About ${baseTitle.toLowerCase()}`}
		</h2>
		<div class="mb-10 space-y-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
			{#each editorial as para, i (i)}
			<p>{para}</p>
			{/each}
		</div>
		{/if}

		{#if faqItems.length > 0}
		{#if editorial.length > 0}
		<hr class="mb-8 border-[var(--color-border-subtle)]" />
		{/if}
		<div class="space-y-6">
			{#each faqItems as item (item.q)}
			<div>
				<h3 class="mb-1 text-base font-semibold text-[var(--color-text-primary)]">{item.q}</h3>
				<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.a}</p>
			</div>
			{/each}
		</div>
		{/if}

		{#if relatedCollections.length > 0}
		<nav class="mt-10" aria-label={ssrLang === 'no' ? 'Relaterte samlinger' : 'Related collections'}>
			<h2 class="mb-3 text-base font-semibold text-[var(--color-text-primary)]">
				{ssrLang === 'no' ? 'Mer i Bergen' : 'More in Bergen'}
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
