<script lang="ts">
	import type { GaariEvent } from '$lib/types';
	import { lang, t } from '$lib/i18n';
	import { groupEventsByDate, formatDateSectionHeader } from '$lib/utils';
	import EventCard from './EventCard.svelte';
	import NewsletterInline from './NewsletterInline.svelte';
	import NewsletterSignupCard from './NewsletterSignupCard.svelte';

	interface Props {
		events: GaariEvent[];
		promotedEventIds?: string[];
		/** Show inline newsletter CTA between date groups (default: false) */
		showNewsletterCta?: boolean;
		/** Insert newsletter signup card as a grid item in the first day group (default: false) */
		showSignupCard?: boolean;
		/** Show student price badges on venues with known student pricing */
		studentContext?: boolean;
		/** Date range for multi-day event expansion (YYYY-MM-DD). Events are expanded across each day within this window. */
		rangeFrom?: string;
		rangeTo?: string;
		/** Maximum number of day-groups to show. Pagination reveals complete days at a time. */
		maxDays?: number;
		/** Maximum total cards across all day-groups. When set, trims the last group to fit. */
		maxEvents?: number;
		onHideEvent?: (id: string) => void;
		onHideVenue?: (venue: string) => void;
		onHideCategory?: (category: string) => void;
	}

	let { events, promotedEventIds = [], showNewsletterCta = false, showSignupCard = false, studentContext = false, rangeFrom, rangeTo, maxDays, maxEvents, onHideEvent, onHideVenue, onHideCategory }: Props = $props();

	// Global position (0-indexed) at which to inject the signup card.
	// 7 = appears as the 8th card — after users have scrolled past a few events
	// (usually into the second date group), but before the LoadMore button.
	const SIGNUP_CARD_POSITION = 7;

	// Cumulative event counts at the start of each date group, for computing
	// global card index during iteration.
	let cumulativeCounts = $derived.by(() => {
		const counts: number[] = [0];
		let sum = 0;
		for (const [, dayEvents] of grouped) {
			sum += dayEvents.length;
			counts.push(sum);
		}
		return counts;
	});

	let promotedIdSet = $derived(new Set(promotedEventIds));

	let promotedEvents = $derived(
		promotedIdSet.size > 0
			? events.filter(e => promotedIdSet.has(e.id))
			: []
	);

	let grouped = $derived.by(() => {
		const regularEvents = promotedIdSet.size > 0
			? events.filter(e => !promotedIdSet.has(e.id))
			: events;
		const groups = groupEventsByDate(regularEvents, rangeFrom, rangeTo);
		let sorted = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
		if (maxDays != null) sorted = sorted.slice(0, maxDays);

		// Cap total cards: trim trailing days/cards to fit maxEvents
		if (maxEvents != null) {
			const trimmed: typeof sorted = [];
			let remaining = maxEvents;
			for (const [key, dayEvents] of sorted) {
				if (remaining <= 0) break;
				if (dayEvents.length <= remaining) {
					trimmed.push([key, dayEvents]);
					remaining -= dayEvents.length;
				} else {
					trimmed.push([key, dayEvents.slice(0, remaining)]);
					remaining = 0;
				}
			}
			sorted = trimmed;
		}
		return sorted;
	});

	let canHide = $derived(!!onHideEvent);
</script>

{#if promotedEvents.length > 0}
	<section class="mb-8">
		<div class="mb-2 flex items-center gap-3 border-l-4 border-[var(--color-accent)] pl-3.5 md:mb-5">
			<h2 class="text-lg font-semibold text-[var(--color-text-primary)]" style="font-family: var(--font-display)">
				{$lang === 'no' ? 'Fremhevet' : 'Featured'}
			</h2>
		</div>
		<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each promotedEvents as event (event.id)}
				<EventCard
					{event}
					eager={true}
					promoted={true}
					{studentContext}
					onHideEvent={canHide ? onHideEvent : undefined}
					onHideVenue={canHide ? onHideVenue : undefined}
					onHideCategory={canHide ? onHideCategory : undefined}
				/>
			{/each}
		</ul>
	</section>
{/if}

{#each grouped as [dateKey, dayEvents], groupIdx (dateKey)}
	{#if showNewsletterCta && groupIdx === 3}
		<NewsletterInline location="eventgrid-between-days" />
	{/if}
	<section class="mb-8">
		<div class="mb-2 flex items-center gap-3 border-l-4 border-[var(--color-text-primary)] pl-3.5 md:mb-5">
			<h2 class="text-lg font-semibold text-[var(--color-text-primary)]" style="font-family: var(--font-display)">
				{formatDateSectionHeader(dateKey + 'T00:00:00', $lang)}
			</h2>
			<span class="text-sm text-[var(--color-text-muted)]">
				{dayEvents.length} {$t('events')}
			</span>
		</div>
		<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each dayEvents as event, i (dateKey + ':' + event.id)}
				{#if showSignupCard && cumulativeCounts[groupIdx] + i === SIGNUP_CARD_POSITION}
					<NewsletterSignupCard sampleEvents={events.filter(e => !!e.image_url).slice(0, 5)} />
				{/if}
				<EventCard
					{event}
					eager={groupIdx === 0 && i < 4}
					promoted={promotedIdSet.has(event.id)}
					{studentContext}
					onHideEvent={canHide ? onHideEvent : undefined}
					onHideVenue={canHide ? onHideVenue : undefined}
					onHideCategory={canHide ? onHideCategory : undefined}
				/>
			{/each}
			{#if showSignupCard && groupIdx === grouped.length - 1 && cumulativeCounts[grouped.length] <= SIGNUP_CARD_POSITION && cumulativeCounts[grouped.length] > 0}
				<NewsletterSignupCard sampleEvents={events.filter(e => !!e.image_url).slice(0, 5)} />
			{/if}
		</ul>
	</section>
{/each}
