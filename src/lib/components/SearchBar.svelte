<script lang="ts">
	import { t } from '$lib/i18n';
	import { Search } from 'lucide-svelte';

	interface Props {
		value?: string;
		onSearch?: (query: string) => void;
	}

	let { value = '', onSearch }: Props = $props();

	let query = $state(value);

	// Sync when prop changes externally
	$effect(() => {
		query = value;
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		onSearch?.(query);
	}
</script>

<form onsubmit={handleSubmit} class="relative w-full">
	<label for="event-search" class="sr-only">{$t('searchPlaceholder')}</label>
	<Search size={18} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
	<input
		id="event-search"
		type="search"
		bind:value={query}
		placeholder={$t('searchPlaceholder')}
		class="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white pl-10 pr-4 text-sm shadow-sm transition-shadow focus:border-[#141414] focus:outline-2 focus:outline-[#141414] focus:outline-offset-2"
	/>
</form>
