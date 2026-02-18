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
	<Search size={18} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
	<input
		type="search"
		bind:value={query}
		placeholder={$t('searchPlaceholder')}
		class="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white pl-10 pr-4 text-sm shadow-sm transition-shadow focus:border-[var(--color-today)] focus:outline-none focus:ring-2 focus:ring-[var(--color-today)]/20"
	/>
</form>
