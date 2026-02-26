<script lang="ts">
	import { enhance } from '$app/forms';
	import { lang } from '$lib/i18n';

	let contactStatus: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');

	const venues = [
		'Grieghallen', 'DNS', 'KODE', 'USF Verftet', 'Bergen Bibliotek',
		'Festspillene', 'Ole Bull', 'Harmonien', 'Fløyen', 'Bergenfest',
		'Bergen Kjøtt', 'Bjørgvin Blues Club'
	];
</script>

<!-- 1. Hero -->
<section class="bg-[var(--funkis-plaster)] px-4 py-16 md:py-24">
	<div class="mx-auto max-w-4xl text-center">
		<h1 class="mb-6 text-3xl font-bold tracking-tight font-[family-name:var(--font-display)] md:text-[40px] md:leading-tight">
			{$lang === 'no' ? 'Arrangementene dine i ChatGPT-svar' : 'Your events in ChatGPT answers'}
		</h1>
		<p class="mx-auto mb-8 max-w-[600px] text-lg text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Gåri samler alt som skjer i Bergen — og gjør det synlig i AI-søk, på Google og i ukentlige nyhetsbrev.
			{:else}
				Gåri brings together everything happening in Bergen — and makes it visible in AI search, on Google and in weekly newsletters.
			{/if}
		</p>
		<a
			href="#contact"
			class="inline-block rounded-xl bg-[var(--funkis-red)] px-8 py-3 text-base font-semibold text-white hover:opacity-90"
			style="min-height: 44px; line-height: 24px;"
		>
			{$lang === 'no' ? 'Send meg en melding' : 'Send me a message'}
		</a>
	</div>
</section>

<!-- 2. AI Search Pitch -->
<section class="bg-[var(--color-bg-surface)] px-4 py-16 md:py-20">
	<div class="mx-auto grid max-w-4xl gap-10 md:grid-cols-5">
		<div class="md:col-span-3">
			<h2 class="mb-4 text-2xl font-bold font-[family-name:var(--font-display)] md:text-3xl">
				{$lang === 'no' ? 'Visste du dette?' : 'Did you know this?'}
			</h2>
			<p class="mb-4 text-[var(--color-text-secondary)]">
				{#if $lang === 'no'}
					Når noen spør ChatGPT «hva skjer i Bergen denne helgen?», dukker arrangementene dine opp. Gåri er en av kildene AI-søkemotorene siterer — med lenke rett til arrangementet.
				{:else}
					When someone asks ChatGPT "what's happening in Bergen this weekend?", your events show up. Gåri is one of the sources AI search engines cite — with a link straight to the event.
				{/if}
			</p>
			<p class="text-[var(--color-text-secondary)]">
				{#if $lang === 'no'}
					De fleste arrangører vet ikke at dette skjer. Det er en helt ny kanal, og den vokser raskt.
				{:else}
					Most organizers don't know this is happening. It's a completely new channel, and it's growing fast.
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
			{$lang === 'no' ? 'kilder. Oppdatert to ganger daglig.' : 'sources. Updated twice daily.'}
		</h2>
		<p class="mx-auto mb-8 max-w-[640px] text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Fra Grieghallen og DNS til Bergen Kjøtt og Bjørgvin Blues Club. Dine arrangementer er sannsynligvis allerede på Gåri.
			{:else}
				From Grieghallen and DNS to Bergen Kjøtt and Bjørgvin Blues Club. Your events are probably already on Gåri.
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
					title: $lang === 'no' ? 'Jeg samler alt' : 'I collect everything',
					body: $lang === 'no'
						? 'Konserter, teater, mat, festivaler, familieaktiviteter, turer — 43 kilder i Bergen, oppdatert kl. 06 og 18 hver dag.'
						: 'Concerts, theatre, food, festivals, family activities, tours — 43 sources in Bergen, updated at 06:00 and 18:00 every day.'
				},
				{
					num: '2',
					title: $lang === 'no' ? 'Folk finner deg' : 'People find you',
					body: $lang === 'no'
						? 'Gjennom AI-søk, Google, 13 kuraterte sider på gaari.no og ukentlige nyhetsbrev. Mange oppdager ting de aldri ville søkt etter.'
						: 'Through AI search, Google, 13 curated pages on gaari.no and weekly newsletters. Many discover things they\'d never have searched for.'
				},
				{
					num: '3',
					title: $lang === 'no' ? 'Klikket går til deg' : 'The click goes to you',
					body: $lang === 'no'
						? 'Hvert arrangement linker til din billettside. Jeg selger aldri billetter — jeg sender publikum videre.'
						: 'Every event links to your ticket page. I never sell tickets — I send audiences your way.'
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
					title: $lang === 'no' ? 'Arrangementene dine i AI-svar' : 'Your events in AI answers',
					body: $lang === 'no'
						? 'Når folk spør ChatGPT om Bergen, dukker du opp. Gåri er en av kildene som blir sitert — en kanal de fleste arrangører ikke vet om ennå.'
						: 'When people ask ChatGPT about Bergen, you show up. Gåri is one of the sources that gets cited — a channel most organizers don\'t know about yet.'
				},
				{
					title: $lang === 'no' ? 'Først på kuraterte sider' : 'First on curated pages',
					body: $lang === 'no'
						? 'Arrangementene dine vises øverst på sider som «Denne helgen» og «Konserter denne uken». 13 sider, tusenvis av besøk. Alltid merket som fremhevet.'
						: 'Your events appear at the top of pages like "This Weekend" and "Concerts This Week". 13 pages, thousands of visits. Always labeled as featured.'
				},
				{
					title: $lang === 'no' ? 'I nyhetsbrevet hver uke' : 'In the newsletter every week',
					body: $lang === 'no'
						? 'Arrangementene dine rett i innboksen til bergensere som planlegger helgen. Sendes hver torsdag.'
						: 'Your events straight in the inbox of people in Bergen planning their weekend. Sent every Thursday.'
				},
				{
					title: $lang === 'no' ? 'Tall på hva det ga deg' : 'Numbers on what it did for you',
					body: $lang === 'no'
						? 'Månedlig rapport med klikk fra Gåri til nettsiden din, hvilke arrangementer som traff best, og AI-synlighetsdata.'
						: 'Monthly report with clicks from Gåri to your website, which events performed best, and AI visibility data.'
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
		<p class="text-lg leading-relaxed text-[var(--color-text-secondary)]" style="line-height: 1.7;">
			{#if $lang === 'no'}
				Den store konserthallen trekker folk til torget. Den lille bokklubben blir oppdaget av noen som bare kom for konserten. Det er ikke veldedighet — det er god forretning for alle.
			{:else}
				The big concert hall draws people to the square. The small book club gets discovered by someone who just came for the concert. It's not charity — it's good business for everyone.
			{/if}
		</p>
	</div>
</section>

<!-- 7. Transparency -->
<section class="bg-[var(--funkis-plaster)] px-4 py-12 md:py-16">
	<div class="mx-auto max-w-4xl">
		<div class="rounded-xl border-l-4 border-[var(--color-text-primary)] bg-[var(--color-bg-surface)] p-6 md:p-8">
			<h2 class="mb-3 text-xl font-bold font-[family-name:var(--font-display)]">
				{$lang === 'no' ? 'Ingen skjulte triks' : 'No hidden tricks'}
			</h2>
			<p class="text-[var(--color-text-secondary)]">
				{#if $lang === 'no'}
					Fremhevede arrangementer er alltid tydelig merket. Du får alltid data på hva plasseringen ga deg.
				{:else}
					Featured events are always clearly labeled. You always get data on what the placement delivered.
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
			{$lang === 'no' ? '3 måneder gratis' : '3 months free'}
		</h2>
		<p class="mx-auto max-w-[600px] text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Jeg leter etter de første arrangørene i Bergen som vil prøve dette. Start før 1. juni 2026 — full tilgang, ingen forpliktelser.
			{:else}
				I'm looking for the first organizers in Bergen who want to try this. Start before June 1, 2026 — full access, no commitment.
			{/if}
		</p>
		<a
			href="#contact"
			class="mt-8 inline-block rounded-xl bg-[var(--funkis-red)] px-8 py-3 text-base font-semibold text-white hover:opacity-90"
			style="min-height: 44px; line-height: 24px;"
		>
			{$lang === 'no' ? 'La meg vise deg tallene' : 'Let me show you the numbers'}
		</a>
	</div>
</section>

<!-- 9. CTA + Contact Form -->
<section id="contact" class="px-4 py-16 md:py-20" style="background-color: #F9EEEE;">
	<div class="mx-auto max-w-4xl">
		<h2 class="mb-4 text-center text-2xl font-bold font-[family-name:var(--font-display)] md:text-[32px]">
			{$lang === 'no' ? 'Nysgjerrig?' : 'Curious?'}
		</h2>
		<p class="mx-auto mb-8 max-w-[600px] text-center text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Send meg en e-post — så viser jeg deg dataen for dine arrangementer på Gåri.
			{:else}
				Send me an email — I'll show you the data for your events on Gåri.
			{/if}
		</p>

		<!-- Email button -->
		<div class="mb-10 text-center">
			<a
				href="mailto:gaari.bergen@proton.me?subject={$lang === 'no' ? 'Fremhevet synlighet på Gåri' : 'Promoted visibility on Gåri'}"
				class="inline-block rounded-xl bg-[var(--funkis-red)] px-8 py-3 text-base font-semibold text-white hover:opacity-90"
				style="min-height: 44px; line-height: 24px;"
			>
				{$lang === 'no' ? 'Send e-post til gaari.bergen@proton.me' : 'Email gaari.bergen@proton.me'}
			</a>
		</div>

		<!-- Divider -->
		<p class="mb-8 text-center text-sm text-[var(--color-text-muted)]">
			{$lang === 'no' ? 'Eller legg igjen kontaktinfo, så tar jeg kontakt.' : "Or leave your contact info and I'll be in touch."}
		</p>

		<!-- Contact form -->
		{#if contactStatus === 'success'}
			<div role="status" class="mx-auto max-w-md rounded-xl border border-green-200 bg-green-50 p-6 text-center">
				<p class="text-lg font-semibold text-green-800">
					{$lang === 'no' ? 'Takk! Jeg tar kontakt snart.' : "Thanks! I'll be in touch soon."}
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
						{$lang === 'no' ? 'Melding (valgfritt)' : 'Message (optional)'}
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
						{$lang === 'no' ? 'Sender...' : 'Sending...'}
					{:else}
						{$lang === 'no' ? 'Send' : 'Send'}
					{/if}
				</button>
			</form>
		{/if}
	</div>
</section>
