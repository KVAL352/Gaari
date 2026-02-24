<script lang="ts">
	import { t } from '$lib/i18n';
	import { Search } from 'lucide-svelte';
	import type { GaariEvent } from '$lib/types';
	import EventCard from './EventCard.svelte';

	interface Props {
		popularEvents?: GaariEvent[];
		onClearFilters?: () => void;
		onBrowseAll?: () => void;
	}

	let { popularEvents = [], onClearFilters, onBrowseAll }: Props = $props();
</script>

<div class="flex flex-col items-center px-4 py-16 text-center">
	<Search size={48} class="mb-4 text-[var(--color-text-secondary)]" />
	<h2 class="mb-2 text-xl font-semibold">{$t('noResults')}</h2>
	<p class="mb-6 max-w-md text-[var(--color-text-secondary)]">
		{$t('noResultsMessage')}
	</p>
	<div class="flex gap-3">
		<button
			onclick={onClearFilters}
			class="rounded-xl border border-[var(--color-border)] px-6 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-surface)]"
		>
			{$t('clearFilters')}
		</button>
		<button
			onclick={onBrowseAll}
			class="rounded-xl bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
		>
			{$t('browseAll')}
		</button>
	</div>

	{#if popularEvents.length > 0}
		<div class="mt-12 w-full max-w-5xl">
			<h3 class="mb-4 text-lg font-semibold">{$t('popularNow')}</h3>
			<ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each popularEvents.slice(0, 3) as event (event.id)}
					<EventCard {event} />
				{/each}
			</ul>
		</div>
	{/if}
</div>
