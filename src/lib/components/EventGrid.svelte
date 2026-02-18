<script lang="ts">
	import type { GaariEvent } from '$lib/types';
	import { lang, t } from '$lib/i18n';
	import { groupEventsByDate, formatDateSectionHeader } from '$lib/utils';
	import EventCard from './EventCard.svelte';

	interface Props {
		events: GaariEvent[];
	}

	let { events }: Props = $props();

	let grouped = $derived.by(() => {
		const groups = groupEventsByDate(events);
		return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
	});

	let cardIndex = 0;
</script>

{#each grouped as [dateKey, dayEvents], groupIdx}
	<section class="mx-auto mb-8 max-w-5xl">
		<div class="mb-4 flex items-center gap-3 border-l-[3px] border-[var(--color-accent)] pl-3">
			<h2 class="text-xl font-semibold text-[var(--color-text-primary)]">
				{formatDateSectionHeader(dateKey + 'T00:00:00', $lang)}
			</h2>
			<span class="text-sm text-[var(--color-text-secondary)]">
				— {dayEvents.length} {$t('events')}
			</span>
			<div class="h-px flex-1 bg-[var(--color-border)]"></div>
		</div>
		<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each dayEvents as event, i}
				<EventCard {event} eager={groupIdx === 0 && i < 4} />
			{/each}
		</ul>
	</section>
{/each}
