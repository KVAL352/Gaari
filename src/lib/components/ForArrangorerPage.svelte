<script lang="ts">
	import { enhance } from '$app/forms';
	import { lang } from '$lib/i18n';
	import { getB2bFaqItems } from '$lib/seo';

	interface Props {
		heroImages: Array<{ url: string; title: string; venue: string }>;
	}

	let { heroImages = [] }: Props = $props();

	let contactStatus: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');
	let heroEl: HTMLElement | undefined = $state(undefined);
	let contactEl: HTMLElement | undefined = $state(undefined);
	let heroVisible = $state(true);
	let contactVisible = $state(false);
	let showStickyBar = $derived(!heroVisible && !contactVisible);

	const faqItems = $derived(getB2bFaqItems($lang));

	const tiers = $derived([
		{
			name: 'Basis',
			price: '1 000',
			roi: $lang === 'no' ? '~33 kr dagen' : '~33 NOK/day',
			recommended: false,
			features: [true, true, true, false, false, false]
		},
		{
			name: 'Standard',
			price: '3 500',
			roi: $lang === 'no' ? 'Kostnaden for en avisannonse' : 'The cost of one newspaper ad',
			recommended: true,
			features: [true, true, true, false, true, true]
		},
		{
			name: 'Partner',
			price: '7 000',
			roi: $lang === 'no' ? 'Topp synlighet i alle kategorier' : 'Top visibility in all categories',
			recommended: false,
			features: [true, true, true, true, true, true]
		}
	]);

	// Text overrides for the "Antall utvalgte sider" row (index 0)
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
			'Månedlig rapport med statistikk',
			'Prioritert oppfølging'
		]
		: [
			'Number of curated pages',
			'Visibility share',
			'Visibility in weekly newsletter',
			'Spot in social media posts',
			'Monthly report with statistics',
			'Priority follow-up'
		]
	);

	function trackEvent(name: string) {
		if (typeof window !== 'undefined' && window.umami) {
			umami.track(name);
		}
	}

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
</script>

<!-- === 1. HERO WITH IMAGE COLLAGE === -->
<section bind:this={heroEl} class="relative overflow-hidden bg-[var(--funkis-iron)]">
	<!-- Image collage background -->
	{#if heroImages.length > 0}
		<div class="absolute inset-0 grid grid-cols-3 md:grid-cols-4 gap-0.5 opacity-40">
			{#each heroImages.slice(0, 12) as img, i (img.url)}
				<div class="relative overflow-hidden {i >= 9 ? 'hidden md:block' : ''}">
					<img
						src={img.url}
						alt=""
						loading={i < 4 ? 'eager' : 'lazy'}
						class="h-full w-full object-cover"
						style="aspect-ratio: 1/1;"
					/>
				</div>
			{/each}
		</div>
		<!-- Gradient overlay -->
		<div class="absolute inset-0 bg-gradient-to-b from-[var(--funkis-iron)]/60 via-[var(--funkis-iron)]/80 to-[var(--funkis-iron)]"></div>
	{/if}

	<!-- Content -->
	<div class="relative px-4 py-20 md:py-28">
		<div class="mx-auto max-w-3xl text-center">
			<h1 class="mb-6 text-3xl font-bold tracking-tight text-white font-[family-name:var(--font-display)] md:text-[44px] md:leading-tight">
				{$lang === 'no' ? 'Gjør arrangementet ditt synlig i Bergen' : 'Make your event visible in Bergen'}
			</h1>
			<p class="mx-auto mb-8 max-w-[560px] text-lg text-white/80">
				{#if $lang === 'no'}
					Gåri samler alt som skjer i Bergen fra 54 kilder. Nå tusenvis av bergensere som aktivt planlegger helgen, med fremhevet plassering i utvalgte sider, nyhetsbrev og AI-søk.
				{:else}
					Gåri collects everything happening in Bergen from 54 sources. Reach thousands of people actively planning their weekend, with promoted placement on curated pages, in the newsletter and in AI search.
				{/if}
			</p>
			<a
				href="#pricing"
				data-umami-event="for-arrangorer-hero-cta"
				onclick={() => trackEvent('for-arrangorer-hero-cta')}
				class="inline-block rounded-xl bg-[var(--funkis-red)] px-8 py-3 text-base font-semibold text-white hover:opacity-90"
				style="min-height: 44px; line-height: 24px;"
			>
				{$lang === 'no' ? 'Prøv gratis i 3 måneder' : 'Try free for 3 months'}
			</a>

			<!-- Stats strip -->
			<p class="mt-8 text-sm text-white/60">
				2 000+ {$lang === 'no' ? 'arrangementer' : 'events'} · 54 {$lang === 'no' ? 'kilder' : 'sources'} · 13 {$lang === 'no' ? 'utvalgte sider' : 'curated pages'}
			</p>

			<!-- Early bird hint -->
			<p class="mt-2 text-sm font-medium text-[var(--funkis-red)]">
				{$lang === 'no'
					? 'Tidlige partnere: gratis frem til 1. juni 2026'
					: 'Early partners: free until June 1, 2026'}
			</p>
		</div>
	</div>
</section>

<!-- === 2. PROBLEMET === -->
<section class="bg-[var(--color-bg-surface)] px-4 py-16 md:py-20">
	<div class="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[50%_50%]">
		<div>
			<h2 class="mb-4 text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
				{$lang === 'no'
					? 'Hundrevis av arrangementer. Hvordan finner folk ditt?'
					: 'Hundreds of events. How do people find yours?'}
			</h2>
			<p class="text-[var(--color-text-secondary)]">
				{#if $lang === 'no'}
					Bergen har et rikt kulturliv, men det gjør det vanskeligere å bli sett. Folk som planlegger helgen scroller gjennom lange lister. Med fremhevet plassering er ditt arrangement det første de ser.
				{:else}
					Bergen has a rich cultural scene, but that makes it harder to stand out. People planning their weekend scroll through long lists. With promoted placement, your event is the first thing they see.
				{/if}
			</p>
		</div>

		<!-- Product mockup: Browser frame with real event images -->
		<div class="flex justify-center md:justify-end">
			<div class="w-full overflow-hidden rounded-xl" style="max-width: 400px; transform: rotate(-1deg); box-shadow: var(--shadow-lg);">
				<!-- Browser chrome -->
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
				<!-- Browser content: event card grid with real images -->
				<div class="bg-[var(--color-bg)] p-3">
					<div class="grid grid-cols-2 gap-2">
						{#each heroImages.slice(0, 4) as img, i (img.url)}
							<div class="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
								<div class="relative h-20 overflow-hidden">
									<img src={img.url} alt="" class="h-full w-full object-cover" />
									{#if i === 0}
										<span class="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[var(--funkis-red)]" style="font-size: 8px; font-weight: 600; background: #F9EEEE;">
											{$lang === 'no' ? 'Fremhevet' : 'Featured'}
										</span>
									{/if}
								</div>
								<div class="p-1.5">
									<p class="font-bold leading-tight truncate" style="font-size: 10px;">{img.title}</p>
									<p class="text-[var(--color-text-muted)] truncate" style="font-size: 8px;">{img.venue}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- === 3. SLIK FUNGERER DET === -->
<section class="bg-[var(--funkis-plaster)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-4xl">
		<h2 class="mb-10 text-center text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
			{$lang === 'no' ? 'Slik fungerer det' : 'How it works'}
		</h2>

		<div class="grid gap-4 md:grid-cols-3">
			<div class="rounded-xl bg-[var(--color-bg-surface)] p-5" style="box-shadow: var(--shadow-sm);">
				<p class="mb-2 text-[28px] font-bold leading-none font-[family-name:var(--font-display)] text-[var(--funkis-red)]">1</p>
				<h3 class="mb-1 text-sm font-bold">
					{$lang === 'no' ? 'Allerede på Gåri' : 'Already on Gåri'}
				</h3>
				<p class="text-sm text-[var(--color-text-secondary)]">
					{$lang === 'no'
						? 'Arrangementene dine hentes automatisk fra nettsiden din. Du trenger ikke gjøre noe.'
						: 'Your events are automatically collected from your website. You don\'t need to do anything.'}
				</p>
			</div>
			<div class="rounded-xl bg-[var(--color-bg-surface)] p-5" style="box-shadow: var(--shadow-sm);">
				<p class="mb-2 text-[28px] font-bold leading-none font-[family-name:var(--font-display)] text-[var(--funkis-red)]">2</p>
				<h3 class="mb-1 text-sm font-bold">
					{$lang === 'no' ? 'Fremhevet plassering' : 'Promoted placement'}
				</h3>
				<p class="text-sm text-[var(--color-text-secondary)]">
					{$lang === 'no'
						? 'Arrangementene dine vises øverst i utvalgte sider, i nyhetsbrevet og i AI-søk.'
						: 'Your events appear at the top of curated pages, in the newsletter and in AI search.'}
				</p>
			</div>
			<div class="rounded-xl bg-[var(--color-bg-surface)] p-5" style="box-shadow: var(--shadow-sm);">
				<p class="mb-2 text-[28px] font-bold leading-none font-[family-name:var(--font-display)] text-[var(--funkis-red)]">3</p>
				<h3 class="mb-1 text-sm font-bold">
					{$lang === 'no' ? 'Månedlig rapport' : 'Monthly report'}
				</h3>
				<p class="text-sm text-[var(--color-text-secondary)]">
					{$lang === 'no'
						? 'Du får data på klikk, synlighet og hvilke arrangementer som traff best.'
						: 'You get data on clicks, visibility and which events performed best.'}
				</p>
			</div>
		</div>
	</div>
</section>

<!-- === 4. PRISER === -->
<section id="pricing" class="bg-[var(--color-bg-surface)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-4xl">
		<div class="mb-2 text-center">
			<h2 class="mb-3 text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
				{$lang === 'no' ? 'Velg synligheten som passer deg' : 'Choose the visibility that fits'}
			</h2>
			<p class="text-sm font-semibold text-[var(--funkis-green)]">
				{$lang === 'no' ? 'Ingen bindingstid' : 'No commitment period'}
			</p>
		</div>

		<!-- Tier cards -->
		<div class="mt-10 grid gap-6 md:grid-cols-3">
			{#each tiers as tier (tier.name)}
				<div
					class="relative rounded-xl bg-[var(--color-bg-surface)] p-6"
					style="box-shadow: {tier.recommended ? 'var(--shadow-lg)' : 'var(--shadow-sm)'}; {tier.recommended ? 'border: 2px solid var(--funkis-red);' : 'border: 1px solid var(--color-border);'}"
				>
					{#if tier.recommended}
						<span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--funkis-red)] px-4 py-1 text-xs font-semibold text-white">
							{$lang === 'no' ? 'Anbefalt' : 'Recommended'}
						</span>
					{/if}
					<h3 class="mb-1 text-lg font-bold font-[family-name:var(--font-display)]">{tier.name}</h3>
					<p class="mb-1">
						<span class="text-[32px] font-bold leading-none font-[family-name:var(--font-display)]">{tier.price}</span>
						<span class="text-sm text-[var(--color-text-secondary)]"> kr/{$lang === 'no' ? 'mnd' : 'mo'}</span>
					</p>
					<p class="mb-4 text-xs text-[var(--color-text-muted)]">{$lang === 'no' ? 'ekskl. mva' : 'excl. VAT'}</p>
					<p class="mb-6 text-sm text-[var(--color-text-secondary)]">{tier.roi}</p>
					<a
						href="#contact"
						data-umami-event="for-arrangorer-pricing-{tier.name.toLowerCase()}"
						onclick={() => trackEvent(`for-arrangorer-pricing-${tier.name.toLowerCase()}`)}
						class="block rounded-xl px-4 py-2.5 text-center text-sm font-semibold hover:opacity-90"
						style="min-height: 44px; line-height: 24px; {tier.recommended
							? 'background: var(--funkis-red); color: white;'
							: 'background: var(--funkis-plaster); color: var(--color-text-primary);'}"
					>
						{$lang === 'no' ? 'Ta kontakt' : 'Get in touch'}
					</a>
				</div>
			{/each}
		</div>

		<!-- Feature matrix -->
		<div class="mt-10 overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-[var(--color-border)]">
						<th class="py-3 pr-4 text-left font-medium text-[var(--color-text-muted)]">
							{$lang === 'no' ? 'Inkludert' : 'Included'}
						</th>
						{#each tiers as tier (tier.name)}
							<th class="px-3 py-3 text-center font-semibold {tier.recommended ? 'text-[var(--funkis-red)]' : ''}">
								{tier.name}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each featureLabels as label, i (label)}
						<tr class="border-b border-[var(--color-border-subtle)]">
							<td class="py-2.5 pr-4 text-[var(--color-text-secondary)]">{label}</td>
							{#each tiers as tier (tier.name)}
								<td class="px-3 py-2.5 text-center">
									{#if i === 0}
										<span class="text-sm font-medium">{sideCount[tier.name]}</span>
									{:else if i === 1}
										<span class="text-sm font-medium">{visibilityShare[tier.name]}</span>
									{:else if tier.features[i]}
										<span class="text-[var(--funkis-green)]">&#10003;</span>
									{:else}
										<span class="text-[var(--color-text-muted)]">—</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Early bird banner -->
		<div class="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--funkis-plaster)] px-5 py-4 text-center" style="box-shadow: var(--shadow-sm);">
			<p class="text-sm text-[var(--color-text-primary)]">
				<span class="font-semibold text-[var(--funkis-red)]">
					{$lang === 'no' ? 'Tidlig partner-tilbud: ' : 'Early partner offer: '}
				</span>
				{$lang === 'no'
					? '3 måneder gratis Standard-pakken for de som starter før 1. juni 2026. Ingen bindingstid.'
					: '3 months free Standard package for those who start before June 1, 2026. No commitment.'}
			</p>
		</div>
	</div>
</section>

<!-- === 5. SOCIAL PROOF === -->
<section class="bg-[var(--funkis-plaster)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-4xl">
		<h2 class="mb-10 text-center text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
			{$lang === 'no' ? 'Allerede på Gåri' : 'Already on Gåri'}
		</h2>

		<!-- Venue pills -->
		<div class="mb-10 flex flex-wrap justify-center gap-1.5">
			{#each ['Grieghallen', 'Den Nationale Scene', 'KODE', 'USF Verftet', 'Bergen Bibliotek', 'Festspillene', 'Ole Bull Huset', 'Harmonien', 'Fløyen', 'Bergenfest', 'Bergen Kjøtt', 'Cornerteateret', 'Akvariet', 'Litteraturhuset', 'SK Brann', 'Carte Blanche'] as venue (venue)}
				<span class="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-1 text-[12px] text-[var(--color-text-muted)]">
					{venue}
				</span>
			{/each}
			<span class="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-1 text-[12px] font-medium text-[var(--funkis-red)]">
				+38 {$lang === 'no' ? 'til' : 'more'}
			</span>
		</div>

		<!-- Report mockup -->
		<div class="mx-auto max-w-sm">
			<p class="mb-4 text-center text-sm text-[var(--color-text-secondary)]">
				{$lang === 'no' ? 'Eksempel på månedlig rapport:' : 'Example monthly report:'}
			</p>
			<div class="rounded-xl bg-[var(--color-bg-surface)] p-5" style="box-shadow: var(--shadow-sm);">
				<p class="mb-3 text-sm font-bold text-[var(--color-text-primary)]">
					Grieghallen — {$lang === 'no' ? 'mars' : 'March'} 2026
				</p>
				<div class="mb-3 border-t border-[var(--color-border)]"></div>
				<div class="mb-1 flex items-baseline justify-between">
					<span class="text-sm text-[var(--color-text-secondary)]">{$lang === 'no' ? 'Klikk fra Gåri' : 'Clicks from Gåri'}</span>
					<div class="flex items-baseline gap-2">
						<span class="text-[36px] font-bold leading-none font-[family-name:var(--font-display)] text-[var(--funkis-red)]">483</span>
						<span class="text-sm font-semibold text-[var(--funkis-green)]">+22%</span>
					</div>
				</div>
				<div class="my-3 border-t border-[var(--color-border)]"></div>
				<div class="space-y-1.5 text-sm" style="font-variant-numeric: tabular-nums;">
					<div class="flex justify-between">
						<span class="text-[var(--color-text-secondary)]">{$lang === 'no' ? 'Fra utvalgte sider' : 'From curated pages'}</span>
						<span class="font-medium">198</span>
					</div>
					<div class="flex justify-between">
						<span class="text-[var(--color-text-secondary)]">{$lang === 'no' ? 'Fra AI-søk' : 'From AI search'}</span>
						<span class="font-medium">87</span>
					</div>
					<div class="flex justify-between">
						<span class="text-[var(--color-text-secondary)]">{$lang === 'no' ? 'Fra hovedsiden' : 'From homepage'}</span>
						<span class="font-medium">198</span>
					</div>
				</div>
				<div class="mt-3 border-t border-[var(--color-border)] pt-3">
					<p class="text-[12px] text-[var(--color-text-muted)]">{$lang === 'no' ? 'Topp arrangement:' : 'Top event:'}</p>
					<p class="text-sm font-bold">Bergen Filharmoniske</p>
					<p class="text-[12px] text-[var(--color-text-muted)]">142 {$lang === 'no' ? 'klikk' : 'clicks'}</p>
				</div>
			</div>
		</div>

		<!-- Placeholder for testimonials — replace with real quotes -->
		<!--
		<div class="mt-10 grid gap-6 md:grid-cols-2">
			<blockquote class="rounded-xl bg-[var(--color-bg-surface)] p-5" style="box-shadow: var(--shadow-sm);">
				<p class="mb-3 text-sm text-[var(--color-text-secondary)]">"Sitat fra arrangør."</p>
				<footer class="text-sm font-semibold">Navn, Organisasjon</footer>
			</blockquote>
		</div>
		-->
	</div>
</section>

<!-- === 6. FAQ === -->
<section class="bg-[var(--color-bg-surface)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-2xl">
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

<!-- === 7. AVSLUTTENDE CTA + KONTAKTSKJEMA === -->
<section bind:this={contactEl} id="contact" class="px-4 py-16 md:py-20" style="background-color: var(--funkis-red-subtle);">
	<div class="mx-auto max-w-md text-center">
		<div class="mx-auto mb-4 h-1 w-16 rounded bg-[var(--funkis-red)]"></div>
		<h2 class="mb-4 text-2xl font-bold text-[var(--funkis-iron)] font-[family-name:var(--font-display)] md:text-[32px]">
			{$lang === 'no' ? 'La oss ta en prat' : 'Let\'s have a chat'}
		</h2>
		<p class="mb-8 text-[var(--funkis-steel)]">
			{$lang === 'no'
				? 'Prøv gratis i 3 måneder. Ingen bindingstid. Vi svarer innen en arbeidsdag.'
				: 'Try free for 3 months. No commitment. We respond within one working day.'}
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
						{$lang === 'no' ? 'Start samtalen' : 'Start the conversation'}
					{/if}
				</button>
			</form>

			<p class="mt-4 text-sm text-[var(--funkis-granite)]">
				{$lang === 'no' ? 'Eller send en e-post til' : 'Or send an email to'}
				<a href="mailto:post@gaari.no" class="font-medium text-[var(--funkis-red)] underline">post@gaari.no</a>
			</p>
		{/if}
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
</style>
