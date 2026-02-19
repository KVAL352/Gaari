<script lang="ts">
	import { t } from '$lib/i18n';
	import DateQuickFilters from './DateQuickFilters.svelte';

	interface Props {
		activeWhen?: string;
		onDateSelect?: (when: string) => void;
	}

	let { activeWhen = '', onDateSelect }: Props = $props();
</script>

<section class="border-b border-[var(--color-border)] bg-white px-4 pb-8 pt-12">
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="mb-6 text-[clamp(2rem,4vw,3.25rem)] font-bold uppercase leading-[1.05] tracking-[-0.03em]" style="font-family: var(--font-display)">
			{$t('tagline')}
		</h1>
		<DateQuickFilters active={activeWhen} onSelect={onDateSelect} />
	</div>
</section>
