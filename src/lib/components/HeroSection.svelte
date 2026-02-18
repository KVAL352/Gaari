<script lang="ts">
	import { t } from '$lib/i18n';
	import SearchBar from './SearchBar.svelte';
	import DateQuickFilters from './DateQuickFilters.svelte';

	interface Props {
		activeWhen?: string;
		searchQuery?: string;
		onSearch?: (query: string) => void;
		onDateSelect?: (when: string) => void;
	}

	let { activeWhen = '', searchQuery = '', onSearch, onDateSelect }: Props = $props();
</script>

<section class="bg-[var(--color-surface)] px-4 pb-8 pt-12">
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="mb-6 text-3xl font-semibold tracking-tight sm:text-4xl">
			{$t('tagline')}
		</h1>
		<div class="mb-6">
			<SearchBar value={searchQuery} {onSearch} />
		</div>
		<DateQuickFilters active={activeWhen} onSelect={onDateSelect} />
	</div>
</section>
