<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { lang, t } from '$lib/i18n';
	import {
		formatEventDate, formatEventTime, formatMetaDate, formatPrice, isFreeEvent, buildOutboundUrl
	} from '$lib/utils';
	import type { GaariEvent } from '$lib/types';
	import { generateEventJsonLd, generateBreadcrumbJsonLd, getCanonicalUrl } from '$lib/seo';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import ImagePlaceholder from '$lib/components/ImagePlaceholder.svelte';
	import CalendarDropdown from '$lib/components/CalendarDropdown.svelte';
	import { Calendar, MapPin, Clock, Tag, ExternalLink, ArrowLeft, MessageSquareDiff, Share2, Check, Navigation, Bell } from 'lucide-svelte';
	import { optimizedSrc, optimizedSrcset } from '$lib/image';
	import NewsletterCTA from '$lib/components/NewsletterCTA.svelte';
	import { slide } from 'svelte/transition';
	import { ArrowRight } from 'lucide-svelte';

	let { data } = $props();
	let event: GaariEvent = $derived(data.event);
	let related: GaariEvent[] = $derived(data.related);

	let title = $derived(($lang === 'en' && event.title_en) ? event.title_en : event.title_no);
	let description = $derived(($lang === 'en' && event.description_en) ? event.description_en : event.description_no);
	const DESC_LIMIT = 160;
	let descExpanded = $state(false);
	let descIsLong = $derived(description ? description.length > DESC_LIMIT : false);
	let descTruncated = $derived.by(() => {
		if (!description || !descIsLong) return description || '';
		const cut = description.lastIndexOf(' ', DESC_LIMIT);
		return description.slice(0, cut > 0 ? cut : DESC_LIMIT) + '…';
	});
	let metaTitle = $derived.by(() => {
		const date = formatMetaDate(event.date_start, $lang);
		const venue = event.venue_name || '';
		const parts = [title, date];
		if (venue) parts.push(venue);
		return parts.join(' — ') + ' | Gåri';
	});
	let metaDescription = $derived.by(() => {
		const date = formatMetaDate(event.date_start, $lang);
		const venue = event.venue_name ? `${event.venue_name}, Bergen` : 'Bergen';
		const suffix = ` — ${date}, ${venue}`;
		const desc = description || title;
		const maxDescLen = 160 - suffix.length;
		if (maxDescLen < 40) return (desc + suffix).slice(0, 160);
		const trimmed = desc.length > maxDescLen
			? desc.slice(0, desc.lastIndexOf(' ', maxDescLen) || maxDescLen) + '…'
			: desc;
		return trimmed + suffix;
	});

	let isCancelled = $derived(event.status === 'cancelled');

	// Contextual collection link based on event category
	const CATEGORY_COLLECTIONS: Record<string, { slug: Record<string, string>; label: Record<string, string> }> = {
		music: { slug: { no: 'konserter', en: 'konserter' }, label: { no: 'Se alle konserter i Bergen', en: 'See all concerts in Bergen' } },
		family: { slug: { no: 'familiehelg', en: 'familiehelg' }, label: { no: 'Se alle familieaktiviteter', en: 'See all family activities' } },
		student: { slug: { no: 'studentkveld', en: 'studentkveld' }, label: { no: 'Se alle studentarrangementer', en: 'See all student events' } },
		nightlife: { slug: { no: 'i-kveld', en: 'i-kveld' }, label: { no: 'Se alt som skjer i kveld', en: 'See what\'s on tonight' } },
		food: { slug: { no: 'mat-og-drikke', en: 'mat-og-drikke' }, label: { no: 'Se alle matopplevelser', en: 'See all food events' } },
		workshop: { slug: { no: 'denne-helgen', en: 'this-weekend' }, label: { no: 'Se alt som skjer denne helgen', en: 'See everything this weekend' } },
		festival: { slug: { no: 'denne-helgen', en: 'this-weekend' }, label: { no: 'Se alt som skjer denne helgen', en: 'See everything this weekend' } },
		culture: { slug: { no: 'utstillinger', en: 'utstillinger' }, label: { no: 'Se alle utstillinger i Bergen', en: 'See all exhibitions in Bergen' } },
		theatre: { slug: { no: 'teater', en: 'teater' }, label: { no: 'Se alle forestillinger i Bergen', en: 'See all theatre in Bergen' } },
		sports: { slug: { no: 'denne-helgen', en: 'this-weekend' }, label: { no: 'Se alt som skjer denne helgen', en: 'See everything this weekend' } },
		tours: { slug: { no: 'denne-helgen', en: 'this-weekend' }, label: { no: 'Se alt som skjer denne helgen', en: 'See everything this weekend' } },
	};
	let collectionLink = $derived(CATEGORY_COLLECTIONS[event.category]);

	// Bydel → collection slug mapping
	const BYDEL_SLUGS: Record<string, string> = {
		'Sentrum': 'sentrum', 'Bergenhus': 'bergenhus', 'Laksevåg': 'laksevag',
		'Fyllingsdalen': 'fyllingsdalen', 'Åsane': 'asane', 'Fana': 'fana',
		'Ytrebygda': 'ytrebygda', 'Arna': 'arna'
	};
	let bydelSlug = $derived(BYDEL_SLUGS[event.bydel]);
	let bydelLabel = $derived.by(() => {
		if (!event.bydel) return null;
		return $lang === 'no' ? `Flere arrangementer i ${event.bydel}` : `More events in ${event.bydel}`;
	});

	// Reminder state
	let showReminderForm = $state(false);
	let reminderEmail = $state('');
	let reminderSubmitted = $state(false);
	let reminderSubmitting = $state(false);

	async function handleReminder() {
		if (!reminderEmail || reminderSubmitting) return;
		reminderSubmitting = true;
		try {
			const res = await fetch('/api/remind', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: reminderEmail,
					eventSlug: event.slug,
					eventTitle: title,
					eventDate: event.date_start.slice(0, 10),
					venueName: event.venue_name
				})
			});
			if (res.ok) {
				reminderSubmitted = true;
				if (typeof window !== 'undefined' && window.umami) {
					umami.track('reminder-signup', { slug: event.slug });
				}
			}
		} catch { /* ignore */ }
		reminderSubmitting = false;
	}

	let showCorrectionForm = $state(false);
	let correctionSubmitted = $state(false);
	let correctionSubmitting = $state(false);

	function detectClickContext(): 'newsletter' | 'social' | 'direct' {
		if (typeof window === 'undefined') return 'direct';
		const params = new URLSearchParams(window.location.search);
		if (params.get('utm_medium') === 'newsletter') return 'newsletter';
		const ref = document.referrer;
		if (ref && /(facebook|instagram|fb\.com|t\.co|x\.com|twitter|bsky|threads|reddit)/i.test(ref)) {
			return 'social';
		}
		return 'direct';
	}

	function trackTicketClick() {
		if (typeof window !== 'undefined' && window.umami) {
			umami.track('ticket-click', { venue: event.venue_name, slug: event.slug });
		}
		// Server-side venue click tracking for B2B reporting.
		// Context: ticket clicks from event-detail are 'direct' unless newsletter/social
		// referrer says otherwise. The original card-click (if any) was logged separately
		// with promoted/organic context by EventCard.
		fetch('/api/track-click', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			keepalive: true,
			body: JSON.stringify({
				venue_name: event.venue_name,
				event_slug: event.slug,
				source_page: window.location.pathname,
				placement_context: detectClickContext()
			})
		}).catch(() => {}); // fire-and-forget
	}
	let correctionError = $state(false);
	let linkCopied = $state(false);

	async function handleShare() {
		if (typeof window !== 'undefined' && window.umami) {
			umami.track('event-share', { slug: event.slug });
		}
		const url = canonicalUrl;
		const shareText = $lang === 'no'
			? `${title} — ${event.venue_name}, Bergen\n${url}`
			: `${title} — ${event.venue_name}, Bergen\n${url}`;
		if (typeof navigator !== 'undefined' && navigator.share) {
			try {
				await navigator.share({ title, text: shareText, url });
			} catch {
				// User cancelled or share failed — ignore
			}
		} else {
			await navigator.clipboard.writeText(shareText);
			linkCopied = true;
			setTimeout(() => linkCopied = false, 2000);
		}
	}

	// Track event detail view (fires once on page load)
	$effect(() => {
		if (typeof window !== 'undefined' && window.umami) {
			umami.track('event-view', { slug: event.slug, venue: event.venue_name || '', category: event.category || '' });
		}
	});

	// Track newsletter/social click-through (fires once on landing)
	$effect(() => {
		if (typeof window !== 'undefined' && window.umami) {
			const params = new URLSearchParams(window.location.search);
			if (params.get('utm_medium') === 'newsletter') {
				umami.track('newsletter-click', { slug: event.slug, venue: event.venue_name || '' });
			}
			if (params.get('utm_source') === 'facebook' || params.get('utm_source') === 'instagram') {
				umami.track('social-click', { source: params.get('utm_source')!, slug: event.slug });
			}
		}
	});

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/events/${event.slug}`));
	let eventJsonLd = $derived(generateEventJsonLd(event, $lang, canonicalUrl));
	const CATEGORY_BREADCRUMB: Record<string, Record<string, string>> = {
		music: { no: 'Konserter', en: 'Concerts' },
		culture: { no: 'Utstillinger', en: 'Exhibitions' },
		theatre: { no: 'Teater', en: 'Theatre' },
		family: { no: 'Familie', en: 'Family' },
		food: { no: 'Mat og drikke', en: 'Food & drink' },
		festival: { no: 'Festivaler', en: 'Festivals' },
		sports: { no: 'Sport', en: 'Sports' },
		nightlife: { no: 'Uteliv', en: 'Nightlife' },
		workshop: { no: 'Kurs', en: 'Workshops' },
		student: { no: 'Student', en: 'Student' },
		tours: { no: 'Turer', en: 'Tours' },
	};
	let breadcrumbItems = $derived.by(() => {
		const items: { name: string; url?: string }[] = [
			{ name: 'Gåri', url: getCanonicalUrl(`/${$lang}`) }
		];
		const catLabel = CATEGORY_BREADCRUMB[event.category];
		const catSlug = collectionLink?.slug[$lang];
		if (catLabel && catSlug) {
			items.push({ name: catLabel[$lang], url: getCanonicalUrl(`/${$lang}/${catSlug}`) });
		}
		items.push({ name: title });
		return items;
	});
	let breadcrumbJsonLd = $derived(generateBreadcrumbJsonLd(breadcrumbItems));

	let calendarData = $derived({
		title: title,
		description: description,
		date_start: event.date_start,
		date_end: event.date_end,
		venue_name: event.venue_name,
		address: event.address
	});
</script>

<svelte:head>
	<title>{metaTitle}</title>
	<meta name="description" content={metaDescription} />
	<link rel="canonical" href={canonicalUrl} />
	<meta name="googlebot" content="unavailable_after: {new Date(new Date(event.date_end || event.date_start).getTime() + 14 * 86400000).toUTCString()}" />
	<meta property="og:title" content={metaTitle} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:type" content="event" />
	<meta property="og:image" content={`${$page.url.origin}/og/${event.slug}.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={metaTitle} />
	<meta name="twitter:description" content={metaDescription} />
	<meta name="twitter:image" content={`${$page.url.origin}/og/${event.slug}.png`} />
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + eventJsonLd + '</scr' + 'ipt>'}
	{@html '<script type="application/ld+json">' + breadcrumbJsonLd + '</scr' + 'ipt>'}
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-6 pb-20 md:pb-6">
	<!-- Back link -->
	<a
		href="/{$lang}"
		class="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
	>
		<ArrowLeft size={16} />
		{$t('explore')}
	</a>

	<!-- Hero image -->
	<div class="mb-6 aspect-[16/9] overflow-hidden rounded-2xl bg-[var(--color-surface)]">
		{#if event.image_url}
			<img
				src={optimizedSrc(event.image_url, 800)}
				srcset={optimizedSrcset(event.image_url, [800, 1200])}
				sizes="(max-width: 56rem) calc(100vw - 2rem), 54rem"
				alt={title}
				class="h-full w-full object-cover"
				width="800"
				height="450"
				fetchpriority="high"
			/>
		{:else}
			<ImagePlaceholder category={event.category} size={64} />
		{/if}
	</div>

	<!-- Badges -->
	<div class="mb-3 flex gap-2">
		{#if isCancelled}
			<StatusBadge type="cancelled" />
		{/if}
		{#if isFreeEvent(event.price) && !isCancelled}
			<StatusBadge type="free" />
		{/if}
		<span class="rounded-full bg-[var(--color-surface)] px-3 py-0.5 text-xs font-medium">
			{$t(`cat.${event.category}` )}
		</span>
	</div>

	<!-- Title -->
	<h1 class="mb-4 text-3xl font-bold {isCancelled ? 'line-through opacity-60' : ''}">
		{title}
	</h1>

	<!-- Key info grid -->
	<div class="mb-8 grid gap-4 sm:grid-cols-2">
		<div class="flex items-start gap-3 rounded-xl bg-[var(--color-surface)] p-4">
			<Calendar size={20} class="mt-0.5 flex-shrink-0 text-[var(--color-text-secondary)]" />
			<div>
				<p class="text-sm font-semibold">{$t('when')}</p>
				<time datetime={event.date_start} class="tabular-nums text-sm text-[var(--color-text-secondary)]">
					{formatEventDate(event.date_start, $lang, event.date_end)}{formatEventTime(event.date_start, $lang) ? `, ${formatEventTime(event.date_start, $lang)}` : ''}{#if event.date_end && formatEventTime(event.date_end, $lang)} — {formatEventTime(event.date_end, $lang)}{/if}
				</time>
			</div>
		</div>
		<div class="flex items-start gap-3 rounded-xl bg-[var(--color-surface)] p-4">
			<MapPin size={20} class="mt-0.5 flex-shrink-0 text-[var(--color-text-secondary)]" />
			<div>
				<p class="text-sm font-semibold">{$t('where')}</p>
				<p class="text-sm text-[var(--color-text-secondary)]">{event.venue_name}</p>
				<p class="text-xs text-[var(--color-text-secondary)]">{event.address}, {event.bydel}</p>
				{#if event.venue_name || event.address}
					<a
						href="https://maps.google.com/?q={encodeURIComponent((event.venue_name ? event.venue_name + ', ' : '') + (event.address || 'Bergen'))}"
						target="_blank"
						rel="noopener noreferrer"
						class="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
					>
						<Navigation size={12} />
						{$t('getDirections')}
					</a>
				{/if}
			</div>
		</div>
		<div class="flex items-start gap-3 rounded-xl bg-[var(--color-surface)] p-4">
			<Tag size={20} class="mt-0.5 flex-shrink-0 text-[var(--color-text-secondary)]" />
			<div>
				<p class="text-sm font-semibold">{$t('priceLabel')}</p>
				<p class="tabular-nums text-sm text-[var(--color-text-secondary)]">{formatPrice(event.price, $lang)}</p>
				<p class="mt-0.5 text-[0.625rem] italic text-[var(--color-text-muted)]">{$t('priceDisclaimer')}</p>
			</div>
		</div>
		<div class="flex items-start gap-3 rounded-xl bg-[var(--color-surface)] p-4">
			<Clock size={20} class="mt-0.5 flex-shrink-0 text-[var(--color-text-secondary)]" />
			<div>
				<p class="text-sm font-semibold">{$t('category')}</p>
				<p class="text-sm text-[var(--color-text-secondary)]">{$t(`cat.${event.category}` )}</p>
			</div>
		</div>
	</div>

	<!-- Action buttons (inline) -->
	<div class="mb-8 flex flex-wrap gap-3">
		{#if (event.ticket_url || event.source_url) && !isCancelled}
			<a
				href={buildOutboundUrl(event.ticket_url || event.source_url!, 'event_detail', event.venue_name, event.slug)}
				target="_blank"
				rel="noopener noreferrer"
				onclick={trackTicketClick}
				class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
			>
				<ExternalLink size={16} />
				{isFreeEvent(event.price) ? ($lang === 'no' ? 'Mer info' : 'More info') : event.ticket_url ? $t('buyTickets') : ($lang === 'no' ? 'Gå til arrangement' : 'Go to event')}
			</a>
		{/if}
		<CalendarDropdown event={calendarData} />
		<button
			onclick={handleShare}
			class="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-6 py-3 text-sm font-semibold transition-colors hover:bg-[var(--color-surface)]"
		>
			{#if linkCopied}
				<Check size={16} />
				{$t('linkCopied')}
			{:else}
				<Share2 size={16} />
				{$t('share')}
			{/if}
		</button>
		{#if !isCancelled}
			<button
				onclick={() => showReminderForm = !showReminderForm}
				class="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-6 py-3 text-sm font-semibold transition-colors hover:bg-[var(--color-surface)]"
			>
				<Bell size={16} />
				{$lang === 'no' ? 'Påminn meg' : 'Remind me'}
			</button>
		{/if}
	</div>

	<!-- Reminder form -->
	{#if showReminderForm && !reminderSubmitted}
		<div class="mb-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4" transition:slide={{ duration: 200 }}>
			<p class="mb-2 text-sm font-medium">
				{$lang === 'no' ? 'Få en påminnelse kvelden før' : 'Get a reminder the evening before'}
			</p>
			<form onsubmit={(e) => { e.preventDefault(); handleReminder(); }} class="flex gap-2">
				<input
					type="email"
					bind:value={reminderEmail}
					placeholder={$lang === 'no' ? 'Din e-post' : 'Your email'}
					required
					class="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
				/>
				<button
					type="submit"
					disabled={reminderSubmitting}
					class="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
				>
					{reminderSubmitting
						? ($lang === 'no' ? 'Lagrer...' : 'Saving...')
						: ($lang === 'no' ? 'Send påminnelse' : 'Set reminder')}
				</button>
			</form>
		</div>
	{/if}
	{#if reminderSubmitted}
		<div class="mb-8 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
			<Check size={16} class="mr-1 inline" />
			{$lang === 'no'
				? `Vi sender deg en påminnelse kvelden før til ${reminderEmail}`
				: `We'll send you a reminder the evening before to ${reminderEmail}`}
		</div>
	{/if}

	<!-- Sticky ticket button on mobile -->
	{#if (event.ticket_url || event.source_url) && !isCancelled}
		<div class="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-white/95 px-4 py-3 backdrop-blur-sm md:hidden">
			<a
				href={buildOutboundUrl(event.ticket_url || event.source_url!, 'event_detail', event.venue_name, event.slug)}
				target="_blank"
				rel="noopener noreferrer"
				onclick={trackTicketClick}
				class="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
			>
				<ExternalLink size={16} />
				{isFreeEvent(event.price) ? ($lang === 'no' ? 'Mer info' : 'More info') : event.ticket_url ? $t('buyTickets') : ($lang === 'no' ? 'Gå til arrangement' : 'Go to event')}
			</a>
		</div>
	{/if}

	<!-- Description -->
	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">{$t('description')}</h2>
		<div class="prose max-w-none text-[var(--color-text-secondary)]">
			<p class="whitespace-pre-line">{descIsLong && !descExpanded ? descTruncated : description}</p>
			{#if descIsLong}
				<button
					type="button"
					class="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
					onclick={() => descExpanded = !descExpanded}
				>
					{descExpanded ? $t('readLess') : $t('readMore')}
				</button>
			{/if}
		</div>
	</section>

	<!-- Collection links: category + bydel + weekend -->
	<div class="mb-6 flex flex-wrap gap-2">
		{#if collectionLink}
			<a
				href="/{$lang}/{collectionLink.slug[$lang]}"
				class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
			>
				{collectionLink.label[$lang]}
				<ArrowRight size={16} />
			</a>
		{/if}
		{#if bydelSlug}
			<a
				href="/{$lang}/{bydelSlug}"
				class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
			>
				{bydelLabel}
				<ArrowRight size={16} />
			</a>
		{/if}
		{#if !collectionLink || (collectionLink.slug[$lang] !== 'denne-helgen' && collectionLink.slug[$lang] !== 'this-weekend')}
			<a
				href="/{$lang}/{$lang === 'no' ? 'denne-helgen' : 'this-weekend'}"
				class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
			>
				{$lang === 'no' ? 'Denne helgen i Bergen' : 'This weekend in Bergen'}
				<ArrowRight size={16} />
			</a>
		{/if}
	</div>

	<!-- Related events -->
	{#if related.length > 0}
		<section class="mb-10">
			<h2 class="mb-4 text-xl font-semibold">{$t('relatedEvents')}</h2>
			<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each related as event (event.id)}
					<EventCard {event} />
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Newsletter CTA -->
	<div class="mb-8">
		<NewsletterCTA id="event-detail" variant="card" contextCategory={event.category} />
	</div>

	<!-- Suggest correction -->
	<section class="mb-12">
		{#if correctionSubmitted}
			<div class="rounded-xl bg-[var(--funkis-green-subtle)] p-4 text-sm text-[var(--funkis-green)]">
				{$t('correctionThank')}
			</div>
		{:else}
			<button
				onclick={() => showCorrectionForm = !showCorrectionForm}
				class="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] underline decoration-[var(--color-border)] underline-offset-2 hover:text-[var(--color-text-primary)] hover:decoration-[var(--color-text-primary)]"
			>
				<MessageSquareDiff size={16} />
				{$t('suggestCorrection')}
			</button>
			{#if showCorrectionForm}
				<form
					method="POST"
					action="?/correction"
					use:enhance={() => {
						correctionSubmitting = true;
						correctionError = false;
						return async ({ result }) => {
							correctionSubmitting = false;
							if (result.type === 'success') {
								correctionSubmitted = true;
								showCorrectionForm = false;
							} else {
								correctionError = true;
							}
						};
					}}
					class="mt-4 space-y-3 rounded-xl border border-[var(--color-border)] p-4"
					transition:slide={{ duration: 200 }}
				>
					<input type="hidden" name="event_id" value={event.id} />
					<input type="hidden" name="event_title" value={event.title_no || event.title_en} />
					<input type="hidden" name="event_slug" value={event.slug} />
					<div>
						<label for="correction-field" class="mb-1 block text-sm font-medium">
							{$t('correctionWhat')}
						</label>
						<select id="correction-field" name="field" class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
							<option value="date">{$t('date')}</option>
							<option value="price">{$t('priceLabel')}</option>
							<option value="venue">{$t('correctionVenue')}</option>
							<option value="description">{$t('description')}</option>
							<option value="other">{$t('correctionOther')}</option>
						</select>
					</div>
					<div>
						<label for="correction-value" class="mb-1 block text-sm font-medium">
							{$t('correctionValue')} <span class="text-[var(--color-accent)]">*</span>
						</label>
						<input
							id="correction-value"
							name="suggested_value"
							required
							aria-required="true"
							placeholder={$t('correctionValuePlaceholder')}
							class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm placeholder:text-[var(--color-text-muted)]"
						/>
					</div>
					<div>
						<label for="correction-reason" class="mb-1 block text-sm font-medium">
							{$t('correctionReason')}
						</label>
						<textarea id="correction-reason" name="reason" rows="2" class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"></textarea>
					</div>
					<div>
						<label for="correction-email" class="mb-1 block text-sm font-medium">
							{$t('correctionEmail')}
						</label>
						<input
							id="correction-email"
							name="email"
							type="email"
							placeholder={$t('correctionEmailPlaceholder')}
							class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm placeholder:text-[var(--color-text-muted)]"
						/>
					</div>
					{#if correctionError}
						<p class="text-sm text-red-600" role="alert">
							{$t('correctionError')}
						</p>
					{/if}
					<button type="submit" disabled={correctionSubmitting} class="rounded-lg bg-[var(--color-text-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-text-secondary)] disabled:opacity-70">
						{$t('submit')}
					</button>
				</form>
			{/if}
		{/if}
	</section>
</div>
