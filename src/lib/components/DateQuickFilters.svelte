<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		active?: string;
		onSelect?: (when: string) => void;
	}

	let { active = '', onSelect }: Props = $props();

	const filters = [
		{ key: 'today', label: 'today' },
		{ key: 'tomorrow', label: 'tomorrow' },
		{ key: 'weekend', label: 'thisWeekend' },
		{ key: 'week', label: 'thisWeek' }
	] as const;
</script>

<div class="flex flex-wrap gap-2">
	{#each filters as f}
		<button
			class="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors
				{active === f.key
					? 'border-[#141414] bg-[#141414] text-white'
					: 'border-[var(--color-border)] bg-white text-[var(--color-text-primary)] hover:border-[#141414] hover:text-[#141414]'}"
			onclick={() => onSelect?.(active === f.key ? '' : f.key)}
		>
			{$t(f.label)}
		</button>
	{/each}
</div>
