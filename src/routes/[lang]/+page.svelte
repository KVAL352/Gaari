<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { lang, t } from '$lib/i18n';
	import { isFreeEvent } from '$lib/utils';
	import type { Category, Bydel, GaariEvent } from '$lib/types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';

	import EventGrid from '$lib/components/EventGrid.svelte';
	import LoadMore from '$lib/components/LoadMore.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data } = $props();
	let allEvents: GaariEvent[] = $derived(data.events);

	const PAGE_SIZE = 12;

	// Read filters from URL
	let category = $derived(($page.url.searchParams.get('category') || '') as Category | '');
	let bydel = $derived(($page.url.searchParams.get('bydel') || '') as Bydel | '');
	let price = $derived($page.url.searchParams.get('price') || '');
	let audience = $derived($page.url.searchParams.get('audience') || '');
	let q = $derived($page.url.searchParams.get('q') || '');
	let pageNum = $derived(Number($page.url.searchParams.get('page') || '1'));

	// Filter events
	let filteredEvents = $derived.by(() => {
		let events = allEvents.filter(e => e.status !== 'cancelled' && e.status !== 'expired');

		// Category filter
		if (category) {
			events = events.filter(e => e.category === category);
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

		// Sort by date
		events.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

		return events;
	});

	// Count today / this week
	let todayCount = $derived.by(() => {
		const todayStr = new Date().toISOString().slice(0, 10);
		return filteredEvents.filter(e => e.date_start.slice(0, 10) === todayStr).length;
	});
	let thisWeekCount = $derived.by(() => {
		const now = new Date();
		const endOfWeek = new Date(now);
		endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
		endOfWeek.setHours(23, 59, 59, 999);
		const endStr = endOfWeek.toISOString();
		return filteredEvents.filter(e => e.date_start <= endStr).length;
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
</script>

<svelte:head>
	<title>Gåri — {$t('tagline')}</title>
	<meta name="description" content={$lang === 'no' ? 'Finn alle arrangementer i Bergen på ett sted.' : 'Find all events in Bergen in one place.'} />
</svelte:head>

<HeroSection />

<FilterBar
	{category}
	{bydel}
	{price}
	{audience}
	{todayCount}
	{thisWeekCount}
	onFilterChange={handleFilterChange}
	onClearAll={handleClearAll}
/>

<div class="mx-auto max-w-7xl px-4 py-6">
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
