<script lang="ts">
	import { page } from '$app/stores';
	import { lang, t } from '$lib/i18n';
	import { getCanonicalUrl, generateBreadcrumbJsonLd } from '$lib/seo';
	import NewsletterCTA from '$lib/components/NewsletterCTA.svelte';

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/guide`));

	let breadcrumbJsonLd = $derived(generateBreadcrumbJsonLd([
		{ name: 'Gåri', url: getCanonicalUrl(`/${$lang}`) },
		{ name: $lang === 'no' ? 'Guide' : 'Guide' }
	]));

	const evergreenNO = [
		{ slug: 'denne-helgen', label: 'Denne helgen' },
		{ slug: 'i-kveld', label: 'I kveld' },
		{ slug: 'i-dag', label: 'I dag' },
		{ slug: 'gratis', label: 'Gratis' },
		{ slug: 'konserter', label: 'Konserter' },
		{ slug: 'familiehelg', label: 'Familiehelg' },
		{ slug: 'studentkveld', label: 'Studentkveld' },
		{ slug: 'regndagsguide', label: 'Regndagsguide' },
		{ slug: 'sentrum', label: 'Sentrum' },
		{ slug: 'voksen', label: 'Voksen' },
		{ slug: 'for-ungdom', label: 'For ungdom' }
	];
	const evergreenEN = [
		{ slug: 'this-weekend', label: 'This Weekend' },
		{ slug: 'today-in-bergen', label: 'Today' },
		{ slug: 'free-things-to-do-bergen', label: 'Free Events' }
	];

	const seasonalNO = [
		{ slug: '17-mai', label: '17. mai', period: 'Mai' },
		{ slug: 'julemarked', label: 'Jul i Bergen', period: 'Nov–Des' },
		{ slug: 'paske', label: 'Påske', period: 'Mars–April' },
		{ slug: 'sankthans', label: 'Sankthans', period: 'Juni' },
		{ slug: 'nyttarsaften', label: 'Nyttårsaften', period: 'Des–Jan' },
		{ slug: 'vinterferie', label: 'Vinterferie', period: 'Uke 9' },
		{ slug: 'hostferie', label: 'Høstferie', period: 'Uke 41' }
	];
	const seasonalEN = [
		{ slug: '17th-of-may-bergen', label: '17th of May', period: 'May' },
		{ slug: 'christmas-bergen', label: 'Christmas', period: 'Nov–Dec' },
		{ slug: 'easter-bergen', label: 'Easter', period: 'Mar–Apr' },
		{ slug: 'midsummer-bergen', label: 'Midsummer', period: 'June' },
		{ slug: 'new-years-eve-bergen', label: "New Year's Eve", period: 'Dec–Jan' },
		{ slug: 'winter-break-bergen', label: 'Winter Break', period: 'Week 9' }
	];

	const festivalsNO = [
		{ slug: 'festspillene', label: 'Festspillene', period: 'Mai–Juni' },
		{ slug: 'bergenfest', label: 'Bergenfest', period: 'Juni' },
		{ slug: 'nattjazz', label: 'Nattjazz', period: 'Mai–Juni' },
		{ slug: 'beyond-the-gates', label: 'Beyond the Gates', period: 'August' },
		{ slug: 'bergen-pride', label: 'Bergen Pride', period: 'Juni' },
		{ slug: 'biff', label: 'BIFF', period: 'Oktober' },
		{ slug: 'borealis', label: 'Borealis', period: 'Mars' }
	];
	const festivalsEN = [
		{ slug: 'bergen-international-festival', label: 'Bergen International Festival', period: 'May–June' },
		{ slug: 'bergenfest-bergen', label: 'Bergenfest', period: 'June' },
		{ slug: 'nattjazz-bergen', label: 'Nattjazz', period: 'May–June' },
		{ slug: 'beyond-the-gates-bergen', label: 'Beyond the Gates', period: 'August' },
		{ slug: 'bergen-pride-festival', label: 'Bergen Pride', period: 'June' },
		{ slug: 'biff-bergen', label: 'BIFF', period: 'October' },
		{ slug: 'borealis-bergen', label: 'Borealis', period: 'March' }
	];

	let evergreen = $derived($lang === 'no' ? evergreenNO : evergreenEN);
	let seasonal = $derived($lang === 'no' ? seasonalNO : seasonalEN);
	let festivals = $derived($lang === 'no' ? festivalsNO : festivalsEN);
</script>

<svelte:head>
	<title>{$lang === 'no' ? 'Hva skjer i Bergen? Din komplette guide' : "What's on in Bergen? Your complete guide"} — Gåri</title>
	<meta name="description" content={$lang === 'no'
		? 'Komplett oversikt over arrangementer i Bergen — konserter, teater, festivaler, familieaktiviteter og mer. Oppdatert daglig fra 53 lokale kilder.'
		: 'Complete guide to events in Bergen — concerts, theatre, festivals, family activities and more. Updated daily from 53 local sources.'} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="nb" href={getCanonicalUrl('/no/guide')} />
	<link rel="alternate" hreflang="en" href={getCanonicalUrl('/en/guide')} />
	<link rel="alternate" hreflang="x-default" href={getCanonicalUrl('/no/guide')} />
	<meta property="og:title" content={$lang === 'no' ? 'Hva skjer i Bergen? Din komplette guide' : "What's on in Bergen? Your complete guide"} />
	<meta property="og:description" content={$lang === 'no'
		? 'Komplett oversikt over arrangementer i Bergen — konserter, teater, festivaler, familieaktiviteter og mer.'
		: 'Complete guide to events in Bergen — concerts, theatre, festivals, family activities and more.'} />
	<meta property="og:image" content={`${$page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + breadcrumbJsonLd + '</scr' + 'ipt>'}
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">
	<h1 class="mb-4 text-3xl font-bold text-[var(--color-text-primary)]">
		{$lang === 'no' ? 'Hva skjer i Bergen?' : "What's on in Bergen?"}
	</h1>
	<p class="mb-10 text-lg leading-relaxed text-[var(--color-text-secondary)]">
		{#if $lang === 'no'}
			Gåri samler arrangementer fra 53 lokale kilder i Bergen — spillesteder, kulturinstitusjoner, festivalarrangører og billettplattformer. Alt fra konserter og teater til matmarkeder og familieaktiviteter, oppdatert daglig. Her er en oversikt over alt du kan utforske.
		{:else}
			Gåri aggregates events from 53 local sources in Bergen — venues, cultural institutions, festival organisers and ticket platforms. Everything from concerts and theatre to food markets and family activities, updated daily. Here is an overview of everything you can explore.
		{/if}
	</p>

	<!-- Evergreen collections -->
	<section class="mb-10">
		<h2 class="mb-4 text-xl font-semibold text-[var(--color-text-primary)]">
			{$lang === 'no' ? 'Utforsk arrangementer' : 'Explore events'}
		</h2>
		<p class="mb-4 text-sm text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Disse sidene oppdateres daglig og viser arrangementer i Bergen basert på tidspunkt, type og målgruppe.
			{:else}
				These pages are updated daily and show Bergen events by time, type and audience.
			{/if}
		</p>
		<ul class="flex flex-wrap gap-2">
			{#each evergreen as col (col.slug)}
				<li>
					<a
						href="/{$lang}/{col.slug}"
						class="inline-block rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
					>
						{col.label}
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<!-- Seasonal collections -->
	<section class="mb-10">
		<h2 class="mb-4 text-xl font-semibold text-[var(--color-text-primary)]">
			{$lang === 'no' ? 'Sesonghendelser' : 'Seasonal events'}
		</h2>
		<p class="mb-4 text-sm text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Bergen har rike tradisjoner knyttet til høytider og ferier. Disse sidene fylles med arrangementer når sesongen nærmer seg.
			{:else}
				Bergen has rich traditions tied to holidays and school breaks. These pages fill with events as the season approaches.
			{/if}
		</p>
		<ul class="space-y-2">
			{#each seasonal as col (col.slug)}
				<li class="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-2.5">
					<a
						href="/{$lang}/{col.slug}"
						class="text-sm font-medium text-[var(--color-text-secondary)] underline transition-colors hover:text-[var(--color-text-primary)]"
					>
						{col.label}
					</a>
					<span class="text-xs text-[var(--color-text-muted)]">{col.period}</span>
				</li>
			{/each}
		</ul>
	</section>

	<!-- Festival collections -->
	<section class="mb-10">
		<h2 class="mb-4 text-xl font-semibold text-[var(--color-text-primary)]">
			{$lang === 'no' ? 'Festivaler i Bergen' : 'Bergen festivals'}
		</h2>
		<p class="mb-4 text-sm text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Bergen er en festivalby med arrangementer gjennom hele året — fra klassisk musikk og jazz til metal, film og pride.
			{:else}
				Bergen is a festival city with events throughout the year — from classical music and jazz to metal, film and pride.
			{/if}
		</p>
		<ul class="space-y-2">
			{#each festivals as col (col.slug)}
				<li class="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-2.5">
					<a
						href="/{$lang}/{col.slug}"
						class="text-sm font-medium text-[var(--color-text-secondary)] underline transition-colors hover:text-[var(--color-text-primary)]"
					>
						{col.label}
					</a>
					<span class="text-xs text-[var(--color-text-muted)]">{col.period}</span>
				</li>
			{/each}
		</ul>
	</section>

	<!-- About Gåri -->
	<section class="mb-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6">
		<h2 class="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
			{$lang === 'no' ? 'Om Gåri' : 'About Gåri'}
		</h2>
		<p class="mb-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Gåri samler arrangementer fra 53 lokale kilder i Bergen og oppdateres daglig klokken 06:00. Navnet kommer fra det bergenske uttrykket «Ke det går i?» — hva skjer? Alle arrangementer linker direkte til arrangørens egen side.
			{:else}
				Gåri aggregates events from 53 local sources in Bergen and updates daily at 06:00. The name comes from the Bergen dialect phrase "Ke det går i?" — meaning "What's going on?" All events link directly to the organiser's own page.
			{/if}
		</p>
		<a
			href="/{$lang}/about"
			class="text-sm font-medium text-[var(--color-accent)] underline transition-colors hover:text-[var(--color-accent-hover)]"
		>
			{$lang === 'no' ? 'Les mer om Gåri' : 'Read more about Gåri'}
		</a>
	</section>

	<!-- FAQ -->
	<section class="mb-10">
		<h2 class="mb-4 text-xl font-semibold text-[var(--color-text-primary)]">
			{$lang === 'no' ? 'Ofte stilte spørsmål' : 'Frequently asked questions'}
		</h2>
		<div class="space-y-6">
			{#if $lang === 'no'}
				<div>
					<h3 class="mb-1 text-base font-semibold text-[var(--color-text-primary)]">Hva skjer i Bergen i helgen?</h3>
					<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">Bergen har typisk 40–80 arrangementer hver helg. Sjekk <a href="/no/denne-helgen" class="underline">denne helgen</a>-siden for oppdatert program.</p>
				</div>
				<div>
					<h3 class="mb-1 text-base font-semibold text-[var(--color-text-primary)]">Er det gratis arrangementer i Bergen?</h3>
					<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">Bergen har mange gratis aktiviteter — bibliotekkonserter, utstillinger, guidede turer og mer. Se <a href="/no/gratis" class="underline">gratis-siden</a>.</p>
				</div>
				<div>
					<h3 class="mb-1 text-base font-semibold text-[var(--color-text-primary)]">Hvilke festivaler har Bergen?</h3>
					<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">Bergen har festivaler gjennom hele året: Festspillene (mai/juni), Bergenfest (juni), Nattjazz (mai/juni), Beyond the Gates (august), Bergen Pride (juni), BIFF (oktober) og Borealis (mars).</p>
				</div>
				<div>
					<h3 class="mb-1 text-base font-semibold text-[var(--color-text-primary)]">Hva kan man gjøre med barn i Bergen?</h3>
					<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">Bergen har barneforestillinger, museumsaktiviteter, Akvariet og familievennlige arrangementer. Se <a href="/no/familiehelg" class="underline">familiehelg-siden</a>.</p>
				</div>
				<div>
					<h3 class="mb-1 text-base font-semibold text-[var(--color-text-primary)]">Hvor ofte oppdateres Gåri?</h3>
					<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">Gåri oppdateres daglig klokken 06:00 med data fra 53 lokale kilder i Bergen.</p>
				</div>
			{:else}
				<div>
					<h3 class="mb-1 text-base font-semibold text-[var(--color-text-primary)]">What's on in Bergen this weekend?</h3>
					<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">Bergen typically has 40–80 events each weekend. Check the <a href="/en/this-weekend" class="underline">this weekend</a> page for the updated programme.</p>
				</div>
				<div>
					<h3 class="mb-1 text-base font-semibold text-[var(--color-text-primary)]">Are there free things to do in Bergen?</h3>
					<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">Bergen has many free activities — library concerts, exhibitions, guided walks and more. See the <a href="/en/free-things-to-do-bergen" class="underline">free events page</a>.</p>
				</div>
				<div>
					<h3 class="mb-1 text-base font-semibold text-[var(--color-text-primary)]">What festivals does Bergen have?</h3>
					<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">Bergen has festivals throughout the year: Bergen International Festival (May/June), Bergenfest (June), Nattjazz (May/June), Beyond the Gates (August), Bergen Pride (June), BIFF (October) and Borealis (March).</p>
				</div>
				<div>
					<h3 class="mb-1 text-base font-semibold text-[var(--color-text-primary)]">What can families do in Bergen?</h3>
					<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">Bergen has children's shows, museum activities, the Aquarium and family-friendly events. See the <a href="/en/this-weekend" class="underline">weekend page</a> for upcoming family activities.</p>
				</div>
				<div>
					<h3 class="mb-1 text-base font-semibold text-[var(--color-text-primary)]">How often is Gåri updated?</h3>
					<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">Gåri updates daily at 06:00 with data from 53 local sources in Bergen.</p>
				</div>
			{/if}
		</div>
	</section>

	<NewsletterCTA
		id="guide"
		variant="card"
		heading={{ no: 'Hold deg oppdatert på Bergen-arrangementer', en: 'Stay updated on Bergen events' }}
	/>
</div>
