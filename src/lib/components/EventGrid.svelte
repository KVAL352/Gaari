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
	<section class="mb-8">
		<div class="mb-5 flex items-center gap-3 border-l-4 border-[#141414] pl-3.5">
			<h2 class="text-lg font-semibold text-[var(--color-text-primary)]" style="font-family: var(--font-display)">
				{formatDateSectionHeader(dateKey + 'T00:00:00', $lang)}
			</h2>
			<span class="text-sm text-[var(--color-text-muted)]">
				{dayEvents.length} {$t('events')}
			</span>
		</div>
		<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each dayEvents as event, i}
				<EventCard {event} eager={groupIdx === 0 && i < 4} />
			{/each}
		</ul>
	</section>
{/each}
