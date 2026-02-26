<script lang="ts">
	import { enhance } from '$app/forms';
	import { lang } from '$lib/i18n';

	let contactStatus: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');

	const venues = [
		'Grieghallen', 'DNS', 'KODE', 'USF Verftet', 'Bergen Bibliotek',
		'Festspillene', 'Ole Bull', 'Harmonien', 'Fløyen', 'Bergenfest',
		'Carte Blanche', 'BIT'
	];
</script>

<!-- 1. Hero -->
<section class="bg-[var(--funkis-plaster)] px-4 py-16 md:py-24">
	<div class="mx-auto max-w-4xl text-center">
		<h1 class="mb-6 text-3xl font-bold tracking-tight font-[family-name:var(--font-display)] md:text-[40px] md:leading-tight">
			{$lang === 'no' ? 'Synlig der folk faktisk søker' : 'Visible where people actually search'}
		</h1>
		<p class="mx-auto mb-8 max-w-[600px] text-lg text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Når noen spør ChatGPT, Google eller Perplexity «hva skjer i Bergen?» — er det Gåri som blir sitert. Vi hjelper arrangører å nå folk som søker med AI, på Google, og direkte på gaari.no.
			{:else}
				When someone asks ChatGPT, Google or Perplexity "what's happening in Bergen?" — Gåri is the source they cite. We help organizers reach people searching with AI, on Google, and directly on gaari.no.
			{/if}
		</p>
		<a
			href="#contact"
			class="inline-block rounded-xl bg-[var(--funkis-red)] px-8 py-3 text-base font-semibold text-white hover:opacity-90"
			style="min-height: 44px; line-height: 24px;"
		>
			{$lang === 'no' ? 'Ta kontakt' : 'Get in touch'}
		</a>
	</div>
</section>

<!-- 2. AI Search Pitch -->
<section class="bg-[var(--color-bg-surface)] px-4 py-16 md:py-20">
	<div class="mx-auto grid max-w-4xl gap-10 md:grid-cols-5">
		<div class="md:col-span-3">
			<h2 class="mb-4 text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
				{$lang === 'no' ? "Bergen's arrangementer i AI-søk" : "Bergen's events in AI search"}
			</h2>
			<p class="mb-4 text-[var(--color-text-secondary)]">
				{#if $lang === 'no'}
					Stadig flere finner ut hva som skjer i Bergen ved å spørre ChatGPT, Perplexity eller Google AI. Når de gjør det, er Gåri en av kildene som blir sitert — med lenke tilbake til arrangementene.
				{:else}
					More and more people find out what's happening in Bergen by asking ChatGPT, Perplexity or Google AI. When they do, Gåri is one of the sources that gets cited — with a link back to the events.
				{/if}
			</p>
			<p class="text-[var(--color-text-secondary)]">
				{#if $lang === 'no'}
					Dette er en helt ny kanal som de fleste arrangører ikke kjenner til ennå. Dine arrangementer er allerede synlige der — med fremhevet synlighet blir de enda mer fremtredende.
				{:else}
					This is a completely new channel that most organizers don't know about yet. Your events are already visible there — with promoted visibility they become even more prominent.
				{/if}
			</p>
		</div>
		<div class="flex items-center justify-center md:col-span-2">
			<div class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--funkis-plaster)] p-6 shadow-md">
				<div class="mb-3 flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-[var(--funkis-red)]"></div>
					<span class="text-xs font-medium text-[var(--color-text-muted)]">AI Search</span>
				</div>
				<p class="mb-2 text-sm italic text-[var(--color-text-secondary)]">
					"{$lang === 'no' ? 'Hva skjer i Bergen denne helgen?' : 'What\'s on in Bergen this weekend?'}"
				</p>
				<div class="rounded-lg bg-white p-3 text-sm text-[var(--color-text-secondary)]">
					<p class="mb-2">
						{$lang === 'no'
							? 'Ifølge Gåri, en lokal arrangementskalender for Bergen, skjer det mye denne helgen...'
							: 'According to Gåri, a local event calendar for Bergen, there\'s a lot happening this weekend...'}
					</p>
					<span class="text-xs text-[var(--funkis-red)] underline">gaari.no</span>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- 3. Social Proof -->
<section class="bg-[var(--funkis-plaster)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-4xl text-center">
		<p class="mb-2 text-5xl font-bold font-[family-name:var(--font-display)] text-[var(--color-text-primary)]">43</p>
		<h2 class="mb-4 text-xl font-bold font-[family-name:var(--font-display)]">
			{$lang === 'no' ? 'kilder i Bergen — oppdatert hver dag' : 'sources in Bergen — updated daily'}
		</h2>
		<p class="mx-auto mb-8 max-w-[640px] text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Gåri samler arrangementer fra 43 aktive kilder i Bergen, fra Grieghallen og DNS til Bergen Bibliotek og lokale klubber. Dine arrangementer er sannsynligvis allerede på Gåri.
			{:else}
				Gåri collects events from 43 active sources across Bergen, from Grieghallen and DNS to Bergen Public Library and local clubs. Your events are probably already on Gåri.
			{/if}
		</p>
		<div class="overflow-x-auto">
			<div class="flex justify-center gap-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)] opacity-60">
				{#each venues as venue}
					<span>{venue}</span>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- 4. How It Works -->
<section class="bg-[var(--color-bg-surface)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-4xl">
		<h2 class="mb-10 text-center text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
			{$lang === 'no' ? 'Slik fungerer det' : 'How it works'}
		</h2>
		<div class="grid gap-8 md:grid-cols-3">
			{#each [
				{
					num: '1',
					title: $lang === 'no' ? 'Vi samler' : 'We collect',
					body: $lang === 'no'
						? 'Alt som skjer i Bergen — konserter, teater, familieaktiviteter, festivaler, turer og mer. 43 kilder, oppdatert to ganger daglig.'
						: 'Everything happening in Bergen — concerts, theatre, family activities, festivals, tours and more. 43 sources, updated twice daily.'
				},
				{
					num: '2',
					title: $lang === 'no' ? 'Folk oppdager' : 'People discover',
					body: $lang === 'no'
						? 'Bergensere, studenter, turister og familier finner arrangementer gjennom AI-søk, Google, kuraterte sider på gaari.no og vårt ukentlige nyhetsbrev.'
						: 'Locals, students, tourists and families find events through AI search, Google, curated pages on gaari.no and our weekly newsletter.'
				},
				{
					num: '3',
					title: $lang === 'no' ? 'Vi sender dem til deg' : 'We send them to you',
					body: $lang === 'no'
						? 'Hvert arrangement linker direkte til din billettside eller nettside. Vi selger aldri billetter — vi sender publikum til deg.'
						: 'Every event links directly to your ticket page or website. We never sell tickets — we send audiences to you.'
				}
			] as step}
				<div>
					<p class="mb-2 text-5xl font-bold font-[family-name:var(--font-display)] text-[var(--funkis-red)]">{step.num}</p>
					<h3 class="mb-2 text-lg font-bold">{step.title}</h3>
					<p class="text-[var(--color-text-secondary)]">{step.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- 5. What You Get -->
<section class="bg-[var(--funkis-plaster)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-4xl">
		<h2 class="mb-10 text-center text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
			{$lang === 'no' ? 'Hva du får' : 'What you get'}
		</h2>
		<div class="grid gap-6 md:grid-cols-2">
			{#each [
				{
					title: $lang === 'no' ? 'Synlig i AI-søk' : 'Visible in AI search',
					body: $lang === 'no'
						? 'Når folk spør ChatGPT eller Perplexity om Bergen, blir Gåri sitert. Dine arrangementer er synlige i svarene — en kanal de fleste arrangører ikke utnytter ennå.'
						: 'When people ask ChatGPT or Perplexity about Bergen, Gåri is cited. Your events are visible in the answers — a channel most organizers aren\'t using yet.'
				},
				{
					title: $lang === 'no' ? 'Fremhevet på kuraterte sider' : 'Featured on curated pages',
					body: $lang === 'no'
						? 'Arrangementene dine vises fremst på sider som «Denne helgen i Bergen», «I kveld» og «Konserter denne uken». 13 kuraterte landingssider med tusenvis av besøk.'
						: 'Your events appear at the top of pages like "This Weekend in Bergen", "Tonight" and "Concerts This Week". 13 curated landing pages with thousands of visits.'
				},
				{
					title: $lang === 'no' ? 'Ukentlig nyhetsbrev' : 'Weekly newsletter',
					body: $lang === 'no'
						? 'Arrangementene dine inkluderes i vårt ukentlige nyhetsbrev som går direkte i innboksen til bergensere som aktivt ser etter ting å gjøre.'
						: 'Your events are included in our weekly newsletter that goes directly to the inbox of people in Bergen actively looking for things to do.'
				},
				{
					title: $lang === 'no' ? 'Månedlig rapport' : 'Monthly report',
					body: $lang === 'no'
						? 'Du får en oversikt over klikk fra Gåri til nettsiden din, hvilke arrangementer som fikk mest oppmerksomhet, og data om AI-synlighet.'
						: 'You get an overview of clicks from Gåri to your website, which events got the most attention, and AI visibility data.'
				}
			] as feature}
				<div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-sm">
					<h3 class="mb-2 text-lg font-bold">{feature.title}</h3>
					<p class="text-sm text-[var(--color-text-secondary)]">{feature.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- 6. Philosophy -->
<section class="bg-[var(--color-bg-surface)] px-4 py-16 md:py-20">
	<div class="mx-auto max-w-[640px] text-center">
		<h2 class="mb-6 text-2xl font-bold font-[family-name:var(--font-display)] md:text-[32px]">
			{$lang === 'no' ? 'Bergens digitale bytorg' : "Bergen's digital town square"}
		</h2>
		<div class="space-y-4 text-lg leading-relaxed text-[var(--color-text-secondary)]" style="line-height: 1.7;">
			{#if $lang === 'no'}
				<p>Et bytorg fungerer fordi alle er der. Den store konserthallen trekker folk til torget, og den lille bokklubben blir oppdaget av noen som egentlig bare kom for konserten.</p>
				<p>Gåri er bygget på samme idé. Når alle arrangementene i Bergen er samlet på ett sted, vinner alle — store og små.</p>
				<p>Det er ikke veldedighet. Det er god forretning for alle.</p>
			{:else}
				<p>A town square works because everyone is there. The large concert hall draws people to the square, and the small book club gets discovered by someone who really just came for the concert.</p>
				<p>Gåri is built on the same idea. When all of Bergen's events are gathered in one place, everyone wins — large and small.</p>
				<p>It's not charity. It's good business for everyone.</p>
			{/if}
		</div>
	</div>
</section>

<!-- 7. Transparency -->
<section class="bg-[var(--funkis-plaster)] px-4 py-12 md:py-16">
	<div class="mx-auto max-w-4xl">
		<div class="rounded-xl border-l-4 border-[var(--color-text-primary)] bg-[var(--color-bg-surface)] p-6 md:p-8">
			<h2 class="mb-3 text-xl font-bold font-[family-name:var(--font-display)]">
				{$lang === 'no' ? 'Transparent alltid' : 'Transparent always'}
			</h2>
			<p class="text-[var(--color-text-secondary)]">
				{#if $lang === 'no'}
					Alle fremhevede arrangementer er tydelig merket. Vi flytter aldri organisk innhold for å gjøre plass — fremhevet synlighet er en tilleggsposisjon, ikke en erstatning. Og du får alltid data på hva plasseringen ga deg.
				{:else}
					All promoted events are clearly labeled. We never push organic content aside to make room — promoted visibility is an additional position, not a replacement. And you always get data on what the placement delivered.
				{/if}
			</p>
		</div>
	</div>
</section>

<!-- 8. Early Bird -->
<section class="px-4 py-16 md:py-20" style="background-color: #F9EEEE;">
	<div class="mx-auto max-w-4xl text-center">
		<div class="mx-auto mb-6 h-1 w-16 rounded bg-[var(--funkis-red)]"></div>
		<h2 class="mb-6 text-2xl font-bold font-[family-name:var(--font-display)] md:text-[32px]">
			{$lang === 'no' ? 'Bli med tidlig — 3 måneder gratis' : 'Join early — 3 months free'}
		</h2>
		<div class="mx-auto max-w-[600px] space-y-4 text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				<p>Vi leter etter de første arrangørene som vil teste fremhevet synlighet på Gåri. De som starter samarbeid før 1. juni 2026 får de første tre månedene helt gratis — med full tilgang.</p>
				<p>Etter gratisperioden fortsetter du til ordinær pris, med full fleksibilitet.</p>
			{:else}
				<p>We're looking for the first organizers who want to try promoted visibility on Gåri. Those who start before June 1, 2026 get the first three months completely free — with full access.</p>
				<p>After the free period, you continue at the regular price, with full flexibility.</p>
			{/if}
		</div>
		<a
			href="#contact"
			class="mt-8 inline-block rounded-xl bg-[var(--funkis-red)] px-8 py-3 text-base font-semibold text-white hover:opacity-90"
			style="min-height: 44px; line-height: 24px;"
		>
			{$lang === 'no' ? 'Ta kontakt før 1. juni' : 'Get in touch before June 1'}
		</a>
	</div>
</section>

<!-- 9. CTA + Contact Form -->
<section id="contact" class="px-4 py-16 md:py-20" style="background-color: #F9EEEE;">
	<div class="mx-auto max-w-4xl">
		<h2 class="mb-4 text-center text-2xl font-bold font-[family-name:var(--font-display)] md:text-[32px]">
			{$lang === 'no' ? 'Vil du nå flere i Bergen?' : 'Want to reach more people in Bergen?'}
		</h2>
		<p class="mx-auto mb-8 max-w-[600px] text-center text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Fyll ut skjemaet under, så tar vi kontakt.
			{:else}
				Fill out the form below and we'll be in touch.
			{/if}
		</p>

		<!-- Contact form -->
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
						} else {
							contactStatus = 'error';
						}
					};
				}}
				class="mx-auto max-w-md space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6"
			>
				<!-- Honeypot -->
				<div class="absolute -left-[9999px]" aria-hidden="true">
					<input type="text" name="website" tabindex="-1" autocomplete="off" />
				</div>

				<div>
					<label for="contact-name" class="mb-1.5 block text-sm font-medium">
						{$lang === 'no' ? 'Navn' : 'Name'}
					</label>
					<input
						type="text"
						id="contact-name"
						name="name"
						required
						aria-required="true"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm"
					/>
				</div>

				<div>
					<label for="contact-org" class="mb-1.5 block text-sm font-medium">
						{$lang === 'no' ? 'Organisasjon' : 'Organization'}
					</label>
					<input
						type="text"
						id="contact-org"
						name="organization"
						required
						aria-required="true"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm"
					/>
				</div>

				<div>
					<label for="contact-email" class="mb-1.5 block text-sm font-medium">
						{$lang === 'no' ? 'E-post' : 'Email'}
					</label>
					<input
						type="email"
						id="contact-email"
						name="email"
						required
						aria-required="true"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm"
					/>
				</div>

				<div>
					<label for="contact-message" class="mb-1.5 block text-sm font-medium">
						{$lang === 'no' ? 'Kort melding (valgfritt)' : 'Short message (optional)'}
					</label>
					<textarea
						id="contact-message"
						name="message"
						rows="3"
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
						{$lang === 'no' ? 'Sender...' : 'Submitting...'}
					{:else}
						{$lang === 'no' ? 'Send' : 'Send'}
					{/if}
				</button>
			</form>
		{/if}

		<!-- Email fallback -->
		<p class="mt-8 text-center text-sm text-[var(--color-text-muted)]">
			{$lang === 'no' ? 'Eller send e-post direkte til' : 'Or email us directly at'}
			<a
				href="mailto:gaari.bergen@proton.me?subject={$lang === 'no' ? 'Fremhevet synlighet på Gåri' : 'Promoted visibility on Gåri'}"
				class="text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]"
			>gaari.bergen@proton.me</a>
		</p>
	</div>
</section>
