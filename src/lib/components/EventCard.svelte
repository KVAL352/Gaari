<script lang="ts">
	import type { GaariEvent, BadgeType } from '$lib/types';
	import { lang, t } from '$lib/i18n';
	import { formatEventDate, formatEventTime, formatPrice, isFreeEvent, hasStudentPrice } from '$lib/utils';
	import StatusBadge from './StatusBadge.svelte';
	import ImagePlaceholder from './ImagePlaceholder.svelte';
	import CalendarDropdown from './CalendarDropdown.svelte';
	import { Send, X } from 'lucide-svelte';
	import { optimizedSrc, optimizedSrcset } from '$lib/image';

	interface Props {
		event: GaariEvent;
		eager?: boolean;
		promoted?: boolean;
		placementId?: string | null;
		studentContext?: boolean;
		onHideEvent?: (id: string) => void;
		onHideVenue?: (venue: string) => void;
		onHideCategory?: (category: string) => void;
	}

	let { event, eager = false, promoted = false, placementId = null, studentContext = false, onHideEvent, onHideVenue, onHideCategory }: Props = $props();

	let showStudentPriceBadge = $derived(studentContext && hasStudentPrice(event.venue_name));

	let title = $derived(($lang === 'en' && event.title_en) ? event.title_en : event.title_no);
	let description = $derived(($lang === 'en' && event.description_en) ? event.description_en : event.description_no);
	let dateText = $derived(formatEventDate(event.date_start, $lang, event.date_end));
	let timeText = $derived(formatEventTime(event.date_start, $lang));
	let priceText = $derived(formatPrice(event.price, $lang));
	let eventUrl = $derived(`/${$lang}/events/${event.slug}`);
	let categoryLabel = $derived($t(`cat.${event.category}` as any));

	// Compute today string once per component (not per render), using Oslo timezone
	const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });

	let badges = $derived.by(() => {
		const b: BadgeType[] = [];
		if (event.status === 'cancelled') {
			b.push('cancelled');
			return b;
		}
		if (event.is_sold_out) {
			b.push('soldout');
			return b;
		}
		// String comparison — no Date allocations per card
		if (event.date_start.slice(0, 10) === todayStr) {
			b.push('today');
		}
		if (isFreeEvent(event.price)) {
			b.push('free');
		}
		if (showStudentPriceBadge) {
			b.push('studentprice');
		}
		return b;
	});

	let imgError = $state(false);
	// Reset imgError when the image URL changes (component reuse across navigations)
	let trackedImg = $derived(event.image_url);
	$effect(() => {
		void trackedImg;
		imgError = false;
	});
	let showDismissMenu = $state(false);

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
		if (typeof window === 'undefined') return;
		if (promoted && window.umami) {
			umami.track('promoted-click', { venue: event.venue_name, slug: event.slug });
		}
		// Server-side attribution: log card click with context so venue reports can
		// split Fremhevet clicks from organic clicks. Fire-and-forget, keepalive so
		// it survives the navigation.
		const context = promoted ? 'promoted' : 'organic';
		fetch('/api/track-click', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			keepalive: true,
			body: JSON.stringify({
				venue_name: event.venue_name,
				event_slug: event.slug,
				source_page: window.location.pathname,
				placement_context: context,
				placement_id: placementId
			})
		}).catch(() => { /* fail silently */ });
	}

	function toggleDismissMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		showDismissMenu = !showDismissMenu;
	}

	function dismissEvent(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		showDismissMenu = false;
		onHideEvent?.(event.id);
	}

	function dismissVenue(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		showDismissMenu = false;
		onHideVenue?.(event.venue_name);
	}

	function dismissCategory(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		showDismissMenu = false;
		onHideCategory?.(event.category);
	}

	function handleClickOutside() {
		if (showDismissMenu) {
			showDismissMenu = false;
		}
	}

	let canHide = $derived(!!onHideEvent);
</script>

<svelte:window onclick={handleClickOutside} />

<li class="group list-none h-full">
	<article class="card relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-sm cursor-pointer">
		<!-- Full-card link (z-10 covers image + text, action bar sits at z-20) -->
		<a href={eventUrl} onclick={trackPromotedClick} class="absolute inset-0 z-10 no-underline" aria-label={title}></a>

		<div class="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface)]">
			{#if event.image_url && !imgError}
				<img
					src={optimizedSrc(event.image_url, 400)}
					srcset={optimizedSrcset(event.image_url, [400, 600])}
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
			{#if canHide}
				<button
					onclick={toggleDismissMenu}
					aria-label={$lang === 'no' ? 'Skjul' : 'Hide'}
					class="hide-btn absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-bg-surface)]/80 text-[var(--color-text-muted)] shadow-sm backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]"
				>
					<X size={14} strokeWidth={2.5} />
				</button>
				{#if showDismissMenu}
					<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
					<div
						class="dismiss-menu absolute right-2 top-10 z-30 min-w-52 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)]"
						onclick={(e: MouseEvent) => e.stopPropagation()}
					>
						<button onclick={dismissEvent} class="dismiss-option">
							{$lang === 'no' ? 'Skjul dette arrangementet' : 'Hide this event'}
						</button>
						<button onclick={dismissVenue} class="dismiss-option">
							{$lang === 'no' ? `Skjul alle fra ${event.venue_name}` : `Hide all from ${event.venue_name}`}
						</button>
						<button onclick={dismissCategory} class="dismiss-option">
							{$lang === 'no' ? `Skjul ${categoryLabel}` : `Hide ${categoryLabel}`}
						</button>
					</div>
				{/if}
			{/if}
			{#if promoted}
				<span class="badge-fremhevet absolute right-2 {canHide ? 'top-10' : 'top-2'} rounded-full border border-[var(--color-primary)] bg-[var(--color-bg-surface)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--color-text-primary)]">
					{$lang === 'no' ? 'Fremhevet' : 'Featured'}
				</span>
			{/if}
		</div>
		<div class="card-body flex flex-1 flex-col p-4">
			<h3 class="card-title mb-1 line-clamp-2 text-lg font-semibold leading-tight">
				{title}
			</h3>
			<time datetime={event.date_start} class="tabular-nums mb-1 text-sm text-[var(--color-text-secondary)]">
				{dateText}{timeText ? ` · ${timeText}` : ''}
			</time>
			<p class="mb-1 text-sm text-[var(--color-text-secondary)]">
				{event.venue_name}, {event.bydel}
			</p>
			<p class="card-desc mb-2 line-clamp-1 text-xs text-[var(--color-text-muted)]">{description || '\u00A0'}</p>
			<span class="read-more-btn" aria-hidden="true">{$t('readMore')} →</span>
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

<style>
	.card {
		transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
	}

	.card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
		border-color: var(--color-accent);
	}

	/* Reserve 2 lines for title so cards align even with short titles */
	.card-title {
		min-height: 2.6em; /* ~2 lines at leading-tight */
	}

	.read-more-btn {
		margin-top: auto;
		display: inline-flex;
		align-items: center;
		align-self: flex-start;
		padding: 0.3rem 0.875rem;
		border: 1.5px solid var(--color-accent);
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-accent);
		background: transparent;
		text-decoration: none;
		transition: background-color 0.15s, color 0.15s;
	}

	.card:hover .read-more-btn {
		background: var(--color-accent);
		color: white;
		text-decoration: none;
	}

	.dismiss-menu {
		animation: dismiss-menu-in 0.15s ease;
	}

	@keyframes dismiss-menu-in {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.dismiss-option {
		display: block;
		width: 100%;
		padding: 0.625rem 0.875rem;
		text-align: left;
		font-size: 0.8125rem;
		font-family: var(--font-body);
		color: var(--color-text-secondary);
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border-subtle);
		cursor: pointer;
		transition: background-color 0.1s, color 0.1s;
	}

	.dismiss-option:last-child {
		border-bottom: none;
	}

	.dismiss-option:hover {
		background: var(--color-surface);
		color: var(--color-text-primary);
	}

	/* Show dismiss button on touch devices where hover is unavailable */
	@media (hover: none) {
		.hide-btn {
			opacity: 0.7;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
		.dismiss-menu {
			animation: none;
		}
	}
</style>
