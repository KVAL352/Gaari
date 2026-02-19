<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { lang, t } from '$lib/i18n';
	import { isFreeEvent } from '$lib/utils';
	import type { Category, Bydel, GaariEvent } from '$lib/types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import EventGrid from '$lib/components/EventGrid.svelte';
	import EventListItem from '$lib/components/EventListItem.svelte';
	import LoadMore from '$lib/components/LoadMore.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data } = $props();
	let allEvents: GaariEvent[] = $derived(data.events);

	const PAGE_SIZE = 12;

	// Read filters from URL
	let when = $derived($page.url.searchParams.get('when') || '');
	let category = $derived(($page.url.searchParams.get('category') || '') as Category | '');
	let bydel = $derived(($page.url.searchParams.get('bydel') || '') as Bydel | '');
	let price = $derived($page.url.searchParams.get('price') || '');
	let audience = $derived($page.url.searchParams.get('audience') || '');
	let q = $derived($page.url.searchParams.get('q') || '');
	let view = $derived(($page.url.searchParams.get('view') || 'grid') as 'grid' | 'list');
	let pageNum = $derived(Number($page.url.searchParams.get('page') || '1'));

	// Filter events
	let filteredEvents = $derived.by(() => {
		let events = allEvents.filter(e => e.status !== 'cancelled' && e.status !== 'expired');
		const now = new Date();

		// When filter
		if (when) {
			const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const todayEnd = new Date(todayStart);
			todayEnd.setDate(todayEnd.getDate() + 1);

			if (when === 'today') {
				events = events.filter(e => {
					const d = new Date(e.date_start);
					return d >= todayStart && d < todayEnd;
				});
			} else if (when === 'tomorrow') {
				const tmrStart = new Date(todayStart);
				tmrStart.setDate(tmrStart.getDate() + 1);
				const tmrEnd = new Date(tmrStart);
				tmrEnd.setDate(tmrEnd.getDate() + 1);
				events = events.filter(e => {
					const d = new Date(e.date_start);
					return d >= tmrStart && d < tmrEnd;
				});
			} else if (when === 'weekend') {
				// Find next Saturday & Sunday
				const dayOfWeek = todayStart.getDay();
				const satOffset = (6 - dayOfWeek + 7) % 7 || 7;
				const satStart = new Date(todayStart);
				// If today is Sat or Sun, include today
				if (dayOfWeek === 0 || dayOfWeek === 6) {
					satStart.setTime(todayStart.getTime());
				} else {
					satStart.setDate(todayStart.getDate() + satOffset);
				}
				const monStart = new Date(satStart);
				if (dayOfWeek === 0) {
					monStart.setDate(monStart.getDate() + 1);
				} else {
					monStart.setDate(satStart.getDate() + (dayOfWeek === 6 ? 2 : 2));
				}
				events = events.filter(e => {
					const d = new Date(e.date_start);
					const eDay = d.getDay();
					return (eDay === 0 || eDay === 6) && d >= todayStart;
				});
			} else if (when === 'week') {
				const weekEnd = new Date(todayStart);
				weekEnd.setDate(weekEnd.getDate() + 7);
				events = events.filter(e => {
					const d = new Date(e.date_start);
					return d >= todayStart && d < weekEnd;
				});
			}
		}

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

	function handleSearch(query: string) {
		updateParam('q', query);
	}

	function handleDateSelect(w: string) {
		updateParam('when', w);
	}

	function handleFilterChange(key: string, value: string) {
		updateParam(key, value);
	}

	function handleClearAll() {
		goto(`/${$lang}`, { replaceState: true, noScroll: true });
	}

	function handleViewChange(v: 'grid' | 'list') {
		updateParam('view', v);
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

<HeroSection
	activeWhen={when}
	onDateSelect={handleDateSelect}
/>

<FilterBar
	{category}
	{bydel}
	{price}
	{audience}
	{view}
	resultCount={filteredEvents.length}
	onFilterChange={handleFilterChange}
	onClearAll={handleClearAll}
	onViewChange={handleViewChange}
/>

<div class="mx-auto max-w-7xl px-4 py-8">
	{#if filteredEvents.length === 0}
		<EmptyState
			{popularEvents}
			onClearFilters={handleClearAll}
			onBrowseAll={handleClearAll}
		/>
	{:else if view === 'list'}
		<ul class="space-y-3">
			{#each displayedEvents as event (event.id)}
				<EventListItem {event} />
			{/each}
		</ul>
		<LoadMore shown={displayedEvents.length} total={filteredEvents.length} onLoadMore={handleLoadMore} />
	{:else}
		<EventGrid events={displayedEvents} />
		<LoadMore shown={displayedEvents.length} total={filteredEvents.length} onLoadMore={handleLoadMore} />
	{/if}
</div>
