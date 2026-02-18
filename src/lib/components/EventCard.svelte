<script lang="ts">
	import type { GaariEvent, BadgeType, Lang } from '$lib/types';
	import { lang, t } from '$lib/i18n';
	import { formatEventDate, formatEventTime, formatPrice, isFreeEvent } from '$lib/utils';
	import StatusBadge from './StatusBadge.svelte';
	import ImagePlaceholder from './ImagePlaceholder.svelte';
	import CalendarDropdown from './CalendarDropdown.svelte';
	import { Send } from 'lucide-svelte';

	interface Props {
		event: GaariEvent;
		eager?: boolean;
	}

	let { event, eager = false }: Props = $props();

	let title = $derived(($lang === 'en' && event.title_en) ? event.title_en : event.title_no);
	let description = $derived(($lang === 'en' && event.description_en) ? event.description_en : event.description_no);
	let dateText = $derived(formatEventDate(event.date_start, $lang));
	let timeText = $derived(formatEventTime(event.date_start, $lang));
	let priceText = $derived(formatPrice(event.price, $lang));
	let eventUrl = $derived(`/${$lang}/events/${event.slug}`);

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

	async function handleShare(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		const shareUrl = window.location.origin + eventUrl;
		const shareData = { title: title, text: `${title} — ${dateText}`, url: shareUrl };

		if (navigator.share) {
			try {
				await navigator.share(shareData);
			} catch {
				// User cancelled share — that's fine
			}
		} else {
			await navigator.clipboard.writeText(shareUrl);
			// Brief visual feedback could be added here
		}
	}

	let calendarData = $derived({
		title: title,
		description: description,
		date_start: event.date_start,
		date_end: event.date_end,
		venue_name: event.venue_name,
		address: event.address
	});
</script>

<li class="group list-none">
	<article class="relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--funkis-shadow-light)] bg-[var(--color-bg-surface)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
		<!-- Full-card link (z-10 covers image + text, action bar sits at z-20) -->
		<a href={eventUrl} class="absolute inset-0 z-10" aria-label={title}></a>

		<div class="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface)]">
			{#if event.image_url && !imgError}
				<img
					src={event.image_url}
					alt=""
					loading={eager ? 'eager' : 'lazy'}
					width="400"
					height="225"
					class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
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
				{title}
			</h3>
			<time datetime={event.date_start} class="tabular-nums mb-1 text-sm text-[var(--color-text-secondary)]">
				{dateText} · {timeText}
			</time>
			<p class="mb-3 text-sm text-[var(--color-text-secondary)]">
				{event.venue_name}, {event.bydel}
			</p>
		</div>
		<div class="relative z-20 flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
			<span class="tabular-nums text-sm font-semibold">{priceText}</span>
			<div class="flex items-center gap-1">
				<CalendarDropdown event={calendarData} compact />
				<button
					onclick={handleShare}
					aria-label="{$lang === 'no' ? 'Del' : 'Share'} {title}"
					class="rounded-full p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-accent-subtle)] hover:text-[var(--color-accent)]"
				>
					<Send size={18} />
				</button>
			</div>
		</div>
	</article>
</li>
