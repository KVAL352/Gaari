<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { lang, t } from '$lib/i18n';
	import { isFreeEvent } from '$lib/utils';
	import { getOsloNow, toOsloDateStr, isSameDay, getWeekendDates, matchesTimeOfDay } from '$lib/event-filters';
	import type { Category, Bydel, GaariEvent, TimeOfDay } from '$lib/types';
	import { generateWebSiteJsonLd, getCanonicalUrl } from '$lib/seo';
	import { optimizedSrc, optimizedSrcset } from '$lib/image';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
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

	// Hide category/audience dropdowns from FilterBar when EventDiscovery has a date selected
	let discoveryActive = $derived(!!when);
	let filterBarHideFields = $derived(discoveryActive ? ['category', 'audience'] : []);

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
				const tmrw = new Date(now);
				tmrw.setDate(now.getDate() + 1);
				const tmrwStr = toOsloDateStr(tmrw);
				events = events.filter(e => isSameDay(e.date_start, tmrwStr));
			} else if (when === 'weekend') {
				const { start, end } = getWeekendDates(now);
				events = events.filter(e => {
					const d = e.date_start.slice(0, 10);
					return d >= start && d <= end;
				});
			} else if (when === 'week') {
				const endOfWeek = new Date(now);
				const daysToSunday = 7 - now.getDay();
				endOfWeek.setDate(now.getDate() + (now.getDay() === 0 ? 0 : daysToSunday));
				const endStr = toOsloDateStr(endOfWeek);
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
		if (audience === 'family') {
			events = events.filter(e => e.age_group === 'family');
		} else if (audience === 'student') {
			events = events.filter(e => e.age_group === 'students' || e.category === 'student');
		} else if (audience === 'tourist') {
			events = events.filter(e => e.language === 'en' || e.language === 'both');
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

		return events;
	});

	// Count today / this week (use Oslo timezone for consistency)
	let todayCount = $derived.by(() => {
		const todayStr = toOsloDateStr(getOsloNow());
		return filteredEvents.filter(e => e.date_start.slice(0, 10) === todayStr).length;
	});
	let thisWeekCount = $derived.by(() => {
		const now = getOsloNow();
		const endOfWeek = new Date(now);
		endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
		const endStr = toOsloDateStr(endOfWeek);
		return filteredEvents.filter(e => e.date_start.slice(0, 10) <= endStr).length;
	});

	// Pagination
	let displayedEvents = $derived(filteredEvents.slice(0, pageNum * PAGE_SIZE));

	// URL update helper
	function updateParam(key: string, value: string) {
		const params = new URLSearchParams($page.url.search);
		if (value) {
			params.set(key, value);
		} else {
			params.delete(key);
		}
		// Reset page when changing filters
		if (key !== 'page') params.delete('page');
		goto(`?${params.toString()}`, { replaceState: true, noScroll: true });
	}

	function handleFilterChange(key: string, value: string) {
		updateParam(key, value);
	}

	function handleClearAll() {
		goto(`/${$lang}`, { replaceState: true, noScroll: true });
	}

	function handleLoadMore() {
		updateParam('page', String(pageNum + 1));
	}

	// Popular events for empty state
	let popularEvents = $derived(allEvents.filter(e => e.status === 'approved').slice(0, 3));

	let websiteJsonLd = $derived(generateWebSiteJsonLd($lang));
	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}`));
</script>

<svelte:head>
	<title>Gåri — {$t('tagline')}</title>
	<meta name="description" content={$lang === 'no' ? 'Finn alle arrangementer i Bergen på ett sted.' : 'Find all events in Bergen in one place.'} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content={`Gåri — ${$t('tagline')}`} />
	<meta property="og:description" content={$lang === 'no' ? 'Finn alle arrangementer i Bergen på ett sted.' : 'Find all events in Bergen in one place.'} />
	<meta property="og:image" content={`${$page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={`Gåri — ${$t('tagline')}`} />
	<meta name="twitter:description" content={$lang === 'no' ? 'Finn alle arrangementer i Bergen på ett sted.' : 'Find all events in Bergen in one place.'} />
	<meta name="twitter:image" content={`${$page.url.origin}/og/default.png`} />
	{#if displayedEvents[0]?.image_url}
		<link rel="preload" as="image"
			href={optimizedSrc(displayedEvents[0].image_url, 400)}
			imagesrcset={optimizedSrcset(displayedEvents[0].image_url, [400, 600, 800])}
			imagesizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 2.5rem), 400px" />
	{/if}
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + websiteJsonLd + '</scr' + 'ipt>'}
</svelte:head>

<HeroSection />

<EventDiscovery
	lang={$lang}
	eventCount={filteredEvents.length}
	onFilterChange={handleFilterChange}
	onClearAll={handleClearAll}
/>


<div class="mx-auto max-w-7xl px-4 py-6" aria-live="polite" aria-atomic="true">
	{#if filteredEvents.length === 0}
		<EmptyState
			{popularEvents}
			onClearFilters={handleClearAll}
			onBrowseAll={handleClearAll}
		/>
	{:else}
		<EventGrid events={displayedEvents} />
		<LoadMore shown={displayedEvents.length} total={filteredEvents.length} onLoadMore={handleLoadMore} />
	{/if}
</div>
