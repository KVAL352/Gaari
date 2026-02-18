<script lang="ts">
	import type { GaariEvent, BadgeType, Lang } from '$lib/types';
	import { lang, t } from '$lib/i18n';
	import { formatEventDate, formatEventTime, formatPrice, isFreeEvent, getDateKey } from '$lib/utils';
	import StatusBadge from './StatusBadge.svelte';
	import ImagePlaceholder from './ImagePlaceholder.svelte';
	import { Heart } from 'lucide-svelte';

	interface Props {
		event: GaariEvent;
		eager?: boolean;
	}

	let { event, eager = false }: Props = $props();

	let title = $derived(($lang === 'en' && event.title_en) ? event.title_en : event.title_no);
	let dateText = $derived(formatEventDate(event.date_start, $lang));
	let timeText = $derived(formatEventTime(event.date_start, $lang));
	let priceText = $derived(formatPrice(event.price, $lang));

	let badges = $derived.by(() => {
		const b: BadgeType[] = [];
		if (event.status === 'cancelled') {
			b.push('cancelled');
			return b;
		}
		const now = new Date();
		const eventDay = new Date(event.date_start);
		if (
			eventDay.getFullYear() === now.getFullYear() &&
			eventDay.getMonth() === now.getMonth() &&
			eventDay.getDate() === now.getDate()
		) {
			b.push('today');
		}
		if (isFreeEvent(event.price)) {
			b.push('free');
		}
		return b;
	});

	let imgError = $state(false);
</script>

<li class="group list-none">
	<article class="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-white transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-lg">
		<div class="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface)]">
			{#if event.image_url && !imgError}
				<img
					src={event.image_url}
					alt=""
					loading={eager ? 'eager' : 'lazy'}
					width="400"
					height="225"
					class="h-full w-full object-cover"
					onerror={() => imgError = true}
				/>
			{:else}
				<ImagePlaceholder category={event.category} />
			{/if}
			{#if badges.length > 0}
				<div class="absolute left-2 top-2 flex flex-col gap-1">
					{#each badges as badge}
						<StatusBadge type={badge} />
					{/each}
				</div>
			{/if}
		</div>
		<div class="flex flex-1 flex-col p-4">
			<h3 class="mb-1 line-clamp-2 text-lg font-semibold leading-tight">
				<a href="/{$lang}/events/{event.slug}" class="hover:underline focus:underline focus:outline-none">
					{title}
				</a>
			</h3>
			<time datetime={event.date_start} class="tabular-nums mb-1 text-sm text-[var(--color-text-secondary)]">
				{dateText} · {timeText}
			</time>
			<p class="mb-3 text-sm text-[var(--color-text-secondary)]">
				{event.venue_name}, {event.bydel}
			</p>
		</div>
		<div class="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
			<span class="tabular-nums text-sm font-semibold">{priceText}</span>
			<button
				aria-label="{$t('save')} {title}"
				class="rounded-full p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] hover:text-red-500"
			>
				<Heart size={18} />
			</button>
		</div>
	</article>
</li>
