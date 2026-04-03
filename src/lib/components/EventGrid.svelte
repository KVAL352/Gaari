<script lang="ts">
	import type { GaariEvent } from '$lib/types';
	import { lang, t } from '$lib/i18n';
	import { groupEventsByDate, formatDateSectionHeader } from '$lib/utils';
	import EventCard from './EventCard.svelte';
	import NewsletterInline from './NewsletterInline.svelte';

	interface Props {
		events: GaariEvent[];
		promotedEventIds?: string[];
		/** Show inline newsletter CTA between date groups (default: false) */
		showNewsletterCta?: boolean;
		onHideEvent?: (id: string) => void;
		onHideVenue?: (venue: string) => void;
		onHideCategory?: (category: string) => void;
	}

	let { events, promotedEventIds = [], showNewsletterCta = false, onHideEvent, onHideVenue, onHideCategory }: Props = $props();

	let grouped = $derived.by(() => {
		const groups = groupEventsByDate(events);
		return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
	});

	let canHide = $derived(!!onHideEvent);
</script>

{#each grouped as [dateKey, dayEvents], groupIdx (dateKey)}
	{#if showNewsletterCta && groupIdx === 3}
		<NewsletterInline />
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
			{#each dayEvents as event, i (event.id)}
				<EventCard
					{event}
					eager={groupIdx === 0 && i < 4}
					promoted={promotedEventIds.includes(event.id)}
					onHideEvent={canHide ? onHideEvent : undefined}
					onHideVenue={canHide ? onHideVenue : undefined}
					onHideCategory={canHide ? onHideCategory : undefined}
				/>
			{/each}
		</ul>
	</section>
{/each}
