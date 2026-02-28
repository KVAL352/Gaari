<script lang="ts">
	import type { GaariEvent, BadgeType } from '$lib/types';
	import { lang, t } from '$lib/i18n';
	import { formatEventDate, formatEventTime, formatPrice, isFreeEvent } from '$lib/utils';
	import StatusBadge from './StatusBadge.svelte';
	import ImagePlaceholder from './ImagePlaceholder.svelte';
	import CalendarDropdown from './CalendarDropdown.svelte';
	import { Send } from 'lucide-svelte';
	import { optimizedSrc, optimizedSrcset } from '$lib/image';

	interface Props {
		event: GaariEvent;
		eager?: boolean;
		promoted?: boolean;
	}

	let { event, eager = false, promoted = false }: Props = $props();

	let title = $derived(($lang === 'en' && event.title_en) ? event.title_en : event.title_no);
	let description = $derived(($lang === 'en' && event.description_en) ? event.description_en : event.description_no);
	let dateText = $derived(formatEventDate(event.date_start, $lang));
	let timeText = $derived(formatEventTime(event.date_start, $lang));
	let priceText = $derived(formatPrice(event.price, $lang));
	let eventUrl = $derived(`/${$lang}/events/${event.slug}`);

	// Compute today string once per component (not per render), using Oslo timezone
	const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });

	let badges = $derived.by(() => {
		const b: BadgeType[] = [];
		if (event.status === 'cancelled') {
			b.push('cancelled');
			return b;
		}
		// String comparison — no Date allocations per card
		if (event.date_start.slice(0, 10) === todayStr) {
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

	function trackPromotedClick() {
		if (promoted && typeof window !== 'undefined' && 'plausible' in window) {
			(window as unknown as { plausible: (name: string, opts?: { props: Record<string, string> }) => void }).plausible('promoted-click', {
				props: { venue: event.venue_name, slug: event.slug }
			});
		}
	}
</script>

<li class="group list-none">
	<article class="relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer">
		<!-- Full-card link (z-10 covers image + text, action bar sits at z-20) -->
		<a href={eventUrl} onclick={trackPromotedClick} class="absolute inset-0 z-10" aria-label={title}></a>

		<div class="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface)]">
			{#if event.image_url && !imgError}
				<img
					src={optimizedSrc(event.image_url, 400)}
					srcset={optimizedSrcset(event.image_url, [400, 600, 800])}
					sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 2.5rem), 400px"
					alt={title}
					loading={eager ? 'eager' : 'lazy'}
					fetchpriority={eager ? 'high' : 'auto'}
					decoding={eager ? 'sync' : 'async'}
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
					{#each badges as badge (badge)}
						<StatusBadge type={badge} />
					{/each}
				</div>
			{/if}
			{#if promoted}
				<span class="badge-fremhevet absolute right-2 top-2 rounded-full border border-[var(--color-primary)] bg-[var(--color-bg-surface)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--color-text-primary)]">
					{$lang === 'no' ? 'Fremhevet' : 'Featured'}
				</span>
			{/if}
		</div>
		<div class="flex flex-1 flex-col p-4">
			<h3 class="mb-1 line-clamp-2 text-lg font-semibold leading-tight">
				{title}
			</h3>
			<time datetime={event.date_start} class="tabular-nums mb-1 text-sm text-[var(--color-text-secondary)]">
				{dateText}{timeText ? ` · ${timeText}` : ''}
			</time>
			<p class="mb-2 text-sm text-[var(--color-text-secondary)]">
				{event.venue_name}, {event.bydel}
			</p>
			<span class="mt-auto text-sm font-medium text-[var(--color-primary)] group-hover:underline">{$t('readMore')} &rarr;</span>
		</div>
		<div class="relative z-20 pointer-events-none border-t border-[var(--color-border)] px-4 py-3">
			<div class="flex items-center justify-between">
			<span class="tabular-nums text-sm font-semibold">{priceText}</span>
			<div class="pointer-events-auto flex items-center gap-1">
				<CalendarDropdown event={calendarData} compact />
				<button
					onclick={handleShare}
					aria-label="{$lang === 'no' ? 'Del' : 'Share'} {title}"
					class="rounded-full p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
				>
					<Send size={18} />
				</button>
			</div>
			</div>
			{#if event.price !== null && event.price !== undefined && event.price !== ''}
				<p class="mt-1 text-[0.625rem] italic text-[var(--color-text-muted)]">{$t('priceDisclaimer')}</p>
			{/if}
		</div>
	</article>
</li>
