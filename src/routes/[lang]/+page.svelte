<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { lang, t } from '$lib/i18n';
	import { isFreeEvent } from '$lib/utils';
	import { getOsloNow, toOsloDateStr, isSameDay, getWeekendDates, matchesTimeOfDay, addDays, getEndOfWeekDateStr, buildQueryString } from '$lib/event-filters';
	import type { Bydel, GaariEvent } from '$lib/types';
	import { generateWebSiteJsonLd } from '$lib/seo';
	import { optimizedSrc, optimizedSrcset } from '$lib/image';
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
			const youthCategories = new Set(['music', 'culture', 'sports', 'workshop', 'festival', 'student']);
			const youthRe = /\bungdom|\btenåring|\bfor\s+unge?\b|\bteen|\b1[0-5]\s*[-–]\s*1[5-9]\s*år|\bfra\s+1[0-5]\s+år/i;
			events = events.filter(e => {
				if (e.age_group === '18+') return false;
				if (e.category === 'nightlife' || e.category === 'food') return false;
				return youthCategories.has(e.category) || e.age_group === 'family' || e.category === 'family' || youthRe.test(e.title_no) || youthRe.test(e.description_no);
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

		return events;
	});

	// Pagination
	let displayedEvents = $derived(filteredEvents.slice(0, pageNum * PAGE_SIZE));

	// URL update helper
	function updateParam(key: string, value: string) {
		goto(`?${buildQueryString($page.url.search, key, value)}`, { replaceState: true, noScroll: true });
	}

	function handleFilterChange(key: string, value: string) {
		updateParam(key, value);
	}

	function handleClearAll() {
		goto(`/${$lang}`, { replaceState: true, noScroll: true });
	}

	let nextPageHref = $derived(`?${buildQueryString($page.url.search, 'page', String(pageNum + 1))}`);

	// Popular events for empty state
	let popularEvents = $derived(allEvents.filter(e => e.status === 'approved').slice(0, 3));

	let websiteJsonLd = $derived(generateWebSiteJsonLd($lang));
</script>

<svelte:head>
	<title>Gåri — {$t('tagline')}</title>
	<meta name="description" content={$lang === 'no' ? 'Gåri samler alle arrangementer i Bergen på ett sted — konserter, utstillinger, teater, mat og mer. Oppdatert to ganger daglig fra 48 kilder.' : 'Gåri aggregates all events in Bergen in one place — concerts, exhibitions, theatre, food and more. Updated twice daily from 48 sources.'} />
	<link rel="canonical" href={data.canonical} />
	{#if data.noindex}<meta name="robots" content="noindex, follow" />{/if}
	<meta property="og:title" content={`Gåri — ${$t('tagline')}`} />
	<meta property="og:description" content={$lang === 'no' ? 'Gåri samler alle arrangementer i Bergen på ett sted — konserter, utstillinger, teater, mat og mer. Oppdatert to ganger daglig fra 48 kilder.' : 'Gåri aggregates all events in Bergen in one place — concerts, exhibitions, theatre, food and more. Updated twice daily from 48 sources.'} />
	<meta property="og:image" content={`${$page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={`Gåri — ${$t('tagline')}`} />
	<meta name="twitter:description" content={$lang === 'no' ? 'Gåri samler alle arrangementer i Bergen på ett sted — konserter, utstillinger, teater, mat og mer. Oppdatert to ganger daglig fra 48 kilder.' : 'Gåri aggregates all events in Bergen in one place — concerts, exhibitions, theatre, food and more. Updated twice daily from 48 sources.'} />
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
	{allEvents}
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
		<LoadMore shown={displayedEvents.length} total={filteredEvents.length} href={nextPageHref} />
	{/if}
</div>
