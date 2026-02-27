<script lang="ts">
	import { enhance } from '$app/forms';
	import { lang } from '$lib/i18n';
	import StreamingAnimation from '$lib/components/StreamingAnimation.svelte';

	let contactStatus: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');
	let heroEl: HTMLElement | undefined = $state(undefined);
	let contactEl: HTMLElement | undefined = $state(undefined);
	let heroVisible = $state(true);
	let contactVisible = $state(false);
	let showStickyBar = $derived(!heroVisible && !contactVisible);

	const venues = [
		'Grieghallen', 'DNS', 'KODE', 'USF Verftet', 'Bergen Bibliotek',
		'Festspillene', 'Ole Bull', 'Harmonien', 'Fløyen', 'Bergenfest',
		'Bergen Kjøtt', 'Bjørgvin Blues Club'
	];

	// Expanded list for venue lookup (display names people would recognize)
	const allVenues = [
		'Grieghallen', 'Den Nationale Scene', 'KODE', 'USF Verftet',
		'Bergen Bibliotek', 'Festspillene', 'Ole Bull Huset', 'Bergen Filharmoniske',
		'Fløyen', 'Bergenfest', 'Bergen Kjøtt', 'Bjørgvin Blues Club',
		'Cornerteateret', 'Det Vestnorske Teateret', 'BIT Teatergarasjen',
		'Carte Blanche', 'Bergen Kunsthall', 'Litteraturhuset', 'Akvariet',
		'Bymuseet', 'Museum Vest', 'Forum Scene', 'Colonialen', 'Råbrent',
		'SK Brann', 'DNT Bergen', 'Beyond the Gates', 'Oseana',
		'Det Akademiske Kvarter', 'Kulturhuset i Bergen', 'Nordnes Sjøbad',
		'Media City Bergen', 'BEK', 'Bergen Filmklubb', 'Hulen',
		'Madam Felle', 'Brettspillcafeen', 'VVV', 'Bergen Kammermusikkforening',
		'Paint\'n Sip Bergen'
	];

	let venueSearch = $state('');
	let addVenueStatus: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');
	let venueMatch = $derived(
		venueSearch.length < 2
			? null
			: allVenues.find(v => v.toLowerCase().includes(venueSearch.toLowerCase())) ?? false
	);

	function trackEvent(name: string) {
		if (typeof window !== 'undefined' && 'plausible' in window) {
			(window as unknown as { plausible: (name: string) => void }).plausible(name);
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

	// Chat animation
	let phoneEl: HTMLElement | undefined = $state(undefined);
	let chatPhase: 'idle' | 'typing' | 'sent' | 'thinking' | 'responding' | 'done' = $state('idle');
	let typedLen = $state(0);
	let aiLines = $state(0);
	let chatAnimated = $state(false);

	const chatUserMsg = $derived(
		$lang === 'no' ? 'Hva skjer i Bergen denne helgen?' : "What's on in Bergen this weekend?"
	);

	$effect(() => {
		if (!phoneEl) return;

		const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReduced) {
			chatPhase = 'done';
			typedLen = chatUserMsg.length;
			aiLines = 5;
			return;
		}

		const phoneObserver = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !chatAnimated) {
					chatAnimated = true;
					runChatAnimation();
				}
			},
			{ threshold: 0.3 }
		);

		phoneObserver.observe(phoneEl);
		return () => phoneObserver.disconnect();
	});

	async function runChatAnimation() {
		await sleep(400);

		chatPhase = 'typing';
		for (let i = 0; i <= chatUserMsg.length; i++) {
			typedLen = i;
			await sleep(45 + Math.random() * 30);
		}

		await sleep(300);
		chatPhase = 'sent';

		await sleep(600);
		chatPhase = 'thinking';
		await sleep(1200);

		chatPhase = 'responding';
		for (let i = 1; i <= 5; i++) {
			aiLines = i;
			await sleep(400);
		}

		await sleep(200);
		chatPhase = 'done';
	}

	function sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

</script>

<!-- === HVA ER DETTE === -->
<section bind:this={heroEl} class="bg-[var(--funkis-plaster)] px-4 py-16 md:py-24">
	<div class="mx-auto max-w-4xl text-center">
		<h1 class="mb-6 text-3xl font-bold tracking-tight font-[family-name:var(--font-display)] md:text-[40px] md:leading-tight">
			{$lang === 'no' ? 'Bergens Digitale Bytorg' : "Bergen's Digital Town Square"}
		</h1>
		<p class="mx-auto mb-8 max-w-[640px] text-lg text-[var(--color-text-primary)]">
			{#if $lang === 'no'}
				Gåri er et digitalt bytorg for Bergen. Alt som skjer, samlet på ett sted.
			{:else}
				Gåri is a digital town square for Bergen. Everything happening, gathered in one place.
			{/if}
		</p>
		<a
			href="#contact"
			data-plausible-event="for-arrangorer-hero-cta"
			onclick={() => trackEvent('for-arrangorer-hero-cta')}
			class="inline-block rounded-xl bg-[var(--funkis-red)] px-8 py-3 text-base font-semibold text-white hover:opacity-90"
			style="min-height: 44px; line-height: 24px;"
		>
			{$lang === 'no' ? 'Ta kontakt' : 'Get in touch'}
		</a>
	</div>
</section>

<!-- === HVORDAN FUNGERER DETTE === -->
<section class="bg-[var(--color-bg-surface)] px-4 py-16 md:py-20">
	<div class="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[50%_50%]">
		<div>
			<h2 class="mb-4 text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
				{$lang === 'no' ? 'Gåri henter arrangementene — automatisk' : 'Gåri fetches events — automatically'}
			</h2>
			<p class="text-[var(--color-text-secondary)]">
				{#if $lang === 'no'}
					To ganger om dagen besøker Gåri nettsidene til steder som arrangerer ting i Bergen. Når noe nytt dukker opp — en konsert, en utstilling, en quiz-kveld — tar Gåri det med tilbake og viser det frem på bytorget.
				{:else}
					Twice a day, Gåri visits the websites of venues organizing things in Bergen. When something new appears — a concert, an exhibition, a quiz night — Gåri brings it back and displays it on the town square.
				{/if}
			</p>
			<p class="mt-3 text-sm font-medium text-[var(--color-text-primary)]">
				{$lang === 'no' ? 'Du trenger ikke gjøre noe.' : "You don't need to do anything."}
			</p>
		</div>

		<!-- Streaming animation: venues → Gåri hub -->
		<StreamingAnimation />
	</div>

	<!-- Venue lookup -->
	<div class="mx-auto mt-12 max-w-sm text-center">
		<label for="venue-check" class="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
			{$lang === 'no' ? 'Sjekk om du allerede er på Gåri:' : 'Check if you\'re already on Gåri:'}
		</label>
		<input
			type="text"
			id="venue-check"
			bind:value={venueSearch}
			placeholder={$lang === 'no' ? 'Skriv navnet på stedet ditt...' : 'Type your venue name...'}
			class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-2.5 text-sm"
			style="min-height: 44px;"
		/>
		{#if venueMatch}
			<p class="mt-2 text-sm font-semibold text-[var(--funkis-green)]">
				&#10003; {venueMatch} {$lang === 'no' ? 'er allerede på Gåri!' : 'is already on Gåri!'}
			</p>
		{:else if venueMatch === false}
			<p class="mt-2 text-sm text-[var(--color-text-secondary)]">
				{$lang === 'no'
					? 'Fant ikke et treff — men det er helt gratis å bli lagt til. Vi ønsker å promotere det rike kulturlivet i Bergen.'
					: "Didn't find a match — but getting added is completely free. We want to promote Bergen's rich cultural life."}
			</p>

			{#if addVenueStatus === 'success'}
				<p class="mt-3 text-sm font-semibold text-[var(--funkis-green)]">
					&#10003; {$lang === 'no' ? 'Takk! Vi sjekker nettsiden og tar kontakt.' : "Thanks! We'll check your website and get back to you."}
				</p>
			{:else}
				<form
					method="POST"
					action="?/contact"
					use:enhance={({ formData }) => {
						const venueUrl = formData.get('venue_url');
						formData.set('message', `Ønsker å bli lagt til på Gåri. Nettside: ${venueUrl}`);
						formData.delete('venue_url');
						addVenueStatus = 'submitting';
						return async ({ result }) => {
							if (result.type === 'success') {
								addVenueStatus = 'success';
								trackEvent('for-arrangorer-add-venue');
							} else {
								addVenueStatus = 'error';
							}
						};
					}}
					class="mx-auto mt-3 flex max-w-sm flex-col gap-2"
				>
					<input type="hidden" name="name" value={venueSearch} />
					<input type="hidden" name="organization" value={venueSearch} />
					<!-- Honeypot -->
					<div class="absolute -left-[9999px]" aria-hidden="true">
						<input type="text" name="website" tabindex="-1" autocomplete="off" />
					</div>

					<input
						type="url"
						name="venue_url"
						required
						placeholder={$lang === 'no' ? 'https://dittsted.no' : 'https://yourvenue.com'}
						class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2.5 text-sm"
						style="min-height: 44px;"
					/>
					<input
						type="email"
						name="email"
						required
						placeholder={$lang === 'no' ? 'din@epost.no' : 'your@email.com'}
						class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2.5 text-sm"
						style="min-height: 44px;"
					/>
					<button
						type="submit"
						disabled={addVenueStatus === 'submitting'}
						class="rounded-xl bg-[var(--funkis-red)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-70"
						style="min-height: 44px;"
					>
						{#if addVenueStatus === 'submitting'}
							{$lang === 'no' ? 'Sender...' : 'Sending...'}
						{:else}
							{$lang === 'no' ? 'Sjekk nettsiden min' : 'Check my website'}
						{/if}
					</button>
					{#if addVenueStatus === 'error'}
						<p class="text-sm text-red-600">
							{$lang === 'no' ? 'Noe gikk galt. Prøv igjen.' : 'Something went wrong. Try again.'}
						</p>
					{/if}
				</form>
			{/if}
		{/if}
	</div>
</section>

<!-- === HVORFOR DETTE FUNGERER === -->

<!-- Network effect — the town square argument -->
<section class="bg-[var(--funkis-plaster)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-[640px] space-y-4 text-[var(--color-text-primary)]">
		<h2 class="mb-6 text-center text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
			{$lang === 'no' ? 'Hvorfor dette fungerer' : 'Why this works'}
		</h2>
		{#if $lang === 'no'}
			<p>Et bytorg med tre boder er ikke et bytorg. Det er først når bredden er der — konserter, teater, matfestivaler, quizkvelder, gratisarrangementer — at folk begynner å sjekke innom som vane.</p>
			<p>Gratis arrangementer trekker folk inn. Betalte arrangementer tjener på trafikken. Studenten som finner en gratis quizkveld i dag, kjøper konsertbillett neste uke. Uten det første besøket hadde det andre aldri skjedd.</p>
			<p>Jo mer som er samlet på torget, jo flere grunner har folk til å komme tilbake. Jo oftere de kommer tilbake, jo mer ser de av dine arrangementer.</p>
		{:else}
			<p>A town square with three stalls isn't a town square. It's only when the breadth is there — concerts, theatre, food festivals, quiz nights, free events — that people start checking in as a habit.</p>
			<p>Free events draw people in. Paid events benefit from the traffic. The student who finds a free quiz night today buys a concert ticket next week. Without the first visit, the second would never have happened.</p>
			<p>The more that's gathered on the square, the more reasons people have to come back. The more often they come back, the more they see of your events.</p>
		{/if}
	</div>
</section>

<!-- AI search pitch — phone mockup + mid-page CTA -->
<section class="bg-[var(--color-bg-surface)] px-4 py-16 md:py-20">
	<div class="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[55%_45%]">
		<div>
			<p class="mb-3 text-[40px] font-bold leading-none font-[family-name:var(--font-display)] text-[var(--funkis-red)] md:text-[56px]">
				54%
			</p>
			<h2 class="mb-4 text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
				{$lang === 'no' ? 'av nordmenn bruker KI-verktøy' : 'of Norwegians use AI tools'}
			</h2>
			<p class="mb-4 text-[var(--color-text-secondary)]">
				{#if $lang === 'no'}
					Norge er nummer 3 i verden for bruk av KI. Når noen i Bergen spør ChatGPT «hva skjer denne helgen?», jobber vi for at Gåri dukker opp som kilde — med utvalgte sider tilpasset det folk faktisk spør om.
				{:else}
					Norway is number 3 in the world for AI usage. When someone in Bergen asks ChatGPT "what's on this weekend?", we work to make Gåri appear as a source — with curated pages optimized for what people actually ask about.
				{/if}
			</p>
			<p class="mb-6 text-xs text-[var(--color-text-muted)]">
				{#if $lang === 'no'}
					<a href="https://www.ssb.no/teknologi-og-innovasjon/informasjons-og-kommunikasjonsteknologi-ikt/artikler/slik-bruker-nordmenn-kunstig-intelligens" target="_blank" rel="noopener noreferrer" class="underline hover:text-[var(--color-text-secondary)]">SSB 2025</a>
					·
					<a href="https://www.mynewsdesk.com/no/microsoft-norge/pressreleases/norge-paa-pallen-i-global-ai-undersoekelse-3415347" target="_blank" rel="noopener noreferrer" class="underline hover:text-[var(--color-text-secondary)]">Microsoft AI Diffusion Report 2025</a>
					·
					<a href="https://www.arbeidslivinorden.org/naeringslivet-oker-bruken-av-ai-verktoyer/" target="_blank" rel="noopener noreferrer" class="underline hover:text-[var(--color-text-secondary)]">Arbeidsliv i Norden</a>
					·
					<a href="https://www.superlines.io/articles/chatgpt-statistics/" target="_blank" rel="noopener noreferrer" class="underline hover:text-[var(--color-text-secondary)]">ChatGPT Statistics</a>
				{:else}
					<a href="https://www.ssb.no/teknologi-og-innovasjon/informasjons-og-kommunikasjonsteknologi-ikt/artikler/slik-bruker-nordmenn-kunstig-intelligens" target="_blank" rel="noopener noreferrer" class="underline hover:text-[var(--color-text-secondary)]">Statistics Norway 2025</a>
					·
					<a href="https://www.mynewsdesk.com/no/microsoft-norge/pressreleases/norge-paa-pallen-i-global-ai-undersoekelse-3415347" target="_blank" rel="noopener noreferrer" class="underline hover:text-[var(--color-text-secondary)]">Microsoft AI Diffusion Report 2025</a>
					·
					<a href="https://www.arbeidslivinorden.org/naeringslivet-oker-bruken-av-ai-verktoyer/" target="_blank" rel="noopener noreferrer" class="underline hover:text-[var(--color-text-secondary)]">Nordic Labour Journal</a>
					·
					<a href="https://www.superlines.io/articles/chatgpt-statistics/" target="_blank" rel="noopener noreferrer" class="underline hover:text-[var(--color-text-secondary)]">ChatGPT Statistics</a>
				{/if}
			</p>
			<!-- Mid-page CTA — peak motivation point -->
			<a
				href="#contact"
				data-plausible-event="for-arrangorer-mid-cta"
				onclick={() => trackEvent('for-arrangorer-mid-cta')}
				class="inline-block rounded-xl bg-[var(--funkis-red)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
				style="min-height: 44px; line-height: 24px;"
			>
				{$lang === 'no' ? 'Vis meg dataen for mine arrangementer' : 'Show me the data for my events'}
			</a>
		</div>

		<!-- Phone mockup (animated) -->
		<div class="flex justify-center">
			<div
				bind:this={phoneEl}
				class="relative w-full overflow-hidden rounded-[2rem] border-2 border-[var(--funkis-iron)] bg-[var(--color-bg-surface)]"
				style="max-width: 280px; box-shadow: var(--shadow-lg);"
			>
				<!-- Notch -->
				<div class="flex justify-center pt-2.5 pb-3">
					<div class="h-[6px] w-20 rounded-full bg-[var(--funkis-iron)]"></div>
				</div>

				<!-- Chat messages -->
				<div class="flex flex-col gap-3 px-4 pb-4" style="min-height: 220px;">
					{#if chatPhase !== 'idle'}
						<!-- User typing / sent message -->
						<div class="flex justify-end">
							<div class="rounded-2xl rounded-br-md bg-[var(--funkis-plaster)] px-3 py-2 text-[13px] text-[var(--color-text-primary)]" style="max-width: 85%;">
								{#if chatPhase === 'typing'}
									{chatUserMsg.slice(0, typedLen)}<span class="chat-cursor">|</span>
								{:else}
									{chatUserMsg}
								{/if}
							</div>
						</div>
					{/if}

					{#if chatPhase === 'thinking'}
						<!-- AI thinking dots -->
						<div class="flex items-start gap-2">
							<div class="mt-1 h-6 w-6 shrink-0 rounded-full bg-[var(--funkis-granite)] ai-avatar"></div>
							<div class="rounded-2xl rounded-tl-md border border-[var(--color-border-subtle)] bg-white px-3 py-2.5">
								<div class="flex gap-1">
									<span class="thinking-dot" style="animation-delay: 0ms;">●</span>
									<span class="thinking-dot" style="animation-delay: 200ms;">●</span>
									<span class="thinking-dot" style="animation-delay: 400ms;">●</span>
								</div>
							</div>
						</div>
					{/if}

					{#if chatPhase === 'responding' || chatPhase === 'done'}
						<!-- AI response (progressive reveal) -->
						<div class="flex items-start gap-2">
							<div class="mt-1 h-6 w-6 shrink-0 rounded-full bg-[var(--funkis-granite)] ai-avatar"></div>
							<div class="rounded-2xl rounded-tl-md border border-[var(--color-border-subtle)] bg-white px-3 py-2.5 text-[13px] text-[var(--color-text-primary)]">
								{#if aiLines >= 1}
									<p class="mb-2">{$lang === 'no' ? 'Her er noen arrangementer i Bergen denne helgen:' : 'Here are some events in Bergen this weekend:'}</p>
								{/if}
								{#if aiLines >= 2}
									<p class="mb-0.5">&#8226; Bergen Filharmoniske</p>
								{/if}
								{#if aiLines >= 3}
									<p class="mb-0.5">&#8226; {$lang === 'no' ? 'Kunstutstilling' : 'Art exhibition'} KODE</p>
								{/if}
								{#if aiLines >= 4}
									<p class="mb-2">&#8226; {$lang === 'no' ? 'Ølsmaking' : 'Beer tasting'} Bergen Kjøtt</p>
								{/if}
								{#if aiLines >= 5}
									<p class="text-[11px] font-medium text-[var(--funkis-red)]">{$lang === 'no' ? 'Kilde' : 'Source'}: gaari.no</p>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- Input bar -->
				<div class="px-3 pb-4">
					<div class="rounded-full bg-[var(--color-surface)] px-4 py-2.5 text-[12px] text-[var(--color-text-muted)]">
						{$lang === 'no' ? 'Spør om hva som helst...' : 'Ask anything...'}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- === HVA FÅR JEG === -->
<section class="bg-[var(--funkis-plaster)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-4xl">
		<!-- Section heading with large 13 -->
		<div class="mb-10 text-center">
			<h2 class="mb-3 text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
				{$lang === 'no' ? 'Hva du får' : 'What you get'}
			</h2>
			<p class="flex items-baseline justify-center gap-2 text-[var(--color-text-primary)]">
				<span class="text-[40px] font-bold leading-none font-[family-name:var(--font-display)] text-[var(--funkis-red)] md:text-[56px]">13</span>
				<span class="text-lg">{$lang === 'no' ? 'utvalgte sider bygget rundt søkevanene til folk i Bergen' : 'curated pages built around how people in Bergen search'}</span>
			</p>
		</div>

		<!-- Row 1: Fremhevet card + Product mockup -->
		<div class="mb-6 grid items-center gap-6 md:grid-cols-[45%_55%]">
			<!-- Fremhevet synlighet card -->
			<div class="rounded-xl bg-[var(--color-bg-surface)] p-6" style="border-top: 4px solid var(--funkis-red); box-shadow: var(--shadow-sm);">
				<h3 class="mb-2 text-lg font-bold">{$lang === 'no' ? 'Først på utvalgte sider' : 'First on curated pages'}</h3>
				<p class="text-sm text-[var(--color-text-secondary)]">
					{$lang === 'no'
						? 'Arrangementene dine vises øverst på sider som «Denne helgen» og «Konserter denne uken». 13 utvalgte sider som vokser jevnt. Alltid merket som fremhevet.'
						: 'Your events appear at the top of pages like "This Weekend" and "Concerts This Week". 13 pages growing steadily. Always labeled as featured.'}
				</p>
			</div>

			<!-- Product mockup: Browser frame with event cards -->
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
					<!-- Browser content: event card grid -->
					<div class="bg-[var(--color-bg)] p-3">
						<div class="grid grid-cols-2 gap-2">
							<!-- Card 1: Music — Fremhevet -->
							<div class="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
								<div class="relative flex h-16 items-end bg-[var(--color-cat-music)] p-1.5">
									<span class="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[var(--funkis-red)]" style="font-size: 8px; font-weight: 600; background: #F9EEEE;">
										{$lang === 'no' ? 'Fremhevet' : 'Featured'}
									</span>
									<span class="font-bold uppercase text-white/80 font-[family-name:var(--font-display)]" style="font-size: 8px;">
										{$lang === 'no' ? 'Musikk' : 'Music'}
									</span>
								</div>
								<div class="p-1.5">
									<p class="font-bold leading-tight" style="font-size: 10px;">Bergen Filharmoniske</p>
									<p class="text-[var(--color-text-muted)]" style="font-size: 8px;">Grieghallen</p>
									<p class="text-[var(--color-text-muted)]" style="font-size: 8px;">{$lang === 'no' ? 'Lør 15. mars' : 'Sat 15 Mar'}</p>
									<p class="font-semibold" style="font-size: 8px;">fra 350 kr</p>
								</div>
							</div>
							<!-- Card 2: Culture -->
							<div class="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
								<div class="relative flex h-16 items-end bg-[var(--color-cat-culture)] p-1.5">
									<span class="font-bold uppercase text-white/80 font-[family-name:var(--font-display)]" style="font-size: 8px;">
										{$lang === 'no' ? 'Kultur' : 'Culture'}
									</span>
								</div>
								<div class="p-1.5">
									<p class="font-bold leading-tight" style="font-size: 10px;">{$lang === 'no' ? 'Kunstutstilling' : 'Art exhibition'}</p>
									<p class="text-[var(--color-text-muted)]" style="font-size: 8px;">KODE</p>
									<p class="text-[var(--color-text-muted)]" style="font-size: 8px;">{$lang === 'no' ? 'Fre 14. mars' : 'Fri 14 Mar'}</p>
									<p class="font-semibold" style="font-size: 8px;">{$lang === 'no' ? 'Trolig gratis' : 'Likely free'}</p>
								</div>
							</div>
							<!-- Card 3: Food -->
							<div class="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
								<div class="relative flex h-16 items-end bg-[var(--color-cat-food)] p-1.5">
									<span class="font-bold uppercase text-white/80 font-[family-name:var(--font-display)]" style="font-size: 8px;">
										{$lang === 'no' ? 'Mat' : 'Food'}
									</span>
								</div>
								<div class="p-1.5">
									<p class="font-bold leading-tight" style="font-size: 10px;">{$lang === 'no' ? 'Ølsmaking' : 'Beer tasting'}</p>
									<p class="text-[var(--color-text-muted)]" style="font-size: 8px;">Bergen Kjøtt</p>
									<p class="text-[var(--color-text-muted)]" style="font-size: 8px;">{$lang === 'no' ? 'Fre 14. mars' : 'Fri 14 Mar'}</p>
									<p class="font-semibold" style="font-size: 8px;">fra 200 kr</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Row 2: AI-søk + Nyhetsbrev cards -->
		<div class="mb-6 grid gap-6 md:grid-cols-2">
			<!-- AI-søk card -->
			<div class="rounded-xl bg-[var(--color-bg-surface)] p-6" style="border-top: 4px solid var(--color-cat-culture); box-shadow: var(--shadow-sm);">
				<h3 class="mb-2 text-lg font-bold">{$lang === 'no' ? 'Arrangementene dine i AI-svar' : 'Your events in AI answers'}</h3>
				<p class="text-sm text-[var(--color-text-secondary)]">
					{$lang === 'no'
						? 'Vi optimaliserer for at Gåri skal dukke opp når folk spør ChatGPT om Bergen — en kanal de fleste arrangører ikke vet om ennå.'
						: 'We optimize for Gåri to appear when people ask ChatGPT about Bergen — a channel most organizers don\'t know about yet.'}
				</p>
			</div>
			<!-- Nyhetsbrev card -->
			<div class="rounded-xl bg-[var(--color-bg-surface)] p-6" style="border-top: 4px solid var(--color-cat-music); box-shadow: var(--shadow-sm);">
				<h3 class="mb-2 text-lg font-bold">{$lang === 'no' ? 'I nyhetsbrevet hver uke' : 'In the newsletter every week'}</h3>
				<p class="text-sm text-[var(--color-text-secondary)]">
					{$lang === 'no'
						? 'Arrangementene dine rett i innboksen til bergensere som planlegger helgen. Sendes hver torsdag.'
						: 'Your events straight in the inbox of people in Bergen planning their weekend. Sent every Thursday.'}
				</p>
			</div>
		</div>

		<!-- Row 3: Rapport card + Report mockup -->
		<div class="grid items-center gap-6 md:grid-cols-[55%_45%]">
			<!-- Rapport card -->
			<div class="rounded-xl bg-[var(--color-bg-surface)] p-6" style="border-top: 4px solid var(--funkis-green); box-shadow: var(--shadow-sm);">
				<h3 class="mb-2 text-lg font-bold">{$lang === 'no' ? 'Tall på hva det ga deg' : 'Numbers on what it did for you'}</h3>
				<p class="text-sm text-[var(--color-text-secondary)]">
					{$lang === 'no'
						? 'Månedlig rapport med klikk fra Gåri til nettsiden din, hvilke arrangementer som traff best, og AI-synlighetsdata.'
						: 'Monthly report with clicks from Gåri to your website, which events performed best, and AI visibility data.'}
				</p>
			</div>

			<!-- Report mockup card -->
			<div class="flex justify-center md:justify-end">
				<div class="w-full rounded-xl bg-[var(--color-bg-surface)] p-5" style="max-width: 320px; box-shadow: var(--shadow-sm);">
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
		</div>
	</div>
</section>

<!-- === HVA NÅ === -->
<!-- Transparency -->
<section class="bg-[var(--funkis-plaster)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-4xl">
		<div class="rounded-xl border-l-4 border-[var(--color-text-primary)] bg-[var(--color-bg-surface)] p-6 md:p-8">
			<h2 class="mb-3 text-xl font-bold font-[family-name:var(--font-display)]">
				{$lang === 'no' ? 'Ingen skjulte triks' : 'No hidden tricks'}
			</h2>
			<p class="text-[var(--color-text-secondary)]">
				{#if $lang === 'no'}
					Fremhevede arrangementer er alltid tydelig merket. Du får alltid data på hva plasseringen ga deg. Ingen bindingstid i prøveperioden.
				{:else}
					Featured events are always clearly labeled. You always get data on what the placement delivered. No commitment during the trial period.
				{/if}
			</p>
		</div>
	</div>
</section>

<!-- Hvem står bak -->
<section class="bg-[var(--color-bg-surface)] px-4 py-16 md:py-20">
	<div class="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[200px_1fr]">
		<!-- Photo placeholder — replace src with your actual photo -->
		<div class="flex justify-center">
			<img
				src="/images/kjersti.jpg"
				alt="Kjersti Valland Therkildsen"
				class="h-44 w-44 rounded-full object-cover border-4 border-[var(--funkis-plaster)]"
				style="box-shadow: var(--shadow-sm);"
			/>
		</div>

		<div>
			<h2 class="mb-4 text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
				{$lang === 'no' ? 'Hvem står bak' : 'Who\'s behind this'}
			</h2>
			<div class="space-y-4 text-[var(--color-text-primary)]">
				{#if $lang === 'no'}
					<p>Jeg heter Kjersti Valland Therkildsen. Jeg er mediedesigner fra Bergen, med en mastergrad fra Tokyo.</p>
					<p>Etter at jeg ble mor oppdaget jeg hvor vanskelig det faktisk er å finne ut hva som skjer i Bergen. Byen har et rikt kulturliv, men det finnes ikke ett sted der alt er samlet. Enten må man følge med på ti ulike nettsider, eller så går ting under radaren.</p>
					<p>Gåri er mitt svar på det problemet. God design starter med en tydelig utfordring — og dette er min: å samle alt som skjer i Bergen på ett sted, slik at ingen trenger å gå glipp av noe.</p>
				{:else}
					<p>My name is Kjersti Valland Therkildsen. I'm a media designer from Bergen, with a master's degree from Tokyo.</p>
					<p>After becoming a mother, I realized how hard it actually is to find out what's happening in Bergen. The city has a rich cultural scene, but there's no single place where everything is gathered. Either you follow ten different websites, or things slip under the radar.</p>
					<p>Gåri is my answer to that problem. Good design starts with a clear challenge — and this is mine: gathering everything happening in Bergen in one place, so nobody has to miss out.</p>
				{/if}
			</div>
		</div>
	</div>
</section>

<!-- Early Bird + CTA -->
<section bind:this={contactEl} id="contact" class="px-4 py-16 md:py-20" style="background-color: var(--funkis-red-subtle);">
	<div class="mx-auto max-w-4xl">
		<!-- Early bird header -->
		<div class="mb-10 text-center">
			<div class="mx-auto mb-4 h-1 w-16 rounded bg-[var(--funkis-red)]"></div>
			<h2 class="mb-4 text-2xl font-bold text-[var(--funkis-iron)] font-[family-name:var(--font-display)] md:text-[32px]">
				{$lang === 'no' ? '3 måneder gratis' : '3 months free'}
			</h2>
			<p class="mx-auto max-w-[600px] text-[var(--funkis-steel)]">
				{#if $lang === 'no'}
					Vi leter etter de første arrangørene i Bergen som vil prøve dette. Start før 1. juni 2026 — full tilgang, ingen bindingstid.
				{:else}
					We're looking for the first organizers in Bergen who want to try this. Start before June 1, 2026 — full access, no commitment.
				{/if}
			</p>
		</div>

		<!-- Email option — equally prominent -->
		<div class="mb-8 text-center">
			<a
				href="mailto:post@gaari.no?subject={$lang === 'no' ? 'Fremhevet synlighet på Gåri' : 'Promoted visibility on Gåri'}"
				data-plausible-event="for-arrangorer-email-click"
				onclick={() => trackEvent('for-arrangorer-email-click')}
				class="inline-block rounded-xl bg-[var(--funkis-red)] px-8 py-3 text-base font-semibold text-white hover:opacity-90"
				style="min-height: 44px; line-height: 24px;"
			>
				{$lang === 'no' ? 'Send e-post til post@gaari.no' : 'Email post@gaari.no'}
			</a>
		</div>

		<!-- Divider — framing the form as a quick message -->
		<p class="mb-6 text-center text-sm text-[var(--funkis-granite)]">
			{$lang === 'no' ? 'Eller send en rask melding:' : 'Or send a quick message:'}
		</p>

		<!-- Contact form — lightweight feel -->
		{#if contactStatus === 'success'}
			<div role="status" class="mx-auto max-w-md rounded-xl border border-green-200 bg-green-50 p-6 text-center">
				<p class="text-lg font-semibold text-green-800">
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
						} else {
							contactStatus = 'error';
						}
					};
				}}
				class="mx-auto max-w-md space-y-4 rounded-xl bg-[var(--color-bg-surface)] p-6"
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
					/>
				</div>

				<div>
					<label for="contact-message" class="mb-1 block text-sm font-medium">
						{$lang === 'no' ? 'Melding (valgfritt)' : 'Message (optional)'}
					</label>
					<textarea
						id="contact-message"
						name="message"
						rows="2"
						placeholder={$lang === 'no' ? 'Fortell oss litt om hva dere arrangerer...' : 'Tell us a bit about what you organize...'}
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm"
					></textarea>
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
						{$lang === 'no' ? 'Send' : 'Send'}
					{/if}
				</button>
			</form>
		{/if}

		<!-- Social proof near form -->
		<div class="mt-10 text-center">
			<p class="mb-3 text-sm text-[var(--funkis-granite)]">
				{$lang === 'no' ? 'Samler allerede fra 43 kilder i Bergen' : 'Already collecting from 43 sources in Bergen'}
			</p>
			<div class="flex flex-wrap justify-center gap-1.5">
				{#each venues.slice(0, 8) as venue (venue)}
					<span class="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-1 text-[12px] text-[var(--color-text-muted)]">
						{venue}
					</span>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- 10. Testimonial placeholder -->
<section class="bg-[var(--color-bg-surface)] px-4 py-12 md:py-16">
	<div class="mx-auto max-w-4xl text-center">
		<h2 class="mb-3 text-xl font-bold font-[family-name:var(--font-display)]">
			{$lang === 'no' ? 'Hva arrangører sier' : 'What organizers say'}
		</h2>
		<p class="text-sm italic text-[var(--color-text-muted)]">
			{$lang === 'no'
				? 'Gåri er i oppstartsfasen — de første tilbakemeldingene kommer snart.'
				: 'Gåri is in its early stages — the first feedback is coming soon.'}
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
			data-plausible-event="for-arrangorer-sticky-cta"
			onclick={() => trackEvent('for-arrangorer-sticky-cta')}
			class="flex items-center justify-center text-base font-semibold text-white"
			style="min-height: 40px;"
		>
			{$lang === 'no' ? 'Ta kontakt' : 'Get in touch'}
		</a>
	</div>
</div>

<style>
	@keyframes ai-breathe {
		0%, 100% { box-shadow: 0 0 0 0 rgba(107, 104, 98, 0.3); }
		50% { box-shadow: 0 0 8px 2px rgba(107, 104, 98, 0.15); }
	}
	.ai-avatar {
		animation: ai-breathe 3s ease-in-out infinite;
	}

	.chat-cursor {
		animation: blink 0.7s step-end infinite;
		font-weight: normal;
		color: var(--color-text-primary);
	}
	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0; }
	}

	.thinking-dot {
		font-size: 8px;
		color: var(--funkis-granite);
		animation: dot-bounce 1.4s ease-in-out infinite;
	}
	@keyframes dot-bounce {
		0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
		40% { opacity: 1; transform: translateY(-4px); }
	}

</style>
