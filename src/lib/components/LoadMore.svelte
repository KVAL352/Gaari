<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		shown: number;
		total: number;
		onLoadMore?: () => void;
	}

	let { shown, total, onLoadMore }: Props = $props();
</script>

{#if shown < total}
	<div class="mt-8 flex flex-col items-center gap-3 py-4">
		<p class="tabular-nums text-sm text-[var(--color-text-secondary)]">
			{$t('showingOf')} {shown} {$t('of')} {total} {$t('events')}
		</p>
		<button
			onclick={onLoadMore}
			class="rounded-xl border border-[var(--color-accent)] bg-white px-8 py-3 text-sm font-semibold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)] hover:text-white"
		>
			{$t('loadMore')}
		</button>
	</div>
{/if}
