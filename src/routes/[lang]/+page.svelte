<script lang="ts">
	import { page } from '$app/stores';
	import { replaceState, beforeNavigate, afterNavigate } from '$app/navigation';
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import { lang, t } from '$lib/i18n';
	import { isFreeEvent } from '$lib/utils';
	import { hideEvent, hideVenue, hideCategory, isHidden, unhideAll, hiddenCount, hiddenSummary } from '$lib/hidden-events.svelte';
	import { getOsloNow, toOsloDateStr, isSameDay, getWeekendDates, matchesTimeOfDay, addDays, getEndOfWeekDateStr, buildQueryString } from '$lib/event-filters';
	import type { Bydel, GaariEvent } from '$lib/types';
	import { generateWebSiteJsonLd, computeCanonical } from '$lib/seo';
	import { optimizedSrc, optimizedSrcset } from '$lib/image';
	import { ArrowRight } from 'lucide-svelte';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import EventDiscovery from '$lib/components/EventDiscovery.svelte';

	import EventGrid from '$lib/components/EventGrid.svelte';
	import LoadMore from '$lib/components/LoadMore.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data } = $props();
	let allEvents: GaariEvent[] = $derived(data.events);

	const PAGE_SIZE = 12;

	// Read filters from URL
	let category = $derived($page.url.searchParams.get('category') || '');
	let bydel = $derived(($page.url.searchParams.get('bydel') || '') as Bydel | '');
	let price = $derived($page.url.searchParams.get('price') || '');
	let audience = $derived($page.url.searchParams.get('audience') || '');
	let when = $derived($page.url.searchParams.get('when') || '');
	let time = $derived($page.url.searchParams.get('time') || '');
	let q = $derived($page.url.searchParams.get('q') || '');
	let pageNum = $derived(Number($page.url.searchParams.get('page') || '1'));

	// Filter events
	let filteredEvents = $derived.by(() => {
		let events = allEvents.filter(e => e.status !== 'cancelled' && e.status !== 'expired');

		// When filter (date)
		if (when) {
			const now = getOsloNow();
			const todayStr = toOsloDateStr(now);

			if (when === 'today') {
				events = events.filter(e => isSameDay(e.date_start, todayStr));
			} else if (when === 'tomorrow') {
				const tmrwStr = toOsloDateStr(addDays(now, 1));
				events = events.filter(e => isSameDay(e.date_start, tmrwStr));
			} else if (when === 'weekend') {
				const { start, end } = getWeekendDates(now);
				events = events.filter(e => {
					const d = e.date_start.slice(0, 10);
					return d >= start && d <= end;
				});
			} else if (when === 'week') {
				const endStr = getEndOfWeekDateStr(now);
				events = events.filter(e => {
					const d = e.date_start.slice(0, 10);
					return d >= todayStr && d <= endStr;
				});
			} else if (when.includes(':')) {
				// Range: YYYY-MM-DD:YYYY-MM-DD
				const [from, to] = when.split(':');
				events = events.filter(e => {
					const d = e.date_start.slice(0, 10);
					return d >= from && d <= to;
				});
			} else {
				// Single date: YYYY-MM-DD
				events = events.filter(e => e.date_start.startsWith(when));
			}
		}

		// Time of day filter
		if (time) {
			const times = time.split(',');
			events = events.filter(e => matchesTimeOfDay(e.date_start, times));
		}

		// Category filter — handle comma-separated multi-select
		if (category) {
			const cats = category.split(',');
			events = events.filter(e => cats.includes(e.category));
		}

		// Bydel filter
		if (bydel) {
			events = events.filter(e => e.bydel === bydel);
		}

		// Price filter
		if (price === 'free') {
			events = events.filter(e => isFreeEvent(e.price));
		} else if (price === 'paid') {
			events = events.filter(e => !isFreeEvent(e.price));
		}

		// Audience filter
		const familyTitleRe = /familie|barnelørdag|barnas\s|for\s+barn|barneforestilling/i;
		if (audience === 'family') {
			events = events.filter(e => e.age_group === 'family' || e.category === 'family' || familyTitleRe.test(e.title_no));
		} else if (audience === 'ungdom') {
			const youthCategories = new Set(['sports', 'workshop', 'student']);
			const youthRe = /\bungdom|\btenåring|\bteenåring|\bfor\s+unge?\b|\bunge\b|\bteen|\b1[0-5]\s*[-–]\s*1[5-9]\s*år|\bfra\s+1[0-5]\s+år/i;
			events = events.filter(e => {
				if (e.age_group === '18+') return false;
				if (e.category === 'nightlife' || e.category === 'food') return false;
				if (e.age_group === 'family' || e.category === 'family') return true;
				if (youthRe.test(e.title_no) || youthRe.test(e.description_no)) return true;
				if (e.category === 'theatre') return false;
				return youthCategories.has(e.category);
			});
		} else if (audience === 'student') {
			events = events.filter(e => e.age_group === 'students' || e.category === 'student');
		} else if (audience === 'tourist') {
			events = events.filter(e => e.language === 'en' || e.language === 'both');
		} else if (audience === 'voksen') {
			const adultCategories = new Set(['culture', 'music', 'theatre', 'tours', 'food', 'workshop']);
			events = events.filter(e => adultCategories.has(e.category));
		} else if (audience === 'adult') {
			events = events.filter(e => e.age_group !== 'family' && e.category !== 'family');
		} else if (audience === 'free') {
			events = events.filter(e => isFreeEvent(e.price));
		}

		// Search query
		if (q) {
			const query = q.toLowerCase();
			events = events.filter(e =>
				e.title_no.toLowerCase().includes(query) ||
				(e.title_en && e.title_en.toLowerCase().includes(query)) ||
				e.venue_name.toLowerCase().includes(query)
			);
		}

		// Sort by date (ISO strings are lexicographically sortable — no Date allocation needed)
		events.sort((a, b) => a.date_start < b.date_start ? -1 : a.date_start > b.date_start ? 1 : 0);

		// Remove user-hidden events — only after hydration to prevent SSR mismatch
		if (hydrated) {
			void hiddenVersion; // explicit dependency for re-derive
			events = events.filter(e => !isHidden(e.id, e.venue_name, e.category));
		}

		return events;
	});

	// Pagination
	let displayedEvents = $derived(filteredEvents.slice(0, pageNum * PAGE_SIZE));

	// URL update helper — use replaceState (shallow routing) to avoid re-running server load
	function updateParam(key: string, value: string) {
		const qs = buildQueryString($page.url.search, key, value);
		replaceState(`?${qs}`, {});
	}

	function handleFilterChange(key: string, value: string) {
		updateParam(key, value);
	}

	function handleClearAll() {
		replaceState(`/${$lang}`, {});
	}

	let nextPageHref = $derived(`?${buildQueryString($page.url.search, 'page', String(pageNum + 1))}`);

	// Popular events for empty state
	let popularEvents = $derived(allEvents.filter(e => e.status === 'approved').slice(0, 3));

	let websiteJsonLd = $derived(generateWebSiteJsonLd($lang));

	// Filter transition animation
	let filterFingerprint = $derived(`${when}|${time}|${audience}|${category}|${bydel}|${price}`);
	let transitioning = $state(false);
	let initialFingerprint = true;
	$effect(() => {
		const _ = filterFingerprint;
		if (initialFingerprint) { initialFingerprint = false; return; }
		if (!browser) return;
		transitioning = true;
		const timeout = setTimeout(() => { transitioning = false; }, 200);
		return () => clearTimeout(timeout);
	});

	// Scroll restoration: save position when leaving, restore on back navigation
	beforeNavigate(() => {
		sessionStorage.setItem('gaari-home-scroll', String(window.scrollY));
	});

	afterNavigate(({ type }) => {
		if (type === 'popstate') {
			const saved = sessionStorage.getItem('gaari-home-scroll');
			if (saved) {
				sessionStorage.removeItem('gaari-home-scroll');
				tick().then(() => {
					requestAnimationFrame(() => {
						window.scrollTo({ top: parseInt(saved), behavior: 'instant' });
					});
				});
			}
		}
	});

	// Contextual collection suggestions based on day/time
	let collectionSuggestions = $derived.by(() => {
		const now = getOsloNow();
		const day = now.getDay(); // 0=Sun
		const hour = now.getHours();
		const isWeekend = day === 0 || day === 5 || day === 6;

		const suggestions: Array<{ slug: string; label: Record<string, string> }> = [];

		if (isWeekend) {
			suggestions.push({ slug: 'denne-helgen', label: { no: 'Denne helgen', en: 'This weekend' } });
		}
		if (hour >= 14) {
			suggestions.push({ slug: 'i-kveld', label: { no: 'I kveld', en: 'Tonight' } });
		}
		suggestions.push(
			{ slug: 'gratis', label: { no: 'Gratis i Bergen', en: 'Free events' } },
			{ slug: 'konserter', label: { no: 'Konserter', en: 'Concerts' } },
			{ slug: 'familiehelg', label: { no: 'For familier', en: 'For families' } },
		);
		if (!isWeekend) {
			suggestions.push({ slug: 'i-dag', label: { no: 'I dag', en: 'Today' } });
		}
		return suggestions.slice(0, 5);
	});

	// Only show collection suggestions when no filters are active
	let hasActiveFilters = $derived(!!when || !!time || !!audience || !!category || !!bydel || !!price || !!q);

	// Hidden events — only apply after hydration to avoid SSR mismatch
	let hiddenVersion = $state(0);
	let hydrated = $state(false);
	$effect(() => { hydrated = true; });
	let numHidden = $derived.by(() => { void hiddenVersion; return hydrated ? hiddenCount() : 0; });
	let hiddenLabels = $derived.by(() => { void hiddenVersion; return hydrated ? hiddenSummary($lang) : []; });

	function handleHideEvent(id: string) {
		hideEvent(id);
		hiddenVersion++;
	}

	function handleHideVenue(venue: string) {
		hideVenue(venue);
		hiddenVersion++;
	}

	function handleHideCategory(category: string) {
		hideCategory(category);
		hiddenVersion++;
	}

	function handleUnhideAll() {
		unhideAll();
		hiddenVersion++;
	}

	// Compute canonical/noindex client-side to avoid server load re-runs on filter changes
	let canonicalInfo = $derived(computeCanonical($page.url, $lang, filteredEvents.length));

	let homeDescription = $derived($lang === 'no'
		? 'Hva skjer i Bergen? Konserter, utstillinger, teater, mat og mer. Gåri samler arrangementer fra 54 lokale kilder, oppdatert daglig.'
		: 'What\u2019s on in Bergen? Concerts, exhibitions, theatre, food and more. Gåri collects events from 54 local sources, updated daily.');
</script>

<svelte:head>
	<title>Gåri — {$t('tagline')}</title>
	<meta name="description" content={homeDescription} />
	<link rel="canonical" href={canonicalInfo.canonical} />
	{#if canonicalInfo.noindex}<meta name="robots" content="noindex, follow" />{/if}
	<meta property="og:title" content={`Gåri — ${$t('tagline')}`} />
	<meta property="og:description" content={homeDescription} />
	<meta property="og:image" content={`${$page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={`Gåri — ${$t('tagline')}`} />
	<meta name="twitter:description" content={homeDescription} />
	<meta name="twitter:image" content={`${$page.url.origin}/og/default.png`} />
	{#if displayedEvents[0]?.image_url}
		<link rel="preload" as="image"
			href={optimizedSrc(displayedEvents[0].image_url, 400)}
			imagesrcset={optimizedSrcset(displayedEvents[0].image_url, [400, 600])}
			imagesizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 2.5rem), 400px" />
	{/if}
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + websiteJsonLd + '</scr' + 'ipt>'}
</svelte:head>

<HeroSection />

<EventDiscovery
	lang={$lang}
	eventCount={filteredEvents.length}
	{allEvents}
	onFilterChange={handleFilterChange}
	onClearAll={handleClearAll}
/>


<div class="mx-auto max-w-7xl px-4 py-1 md:py-3" aria-live="polite" aria-atomic="true">
	{#if filteredEvents.length === 0}
		<EmptyState
			{popularEvents}
			onClearFilters={handleClearAll}
			onBrowseAll={handleClearAll}
		/>
	{:else}
		<div class="event-results" class:fading={transitioning}>
			<EventGrid events={displayedEvents} onHideEvent={handleHideEvent} onHideVenue={handleHideVenue} onHideCategory={handleHideCategory} />
			{#if numHidden > 0}
				<div class="mb-6 flex items-center justify-center gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-2.5">
					<span class="text-sm text-[var(--color-text-muted)]">
						{$lang === 'no' ? 'Skjuler' : 'Hiding'}: {hiddenLabels.join(', ')}
					</span>
					<button
						onclick={handleUnhideAll}
						class="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
					>
						{$lang === 'no' ? 'Nullstill' : 'Reset'}
					</button>
				</div>
			{/if}
			<LoadMore shown={displayedEvents.length} total={filteredEvents.length} href={nextPageHref} />
		</div>
	{/if}
</div>

<!-- Collection suggestions -->
{#if !hasActiveFilters && filteredEvents.length > 0}
	<nav class="mx-auto max-w-7xl px-4 py-6" aria-label={$lang === 'no' ? 'Utforsk samlinger' : 'Explore collections'}>
		<h2 class="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
			{$lang === 'no' ? 'Utforsk' : 'Explore'}
		</h2>
		<div class="flex flex-wrap gap-2">
			{#each collectionSuggestions as col}
				<a
					href="/{$lang}/{col.slug}"
					class="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
				>
					{col.label[$lang]}
					<ArrowRight size={14} />
				</a>
			{/each}
		</div>
	</nav>
{/if}

<style>
	.event-results {
		transition: opacity 0.2s ease;
	}
	.event-results.fading {
		opacity: 0.5;
	}
	@media (prefers-reduced-motion: reduce) {
		.event-results {
			transition: none;
		}
	}
</style>
