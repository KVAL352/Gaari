<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { lang, t } from '$lib/i18n';
	import {
		formatEventDate, formatEventTime, formatPrice, isFreeEvent, buildOutboundUrl
	} from '$lib/utils';
	import type { GaariEvent } from '$lib/types';
	import { generateEventJsonLd, generateBreadcrumbJsonLd, getCanonicalUrl } from '$lib/seo';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import ImagePlaceholder from '$lib/components/ImagePlaceholder.svelte';
	import CalendarDropdown from '$lib/components/CalendarDropdown.svelte';
	import { Calendar, MapPin, Clock, Tag, ExternalLink, ArrowLeft, MessageSquare } from 'lucide-svelte';
	import { optimizedSrc, optimizedSrcset } from '$lib/image';
	import NewsletterCTA from '$lib/components/NewsletterCTA.svelte';

	let { data } = $props();
	let event: GaariEvent = $derived(data.event);
	let related: GaariEvent[] = $derived(data.related);

	let title = $derived(($lang === 'en' && event.title_en) ? event.title_en : event.title_no);
	let description = $derived(($lang === 'en' && event.description_en) ? event.description_en : event.description_no);

	let isCancelled = $derived(event.status === 'cancelled');

	let showCorrectionForm = $state(false);
	let correctionSubmitted = $state(false);
	let correctionSubmitting = $state(false);
	let correctionError = $state(false);

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/events/${event.slug}`));
	let eventJsonLd = $derived(generateEventJsonLd(event, $lang, canonicalUrl));
	let breadcrumbJsonLd = $derived(generateBreadcrumbJsonLd([
		{ name: 'Gåri', url: getCanonicalUrl(`/${$lang}`) },
		{ name: title }
	]));

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
	<title>{title} — Gåri</title>
	<meta name="description" content={description?.slice(0, 160)} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content={`${title} — Gåri`} />
	<meta property="og:description" content={description?.slice(0, 160)} />
	<meta property="og:type" content="event" />
	<meta property="og:image" content={`${$page.url.origin}/og/${event.slug}.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={`${title} — Gåri`} />
	<meta name="twitter:description" content={description?.slice(0, 160)} />
	<meta name="twitter:image" content={`${$page.url.origin}/og/${event.slug}.png`} />
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + eventJsonLd + '</scr' + 'ipt>'}
	{@html '<script type="application/ld+json">' + breadcrumbJsonLd + '</scr' + 'ipt>'}
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-6">
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
				srcset={optimizedSrcset(event.image_url, [600, 800, 1200])}
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
					{formatEventDate(event.date_start, $lang)}{formatEventTime(event.date_start, $lang) ? `, ${formatEventTime(event.date_start, $lang)}` : ''}{#if event.date_end && formatEventTime(event.date_end, $lang)} — {formatEventTime(event.date_end, $lang)}{/if}
				</time>
			</div>
		</div>
		<div class="flex items-start gap-3 rounded-xl bg-[var(--color-surface)] p-4">
			<MapPin size={20} class="mt-0.5 flex-shrink-0 text-[var(--color-text-secondary)]" />
			<div>
				<p class="text-sm font-semibold">{$t('where')}</p>
				<p class="text-sm text-[var(--color-text-secondary)]">{event.venue_name}</p>
				<p class="text-xs text-[var(--color-text-secondary)]">{event.address}, {event.bydel}</p>
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

	<!-- Action buttons -->
	<div class="mb-8 flex flex-wrap gap-3">
		{#if event.ticket_url && !isCancelled}
			<a
				href={buildOutboundUrl(event.ticket_url, 'event_detail', event.venue_name, event.slug)}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
			>
				<ExternalLink size={16} />
				{isFreeEvent(event.price) ? ($lang === 'no' ? 'Mer info' : 'More info') : $t('buyTickets')}
			</a>
		{/if}
		<CalendarDropdown event={calendarData} />
	</div>

	<!-- Description -->
	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">{$t('description')}</h2>
		<div class="prose max-w-none text-[var(--color-text-secondary)]">
			<p class="whitespace-pre-line">{description}</p>
		</div>
	</section>

	<!-- Suggest correction -->
	<section class="mb-12">
		{#if correctionSubmitted}
			<div class="rounded-xl bg-[var(--funkis-green-subtle)] p-4 text-sm text-[var(--funkis-green)]">
				Takk for forslaget! / Thank you for your suggestion!
			</div>
		{:else}
			<button
				onclick={() => showCorrectionForm = !showCorrectionForm}
				class="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
			>
				<MessageSquare size={16} />
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
				>
					<input type="hidden" name="event_id" value={event.id} />
					<input type="hidden" name="event_title" value={event.title_no || event.title_en} />
					<input type="hidden" name="event_slug" value={event.slug} />
					<div>
						<label for="correction-field" class="mb-1 block text-sm font-medium">
							{$lang === 'no' ? 'Hva bør endres?' : 'What should be changed?'}
						</label>
						<select id="correction-field" name="field" class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
							<option value="date">{$t('date')}</option>
							<option value="price">{$t('priceLabel')}</option>
							<option value="venue">{$lang === 'no' ? 'Sted' : 'Venue'}</option>
							<option value="description">{$t('description')}</option>
							<option value="other">{$lang === 'no' ? 'Annet' : 'Other'}</option>
						</select>
					</div>
					<div>
						<label for="correction-value" class="mb-1 block text-sm font-medium">
							{$lang === 'no' ? 'Riktig verdi' : 'Correct value'}
						</label>
						<input id="correction-value" name="suggested_value" class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
					</div>
					<div>
						<label for="correction-reason" class="mb-1 block text-sm font-medium">
							{$lang === 'no' ? 'Begrunnelse (valgfritt)' : 'Reason (optional)'}
						</label>
						<textarea id="correction-reason" name="reason" rows="2" class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"></textarea>
					</div>
					{#if correctionError}
						<p class="text-sm text-red-600" role="alert">
							{$lang === 'no' ? 'Noe gikk galt. Prøv igjen.' : 'Something went wrong. Please try again.'}
						</p>
					{/if}
					<button type="submit" disabled={correctionSubmitting} class="rounded-lg bg-[var(--color-text-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-text-secondary)] disabled:opacity-70">
						{$t('submit')}
					</button>
				</form>
			{/if}
		{/if}
	</section>

	<!-- Newsletter CTA -->
	<div class="mb-8">
		<NewsletterCTA id="event-detail" variant="card" />
	</div>

	<!-- Related events -->
	{#if related.length > 0}
		<section>
			<h2 class="mb-4 text-xl font-semibold">{$t('relatedEvents')}</h2>
			<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each related as event (event.id)}
					<EventCard {event} />
				{/each}
			</ul>
		</section>
	{/if}
</div>
