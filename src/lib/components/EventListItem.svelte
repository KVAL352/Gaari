<script lang="ts">
	import type { GaariEvent } from '$lib/types';
	import { lang, t } from '$lib/i18n';
	import { formatEventDate, formatEventTime, formatPrice, getCategoryColor, getCategoryIcon } from '$lib/utils';
	import { Heart } from 'lucide-svelte';

	interface Props {
		event: GaariEvent;
	}

	let { event }: Props = $props();

	let title = $derived(($lang === 'en' && event.title_en) ? event.title_en : event.title_no);
</script>

<li class="list-none">
	<article class="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-white p-3 transition-shadow hover:shadow-md">
		<!-- Thumbnail -->
		<div class="h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg">
			{#if event.image_url}
				<img src={event.image_url} alt="" class="h-full w-full object-cover" loading="lazy" width="80" height="64" />
			{:else}
				<div
					class="flex h-full w-full items-center justify-center"
					style="background-color: {getCategoryColor(event.category)}"
				>
					<span class="text-lg" aria-hidden="true">{getCategoryIcon(event.category)}</span>
				</div>
			{/if}
		</div>

		<!-- Content -->
		<div class="min-w-0 flex-1">
			<h3 class="truncate text-sm font-semibold">
				<a href="/{$lang}/events/{event.slug}" class="hover:underline">{title}</a>
			</h3>
			<p class="tabular-nums text-xs text-[var(--color-text-secondary)]">
				{formatEventDate(event.date_start, $lang)} · {formatEventTime(event.date_start, $lang)} · {event.venue_name}
			</p>
		</div>

		<!-- Price + Save -->
		<span class="tabular-nums flex-shrink-0 text-sm font-semibold">{formatPrice(event.price, $lang)}</span>
		<button aria-label="{$t('save')} {title}" class="flex-shrink-0 rounded-full p-1.5 text-[var(--color-text-secondary)] hover:text-red-500">
			<Heart size={16} />
		</button>
	</article>
</li>
