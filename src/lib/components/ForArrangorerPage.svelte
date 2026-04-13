<script lang="ts">
	import { enhance } from '$app/forms';
	import { lang } from '$lib/i18n';
	import { getB2bFaqItems } from '$lib/seo';
	import { SOURCE_COUNT } from '$lib/constants';

	interface Props {
		heroImages: Array<{ url: string; title: string; venue: string }>;
		venueEventsMap?: Record<string, Array<{ url: string; title: string; venue: string }>>;
	}

	let { heroImages = [], venueEventsMap = {} }: Props = $props();

	let contactStatus: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');
	let heroEl: HTMLElement | undefined = $state(undefined);
	let contactEl: HTMLElement | undefined = $state(undefined);
	let heroVisible = $state(true);
	let contactVisible = $state(false);
	let showStickyBar = $derived(!heroVisible && !contactVisible);
	let activeTier = $state<'Basis' | 'Standard' | 'Partner'>('Standard');
	let reportVisible = $state(false);
	let reportEl: HTMLElement | undefined = $state(undefined);
	let heroPromoted = $state(true);
	let activeProductTab = $state(0);
	const visibleVenues = ['Grieghallen', 'Den Nationale Scene', 'KODE', 'USF Verftet', 'Bergen Bibliotek', 'Festspillene', 'Ole Bull Huset', 'Harmonien', 'Fløyen', 'Bergenfest', 'Bergen Kjøtt', 'Cornerteateret', 'Akvariet', 'Litteraturhuset', 'SK Brann', 'Carte Blanche'];
	const allVenues = [...visibleVenues, 'Hulen', 'Kvarteret', 'Forum Scene', 'Landmark', 'Victoria', 'Madam Felle', 'BIT Teatergarasjen', 'Bergen Kunsthall', 'Cinemateket', 'VilVite', 'Bergen Kino', 'Fana Kulturhus', 'Åsane Kulturhus', 'Laksevåg Kultursenter', 'Fyllingsdalen Teater', 'Det Vestnorske Teateret', 'Troldhaugen', 'Sardinen', 'Bergen Domkirke', 'Lydgalleriet', 'Statsraad Lehmkuhl', 'Bergen Pride', 'BIFF', 'Borealis', 'Logen', 'Østre', 'Kulturhuset Sentrum', 'Oseana', 'Det Akademiske Kvarter', 'Verftet', 'Bergen Internasjonale Teater', 'Ny-Krohnborg', 'Laugaren', 'Røkeriet', 'Studio USF', 'Vestre', 'Bergen Filharmoniske Orkester', 'Cornerhagen'];

	let venueSearch = $state('');
	let venueSearchActive = $state(false);
	let venueQuery = $derived(venueSearch.trim().toLowerCase());
	// Find events matching the venue search from the server-provided map
	let searchedVenueEvents = $derived.by(() => {
		if (!venueQuery) return [];
		for (const [key, events] of Object.entries(venueEventsMap)) {
			if (key.includes(venueQuery)) return events;
		}
		return [];
	});

	const faqItems = $derived(getB2bFaqItems($lang));

	const tiers = $derived([
		{
			name: 'Basis' as const,
			price: '1 500',
			roi: $lang === 'no' ? '~50 kr dagen' : '~50 NOK/day',
			recommended: false,
			features: [true, true, false, false, false, false, false, false, false]
		},
		{
			name: 'Standard' as const,
			price: '3 500',
			roi: $lang === 'no' ? 'Kostnaden for en avisannonse' : 'The cost of one newspaper ad',
			recommended: true,
			features: [true, true, true, false, false, false, true, false, true]
		},
		{
			name: 'Partner' as const,
			price: '9 000',
			roi: $lang === 'no' ? 'Full synlighet + 2 000 kr kampanjebudsjett inkl.' : 'Full visibility + 2,000 NOK campaign budget incl.',
			recommended: false,
			features: [true, true, true, true, true, true, true, true, true]
		}
	]);

	const sideCount = $derived<Record<string, string>>({
		'Basis': $lang === 'no' ? 'Opptil 2' : 'Up to 2',
		'Standard': $lang === 'no' ? 'Opptil 4' : 'Up to 4',
		'Partner': $lang === 'no' ? 'Opptil 8' : 'Up to 8'
	});

	const visibilityShare = $derived<Record<string, string>>({
		'Basis': '15%',
		'Standard': '25%',
		'Partner': '35%'
	});

	const featureLabels = $derived($lang === 'no'
		? [
			'Antall utvalgte sider',
			'Synlighetsandel',
			'Synlighet i ukentlig nyhetsbrev',
			'Plass i sosiale medier-poster',
			'Garantert plass i betalte kampanjer',
			'Kampanjebudsjett inkludert (2 000 kr/mnd)',
			'Månedlig rapport med statistikk',
			'Kvartalsmøte med gjennomgang',
			'Prioritert oppfølging'
		]
		: [
			'Number of curated pages',
			'Visibility share',
			'Visibility in weekly newsletter',
			'Spot in social media posts',
			'Guaranteed spot in paid campaigns',
			'Campaign budget included (2,000 NOK/mo)',
			'Monthly report with statistics',
			'Quarterly review meeting',
			'Priority follow-up'
		]
	);

	// Animated counter for report
	let reportCount = $state(0);
	let reportPercent = $state(0);
	const REPORT_TARGET = 320; // Based on ~127 ticket clicks in 12 days = ~320/month
	const REPORT_PERCENT_TARGET = 18;

	function trackEvent(name: string) {
		if (typeof window !== 'undefined' && window.umami) {
			umami.track(name);
		}
	}

	let failedUrls = $state(new Set<string>());

	function handleImageError(event: Event) {
		const img = event.target as HTMLImageElement;
		failedUrls = new Set([...failedUrls, img.src]);
		img.style.opacity = '0';
	}

	// Filter out broken images for the simulation
	let validHeroImages = $derived(heroImages.filter(img => !failedUrls.has(img.url)));

	function animateCount(target: number, duration: number, cb: (v: number) => void) {
		const start = performance.now();
		function tick(now: number) {
			const elapsed = now - start;
			const progress = Math.min(elapsed / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3);
			cb(Math.round(target * eased));
			if (progress < 1) requestAnimationFrame(tick);
		}
		requestAnimationFrame(tick);
	}

	// Hero + contact observer (sticky bar)
	$effect(() => {
		if (!heroEl || !contactEl) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.target === heroEl) heroVisible = entry.isIntersecting;
					if (entry.target === contactEl) contactVisible = entry.isIntersecting;
				}
			},
			{ threshold: 0 }
		);

		observer.observe(heroEl);
		observer.observe(contactEl);

		return () => observer.disconnect();
	});

	// Report count-up animation
	$effect(() => {
		if (!reportEl) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !reportVisible) {
					reportVisible = true;
					const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
					if (prefersReduced) {
						reportCount = REPORT_TARGET;
						reportPercent = REPORT_PERCENT_TARGET;
					} else {
						animateCount(REPORT_TARGET, 1200, (v) => reportCount = v);
						animateCount(REPORT_PERCENT_TARGET, 800, (v) => reportPercent = v);
					}
					observer.disconnect();
				}
			},
			{ threshold: 0.3 }
		);

		observer.observe(reportEl);
		return () => observer.disconnect();
	});

</script>

<!-- === 1. HERO === -->
<section bind:this={heroEl} class="relative overflow-hidden bg-[var(--funkis-iron)]">
	<div class="relative px-4 py-14 md:py-20">
		<div class="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-[1fr_340px]">
			<!-- Text -->
			<div class="text-center md:text-left">
				<p class="mb-3 text-sm font-medium text-white/50">
					<span class="hidden sm:inline">
						{$lang === 'no'
							? `Bergens arrangementskalender · 1 800+ arrangementer · ${SOURCE_COUNT} kilder · Fra 1 500 kr/mnd`
							: `Bergen's event calendar · 1,800+ events · ${SOURCE_COUNT} sources · From 1,500 NOK/mo`}
					</span>
					<span class="sm:hidden">
						{$lang === 'no'
							? `1 800+ arrangementer · ${SOURCE_COUNT} kilder · Fra 1 500 kr/mnd`
							: `1,800+ events · ${SOURCE_COUNT} sources · From 1,500 NOK/mo`}
					</span>
				</p>
				<h1 class="mb-4 text-3xl font-bold tracking-tight text-white font-[family-name:var(--font-display)] md:text-[44px] md:leading-tight">
					{$lang === 'no' ? 'Arrangementet ditt fortjener' : 'Your event deserves'}
					<br />
					<span class="text-[var(--funkis-red)]">{$lang === 'no' ? 'å bli sett først' : 'to be seen first'}</span>
				</h1>
				<p class="mb-6 text-white/70 md:text-lg" style="max-width: 420px;">
					{$lang === 'no'
						? 'Hver uke planlegger tusenvis av bergensere helgen på Gåri. Ditt arrangement er allerede her — vi løfter det til toppen.'
						: 'Every week, thousands of people in Bergen plan their weekend on Gåri. Your event is already here — we bring it to the top.'}
				</p>
				<a
					href="#how-it-works"
					data-umami-event="for-arrangorer-hero-cta"
					onclick={() => trackEvent('for-arrangorer-hero-cta')}
					class="inline-block rounded-xl bg-[var(--funkis-red)] px-8 py-3 text-base font-semibold text-white hover:opacity-90"
					style="min-height: 44px; line-height: 24px;"
				>
					{$lang === 'no' ? 'Se hvordan det fungerer' : 'See how it works'}
				</a>
			</div>

			<!-- Interactive toggle: with/without promoted placement -->
			{#if validHeroImages.length > 1}
				<div class="mx-auto w-full" style="max-width: 340px;">
					<!-- Event card — the whole card is clickable as toggle -->
					<button
						onclick={() => { heroPromoted = !heroPromoted; trackEvent('hero-toggle-promoted'); }}
						aria-pressed={heroPromoted}
						aria-label={$lang === 'no' ? 'Slå fremhevet plassering av og på' : 'Toggle promoted placement on and off'}
						class="hero-card-toggle w-full cursor-pointer text-left transition-all duration-500"
						style="{heroPromoted
							? 'transform: translateY(0);'
							: 'transform: translateY(16px);'}"
					>
						<div
							class="overflow-hidden rounded-xl bg-[var(--color-bg-surface)] transition-all duration-500"
							style="{heroPromoted
								? 'box-shadow: 0 20px 40px rgba(200,45,45,0.3), 0 0 0 2px rgba(200,45,45,0.2);'
								: 'box-shadow: 0 8px 20px rgba(0,0,0,0.3);'}"
						>
							<div class="relative overflow-hidden" style="aspect-ratio: 16/9;">
								<img
									src={validHeroImages[0].url}
									alt=""
									width="340"
									height="191"
									loading="eager"
									class="h-full w-full object-cover"
								/>
								<!-- Badge -->
								<span
									class="absolute right-2 top-2 rounded-full border border-[var(--funkis-red)] bg-[var(--color-bg-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-primary)] transition-all duration-500"
									style="{heroPromoted
										? 'transform: scale(1); opacity: 1;'
										: 'transform: scale(0); opacity: 0;'}"
								>
									{$lang === 'no' ? 'Fremhevet' : 'Featured'}
								</span>
							</div>
							<div class="p-3">
								<p class="font-semibold leading-tight">{validHeroImages[0].title}</p>
								<p class="mt-1 text-sm text-[var(--color-text-secondary)]">{validHeroImages[0].venue}</p>
							</div>
						</div>

						<!-- Toggle bar under the card -->
						<div
							class="mt-3 flex items-center justify-between rounded-xl px-4 py-2.5 transition-all duration-300"
							style="{heroPromoted
								? 'background: var(--funkis-red); color: white;'
								: 'background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6);'}"
						>
							<div>
								<span class="text-xs font-semibold">
									{$lang === 'no' ? 'Fremhevet plassering' : 'Promoted placement'}
								</span>
								<span class="block text-[10px] transition-all duration-300" style="opacity: 0.7;">
									{heroPromoted
										? ($lang === 'no' ? 'Blant de første av 200+' : 'Among the first of 200+')
										: ($lang === 'no' ? 'Posisjon #47 av 200+' : 'Position #47 of 200+')}
								</span>
							</div>
							<!-- Toggle switch -->
							<span
								class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-all duration-300"
								style="{heroPromoted
									? 'background: rgba(255,255,255,0.3);'
									: 'background: rgba(255,255,255,0.15);'}"
							>
								<span
									class="inline-block h-3.5 w-3.5 rounded-full transition-all duration-300"
									style="{heroPromoted
										? 'transform: translateX(16px); background: white;'
										: 'transform: translateX(3px); background: rgba(255,255,255,0.4);'}"
								></span>
							</span>
						</div>
					</button>

				</div>
			{/if}
		</div>
	</div>
</section>


<!-- === 2. BRIDGE + SJEKK OM DU ER HER === -->
<section id="how-it-works" class="bg-[var(--color-bg-surface)] px-4 py-16 md:py-20">
	<div class="mx-auto grid max-w-4xl items-start gap-10 md:grid-cols-[1fr_1fr]">
		<!-- Left: bridge text -->
		<div>
			<h2 class="mb-4 text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
				{$lang === 'no' ? 'Er du allerede på Gåri?' : 'Are you already on Gåri?'}
			</h2>
			<p class="text-[var(--color-text-secondary)]">
				{$lang === 'no'
					? 'Hver dag legger vi til over 100 nye arrangementer fra Grieghallen, DNS, USF Verftet og resten av Bergen. Nesten tre av fire besøkende klikker seg inn på minst ett arrangement.'
					: 'Every day we add over 100 new events from Grieghallen, DNS, USF Verftet and the rest of Bergen. Nearly three in four visitors click into at least one event.'}
			</p>
		</div>
		<!-- Right: search -->
		<div>
			<input
				type="text"
				bind:value={venueSearch}
				oninput={() => venueSearchActive = venueSearch.trim().length > 0}
				placeholder={$lang === 'no' ? 'Skriv navnet på organisasjonen din...' : 'Type the name of your organization...'}
				class="w-full rounded-xl border-2 bg-[var(--color-bg-surface)] px-5 py-4 text-base transition-all duration-300"
				style="min-height: 52px; border-color: {venueSearchActive ? 'var(--funkis-red)' : 'var(--color-border)'}; box-shadow: {venueSearchActive ? '0 0 0 4px rgba(200,45,45,0.1)' : 'var(--shadow-sm)'};"
			/>
			{#if !venueSearchActive}
				<p class="mt-2 text-xs text-[var(--color-text-muted)]">
					{$lang === 'no' ? 'F.eks. Grieghallen, USF Verftet, Cornerteateret...' : 'E.g. Grieghallen, USF Verftet, Cornerteateret...'}
				</p>
			{/if}
			{#if venueSearchActive}
				{@const hasMatch = allVenues.some(v => v.toLowerCase().includes(venueQuery))}
				<div class="mt-4 space-y-2">
					{#if hasMatch}
						<div class="inline-flex items-center gap-2 rounded-full bg-[var(--funkis-green-subtle)] px-5 py-2.5">
							<span class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--funkis-green)] text-xs text-white">&#10003;</span>
							<span class="text-sm font-semibold text-[var(--funkis-green)]">
								{$lang === 'no' ? 'Du er allerede på Gåri!' : "You're already on Gåri!"}
							</span>
						</div>
						{@const displayEvents = searchedVenueEvents.length > 0 ? searchedVenueEvents.slice(0, 3) : validHeroImages.slice(0, 3)}
						<div class="mt-3 flex gap-2">
							{#each displayEvents as evt, i (evt.url)}
								<div class="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-left {i >= 2 ? 'hidden sm:block' : ''}" style="width: 140px; box-shadow: var(--shadow-sm);">
									<div class="overflow-hidden" style="aspect-ratio: 16/9;">
										<img src={evt.url} alt="" class="h-full w-full object-cover" />
									</div>
									<div class="p-1.5">
										<p class="font-semibold leading-tight truncate" style="font-size: 9px;">{evt.title}</p>
										<p class="text-[var(--color-text-muted)] truncate" style="font-size: 8px;">{evt.venue}</p>
									</div>
								</div>
							{/each}
						</div>
						{#if searchedVenueEvents.length === 0}
							<p class="mt-1 text-xs text-[var(--color-text-muted)]">
								{$lang === 'no' ? 'Eksempler fra arrangementer på Gåri' : 'Examples of events on Gåri'}
							</p>
						{/if}
					{:else}
						<a href="#contact" class="inline-flex items-center gap-2 rounded-full bg-[var(--funkis-red-subtle)] px-5 py-2.5 text-sm font-semibold text-[var(--funkis-red)] hover:underline">
							{$lang === 'no' ? 'Ikke funnet? Ta kontakt.' : "Not found? Get in touch."}
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</section>

<!-- === 3. HVA DU FÅR — interactive product tabs === -->

<!-- === 3. BLI SETT FØRST — product showcase === -->
<section class="bg-[var(--funkis-plaster)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-4xl">
		<h2 class="mb-3 text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
			{$lang === 'no' ? 'Bli sett først' : 'Be seen first'}
		</h2>
		<p class="mb-8 text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Folk som bruker Gåri blar gjennom nesten 4 sider — de leter etter noe å gjøre. Med fremhevet plassering er du blant de første de ser.'
				: 'People using Gåri browse nearly 4 pages — they\'re looking for something to do. With promoted placement, you\'re among the first they see.'}
		</p>

		<!-- Key numbers strip — always visible -->
		<div class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
			<div class="rounded-xl bg-[var(--color-bg-surface)] p-4 text-center" style="box-shadow: var(--shadow-sm);">
				<p class="text-2xl font-bold leading-none font-[family-name:var(--font-display)] text-[var(--funkis-red)] md:text-3xl">21%</p>
				<p class="mt-1 text-xs text-[var(--color-text-muted)]">{$lang === 'no' ? 'klikker til billett' : 'click to tickets'}</p>
			</div>
			<div class="rounded-xl bg-[var(--color-bg-surface)] p-4 text-center" style="box-shadow: var(--shadow-sm);">
				<p class="text-2xl font-bold leading-none font-[family-name:var(--font-display)] text-[var(--funkis-red)] md:text-3xl">52x</p>
				<p class="mt-1 text-xs text-[var(--color-text-muted)]">{$lang === 'no' ? 'nyhetsbrev i året' : 'newsletters per year'}</p>
			</div>
			<div class="rounded-xl bg-[var(--color-bg-surface)] p-4 text-center" style="box-shadow: var(--shadow-sm);">
				<p class="text-2xl font-bold leading-none font-[family-name:var(--font-display)] text-[var(--funkis-red)] md:text-3xl">50k+</p>
				<p class="mt-1 text-xs text-[var(--color-text-muted)]">{$lang === 'no' ? 'i Facebook-grupper' : 'in Facebook groups'}</p>
			</div>
			<div class="rounded-xl bg-[var(--color-bg-surface)] p-4 text-center" style="box-shadow: var(--shadow-sm);">
				<p class="text-2xl font-bold leading-none font-[family-name:var(--font-display)] text-[var(--funkis-red)] md:text-3xl">2 000</p>
				<p class="mt-1 text-xs text-[var(--color-text-muted)]">{$lang === 'no' ? 'kr/mnd kampanjebudsjett' : 'NOK/mo campaign budget'}</p>
			</div>
		</div>

		<!-- Tab buttons -->
		<div class="mb-6 flex flex-wrap gap-2" role="tablist">
			{#each ($lang === 'no'
				? ['Utvalgte sider', 'Nyhetsbrev', 'Sosiale medier', 'Betalte kampanjer']
				: ['Curated pages', 'Newsletter', 'Social media', 'Paid campaigns']
			) as label, i (label)}
				<button
					role="tab"
					aria-selected={activeProductTab === i}
					onclick={() => { activeProductTab = i; trackEvent(`product-tab-${i}`); }}
					class="rounded-full px-4 py-2 text-sm font-medium transition-all duration-200"
					style="min-height: 40px; {activeProductTab === i
						? 'background: var(--funkis-iron); color: white; box-shadow: var(--shadow-md);'
						: 'background: var(--color-bg-surface); color: var(--color-text-secondary); border: 1px solid var(--color-border);'}"
				>
					{label}
				</button>
			{/each}
		</div>

		<!-- Tab content — mockup full width -->
		<div>
			{#if activeProductTab === 0}
				{#if validHeroImages.length > 5}
					<div class="overflow-hidden rounded-xl" style="box-shadow: var(--shadow-lg);">
						<div class="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--funkis-plaster)] px-3 py-2">
							<div class="flex gap-1.5">
								<div class="h-2.5 w-2.5 rounded-full" style="background: #FF5F57;"></div>
								<div class="h-2.5 w-2.5 rounded-full" style="background: #FFBD2E;"></div>
								<div class="h-2.5 w-2.5 rounded-full" style="background: #28CA41;"></div>
							</div>
							<div class="flex-1 rounded-md bg-white px-2 py-0.5 text-[var(--color-text-muted)]" style="font-size: 10px; font-family: ui-monospace, monospace;">
								gaari.no/no/denne-helgen
							</div>
						</div>
						<div class="bg-[var(--color-bg)] p-4">
							<p class="mb-3 font-bold font-[family-name:var(--font-display)]" style="font-size: 14px;">
								{$lang === 'no' ? 'Denne helgen i Bergen' : 'This weekend in Bergen'}
							</p>
							<div class="grid grid-cols-3 gap-2">
								<!-- Promoted -->
								<div class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]" style="box-shadow: var(--shadow-sm);">
									<div class="relative overflow-hidden" style="aspect-ratio: 16/9;">
										<img src={validHeroImages[0].url} alt="" class="h-full w-full object-cover" onerror={handleImageError} />
										<span class="absolute right-1.5 top-1.5 rounded-full border border-[var(--funkis-red)] bg-[var(--color-bg-surface)] px-1.5 py-0.5 text-[var(--color-text-primary)]" style="font-size: 8px; font-weight: 600;">
											{$lang === 'no' ? 'Fremhevet' : 'Featured'}
										</span>
									</div>
									<div class="p-2">
										<p class="font-semibold leading-tight truncate" style="font-size: 10px;">{validHeroImages[0].title}</p>
										<p class="text-[var(--color-text-muted)] truncate" style="font-size: 8px;">{validHeroImages[0].venue}</p>
									</div>
								</div>
								{#each validHeroImages.slice(1, 6) as img (img.url)}
									<div class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]" style="box-shadow: var(--shadow-sm);">
										<div class="overflow-hidden" style="aspect-ratio: 16/9;">
											<img src={img.url} alt="" class="h-full w-full object-cover" onerror={handleImageError} />
										</div>
										<div class="p-2">
											<p class="font-semibold leading-tight truncate" style="font-size: 10px;">{img.title}</p>
											<p class="text-[var(--color-text-muted)] truncate" style="font-size: 8px;">{img.venue}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}

			{:else if activeProductTab === 1}
				{#if validHeroImages.length > 3}
					<div class="mx-auto overflow-hidden rounded-xl bg-[var(--color-bg-surface)]" style="max-width: 500px; box-shadow: var(--shadow-lg);">
						<div class="border-b border-[var(--color-border)] px-4 py-3">
							<div class="flex items-center gap-2">
								<div class="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--funkis-red)] text-[9px] font-bold text-white">G</div>
								<div>
									<p class="font-semibold" style="font-size: 11px;">Gåri Bergen</p>
									<p class="text-[var(--color-text-muted)]" style="font-size: 9px;">{$lang === 'no' ? 'Denne uken i Bergen' : 'This week in Bergen'}</p>
								</div>
							</div>
						</div>
						<div class="p-4">
							<div class="mb-3 overflow-hidden rounded-lg" style="border-top: 3px solid #AECDE8;">
								<div class="relative overflow-hidden" style="height: 160px;">
									<img src={validHeroImages[0].url} alt="" class="h-full w-full object-cover" />
									<div class="absolute inset-x-0 bottom-0 p-3" style="background: linear-gradient(transparent, rgba(0,0,0,0.7));">
										<span class="inline-block rounded px-1.5 py-0.5 text-white" style="font-size: 8px; background: var(--funkis-red);">{$lang === 'no' ? 'Fremhevet' : 'Featured'}</span>
										<p class="mt-1 font-bold text-white leading-tight" style="font-size: 13px;">{validHeroImages[0].title}</p>
										<p style="font-size: 10px; color: rgba(255,255,255,0.7);">{validHeroImages[0].venue}</p>
									</div>
								</div>
								<div class="px-3 py-2">
									<span class="text-[var(--funkis-red)] font-semibold" style="font-size: 11px;">{$lang === 'no' ? 'Les mer →' : 'Read more →'}</span>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-2">
								{#each validHeroImages.slice(1, 3) as img (img.url)}
									<div class="overflow-hidden rounded-lg border border-[var(--color-border)]">
										<div class="overflow-hidden" style="height: 80px;">
											<img src={img.url} alt="" class="h-full w-full object-cover" />
										</div>
										<div class="p-2">
											<p class="font-semibold truncate" style="font-size: 10px;">{img.title}</p>
											<p class="text-[var(--funkis-red)] font-semibold" style="font-size: 9px;">{$lang === 'no' ? 'Les mer →' : 'Read more →'}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}

			{:else if activeProductTab === 2}
				{#if validHeroImages.length > 2}
					<div class="mx-auto overflow-hidden rounded-[2rem] bg-[var(--funkis-iron)]" style="width: 340px; max-width: 100%; box-shadow: var(--shadow-lg); padding: 6px;">
						<div class="overflow-hidden rounded-[1.5rem] bg-white">
							<div class="mx-auto mt-2 h-3 w-16 rounded-full bg-[var(--funkis-iron)]"></div>
							<div class="p-3 pt-3">
								<div class="mb-2 flex items-center gap-2">
									<div class="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--funkis-red)] text-[8px] font-bold text-white">G</div>
									<span class="font-semibold" style="font-size: 11px;">gaari_bergen</span>
								</div>
								<div class="relative overflow-hidden rounded-lg" style="aspect-ratio: 1/1;">
									<img src={validHeroImages[0].url} alt="" class="h-full w-full object-cover" />
									<div class="absolute inset-x-0 bottom-0 p-3" style="background: linear-gradient(transparent, rgba(0,0,0,0.8));">
										<p class="font-bold text-white leading-tight" style="font-size: 12px;">{validHeroImages[0].title}</p>
										<p style="font-size: 10px; color: rgba(255,255,255,0.7);">{validHeroImages[0].venue}</p>
									</div>
									<div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
										<div class="h-1.5 w-1.5 rounded-full bg-white"></div>
										<div class="h-1.5 w-1.5 rounded-full bg-white/40"></div>
										<div class="h-1.5 w-1.5 rounded-full bg-white/40"></div>
										<div class="h-1.5 w-1.5 rounded-full bg-white/40"></div>
									</div>
								</div>
								<div class="mt-2 flex gap-4 text-[var(--color-text-muted)]" style="font-size: 10px;">
									<span>&#9825; 47</span>
									<span>&#128172; 12</span>
									<span>&#8618; 8</span>
								</div>
							</div>
						</div>
					</div>
				{/if}

			{:else if activeProductTab === 3}
				{#if validHeroImages.length > 0}
					<div class="mx-auto overflow-hidden rounded-xl bg-[var(--color-bg-surface)]" style="max-width: 500px; box-shadow: var(--shadow-lg);">
						<div class="flex items-center gap-2 px-3 py-2.5">
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--funkis-red)] text-[10px] font-bold text-white">G</div>
							<div>
								<p class="font-semibold" style="font-size: 11px;">Gåri Bergen</p>
								<p class="text-[var(--color-text-muted)]" style="font-size: 9px;">{$lang === 'no' ? 'Sponset' : 'Sponsored'}</p>
							</div>
						</div>
						<p class="px-3 pb-2" style="font-size: 11px;">
							{$lang === 'no' ? 'Hva skjer i Bergen denne helgen?' : "What's on in Bergen this weekend?"}
						</p>
						<div class="relative">
							<img src={validHeroImages[0].url} alt="" class="w-full object-cover" style="aspect-ratio: 1.91/1;" />
						</div>
						<div class="flex items-center justify-between border-t border-[var(--color-border)] px-3 py-2.5">
							<div>
								<p class="font-semibold" style="font-size: 10px;">gaari.no</p>
								<p class="text-[var(--color-text-muted)]" style="font-size: 9px;">
									{$lang === 'no' ? 'Se arrangementer i Bergen' : 'See events in Bergen'}
								</p>
							</div>
							<span class="rounded-md px-3 py-1.5 font-semibold" style="font-size: 10px; background: var(--color-border);">
								{$lang === 'no' ? 'Se mer' : 'Learn more'}
							</span>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- CTA after tabs -->
		<div class="mt-8 text-center">
			<a
				href="#pricing"
				class="inline-flex items-center gap-1 text-sm font-semibold text-[var(--funkis-red)] hover:underline"
				style="min-height: 44px;"
			>
				{$lang === 'no' ? 'Se priser' : 'See pricing'} →
			</a>
		</div>
	</div>
</section>

<!-- === 4. BEVIS — rapport som klimaks === -->
<section class="px-4 py-16 md:py-20" style="background: var(--funkis-iron);">
	<div class="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[1fr_1fr]">
		<div>
			<h2 class="mb-3 text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl" style="color: white;">
				{$lang === 'no' ? 'Tall du kan vise sjefen' : 'Numbers you can show your boss'}
			</h2>
			<p style="color: rgba(255,255,255,0.7);">
				{$lang === 'no'
					? 'Hver måned får du en rapport med klikk fra Gåri til nettsiden din, hvilke arrangementer som traff best, og hvor synligheten kom fra.'
					: 'Every month you get a report with clicks from Gåri to your website, which events performed best, and where the visibility came from.'}
			</p>
			<p class="mt-3 text-sm" style="color: rgba(255,255,255,0.4);">
				{$lang === 'no' ? 'Standard og Partner' : 'Standard and Partner'}
			</p>
		</div>
		<div class="flex justify-center">
			<div bind:this={reportEl} class="w-full rounded-xl bg-[var(--color-bg-surface)] p-5" style="max-width: 360px; box-shadow: var(--shadow-lg);">
				<p class="mb-3 text-sm font-bold">Grieghallen — {$lang === 'no' ? 'mars' : 'March'} 2026</p>
				<div class="mb-3 border-t border-[var(--color-border)]"></div>
				<div class="mb-1 flex items-baseline justify-between">
					<span class="text-sm text-[var(--color-text-secondary)]">{$lang === 'no' ? 'Klikk fra Gåri' : 'Clicks from Gåri'}</span>
					<div class="flex items-baseline gap-2">
						<span class="text-[36px] font-bold leading-none font-[family-name:var(--font-display)] text-[var(--funkis-red)]" style="font-variant-numeric: tabular-nums;">{reportCount}</span>
						<span class="text-sm font-semibold text-[var(--funkis-green)]">+{reportPercent}%</span>
					</div>
				</div>
				<div class="my-3 border-t border-[var(--color-border)]"></div>
				<div class="space-y-1.5 text-sm" style="font-variant-numeric: tabular-nums;">
					<div class="flex justify-between">
						<span class="text-[var(--color-text-secondary)]">{$lang === 'no' ? 'Fra utvalgte sider' : 'From curated pages'}</span>
						<span class="font-medium">134</span>
					</div>
					<div class="flex justify-between">
						<span class="text-[var(--color-text-secondary)]">{$lang === 'no' ? 'Fra nyhetsbrev' : 'From newsletter'}</span>
						<span class="font-medium">68</span>
					</div>
					<div class="flex justify-between">
						<span class="text-[var(--color-text-secondary)]">{$lang === 'no' ? 'Fra hovedsiden' : 'From homepage'}</span>
						<span class="font-medium">134</span>
					</div>
				</div>
				<div class="mt-3 border-t border-[var(--color-border)] pt-3">
					<p class="text-xs italic text-[var(--color-text-muted)]">{$lang === 'no' ? 'Estimat basert på 127 billettklikk over 12 dager' : 'Estimate based on 127 ticket clicks over 12 days'}</p>
				</div>
			</div>
		</div>
		<!-- CTA after report -->
		<div class="mt-8 text-center md:text-left">
			<a
				href="#pricing"
				class="inline-flex items-center gap-1 text-sm font-semibold text-[var(--funkis-red)] hover:underline"
				style="min-height: 44px;"
			>
				{$lang === 'no' ? 'Klar? Se hva som passer deg' : 'Ready? See what fits you'} →
			</a>
		</div>
	</div>
</section>

<!-- === 7. PRISER === -->
<section id="pricing" class="bg-[var(--funkis-plaster)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-4xl">
		<div class="mb-2 text-center">
			<h2 class="mb-3 text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
				{$lang === 'no' ? 'Velg synligheten som passer deg' : 'Choose the visibility that fits'}
			</h2>
			<p class="text-sm font-semibold text-[var(--funkis-green)]">
				{$lang === 'no' ? 'Ingen bindingstid' : 'No commitment period'}
			</p>
		</div>

		<!-- Tier selector tabs -->
		<div class="mt-10 flex justify-center gap-2" role="tablist">
			{#each tiers as tier (tier.name)}
				<button
					role="tab"
					aria-selected={activeTier === tier.name}
					aria-controls="pricing-details"
					onclick={() => { activeTier = tier.name; trackEvent(`for-arrangorer-tab-${tier.name.toLowerCase()}`); }}
					class="relative rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200"
					style="min-height: 44px; {activeTier === tier.name
						? 'background: var(--funkis-red); color: white; box-shadow: var(--shadow-lg);'
						: 'background: var(--color-bg-surface); color: var(--color-text-primary); border: 1px solid var(--color-border);'}"
				>
					{#if tier.recommended}
						<span
							class="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-semibold"
							style="{activeTier === tier.name
								? 'background: white; color: var(--funkis-red);'
								: 'background: var(--funkis-red); color: white;'}"
						>
							{$lang === 'no' ? 'Anbefalt' : 'Recommended'}
						</span>
					{/if}
					{tier.name}
				</button>
			{/each}
		</div>

		<!-- Active tier details -->
		{#each tiers as tier (tier.name)}
			{#if activeTier === tier.name}
				<div id="pricing-details" role="tabpanel" class="mt-8">
					<div class="grid items-start gap-8 rounded-xl bg-[var(--color-bg-surface)] p-8 md:grid-cols-[1fr_1fr]" style="box-shadow: var(--shadow-lg);">
						<!-- Left: price + CTA -->
						<div class="text-center md:text-left">
							<h3 class="mb-2 text-2xl font-bold font-[family-name:var(--font-display)]">{tier.name}</h3>
							<p class="mb-1">
								<span class="text-[48px] font-bold leading-none font-[family-name:var(--font-display)]">{tier.price}</span>
								<span class="text-sm text-[var(--color-text-secondary)]"> kr/{$lang === 'no' ? 'mnd' : 'mo'}</span>
							</p>
							<p class="mb-2 text-xs text-[var(--color-text-muted)]">{$lang === 'no' ? 'ekskl. mva' : 'excl. VAT'}</p>
							<p class="mb-6 text-sm text-[var(--color-text-secondary)]">{tier.roi}</p>
						</div>
						<!-- Right: features -->
						<div class="space-y-2">
							{#each featureLabels as label, i (label)}
								<div class="flex items-center gap-3 text-sm">
									{#if i === 0}
										<span class="text-[var(--funkis-green)]">&#10003;</span>
										<span>{sideCount[tier.name]} {$lang === 'no' ? 'utvalgte sider' : 'curated pages'}</span>
									{:else if i === 1}
										<span class="text-[var(--funkis-green)]">&#10003;</span>
										<span>{visibilityShare[tier.name]} {$lang === 'no' ? 'synlighetsandel' : 'visibility share'}</span>
									{:else if tier.features[i]}
										<span class="text-[var(--funkis-green)]">&#10003;</span>
										<span>{label}</span>
									{:else}
										<span class="text-[var(--color-text-muted)]">—</span>
										<span class="text-[var(--color-text-muted)]">{label}</span>
									{/if}
								</div>
							{/each}
						</div>
						<!-- CTA spans both columns -->
						<div class="md:col-span-2">
							<a
								href="#contact"
								data-umami-event="for-arrangorer-pricing-{tier.name.toLowerCase()}"
								onclick={() => trackEvent(`for-arrangorer-pricing-${tier.name.toLowerCase()}`)}
								class="block rounded-xl bg-[var(--funkis-red)] px-6 py-3 text-center text-base font-semibold text-white hover:opacity-90"
								style="min-height: 44px; line-height: 24px;"
							>
								{$lang === 'no' ? 'Ta kontakt' : 'Get in touch'}
							</a>
						</div>
					</div>
				</div>
			{/if}
		{/each}

		<!-- Early bird banner -->
		<div class="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-5 py-4 text-center" style="box-shadow: var(--shadow-sm);">
			<p class="text-sm text-[var(--color-text-primary)]">
				<span class="font-semibold text-[var(--funkis-red)]">
					{$lang === 'no' ? 'Tidlig partner-tilbud: ' : 'Early partner offer: '}
				</span>
				{$lang === 'no'
					? '3 måneder gratis Standard-pakken for de som starter før 1. juni 2026. Ingen bindingstid.'
					: '3 months free Standard package for those who start before June 1, 2026. No commitment.'}
			</p>
		</div>

		<!-- À la carte -->
		<div class="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-6 py-6" style="box-shadow: var(--shadow-sm);">
			<div class="flex flex-col items-center gap-4 md:flex-row md:justify-between">
				<div class="text-center md:text-left">
					<h3 class="text-lg font-bold font-[family-name:var(--font-display)]">
						{$lang === 'no' ? 'Har du noen arrangementer, men ikke så mange?' : 'Have a few events, but not that many?'}
					</h3>
					<p class="mt-1 text-sm text-[var(--color-text-secondary)]">
						{$lang === 'no'
							? 'Fremhevet plassering på én utvalgt side og i nyhetsbrevet i opptil 2 uker.'
							: 'Promoted placement on one curated page and in the newsletter for up to 2 weeks.'}
					</p>
					<p class="mt-2 text-sm text-[var(--color-text-muted)]">
						{$lang === 'no'
							? 'Festival eller større produksjon? Ta kontakt for en tilpasset pakke.'
							: 'Festival or larger production? Get in touch for a custom package.'}
					</p>
				</div>
				<div class="shrink-0 text-center">
					<p>
						<span class="text-[32px] font-bold leading-none font-[family-name:var(--font-display)]">750</span>
						<span class="text-sm text-[var(--color-text-secondary)]"> kr/{$lang === 'no' ? 'arrangement' : 'event'}</span>
					</p>
					<p class="mt-1 text-xs text-[var(--color-text-muted)]">{$lang === 'no' ? 'ekskl. mva' : 'excl. VAT'}</p>
					<a
						href="#contact"
						data-umami-event="for-arrangorer-pricing-alacarte"
						onclick={() => trackEvent('for-arrangorer-pricing-alacarte')}
						class="mt-3 inline-block rounded-xl bg-[var(--funkis-plaster)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] hover:opacity-90"
						style="min-height: 44px; line-height: 24px;"
					>
						{$lang === 'no' ? 'Ta kontakt' : 'Get in touch'}
					</a>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- === 8. FAQ === -->
<section class="bg-[var(--color-bg-surface)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-4xl">
		<h2 class="mb-8 text-center text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
			{$lang === 'no' ? 'Ofte stilte spørsmål' : 'Frequently asked questions'}
		</h2>

		<div class="space-y-2">
			{#each faqItems as item (item.q)}
				<details class="group rounded-lg border border-[var(--color-border-subtle)]">
					<summary class="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
						{item.q}
						<span class="ml-2 shrink-0 text-[var(--color-text-muted)] transition-transform group-open:rotate-180">&#9660;</span>
					</summary>
					<div class="px-5 pb-4">
						<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.a}</p>
					</div>
				</details>
			{/each}
		</div>
	</div>
</section>

<!-- === 9. KONTAKTSKJEMA === -->
<section bind:this={contactEl} id="contact" class="px-4 py-16 md:py-20" style="background-color: var(--funkis-red-subtle);">
	<div class="mx-auto max-w-md text-center">
		<div class="mx-auto mb-4 h-1 w-16 rounded bg-[var(--funkis-red)]"></div>
		<h2 class="mb-4 text-2xl font-bold text-[var(--funkis-iron)] font-[family-name:var(--font-display)] md:text-[32px]">
			{$lang === 'no' ? 'Klar for å prøve?' : 'Ready to try?'}
		</h2>
		<p class="mb-8 text-[var(--funkis-steel)]">
			{$lang === 'no'
				? 'Fyll ut skjemaet, så sender vi deg et forslag innen én arbeidsdag. 3 måneder gratis, ingen bindingstid.'
				: 'Fill out the form and we\'ll send you a proposal within one working day. 3 months free, no commitment.'}
		</p>

		{#if contactStatus === 'success'}
			<div role="status" class="rounded-xl p-6" style="border: 1px solid var(--funkis-green-subtle); background: var(--funkis-green-subtle);">
				<p class="text-lg font-semibold" style="color: var(--funkis-green);">
					{$lang === 'no' ? 'Takk! Vi tar kontakt snart.' : "Thanks! We'll be in touch soon."}
				</p>
			</div>
		{:else}
			<form
				method="POST"
				action="?/contact"
				use:enhance={() => {
					contactStatus = 'submitting';
					return async ({ result }) => {
						if (result.type === 'success') {
							contactStatus = 'success';
							trackEvent('for-arrangorer-form-submit');
							if (typeof window !== 'undefined' && window.umami) {
								umami.track('inquiry-submit', { source: 'for-arrangorer' });
							}
						} else {
							contactStatus = 'error';
						}
					};
				}}
				class="space-y-4 rounded-xl bg-[var(--color-bg-surface)] p-6 text-left"
				style="box-shadow: var(--shadow-sm);"
			>
				<!-- Honeypot -->
				<div class="absolute -left-[9999px]" aria-hidden="true">
					<input type="text" name="website" tabindex="-1" autocomplete="off" />
				</div>

				<div>
					<label for="contact-name" class="mb-1 block text-sm font-medium">
						{$lang === 'no' ? 'Navn' : 'Name'}
					</label>
					<input
						type="text"
						id="contact-name"
						name="name"
						required
						aria-required="true"
						placeholder={$lang === 'no' ? 'Ola Nordmann' : 'Your name'}
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm"
						style="min-height: 44px;"
					/>
				</div>

				<div>
					<label for="contact-org" class="mb-1 block text-sm font-medium">
						{$lang === 'no' ? 'Organisasjon' : 'Organization'}
					</label>
					<input
						type="text"
						id="contact-org"
						name="organization"
						required
						aria-required="true"
						placeholder={$lang === 'no' ? 'Grieghallen, USF Verftet...' : 'Grieghallen, USF Verftet...'}
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm"
						style="min-height: 44px;"
					/>
				</div>

				<div>
					<label for="contact-email" class="mb-1 block text-sm font-medium">
						{$lang === 'no' ? 'E-post' : 'Email'}
					</label>
					<input
						type="email"
						id="contact-email"
						name="email"
						required
						aria-required="true"
						placeholder="navn@organisasjon.no"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm"
						style="min-height: 44px;"
					/>
				</div>

				<!-- Package interest -->
				<div>
					<label for="contact-package" class="mb-1 block text-sm font-medium">
						{$lang === 'no' ? 'Hva er du interessert i?' : 'What are you interested in?'}
					</label>
					<select
						id="contact-package"
						name="package"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm bg-white"
						style="min-height: 44px;"
					>
						<option value="">{$lang === 'no' ? 'Velg...' : 'Choose...'}</option>
						<option value="unsure">{$lang === 'no' ? 'Usikker, vil gjerne vite mer' : 'Not sure, want to learn more'}</option>
						<option value="basis">Basis — 1 500 kr/{$lang === 'no' ? 'mnd' : 'mo'}</option>
						<option value="standard">Standard — 3 500 kr/{$lang === 'no' ? 'mnd' : 'mo'}</option>
						<option value="partner">Partner — 9 000 kr/{$lang === 'no' ? 'mnd' : 'mo'}</option>
						<option value="alacarte">{$lang === 'no' ? 'Enkeltarrangement — 750 kr' : 'Single event — 750 NOK'}</option>
					</select>
				</div>

				{#if contactStatus === 'error'}
					<p role="alert" class="text-sm text-red-600">
						{$lang === 'no' ? 'Noe gikk galt. Prøv igjen eller send e-post direkte.' : 'Something went wrong. Please try again or send an email directly.'}
					</p>
				{/if}

				<button
					type="submit"
					disabled={contactStatus === 'submitting'}
					class="w-full rounded-xl bg-[var(--funkis-red)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-70"
					style="min-height: 44px;"
				>
					{#if contactStatus === 'submitting'}
						{$lang === 'no' ? 'Sender...' : 'Sending...'}
					{:else}
						{$lang === 'no' ? 'Send henvendelse' : 'Send inquiry'}
					{/if}
				</button>
			</form>

			<p class="mt-4 text-sm text-[var(--funkis-granite)]">
				{$lang === 'no' ? 'Eller send en e-post til' : 'Or send an email to'}
				<a href="mailto:post@gaari.no" class="font-medium text-[var(--funkis-red)] underline">post@gaari.no</a>
			</p>
		{/if}
		<p class="mt-6 text-xs text-[var(--funkis-granite)]">
			{$lang === 'no' ? 'Bygget i Bergen' : 'Built in Bergen'}
		</p>
	</div>
</section>

<!-- Sticky mobile CTA bar -->
<div
	class="fixed bottom-0 left-0 right-0 z-50 md:hidden"
	style="transform: {showStickyBar ? 'translateY(0)' : 'translateY(100%)'}; transition: transform 200ms ease-out;"
>
	<div class="bg-[var(--funkis-red)] px-4 py-2" style="box-shadow: 0 -2px 8px rgba(0,0,0,0.15);">
		<a
			href="#contact"
			data-umami-event="for-arrangorer-sticky-cta"
			onclick={() => trackEvent('for-arrangorer-sticky-cta')}
			class="flex items-center justify-center text-base font-semibold text-white"
			style="min-height: 44px;"
		>
			{$lang === 'no' ? 'Prøv gratis i 3 måneder' : 'Try free for 3 months'}
		</a>
	</div>
</div>

<style>
	details summary::-webkit-details-marker {
		display: none;
	}
	details summary {
		list-style: none;
	}
	/* Focus indicator for hero toggle on dark background */
	.hero-card-toggle:focus-visible {
		outline: 2px solid white;
		outline-offset: 4px;
		border-radius: 0.75rem;
	}
</style>
