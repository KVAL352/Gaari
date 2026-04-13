<script lang="ts">
	import { lang, t } from '$lib/i18n';
	import { isFreeEvent } from '$lib/utils';
	import { safeJsonLd } from '$lib/seo';
	import { SOURCE_COUNT } from '$lib/constants';
	import EventCard from '$lib/components/EventCard.svelte';
	import NewsletterCTA from '$lib/components/NewsletterCTA.svelte';
	import { ArrowRight } from 'lucide-svelte';

	let { data } = $props();
	let events = $derived(data.events);

	let freeCount = $derived(events.filter((e: any) => isFreeEvent(e.price)).length);
	let categoryBreakdown = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const e of events) counts[e.category] = (counts[e.category] || 0) + 1;
		return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
	});

	let formatDate = (dateStr: string) => {
		const d = new Date(dateStr + 'T12:00:00');
		return d.toLocaleDateString($lang === 'no' ? 'nb-NO' : 'en-GB', { day: 'numeric', month: 'long' });
	};

	let title = $derived(
		$lang === 'no'
			? `Uke ${data.week}: Hva skjer i Bergen ${formatDate(data.startDate)}–${formatDate(data.endDate)}`
			: `Week ${data.week}: What's on in Bergen ${formatDate(data.startDate)}–${formatDate(data.endDate)}`
	);

	let metaDescription = $derived(
		$lang === 'no'
			? `${events.length} arrangementer i Bergen uke ${data.week} — ${freeCount} gratis. Konserter, teater, utstillinger og mer fra ${SOURCE_COUNT} kilder.`
			: `${events.length} events in Bergen week ${data.week} — ${freeCount} free. Concerts, theatre, exhibitions and more from ${SOURCE_COUNT} sources.`
	);

	let canonicalUrl = $derived(`https://gaari.no/${$lang}/denne-uken/${data.year}-${data.week}`);

	let articleJsonLd = $derived(safeJsonLd({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: title,
		description: metaDescription,
		url: canonicalUrl,
		datePublished: data.startDate,
		dateModified: new Date().toISOString().slice(0, 10),
		publisher: { '@type': 'Organization', name: 'Gåri', url: 'https://gaari.no' },
		author: { '@type': 'Organization', name: 'Gåri' }
	}));
</script>

<svelte:head>
	<title>{title} | Gåri</title>
	<meta name="description" content={metaDescription} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:type" content="article" />
	<meta property="article:modified_time" content={new Date().toISOString()} />
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + articleJsonLd + '</scr' + 'ipt>'}
</svelte:head>

<article class="mx-auto max-w-5xl px-4 py-8">
	<!-- Breadcrumb -->
	<nav class="mb-4 text-sm text-[var(--color-text-muted)]" aria-label="Breadcrumb">
		<a href="/{$lang}" class="hover:text-[var(--color-text-primary)]">Gåri</a>
		<span class="mx-1">/</span>
		<span>{$lang === 'no' ? `Uke ${data.week}` : `Week ${data.week}`}</span>
	</nav>

	<h1 class="mb-4 text-2xl font-bold sm:text-3xl">{title}</h1>

	<!-- Summary -->
	<div class="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
		<p class="text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? `Bergen har ${events.length} arrangementer denne uken — ${freeCount} av dem er gratis. `
				: `Bergen has ${events.length} events this week — ${freeCount} of them are free. `}
			{#if categoryBreakdown.length > 0}
				{$lang === 'no' ? 'Mest av: ' : 'Most popular: '}
				{categoryBreakdown.map(([cat, count]) => `${$t(`cat.${cat}`)} (${count})`).join(', ')}.
			{/if}
		</p>
	</div>

	<!-- Events grid -->
	{#if events.length > 0}
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each events.slice(0, 30) as event (event.id)}
				<EventCard {event} />
			{/each}
		</div>
		{#if events.length > 30}
			<p class="mt-4 text-center text-sm text-[var(--color-text-muted)]">
				<a href="/{$lang}" class="text-[var(--color-accent)] underline">
					{$lang === 'no' ? `Se alle ${events.length} arrangementer` : `See all ${events.length} events`}
				</a>
			</p>
		{/if}
	{:else}
		<p class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-[var(--color-text-secondary)]">
			{$lang === 'no' ? 'Ingen arrangementer funnet for denne uken.' : 'No events found for this week.'}
		</p>
	{/if}

	<!-- Newsletter CTA -->
	<div class="mt-8">
		<NewsletterCTA id="weekly-post" variant="card" />
	</div>

	<!-- Navigation -->
	<div class="mt-8 flex flex-wrap gap-3">
		<a
			href="/{$lang}/{$lang === 'no' ? 'denne-helgen' : 'this-weekend'}"
			class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
		>
			{$lang === 'no' ? 'Denne helgen' : 'This weekend'}
			<ArrowRight size={16} />
		</a>
		<a
			href="/{$lang}/{$lang === 'no' ? 'gratis' : 'free-things-to-do-bergen'}"
			class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
		>
			{$lang === 'no' ? 'Gratis i Bergen' : 'Free events'}
			<ArrowRight size={16} />
		</a>
	</div>
</article>
