<script lang="ts">
	import { lang, t } from '$lib/i18n';
	import { safeJsonLd } from '$lib/seo';
	import { MapPin, Globe, ArrowRight, Calendar } from 'lucide-svelte';
	import EventCard from '$lib/components/EventCard.svelte';

	let { data } = $props();
	let venue = $derived(data.venue);
	let events = $derived(data.events);

	let title = $derived(
		$lang === 'no'
			? `${venue.nameDisplay.no} — Program og arrangementer`
			: `${venue.nameDisplay.en} — Events and programme`
	);

	let metaDescription = $derived(
		$lang === 'no'
			? `Se hva som skjer på ${venue.nameDisplay.no} i Bergen. ${events.length} kommende arrangementer. Oppdatert daglig fra Gåri.`
			: `See what's on at ${venue.nameDisplay.en} in Bergen. ${events.length} upcoming events. Updated daily by Gåri.`
	);

	let canonicalUrl = $derived(`https://gaari.no/${$lang}/venue/${venue.slug}`);

	let localBusinessJsonLd = $derived(safeJsonLd({
		'@context': 'https://schema.org',
		'@type': 'LocalBusiness',
		name: venue.name,
		description: venue.description[$lang],
		address: {
			'@type': 'PostalAddress',
			streetAddress: venue.street,
			postalCode: venue.postalCode,
			addressLocality: 'Bergen',
			addressCountry: 'NO'
		},
		geo: {
			'@type': 'GeoCoordinates',
			latitude: venue.lat,
			longitude: venue.lng
		},
		...(venue.website ? { url: venue.website } : {})
	}));

	let breadcrumbJsonLd = $derived(safeJsonLd({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Gåri', item: `https://gaari.no/${$lang}` },
			{ '@type': 'ListItem', position: 2, name: venue.nameDisplay[$lang], item: canonicalUrl }
		]
	}));
</script>

<svelte:head>
	<title>{title} | Gåri</title>
	<meta name="description" content={metaDescription} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:type" content="website" />
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + localBusinessJsonLd + '</scr' + 'ipt>'}
	{@html '<script type="application/ld+json">' + breadcrumbJsonLd + '</scr' + 'ipt>'}
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
	<!-- Breadcrumb -->
	<nav class="mb-4 text-sm text-[var(--color-text-muted)]" aria-label="Breadcrumb">
		<a href="/{$lang}" class="hover:text-[var(--color-text-primary)]">Gåri</a>
		<span class="mx-1">/</span>
		<span>{venue.nameDisplay[$lang]}</span>
	</nav>

	<!-- Venue header -->
	<h1 class="mb-2 text-2xl font-bold sm:text-3xl">{venue.nameDisplay[$lang]}</h1>
	<p class="mb-6 text-[var(--color-text-secondary)]">{venue.description[$lang]}</p>

	<!-- Venue info -->
	<div class="mb-8 flex flex-wrap gap-4">
		<div class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
			<MapPin size={16} />
			<a
				href={`https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`}
				target="_blank"
				rel="noopener"
				class="underline hover:text-[var(--color-text-primary)]"
			>
				{venue.street}, {venue.postalCode} Bergen
			</a>
		</div>
		{#if venue.website}
			<div class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
				<Globe size={16} />
				<a href={venue.website} target="_blank" rel="noopener" class="underline hover:text-[var(--color-text-primary)]">
					{venue.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
				</a>
			</div>
		{/if}
	</div>

	<!-- Events -->
	<section>
		<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
			<Calendar size={20} />
			{$lang === 'no'
				? `${events.length} kommende arrangementer`
				: `${events.length} upcoming events`}
		</h2>

		{#if events.length > 0}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each events as event (event.id)}
					<EventCard {event} />
				{/each}
			</div>
		{:else}
			<p class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-[var(--color-text-secondary)]">
				{$lang === 'no'
					? `Ingen kommende arrangementer på ${venue.nameDisplay.no} akkurat nå. Sjekk tilbake snart!`
					: `No upcoming events at ${venue.nameDisplay.en} right now. Check back soon!`}
			</p>
		{/if}
	</section>

	<!-- Collection links -->
	<div class="mt-8 flex flex-wrap gap-2">
		<a
			href="/{$lang}/{$lang === 'no' ? 'denne-helgen' : 'this-weekend'}"
			class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
		>
			{$lang === 'no' ? 'Denne helgen i Bergen' : 'This weekend in Bergen'}
			<ArrowRight size={16} />
		</a>
		{#if venue.bydel}
			<a
				href="/{$lang}/{venue.bydel.toLowerCase().replace('å', 'a')}"
				class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
			>
				{$lang === 'no' ? `Flere arrangementer i ${venue.bydel}` : `More events in ${venue.bydel}`}
				<ArrowRight size={16} />
			</a>
		{/if}
	</div>
</div>
