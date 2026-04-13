<script lang="ts">
	import { page } from '$app/state';
	import { goto, beforeNavigate, afterNavigate } from '$app/navigation';
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import { lang, t } from '$lib/i18n';
	import { isFreeEvent } from '$lib/utils';
	import { hideEvent, hideVenue, hideCategory, isHidden, unhideAll, hiddenCount, hiddenSummary } from '$lib/hidden-events.svelte';
	import { getOsloNow, toOsloDateStr, getWeekendDates, matchesTimeOfDay, addDays, getEndOfWeekDateStr, buildQueryString, eventOnDay, eventOverlapsRange } from '$lib/event-filters';
	import type { Bydel, GaariEvent } from '$lib/types';
	import { generateWebSiteJsonLd, generateFaqJsonLd, generateOrganizationJsonLd, generateBreadcrumbJsonLd, computeCanonical, getCanonicalUrl, safeJsonLd } from '$lib/seo';
	import { SOURCE_COUNT } from '$lib/constants';
	import { optimizedSrc, optimizedSrcset } from '$lib/image';
	import { getGroupedCollections } from '$lib/collections';
	import { TOP_VENUES } from '$lib/venues';
	import { ArrowRight } from 'lucide-svelte';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import EventDiscovery from '$lib/components/EventDiscovery.svelte';

	import EventGrid from '$lib/components/EventGrid.svelte';
	import LoadMore from '$lib/components/LoadMore.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import NewsletterInline from '$lib/components/NewsletterInline.svelte';

	let { data } = $props();
	let allEvents: GaariEvent[] = $derived(data.events);

	const PAGE_SIZE = 12;

	// Read filters from URL
	let category = $derived(page.url.searchParams.get('category') || '');
	let bydel = $derived((page.url.searchParams.get('bydel') || '') as Bydel | '');
	let price = $derived(page.url.searchParams.get('price') || '');
	let audience = $derived(page.url.searchParams.get('audience') || '');
	let when = $derived(page.url.searchParams.get('when') || '');
	let time = $derived(page.url.searchParams.get('time') || '');
	let q = $derived(page.url.searchParams.get('q') || '');
	let pageNum = $derived(Number(page.url.searchParams.get('page') || '1'));

	// Filter events
	let filteredEvents = $derived.by(() => {
		let events = allEvents.filter(e => e.status !== 'cancelled' && e.status !== 'expired');

		// When filter (date)
		if (when) {
			const now = getOsloNow();
			const todayStr = toOsloDateStr(now);

			if (when === 'today') {
				events = events.filter(e => eventOnDay(e, todayStr));
			} else if (when === 'tomorrow') {
				const tmrwStr = toOsloDateStr(addDays(now, 1));
				events = events.filter(e => eventOnDay(e, tmrwStr));
			} else if (when === 'weekend') {
				const { start, end } = getWeekendDates(now);
				events = events.filter(e => eventOverlapsRange(e, start, end));
			} else if (when === 'week') {
				const endStr = getEndOfWeekDateStr(now);
				events = events.filter(e => eventOverlapsRange(e, todayStr, endStr));
			} else if (when.includes(':')) {
				// Range: YYYY-MM-DD:YYYY-MM-DD
				const [from, to] = when.split(':');
				events = events.filter(e => eventOverlapsRange(e, from, to));
			} else {
				// Single date: YYYY-MM-DD
				events = events.filter(e => eventOnDay(e, when));
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
			const youthRe = /\bungdom|\btenåring|\bteenåring|\bfor\s+unge?\b|\bunge?\b|\bteen|\b1[0-5]\s*[-–]\s*1[5-9]\s*år|\bfra\s+1[0-5]\s+år/i;
			events = events.filter(e => {
				if (e.age_group === '18+') return false;
				if (e.category === 'nightlife' || e.category === 'food') return false;
				if (e.age_group === 'family' || e.category === 'family') return true;
				if (e.age_group === 'students') return true;
				if (youthRe.test(e.title_no) || youthRe.test(e.description_no)) return true;
				if (e.category === 'theatre') return false;
				return youthCategories.has(e.category);
			});
		} else if (audience === 'student') {
			events = events.filter(e => e.age_group === 'students' || e.category === 'student');
		} else if (audience === 'tourist') {
			events = events.filter(e => e.language === 'en' || e.language === 'both');
		} else if (audience === 'voksen') {
			const voksenCategories = new Set(['culture', 'music', 'theatre', 'tours', 'food', 'workshop', 'festival']);
			const clubRe = /\bklubb|\bdj\b|\bhouse\b|\btechno|\bafterparty|\bnattklubb|\brave\b/i;
			const childRe = /\bjunior\b|\bfor\s+barn\b|\bbarnas\s|\bbarnelørdag|\bbarneforestilling|\beventyrstund|\beventyromvisning|\bprompepulver/i;
			const indieVenues = new Set(['hulen', 'garage', 'kvarteret', 'det akademiske kvarter', 'landmark', 'bergen kjøtt', 'fincken', 'røkeriet']);
			events = events.filter(e => {
				if (e.age_group === 'family' || e.category === 'family') return false;
				if (e.age_group === 'students') return false;
				if (!voksenCategories.has(e.category)) return false;
				if (clubRe.test(e.title_no) || clubRe.test(e.description_no || '')) return false;
				if (childRe.test(e.title_no)) return false;
				if (indieVenues.has(e.venue_name?.toLowerCase())) return false;
				return true;
			});
		} else if (audience === 'adult') {
			const adultVenueNames = [
				'hulen', 'garage', 'kvarteret', 'akademiske kvarter', 'landmark',
				'bergen kjøtt', 'fincken', 'røkeriet', 'østre', 'bodega',
				"o'connor", 'gåsa pub', 'biblioteket bar', 'bryggen nightclub', 'cinemateket',
				'victoria', 'kronbar', 'statsraaden',
				'7 fjell bryggeri', '7fjell bryggeri', 'kennel', 'steppeulven',
				'bakrommet', 'spissen', 'sardinen', "heidi's", 'shipyard'
			];
			const adultRe = /\bsingel\s*treff|\bspeed\s*dat|\bpub\s*quiz|\bquiz\b|\blive\s+på\s+pub|\bnattklubb|\bklubb(?:kveld|natt)|\bafterparty|\bbar\s+og\b|\bstand.?up\b|\bklubbkveld\b|\bklubb\b/i;
			const childRe18 = /\bjunior\b|\bfor\s+barn\b|\bbarnas\s|\bbarnelørdag|\bbarneforestilling|\beventyrstund|\beventyromvisning|\bprompepulver/i;
			events = events.filter(e => {
				if (e.age_group === 'family' || e.category === 'family') return false;
				if (childRe18.test(e.title_no)) return false;
				if (e.age_group === '18+') return true;
				if (e.category === 'nightlife') return true;
				const venueLower = e.venue_name?.toLowerCase() || '';
				if (adultVenueNames.some(v => venueLower.includes(v))) return true;
				if (adultRe.test(e.title_no) || adultRe.test(e.description_no || '')) return true;
				return false;
			});
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

		// Sort: upcoming events first by date_start, then ongoing (past start) by date_end
		const nowIso = getOsloNow().toISOString();
		const upcoming = events.filter(e => e.date_start >= nowIso);
		const ongoing = events.filter(e => e.date_start < nowIso);
		upcoming.sort((a, b) => a.date_start < b.date_start ? -1 : a.date_start > b.date_start ? 1 : 0);
		ongoing.sort((a, b) => (a.date_end ?? '') < (b.date_end ?? '') ? -1 : (a.date_end ?? '') > (b.date_end ?? '') ? 1 : 0);
		events = [...upcoming, ...ongoing];

		// Remove user-hidden events — only after hydration to prevent SSR mismatch
		if (hydrated) {
			void hiddenVersion; // explicit dependency for re-derive
			events = events.filter(e => !isHidden(e.id, e.venue_name, e.category));
		}

		return events;
	});

	// Pagination
	let displayedEvents = $derived(filteredEvents.slice(0, pageNum * PAGE_SIZE));

	// URL update helper — goto with replaceState avoids adding history entries,
	// and since server load doesn't depend on url params, it won't remount.
	function updateParam(key: string, value: string) {
		const qs = buildQueryString(page.url.search, key, value);
		goto(`?${qs}`, { replaceState: true, noScroll: true, keepFocus: true });
	}

	function handleFilterChange(key: string, value: string) {
		updateParam(key, value);
	}

	function handleClearAll() {
		goto(`/${$lang}`, { replaceState: true, noScroll: true, keepFocus: true });
	}

	let nextPageHref = $derived(`?${buildQueryString(page.url.search, 'page', String(pageNum + 1))}`);

	// Popular events for empty state
	let popularEvents = $derived(allEvents.filter(e => e.status === 'approved').slice(0, 3));

	let websiteJsonLd = $derived(generateWebSiteJsonLd($lang));

	// CollectionPage + ItemList JSON-LD: give AI crawlers structured access to top 50 events
	let homepageItemListJsonLd = $derived(safeJsonLd({
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: $lang === 'no' ? 'Hva skjer i Bergen' : 'What\u2019s on in Bergen',
		description: $lang === 'no'
			? `Hva skjer i Bergen? Konserter, utstillinger, teater, mat og mer. Oppdatert daglig fra ${SOURCE_COUNT} lokale kilder.`
			: `What\u2019s on in Bergen? Concerts, exhibitions, theatre, food and more. Updated daily from ${SOURCE_COUNT} local sources.`,
		url: getCanonicalUrl(`/${$lang}`),
		dateModified: new Date().toISOString().slice(0, 10),
		publisher: { '@type': 'Organization', name: 'Gåri', url: 'https://gaari.no' },
		numberOfItems: allEvents.length,
		mainEntity: {
			'@type': 'ItemList',
			numberOfItems: Math.min(allEvents.length, 50),
			itemListElement: allEvents.slice(0, 50).map((e, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				url: getCanonicalUrl(`/${$lang}/events/${e.slug}`)
			}))
		}
	}));

	let homepageFaqJsonLd = $derived(generateFaqJsonLd($lang));
	let orgJsonLd = generateOrganizationJsonLd();
	let homeBreadcrumbJsonLd = $derived(generateBreadcrumbJsonLd([
		{ name: 'Gåri' }
	]));

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
	let canonicalInfo = $derived(computeCanonical(page.url, $lang, filteredEvents.length));

	let homeDescription = $derived($lang === 'no'
		? `Hva skjer i Bergen? Konserter, utstillinger, teater, mat og mer. Gåri samler arrangementer fra ${SOURCE_COUNT} lokale kilder, oppdatert daglig.`
		: `What\u2019s on in Bergen? Concerts, exhibitions, theatre, food and more. Gåri collects events from ${SOURCE_COUNT} local sources, updated daily.`);
</script>

<svelte:head>
	<title>Gåri — {$t('tagline')}</title>
	<meta name="description" content={homeDescription} />
	<link rel="canonical" href={canonicalInfo.canonical} />
	{#if canonicalInfo.noindex}<meta name="robots" content="noindex, follow" />{/if}
	<meta property="og:title" content={`Gåri — ${$t('tagline')}`} />
	<meta property="og:description" content={homeDescription} />
	<meta property="og:image" content={`${page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="article:modified_time" content={new Date().toISOString()} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={`Gåri — ${$t('tagline')}`} />
	<meta name="twitter:description" content={homeDescription} />
	<meta name="twitter:image" content={`${page.url.origin}/og/default.png`} />
	{#if displayedEvents[0]?.image_url}
		<link rel="preload" as="image"
			href={optimizedSrc(displayedEvents[0].image_url, 400)}
			imagesrcset={optimizedSrcset(displayedEvents[0].image_url, [400, 600])}
			imagesizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 2.5rem), 400px" />
	{/if}
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + websiteJsonLd + '</scr' + 'ipt>'}
	{@html '<script type="application/ld+json">' + homepageItemListJsonLd + '</scr' + 'ipt>'}
	{@html '<script type="application/ld+json">' + homepageFaqJsonLd + '</scr' + 'ipt>'}
	{@html '<script type="application/ld+json">' + orgJsonLd + '</scr' + 'ipt>'}
	{@html '<script type="application/ld+json">' + homeBreadcrumbJsonLd + '</scr' + 'ipt>'}
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
			<EventGrid events={displayedEvents} showNewsletterCta showSignupCard={!hasActiveFilters && pageNum === 1} onHideEvent={handleHideEvent} onHideVenue={handleHideVenue} onHideCategory={handleHideCategory} />
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
			{#if pageNum > 1}
				<div class="mt-4">
					<NewsletterInline location="homepage-below-loadmore" />
				</div>
			{/if}
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

<!-- About Gåri (SEO context) -->
<section class="mx-auto max-w-7xl px-4 py-8 text-sm leading-relaxed text-[var(--color-text-secondary)]">
	<h2 class="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
		{$lang === 'no' ? 'Om Gåri' : 'About Gåri'}
	</h2>
	<p>
		{$lang === 'no'
			? `Bergen har ${data.events.length} arrangementer de neste to ukene — konserter, teater, utstillinger, mat og familieaktiviteter fra ${data.events.length > 0 ? 'Grieghallen, KODE, DNS og 50+ andre steder' : `${SOURCE_COUNT} lokale kilder`}. Oppdatert daglig.`
			: `Bergen has ${data.events.length} events over the next two weeks — concerts, theatre, exhibitions, food and family activities from ${data.events.length > 0 ? 'Grieghallen, KODE, DNS and 50+ other venues' : `${SOURCE_COUNT} local sources`}. Updated daily.`}
	</p>
	<p class="mt-2">
		{$lang === 'no'
			? 'Gåri er en uavhengig og gratis arrangementskalender for Bergen. Alle beskrivelser er originale, og utsolgte arrangementer fjernes automatisk.'
			: 'Gåri is an independent, free event calendar for Bergen. All descriptions are original, and sold-out events are removed automatically.'}
	</p>
</section>

<!-- Utforsk Bergen — full collection navigation for SEO internal linking -->
<nav class="mx-auto max-w-7xl px-4 pb-10" aria-label={$lang === 'no' ? 'Utforsk arrangementer i Bergen' : 'Explore events in Bergen'}>
	<h2 class="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
		{$lang === 'no' ? 'Utforsk Bergen' : 'Explore Bergen'}
	</h2>
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each getGroupedCollections($lang) as group}
			<div>
				<h3 class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
					{group.label[$lang]}
				</h3>
				<div class="flex flex-wrap gap-1.5">
					{#each group.items as item}
						<a
							href="/{$lang}/{item.slug}"
							class="inline-block rounded-md border border-[var(--color-border)] px-2.5 py-1 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
						>
							{item.label[$lang]}
						</a>
					{/each}
				</div>
			</div>
		{/each}
		<!-- Top venues -->
		<div>
			<h3 class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
				{$lang === 'no' ? 'Venues' : 'Venues'}
			</h3>
			<div class="flex flex-wrap gap-1.5">
				{#each TOP_VENUES.slice(0, 8) as venue}
					<a
						href="/{$lang}/venue/{venue.slug}"
						class="inline-block rounded-md border border-[var(--color-border)] px-2.5 py-1 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
					>
						{venue.name}
					</a>
				{/each}
			</div>
		</div>
	</div>
</nav>

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
