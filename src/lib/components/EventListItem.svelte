<script lang="ts">
	import type { GaariEvent } from '$lib/types';
	import { lang, t } from '$lib/i18n';
	import { formatEventDate, formatEventTime, formatPrice } from '$lib/utils';
	import { Send } from 'lucide-svelte';
	import ImagePlaceholder from './ImagePlaceholder.svelte';
	import CalendarDropdown from './CalendarDropdown.svelte';

	interface Props {
		event: GaariEvent;
	}

	let { event }: Props = $props();

	let title = $derived(($lang === 'en' && event.title_en) ? event.title_en : event.title_no);
	let description = $derived(($lang === 'en' && event.description_en) ? event.description_en : event.description_no);
	let eventUrl = $derived(`/${$lang}/events/${event.slug}`);

	async function handleShare(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		const shareUrl = window.location.origin + eventUrl;
		if (navigator.share) {
			try { await navigator.share({ title, url: shareUrl }); } catch {}
		} else {
			await navigator.clipboard.writeText(shareUrl);
		}
	}

	let calendarData = $derived({
		title, description,
		date_start: event.date_start, date_end: event.date_end,
		venue_name: event.venue_name, address: event.address
	});
</script>

<li class="list-none">
	<article class="relative flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 shadow-sm transition-all hover:shadow-md">
		<a href={eventUrl} class="absolute inset-0 z-0" aria-label={title}></a>

		<!-- Thumbnail -->
		<div class="h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg">
			{#if event.image_url}
				<img src={event.image_url} alt="" class="h-full w-full object-cover" loading="lazy" width="80" height="64" />
			{:else}
				<ImagePlaceholder category={event.category} size={24} />
			{/if}
		</div>

		<!-- Content -->
		<div class="min-w-0 flex-1">
			<h3 class="truncate text-sm font-semibold">{title}</h3>
			<p class="tabular-nums text-xs text-[var(--color-text-secondary)]">
				{formatEventDate(event.date_start, $lang)}{formatEventTime(event.date_start, $lang) ? ` · ${formatEventTime(event.date_start, $lang)}` : ''} · {event.venue_name}
			</p>
		</div>

		<!-- Price + Actions -->
		<span class="tabular-nums flex-shrink-0 text-sm font-semibold">{formatPrice(event.price, $lang)}</span>
		<div class="relative z-10 flex items-center gap-1">
			<CalendarDropdown event={calendarData} compact />
			<button onclick={handleShare} aria-label="{$lang === 'no' ? 'Del' : 'Share'} {title}" class="flex-shrink-0 rounded-full p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]">
				<Send size={16} />
			</button>
		</div>
	</article>
</li>
