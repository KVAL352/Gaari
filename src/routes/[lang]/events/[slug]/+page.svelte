<script lang="ts">
	import { lang, t } from '$lib/i18n';
	import {
		formatEventDate, formatEventTime, formatPrice, isFreeEvent,
		getCategoryColor, getCategoryIcon, downloadICS
	} from '$lib/utils';
	import type { GaariEvent } from '$lib/types';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import { Calendar, MapPin, Clock, Tag, ExternalLink, ArrowLeft, MessageSquare } from 'lucide-svelte';

	let { data } = $props();
	let event: GaariEvent = $derived(data.event);
	let related: GaariEvent[] = $derived(data.related);

	let title = $derived(($lang === 'en' && event.title_en) ? event.title_en : event.title_no);
	let description = $derived(($lang === 'en' && event.description_en) ? event.description_en : event.description_no);

	let isCancelled = $derived(event.status === 'cancelled');

	let showCorrectionForm = $state(false);
	let correctionField = $state('');
	let correctionValue = $state('');
	let correctionReason = $state('');
	let correctionSubmitted = $state(false);

	function handleCalendarExport() {
		downloadICS({
			title: title,
			description: description,
			date_start: event.date_start,
			date_end: event.date_end,
			venue_name: event.venue_name,
			address: event.address
		});
	}

	function handleCorrectionSubmit(e: SubmitEvent) {
		e.preventDefault();
		correctionSubmitted = true;
		showCorrectionForm = false;
	}
</script>

<svelte:head>
	<title>{title} — Gåri</title>
	<meta name="description" content={description?.slice(0, 160)} />
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
			<img src={event.image_url} alt="" class="h-full w-full object-cover" width="800" height="450" />
		{:else}
			<div
				class="flex h-full w-full items-center justify-center"
				style="background-color: {getCategoryColor(event.category)}"
			>
				<span class="text-6xl" aria-hidden="true">{getCategoryIcon(event.category)}</span>
			</div>
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
			{$t(`cat.${event.category}` as any)}
		</span>
	</div>

	<!-- Title -->
	<h1 class="mb-4 text-3xl font-bold {isCancelled ? 'line-through opacity-60' : ''}">
		{title}
	</h1>

	<!-- Key info grid -->
	<div class="mb-8 grid gap-4 sm:grid-cols-2">
		<div class="flex items-start gap-3 rounded-xl bg-[var(--color-surface)] p-4">
			<Calendar size={20} class="mt-0.5 flex-shrink-0 text-[var(--color-today)]" />
			<div>
				<h2 class="text-sm font-semibold">{$t('when')}</h2>
				<time datetime={event.date_start} class="tabular-nums text-sm text-[var(--color-text-secondary)]">
					{formatEventDate(event.date_start, $lang)}, {formatEventTime(event.date_start, $lang)}
					{#if event.date_end}
						— {formatEventTime(event.date_end, $lang)}
					{/if}
				</time>
			</div>
		</div>
		<div class="flex items-start gap-3 rounded-xl bg-[var(--color-surface)] p-4">
			<MapPin size={20} class="mt-0.5 flex-shrink-0 text-[var(--color-today)]" />
			<div>
				<h2 class="text-sm font-semibold">{$t('where')}</h2>
				<p class="text-sm text-[var(--color-text-secondary)]">{event.venue_name}</p>
				<p class="text-xs text-[var(--color-text-secondary)]">{event.address}, {event.bydel}</p>
			</div>
		</div>
		<div class="flex items-start gap-3 rounded-xl bg-[var(--color-surface)] p-4">
			<Tag size={20} class="mt-0.5 flex-shrink-0 text-[var(--color-today)]" />
			<div>
				<h2 class="text-sm font-semibold">{$t('priceLabel')}</h2>
				<p class="tabular-nums text-sm text-[var(--color-text-secondary)]">{formatPrice(event.price, $lang)}</p>
			</div>
		</div>
		<div class="flex items-start gap-3 rounded-xl bg-[var(--color-surface)] p-4">
			<Clock size={20} class="mt-0.5 flex-shrink-0 text-[var(--color-today)]" />
			<div>
				<h2 class="text-sm font-semibold">{$t('category')}</h2>
				<p class="text-sm text-[var(--color-text-secondary)]">{$t(`cat.${event.category}` as any)}</p>
			</div>
		</div>
	</div>

	<!-- Action buttons -->
	<div class="mb-8 flex flex-wrap gap-3">
		{#if event.ticket_url && !isCancelled}
			<a
				href={event.ticket_url}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-today)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
			>
				<ExternalLink size={16} />
				{$t('buyTickets')}
			</a>
		{/if}
		<button
			onclick={handleCalendarExport}
			class="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-6 py-3 text-sm font-semibold transition-colors hover:bg-[var(--color-surface)]"
		>
			<Calendar size={16} />
			{$t('addToCalendar')}
		</button>
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
			<div class="rounded-xl bg-green-50 p-4 text-sm text-green-800">
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
				<form onsubmit={handleCorrectionSubmit} class="mt-4 space-y-3 rounded-xl border border-[var(--color-border)] p-4">
					<div>
						<label for="correction-field" class="mb-1 block text-sm font-medium">
							{$lang === 'no' ? 'Hva bør endres?' : 'What should be changed?'}
						</label>
						<select id="correction-field" bind:value={correctionField} class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
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
						<input id="correction-value" bind:value={correctionValue} class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
					</div>
					<div>
						<label for="correction-reason" class="mb-1 block text-sm font-medium">
							{$lang === 'no' ? 'Begrunnelse (valgfritt)' : 'Reason (optional)'}
						</label>
						<textarea id="correction-reason" bind:value={correctionReason} rows="2" class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"></textarea>
					</div>
					<button type="submit" class="rounded-lg bg-[var(--color-today)] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
						{$t('submit')}
					</button>
				</form>
			{/if}
		{/if}
	</section>

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
