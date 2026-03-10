<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { lang } from '$lib/i18n';
	import { getCanonicalUrl, generateBreadcrumbJsonLd, generateFaqJsonLdFromItems, safeJsonLd } from '$lib/seo';
	import { getEasterDate, addDays, getISOWeekDates, getContextualHighlight, getOsloNow } from '$lib/event-filters';
	import { getAllCollectionSlugs, getCollection } from '$lib/collections';
	import NewsletterCTA from '$lib/components/NewsletterCTA.svelte';

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/guide`));

	let breadcrumbJsonLd = $derived(generateBreadcrumbJsonLd([
		{ name: 'Gåri', url: getCanonicalUrl(`/${$lang}`) },
		{ name: 'Guide' }
	]));

	let guideCollectionJsonLd = $derived(safeJsonLd({
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: $lang === 'no' ? 'Din guide til Bergen-arrangementer' : 'Your guide to Bergen events',
		description: $lang === 'no'
			? 'Komplett oversikt over arrangementer i Bergen — konserter, teater, festivaler, familieaktiviteter og mer.'
			: 'Complete guide to events in Bergen — concerts, theatre, festivals, family activities and more.',
		url: canonicalUrl,
		isPartOf: { '@type': 'WebSite', name: 'Gåri', url: 'https://gaari.no' },
		mainEntity: {
			'@type': 'ItemList',
			numberOfItems: getAllCollectionSlugs().length,
			itemListElement: getAllCollectionSlugs()
				.map((slug, i) => {
					const col = getCollection(slug);
					return col ? {
						'@type': 'ListItem',
						position: i + 1,
						name: col.title[$lang],
						url: getCanonicalUrl(`/${$lang}/${slug}`)
					} : null;
				})
				.filter(Boolean)
		}
	}));

	// -- Types --
	type CollectionLink = { slug: string; label: string; href?: string };
	type SeasonLink = CollectionLink & { period: string };
	interface CollectionGroup {
		label: string;
		items: CollectionLink[];
	}

	// -- Grouped evergreen collections --
	const groupsNO: CollectionGroup[] = [
		{
			label: 'Når',
			items: [
				{ slug: 'i-dag', label: 'I dag' },
				{ slug: 'i-kveld', label: 'I kveld' },
				{ slug: 'denne-helgen', label: 'Denne helgen' }
			]
		},
		{
			label: 'Hva',
			items: [
				{ slug: 'konserter', label: 'Konserter' },
				{ slug: 'gratis', label: 'Gratis' },
				{ slug: 'regndagsguide', label: 'Regndagsguide' }
			]
		},
		{
			label: 'Hvem',
			items: [
				{ slug: 'familiehelg', label: 'Familiehelg' },
				{ slug: 'studentkveld', label: 'Studentkveld' },
				{ slug: 'for-ungdom', label: 'For ungdom' },
				{ slug: 'voksen', label: 'Voksen' }
			]
		},
		{
			label: 'Hvor',
			items: [
				{ slug: 'sentrum', label: 'Sentrum' },
				{ slug: 'bergenhus', label: 'Bergenhus' },
				{ slug: 'laksevag', label: 'Laksevåg' },
				{ slug: 'fyllingsdalen', label: 'Fyllingsdalen' },
				{ slug: 'asane', label: 'Åsane' },
				{ slug: 'fana', label: 'Fana' },
				{ slug: 'ytrebygda', label: 'Ytrebygda' },
				{ slug: 'arna', label: 'Arna' }
			]
		}
	];

	const groupsEN: CollectionGroup[] = [
		{
			label: 'When',
			items: [
				{ slug: 'today-in-bergen', label: 'Today' },
				{ slug: 'i-kveld', label: 'Tonight' },
				{ slug: 'this-weekend', label: 'This Weekend' }
			]
		},
		{
			label: 'What',
			items: [
				{ slug: 'konserter', label: 'Concerts' },
				{ slug: 'free-things-to-do-bergen', label: 'Free Events' },
				{ slug: 'regndagsguide', label: 'Rainy Day Guide' }
			]
		},
		{
			label: 'Who',
			items: [
				{ slug: 'familiehelg', label: 'Family Weekend' },
				{ slug: 'studentkveld', label: 'Student Night' },
				{ slug: 'for-ungdom', label: 'For Teens' },
				{ slug: 'voksen', label: 'Adults' }
			]
		},
		{
			label: 'Where',
			items: [
				{ slug: 'sentrum', label: 'City Centre' },
				{ slug: 'bergenhus', label: 'Bergenhus' },
				{ slug: 'laksevag', label: 'Laksevåg' },
				{ slug: 'fyllingsdalen', label: 'Fyllingsdalen' },
				{ slug: 'asane', label: 'Åsane' },
				{ slug: 'fana', label: 'Fana' },
				{ slug: 'ytrebygda', label: 'Ytrebygda' },
				{ slug: 'arna', label: 'Arna' }
			]
		}
	];

	// -- Seasonal collections (chronological order) --
	const seasonalNO: SeasonLink[] = [
		{ slug: 'vinterferie', label: 'Vinterferie', period: 'Uke 9' },
		{ slug: 'paske', label: 'Påske', period: 'Mars–April' },
		{ slug: '17-mai', label: '17. mai', period: 'Mai' },
		{ slug: 'sankthans', label: 'Sankthans', period: 'Juni' },
		{ slug: 'hostferie', label: 'Høstferie', period: 'Uke 41' },
		{ slug: 'julemarked', label: 'Jul i Bergen', period: 'Nov–Des' },
		{ slug: 'nyttarsaften', label: 'Nyttårsaften', period: 'Des–Jan' }
	];
	const seasonalEN: SeasonLink[] = [
		{ slug: 'winter-break-bergen', label: 'Winter Break', period: 'Week 9' },
		{ slug: 'easter-bergen', label: 'Easter', period: 'Mar–Apr' },
		{ slug: '17th-of-may-bergen', label: '17th of May', period: 'May' },
		{ slug: 'midsummer-bergen', label: 'Midsummer', period: 'June' },
		{ slug: 'christmas-bergen', label: 'Christmas', period: 'Nov–Dec' },
		{ slug: 'new-years-eve-bergen', label: "New Year's Eve", period: 'Dec–Jan' }
	];

	// -- Festival collections (chronological order) --
	const festivalsNO: SeasonLink[] = [
		{ slug: 'borealis', label: 'Borealis', period: 'Mars' },
		{ slug: 'festspillene', label: 'Festspillene', period: 'Mai–Juni' },
		{ slug: 'nattjazz', label: 'Nattjazz', period: 'Mai–Juni' },
		{ slug: 'bergenfest', label: 'Bergenfest', period: 'Juni' },
		{ slug: 'bergen-pride', label: 'Bergen Pride', period: 'Juni' },
		{ slug: 'beyond-the-gates', label: 'Beyond the Gates', period: 'August' },
		{ slug: 'biff', label: 'BIFF', period: 'Oktober' }
	];
	const festivalsEN: SeasonLink[] = [
		{ slug: 'borealis-bergen', label: 'Borealis', period: 'March' },
		{ slug: 'bergen-international-festival', label: 'Bergen International Festival', period: 'May–June' },
		{ slug: 'nattjazz-bergen', label: 'Nattjazz', period: 'May–June' },
		{ slug: 'bergenfest-bergen', label: 'Bergenfest', period: 'June' },
		{ slug: 'bergen-pride-festival', label: 'Bergen Pride', period: 'June' },
		{ slug: 'beyond-the-gates-bergen', label: 'Beyond the Gates', period: 'August' },
		{ slug: 'biff-bergen', label: 'BIFF', period: 'October' }
	];

	let groups = $derived($lang === 'no' ? groupsNO : groupsEN);
	let seasonal = $derived($lang === 'no' ? seasonalNO : seasonalEN);
	let festivals = $derived($lang === 'no' ? festivalsNO : festivalsEN);

	// -- Season status with exact date windows (mirrors collections.ts logic) --
	// "soon" = within 14 days before start, "active" = inside the window
	function formatDate(d: Date): string {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	type SeasonWindow = { start: string; end: string };

	function getSeasonWindows(year: number): Record<string, SeasonWindow> {
		const easter = getEasterDate(year);
		const palmSunday = addDays(easter, -7);
		const easterMonday = addDays(easter, 1);
		const vinterferieWeek = getISOWeekDates(year, 9);
		const hostferieWeek = getISOWeekDates(year, 41);

		return {
			'17-mai':              { start: `${year}-05-14`, end: `${year}-05-18` },
			'17th-of-may-bergen':  { start: `${year}-05-14`, end: `${year}-05-18` },
			'julemarked':          { start: `${year}-11-15`, end: `${year}-12-23` },
			'christmas-bergen':    { start: `${year}-11-15`, end: `${year}-12-23` },
			'paske':               { start: formatDate(palmSunday), end: formatDate(easterMonday) },
			'easter-bergen':       { start: formatDate(palmSunday), end: formatDate(easterMonday) },
			'sankthans':           { start: `${year}-06-21`, end: `${year}-06-24` },
			'midsummer-bergen':    { start: `${year}-06-21`, end: `${year}-06-24` },
			'nyttarsaften':        { start: `${year}-12-29`, end: `${year + 1}-01-01` },
			'new-years-eve-bergen':{ start: `${year}-12-29`, end: `${year + 1}-01-01` },
			'vinterferie':         vinterferieWeek,
			'winter-break-bergen': vinterferieWeek,
			'hostferie':           hostferieWeek,
			// Festivals — approximate annual windows
			'borealis':            { start: `${year}-03-05`, end: `${year}-03-16` },
			'borealis-bergen':     { start: `${year}-03-05`, end: `${year}-03-16` },
			'festspillene':        { start: `${year}-05-21`, end: `${year}-06-04` },
			'bergen-international-festival': { start: `${year}-05-21`, end: `${year}-06-04` },
			'nattjazz':            { start: `${year}-05-23`, end: `${year}-06-03` },
			'nattjazz-bergen':     { start: `${year}-05-23`, end: `${year}-06-03` },
			'bergenfest':          { start: `${year}-06-11`, end: `${year}-06-14` },
			'bergenfest-bergen':   { start: `${year}-06-11`, end: `${year}-06-14` },
			'bergen-pride':        { start: `${year}-06-07`, end: `${year}-06-15` },
			'bergen-pride-festival': { start: `${year}-06-07`, end: `${year}-06-15` },
			'beyond-the-gates':    { start: `${year}-08-20`, end: `${year}-08-23` },
			'beyond-the-gates-bergen': { start: `${year}-08-20`, end: `${year}-08-23` },
			'biff':                { start: `${year}-10-15`, end: `${year}-10-26` },
			'biff-bergen':         { start: `${year}-10-15`, end: `${year}-10-26` },
		};
	}

	const SOON_DAYS = 14;

	function getStatusBySlug(slug: string): 'active' | 'soon' | 'off' {
		if (!browser) return 'off';

		const now = new Date();
		const today = formatDate(now);
		const year = now.getFullYear();

		// Check current year and adjacent year (for cross-year events like nyttårsaften)
		const windows = getSeasonWindows(year);
		const prevWindows = getSeasonWindows(year - 1);

		const window = windows[slug] || prevWindows[slug];
		if (!window) return 'off';

		// Also check previous year's cross-year window (e.g., nyttårsaften Dec 29 → Jan 1)
		const checkWindows = [windows[slug], prevWindows[slug]].filter(Boolean) as SeasonWindow[];

		for (const w of checkWindows) {
			if (today >= w.start && today <= w.end) return 'active';
		}

		// Check "coming soon" — within 14 days before start of current year's window
		const currentWindow = windows[slug];
		if (currentWindow) {
			const startDate = new Date(currentWindow.start + 'T00:00:00');
			const soonDate = addDays(startDate, -SOON_DAYS);
			const soonStr = formatDate(soonDate);
			if (today >= soonStr && today < currentWindow.start) return 'soon';
		}

		return 'off';
	}

	// FAQ data
	const faqNO = [
		{
			q: 'Hva skjer i Bergen i helgen?',
			a: 'Bergen har typisk 40–80 arrangementer hver helg, fra konserter og teater til familieaktiviteter og uteliv. Sjekk <a href="/no/denne-helgen" class="underline text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">denne helgen</a>-siden for oppdatert program med alle arrangementer samlet.'
		},
		{
			q: 'Er det gratis arrangementer i Bergen?',
			a: 'Bergen har over 20 gratis arrangementer hver uke, inkludert bibliotekkonserter, gallerivandringer, guidede turer og utendørsaktiviteter. Se <a href="/no/gratis" class="underline text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">gratis-siden</a> for en oppdatert oversikt.'
		},
		{
			q: 'Hvilke festivaler har Bergen?',
			a: 'Bergen har 7 store festivaler fordelt gjennom året: Borealis (mars), Festspillene (mai/juni), Nattjazz (mai/juni), Bergenfest (juni), Bergen Pride (juni), Beyond the Gates (august) og BIFF (oktober). Gåri har egne samlingsider for hver festival med oppdatert program.'
		},
		{
			q: 'Hva kan man gjøre med barn i Bergen?',
			a: 'Bergen har barneforestillinger, museumsaktiviteter, Akvariet og familievennlige arrangementer hver uke. Se <a href="/no/familiehelg" class="underline text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">familiehelg-siden</a> for kommende aktiviteter tilpasset familier.'
		},
		{
			q: 'Hvor ofte oppdateres Gåri?',
			a: 'Gåri oppdateres daglig klokken 06:00 med data fra 54 uavhengige kilder i Bergen. Arrangementsinformasjon hentes automatisk fra konsertscener, teatre, museer, biblioteker, festivaler og billettplattformer.'
		}
	];
	const faqEN = [
		{
			q: "What's on in Bergen this weekend?",
			a: 'Bergen typically has 40–80 events each weekend, from concerts and theatre to family activities and nightlife. Check the <a href="/en/this-weekend" class="underline text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">this weekend</a> page for the full updated programme.'
		},
		{
			q: 'Are there free things to do in Bergen?',
			a: 'Bergen has over 20 free events every week, including library concerts, gallery walks, guided tours and outdoor activities. See the <a href="/en/free-things-to-do-bergen" class="underline text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">free events page</a> for an updated list.'
		},
		{
			q: 'What festivals does Bergen have?',
			a: 'Bergen has 7 major festivals throughout the year: Borealis (March), Bergen International Festival (May/June), Nattjazz (May/June), Bergenfest (June), Bergen Pride (June), Beyond the Gates (August) and BIFF (October). Gåri has dedicated collection pages for each festival with updated programmes.'
		},
		{
			q: 'What can families do in Bergen?',
			a: 'Bergen has children\'s shows, museum activities, the Aquarium and family-friendly events every week. See the <a href="/en/familiehelg" class="underline text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">family weekend page</a> for upcoming activities suited for families.'
		},
		{
			q: 'How often is Gåri updated?',
			a: 'Gåri updates daily at 06:00 with data from 53 independent sources in Bergen. Event information is automatically collected from concert venues, theatres, museums, libraries, festivals and ticketing platforms.'
		}
	];

	let faq = $derived($lang === 'no' ? faqNO : faqEN);
	let faqJsonLd = $derived(generateFaqJsonLdFromItems(faq));

	// -- Contextual CTA: tonight after 16:00, weekend on Fri PM/Sat/Sun, else this weekend --
	let ctaConfig = $derived.by(() => {
		if (!browser) return { slug: $lang === 'no' ? 'denne-helgen' : 'this-weekend', label: $lang === 'no' ? 'Se hva som skjer denne helgen' : "See what's on this weekend" };
		const highlight = getContextualHighlight(getOsloNow());
		if (highlight === 'today') {
			return { slug: $lang === 'no' ? 'i-kveld' : 'i-kveld', label: $lang === 'no' ? 'Se hva som skjer i kveld' : "See what's on tonight" };
		}
		if (highlight === 'weekend') {
			return { slug: $lang === 'no' ? 'denne-helgen' : 'this-weekend', label: $lang === 'no' ? 'Se hva som skjer denne helgen' : "See what's on this weekend" };
		}
		return { slug: $lang === 'no' ? 'denne-helgen' : 'this-weekend', label: $lang === 'no' ? 'Se hva som skjer denne helgen' : "See what's on this weekend" };
	});
</script>

<svelte:head>
	<title>{$lang === 'no' ? 'Din guide til Bergen-arrangementer' : 'Your guide to Bergen events'} — Gåri</title>
	<meta name="description" content={$lang === 'no'
		? 'Komplett oversikt over arrangementer i Bergen — konserter, teater, festivaler, familieaktiviteter og mer. Oppdatert daglig fra 54 kilder.'
		: 'Complete guide to events in Bergen, Norway — concerts, theatre, festivals, family activities and more. Updated daily from 54 sources.'} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="nb" href={getCanonicalUrl('/no/guide')} />
	<link rel="alternate" hreflang="en" href={getCanonicalUrl('/en/guide')} />
	<link rel="alternate" hreflang="x-default" href={getCanonicalUrl('/no/guide')} />
	<meta property="og:title" content={$lang === 'no' ? 'Din guide til Bergen-arrangementer' : 'Your guide to Bergen events'} />
	<meta property="og:description" content={$lang === 'no'
		? 'Komplett oversikt over arrangementer i Bergen — konserter, teater, festivaler, familieaktiviteter og mer.'
		: 'Complete guide to events in Bergen — concerts, theatre, festivals, family activities and more.'} />
	<meta property="og:image" content={`${$page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + breadcrumbJsonLd + '</scr' + 'ipt>'}
	{@html '<script type="application/ld+json">' + faqJsonLd + '</scr' + 'ipt>'}
	{@html '<script type="application/ld+json">' + guideCollectionJsonLd + '</scr' + 'ipt>'}
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8 md:py-12">
	<div class="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-sm">

		<!-- Header -->
		<div class="px-6 pt-6 pb-2 md:px-8">
			<a href="/{$lang}" class="mb-3 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]">
				<span aria-hidden="true">←</span> {$lang === 'no' ? 'Forsiden' : 'Home'}
			</a>
			<h1 class="text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl" style="font-family: 'Barlow Condensed', sans-serif">
				{$lang === 'no' ? 'Din guide til Bergen' : 'Your guide to Bergen events'}
			</h1>
			<p class="mt-2 leading-relaxed text-[var(--color-text-secondary)]">
				{$lang === 'no'
					? 'Gåri samler arrangementer fra 54 uavhengige kilder i Bergen, oppdatert daglig klokken 06:00. Bergen har typisk 150–250 arrangementer hver uke, fordelt på konsertscener, teatre, museer, festivaler og friluftsliv.'
					: 'Gåri aggregates events from 53 independent sources in Bergen, updated daily at 06:00. Bergen typically has 150–250 events every week, spanning concert venues, theatres, museums, festivals and outdoor activities.'}
			</p>
			<div class="mt-4 space-y-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
				<p>
					{$lang === 'no'
						? 'Bergen er en av Norges mest kulturaktive byer, med arrangementer spredt over åtte bydeler — fra Grieghallen og Den Nationale Scene i Sentrum til Oseana i Fana og lokale arrangementer i Åsane, Laksevåg og Fyllingsdalen. Gåri dekker alt fra store festivaler som Festspillene, Bergenfest og Nattjazz til ukentlige konserter, utstillinger, familieaktiviteter og studentarrangementer.'
						: 'Bergen is one of Norway\'s most culturally active cities, with events spread across eight districts — from Grieghallen and Den Nationale Scene in the city centre to Oseana in Fana and local happenings in Åsane, Laksevåg and Fyllingsdalen. Gåri covers everything from major festivals like the Bergen International Festival, Bergenfest and Nattjazz to weekly concerts, exhibitions, family activities and student events.'}
				</p>
				<p>
					{$lang === 'no'
						? 'Utforsk samlinger nedenfor for å finne det som passer deg — enten du leter etter gratisarrangementer, familiehelg, konserter denne uken eller noe å gjøre en regnværsdag. Sesongbaserte samlinger som jul i Bergen, 17. mai og påske fylles automatisk med aktuelle arrangementer når sesongen nærmer seg.'
						: 'Browse the collections below to find what suits you — whether you\'re looking for free events, a family weekend, concerts this week or something to do on a rainy day. Seasonal collections like Christmas in Bergen, Constitution Day and Easter are automatically filled with relevant events as the season approaches.'}
				</p>
			</div>
		</div>

		<!-- CTA — contextual: tonight after 16:00, weekend on Fri PM/Sat/Sun -->
		<div class="px-6 pt-4 pb-6 md:px-8">
			<a
				href="/{$lang}/{ctaConfig.slug}"
				class="flex items-center justify-between rounded-xl bg-[var(--color-accent)] px-5 py-3.5 font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
			>
				<span>{ctaConfig.label}</span>
				<span aria-hidden="true" class="text-lg">→</span>
			</a>
		</div>

		<!-- Grouped Evergreen -->
		<section class="px-6 pb-8 md:px-8">
			<h2 class="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
				{$lang === 'no' ? 'Utforsk arrangementer' : 'Explore events'}
			</h2>
			<div class="space-y-4">
				{#each groups as group (group.label)}
					<div>
						<h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
							{group.label}
						</h3>
						<div class="flex flex-wrap gap-2">
							{#each group.items as col (col.slug)}
								<a
									href={col.href ?? `/${$lang}/${col.slug}`}
									class="inline-block rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
								>
									{col.label}
								</a>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<hr class="mx-6 border-[var(--color-border)] md:mx-8" />

		<!-- Seasonal -->
		<section class="px-6 py-8 md:px-8">
			<h2 class="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
				{$lang === 'no' ? 'Sesonghendelser' : 'Seasonal events'}
			</h2>
			<p class="mb-4 text-sm text-[var(--color-text-muted)]">
				{$lang === 'no'
					? 'Fylles med arrangementer når sesongen nærmer seg.'
					: 'Events appear as the season approaches.'}
			</p>
			<ul class="space-y-2">
				{#each seasonal as col (col.slug)}
					{@const status = getStatusBySlug(col.slug)}
					<li>
						<a
							href="/{$lang}/{col.slug}"
							class="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-2.5 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)]"
							class:opacity-60={status === 'off'}
						>
							<span class="text-sm font-medium text-[var(--color-text-secondary)]">{col.label}</span>
							<span class="flex shrink-0 items-center gap-2">
								{#if status === 'active'}
									<span class="whitespace-nowrap rounded-full bg-[var(--funkis-green-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--funkis-green)]">
										{$lang === 'no' ? 'Pågår nå' : 'On now'}
									</span>
								{:else if status === 'soon'}
									<span class="whitespace-nowrap rounded-full bg-[var(--funkis-amber-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--funkis-amber)]">
										{$lang === 'no' ? 'Kommer snart' : 'Coming soon'}
									</span>
								{/if}
								<span class="text-xs text-[var(--color-text-muted)]">{col.period}</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>

		<hr class="mx-6 border-[var(--color-border)] md:mx-8" />

		<!-- Festivals -->
		<section class="px-6 py-8 md:px-8">
			<h2 class="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
				{$lang === 'no' ? 'Festivaler i Bergen' : 'Bergen festivals'}
			</h2>
			<p class="mb-4 text-sm text-[var(--color-text-muted)]">
				{$lang === 'no'
					? 'Fra klassisk musikk og jazz til metal, film og pride.'
					: 'From classical music and jazz to metal, film and pride.'}
			</p>
			<ul class="space-y-2">
				{#each festivals as col (col.slug)}
					{@const status = getStatusBySlug(col.slug)}
					<li>
						<a
							href="/{$lang}/{col.slug}"
							class="flex items-center justify-between rounded-lg border border-[var(--color-border)] border-l-[3px] border-l-[var(--color-accent)] px-4 py-2.5 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)]"
							class:opacity-60={status === 'off'}
						>
							<span class="text-sm font-medium text-[var(--color-text-secondary)]">{col.label}</span>
							<span class="flex shrink-0 items-center gap-2">
								{#if status === 'active'}
									<span class="whitespace-nowrap rounded-full bg-[var(--funkis-green-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--funkis-green)]">
										{$lang === 'no' ? 'Pågår nå' : 'On now'}
									</span>
								{:else if status === 'soon'}
									<span class="whitespace-nowrap rounded-full bg-[var(--funkis-amber-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--funkis-amber)]">
										{$lang === 'no' ? 'Kommer snart' : 'Coming soon'}
									</span>
								{/if}
								<span class="text-xs text-[var(--color-text-muted)]">{col.period}</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>

		<hr class="mx-6 border-[var(--color-border)] md:mx-8" />

		<!-- FAQ -->
		<section class="px-6 py-8 md:px-8">
			<h2 class="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
				{$lang === 'no' ? 'Ofte stilte spørsmål' : 'Frequently asked questions'}
			</h2>
			<div class="space-y-2">
				{#each faq as item, i (item.q)}
					<details class="group rounded-lg border border-[var(--color-border)]" open={i === 0}>
						<summary class="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
							<span>{item.q}</span>
							<svg class="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200 group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="m6 9 6 6 6-6"/>
							</svg>
						</summary>
						<!-- eslint-disable svelte/no-at-html-tags -->
						<p class="px-4 pb-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
							{@html item.a}
						</p>
					</details>
				{/each}
			</div>
		</section>

		<!-- Newsletter -->
		<div class="px-6 pb-8 md:px-8">
			<NewsletterCTA
				id="guide"
				variant="card"
				heading={{ no: 'Hold deg oppdatert', en: 'Stay updated' }}
				subtext={{ no: 'Ukentlig nyhetsbrev med de beste arrangementene i Bergen.', en: 'Weekly newsletter with the best events in Bergen.' }}
			/>
		</div>

	</div>
</div>
