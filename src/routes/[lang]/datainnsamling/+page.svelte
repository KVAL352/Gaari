<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { lang, t } from '$lib/i18n';
	import { getCanonicalUrl } from '$lib/seo';
	import { Mail } from 'lucide-svelte';

	let optOutStatus: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/datainnsamling`));

	let metaDesc = $derived($lang === 'no'
		? 'Hvordan Gåri samler inn eventdata fra 46 kilder i Bergen. Juridisk grunnlag, prinsipper og opt-out for arrangører.'
		: 'How Gåri collects event data from 46 sources in Bergen. Legal basis, principles, and opt-out for organizers.');
</script>

<svelte:head>
	<title>{$t('dataCollectionTitle')} — Gåri</title>
	<meta name="description" content={metaDesc} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content={`${$t('dataCollectionTitle')} — Gåri`} />
	<meta property="og:description" content={metaDesc} />
	<meta property="og:image" content={`${$page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={`${$t('dataCollectionTitle')} — Gåri`} />
	<meta name="twitter:description" content={metaDesc} />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">
<div class="rounded-2xl bg-[var(--color-bg-surface)] px-6 py-10 shadow-[var(--shadow-sm)] sm:px-10">
	<h1 class="mb-6 text-3xl font-bold">{$t('dataCollectionTitle')}</h1>

	<!-- Intro -->
	<section class="mb-10">
		<p class="text-lg leading-relaxed">
			{#if $lang === 'no'}
				Vi tror på åpenhet om hvordan vi samler inn eventdata. Gåri aggregerer offentlig tilgjengelig
				informasjon om arrangementer i Bergen fra {46} kilder, slik at du kan finne alt som skjer på
				ett sted.
			{:else}
				We believe in transparency about how we collect event data. Gåri aggregates publicly
				available event information from {46} sources across Bergen, so you can find everything
				happening in one place.
			{/if}
		</p>
	</section>

	<!-- What we collect -->
	<section class="mb-10 border-t border-[var(--color-border)] pt-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Hva vi samler inn' : 'What we collect'}
		</h2>
		<p class="mb-4 leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Vi samler kun offentlige fakta om arrangementer:'
				: 'We only collect public facts about events:'}
		</p>
		<ul class="list-disc space-y-2 pl-5 text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				<li>Tittel på arrangementet</li>
				<li>Dato og tidspunkt</li>
				<li>Sted og adresse</li>
				<li>Pris og billettstatus</li>
				<li>Kategori (musikk, kultur, sport osv.)</li>
			{:else}
				<li>Event title</li>
				<li>Date and time</li>
				<li>Venue and address</li>
				<li>Price and ticket status</li>
				<li>Category (music, culture, sports, etc.)</li>
			{/if}
		</ul>
	</section>

	<!-- How we collect -->
	<section class="mb-10 border-t border-[var(--color-border)] pt-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Hvordan vi samler inn' : 'How we collect data'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Vi bruker automatiserte scrapere som besøker offentlige nettsider to ganger daglig.
				Scraperne identifiserer seg med et ærlig brukeragent-navn
				(<code class="rounded bg-[var(--color-bg-surface)] px-1.5 py-0.5 text-sm">Gaari-Bergen-Events/1.0</code>)
				og respekterer alle robots.txt-regler. Vi genererer egne beskrivelser basert på fakta — vi
				kopierer aldri kreativt innhold fra kildene.
			{:else}
				We use automated scrapers that visit public websites twice daily. Our scrapers identify
				themselves with an honest user agent
				(<code class="rounded bg-[var(--color-bg-surface)] px-1.5 py-0.5 text-sm">Gaari-Bergen-Events/1.0</code>)
				and respect all robots.txt rules. We generate our own descriptions based on facts — we never
				copy creative content from sources.
			{/if}
		</p>
	</section>

	<!-- Legal basis (expandable) -->
	<section class="mb-10 border-t border-[var(--color-border)] pt-8">
		<details class="rounded-lg border border-[var(--color-border)] p-5">
			<summary class="cursor-pointer text-xl font-semibold">
				{$lang === 'no' ? 'Juridisk grunnlag' : 'Legal basis'}
			</summary>
			<div class="mt-4 space-y-4 text-[var(--color-text-secondary)]">
				{#if $lang === 'no'}
					<p class="leading-relaxed">
						Scraping av offentlig tilgjengelig eventinformasjon er lovlig i Norge. Vårt juridiske
						grunnlag bygger på:
					</p>
					<ul class="list-disc space-y-3 pl-5">
						<li>
							<strong class="text-[var(--color-text-primary)]">Åndsverkloven §§ 2–3:</strong>
							Faktaopplysninger (tittel, dato, sted, pris) er ikke opphavsrettsbeskyttet. Vi
							kopierer aldri kreativt innhold.
						</li>
						<li>
							<strong class="text-[var(--color-text-primary)]">GDPR artikkel 6(1)(f):</strong>
							Berettiget interesse — vi videreformidler kun informasjon som arrangørene selv har
							offentliggjort.
						</li>
						<li>
							<strong class="text-[var(--color-text-primary)]">Vegvesen-saken (LG-2020-40700):</strong>
							Lagmannsretten frikjente standard HTTP-scraping av offentlig tilgjengelig informasjon.
						</li>
						<li>
							<strong class="text-[var(--color-text-primary)]">Straffeloven § 204:</strong>
							Vi omgår aldri autentisering eller tekniske sperrer — standard HTTP-forespørsler til
							offentlige sider er ikke datainnbrudd.
						</li>
					</ul>
				{:else}
					<p class="leading-relaxed">
						Scraping publicly available event information is legal in Norway. Our legal basis
						rests on:
					</p>
					<ul class="list-disc space-y-3 pl-5">
						<li>
							<strong class="text-[var(--color-text-primary)]">Norwegian Copyright Act §§ 2–3:</strong>
							Factual information (title, date, venue, price) is not copyrightable. We never copy
							creative content.
						</li>
						<li>
							<strong class="text-[var(--color-text-primary)]">GDPR Article 6(1)(f):</strong>
							Legitimate interest — we only relay information that organizers have already published.
						</li>
						<li>
							<strong class="text-[var(--color-text-primary)]">Vegvesen case (LG-2020-40700):</strong>
							The Norwegian Court of Appeal acquitted standard HTTP scraping of publicly available
							information.
						</li>
						<li>
							<strong class="text-[var(--color-text-primary)]">Criminal Code § 204:</strong>
							We never bypass authentication or technical barriers — standard HTTP requests to public
							pages are not unauthorized access.
						</li>
					</ul>
				{/if}
			</div>
		</details>
	</section>

	<!-- Our principles -->
	<section class="mb-10 border-t border-[var(--color-border)] pt-8">
		<h2 class="mb-4 text-xl font-semibold">
			{$lang === 'no' ? 'Våre prinsipper' : 'Our principles'}
		</h2>
		<ol class="list-decimal space-y-3 pl-5 text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				<li><strong class="text-[var(--color-text-primary)]">Respektér robots.txt</strong> — fullstendig revisjon av alle kilder gjennomført</li>
				<li><strong class="text-[var(--color-text-primary)]">Ikke omgå tekniske sperrer</strong></li>
				<li><strong class="text-[var(--color-text-primary)]">Generer egne beskrivelser</strong> — respekterer opphavsretten</li>
				<li><strong class="text-[var(--color-text-primary)]">Begrens datauttak</strong> — kun fremtidige arrangementer</li>
				<li><strong class="text-[var(--color-text-primary)]">Link tilbake</strong> — alle arrangementer linker til kilden</li>
				<li><strong class="text-[var(--color-text-primary)]">Rimelig frekvens</strong> — maks to ganger daglig</li>
				<li><strong class="text-[var(--color-text-primary)]">Ærlig identifikasjon</strong> — brukeragent med prosjektnavn og kontakt-e-post</li>
				<li><strong class="text-[var(--color-text-primary)]">Komplementær tjeneste</strong> — vi sender trafikk til arrangørene</li>
			{:else}
				<li><strong class="text-[var(--color-text-primary)]">Respect robots.txt</strong> — full audit of all sources completed</li>
				<li><strong class="text-[var(--color-text-primary)]">Never bypass technical barriers</strong></li>
				<li><strong class="text-[var(--color-text-primary)]">Generate our own descriptions</strong> — respecting copyright</li>
				<li><strong class="text-[var(--color-text-primary)]">Limit data extraction</strong> — only future events</li>
				<li><strong class="text-[var(--color-text-primary)]">Link back</strong> — all events link to the source</li>
				<li><strong class="text-[var(--color-text-primary)]">Reasonable frequency</strong> — at most twice daily</li>
				<li><strong class="text-[var(--color-text-primary)]">Honest identification</strong> — user agent with project name and contact email</li>
				<li><strong class="text-[var(--color-text-primary)]">Complementary service</strong> — we drive traffic to organizers</li>
			{/if}
		</ol>
	</section>

	<!-- Data sources (expandable) -->
	<section class="mb-10 border-t border-[var(--color-border)] pt-8">
		<details class="rounded-lg border border-[var(--color-border)] p-5">
			<summary class="cursor-pointer text-xl font-semibold">
				{$lang === 'no' ? 'Datakilder (46 kilder)' : 'Data sources (46 sources)'}
			</summary>
			<div class="mt-4 space-y-5 text-[var(--color-text-secondary)]">
				<div>
					<h4 class="mb-1 font-semibold text-[var(--color-text-primary)]">
						{$lang === 'no' ? 'Scener & konsertsteder' : 'Venues & concert halls'}
					</h4>
					<p class="text-sm leading-relaxed">
						Grieghallen, Ole Bull Scene, Forum Scene, Bergen Kjøtt, Harmonien, Oseana,
						Kulturhuset i Bergen, Bjørgvin Blues
					</p>
				</div>
				<div>
					<h4 class="mb-1 font-semibold text-[var(--color-text-primary)]">
						{$lang === 'no' ? 'Teater & dans' : 'Theatre & dance'}
					</h4>
					<p class="text-sm leading-relaxed">
						Den Nationale Scene, Det Vestnorske Teateret, BIT Teatergarasjen, Carte Blanche,
						Cornerteateret
					</p>
				</div>
				<div>
					<h4 class="mb-1 font-semibold text-[var(--color-text-primary)]">
						{$lang === 'no' ? 'Kunst & museer' : 'Art & museums'}
					</h4>
					<p class="text-sm leading-relaxed">
						KODE Bergen, Bergen Kunsthall, BEK, Akvariet i Bergen, Bymuseet i Bergen, Museum Vest,
						Litteraturhuset i Bergen, Bergen Filmklubb
					</p>
				</div>
				<div>
					<h4 class="mb-1 font-semibold text-[var(--color-text-primary)]">
						{$lang === 'no' ? 'Festivaler' : 'Festivals'}
					</h4>
					<p class="text-sm leading-relaxed">
						Bergenfest, Festspillene i Bergen, Beyond the Gates, Varmere Våtere Villere (VVV)
					</p>
				</div>
				<div>
					<h4 class="mb-1 font-semibold text-[var(--color-text-primary)]">
						{$lang === 'no' ? 'Kultur & arrangementer' : 'Culture & events'}
					</h4>
					<p class="text-sm leading-relaxed">
						USF Verftet, BergenLive, Kultur i Kveld
					</p>
				</div>
				<div>
					<h4 class="mb-1 font-semibold text-[var(--color-text-primary)]">
						{$lang === 'no' ? 'Offentlig & turisme' : 'Public & tourism'}
					</h4>
					<p class="text-sm leading-relaxed">
						Bergen Kommune, Bergen Bibliotek, visitBergen
					</p>
				</div>
				<div>
					<h4 class="mb-1 font-semibold text-[var(--color-text-primary)]">
						{$lang === 'no' ? 'Idrett & friluft' : 'Sports & outdoors'}
					</h4>
					<p class="text-sm leading-relaxed">
						SK Brann, DNT Bergen, Nordnes Sjøbad, Ado Arena, Fløyen
					</p>
				</div>
				<div>
					<h4 class="mb-1 font-semibold text-[var(--color-text-primary)]">
						{$lang === 'no' ? 'Mat & aktiviteter' : 'Food & activities'}
					</h4>
					<p class="text-sm leading-relaxed">
						Colonialen, Råbrent, Paint'n Sip, Bergen Brettspillklubb
					</p>
				</div>
				<div>
					<h4 class="mb-1 font-semibold text-[var(--color-text-primary)]">
						{$lang === 'no' ? 'Student & barn' : 'Student & family'}
					</h4>
					<p class="text-sm leading-relaxed">
						StudentBergen, BarnasNorge
					</p>
				</div>
				<div>
					<h4 class="mb-1 font-semibold text-[var(--color-text-primary)]">
						{$lang === 'no' ? 'Næringsliv & media' : 'Business & media'}
					</h4>
					<p class="text-sm leading-relaxed">
						Bergen Næringsråd, Media City Bergen
					</p>
				</div>
				<div>
					<h4 class="mb-1 font-semibold text-[var(--color-text-primary)]">
						{$lang === 'no' ? 'Billettplattformer' : 'Ticket platforms'}
					</h4>
					<p class="text-sm leading-relaxed">
						TicketCo, Hoopla, Eventbrite
					</p>
				</div>
			</div>
		</details>
	</section>

	<!-- What we DON'T do -->
	<section class="mb-10 border-t border-[var(--color-border)] pt-8">
		<h2 class="mb-4 text-xl font-semibold">
			{$lang === 'no' ? 'Hva vi IKKE gjør' : 'What we DON\'T do'}
		</h2>
		<ul class="list-disc space-y-2 pl-5 text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				<li>Vi samler ikke inn persondata (ingen e-poster, deltakerlister eller brukerkontoer)</li>
				<li>Vi omgår aldri autentisering, CAPTCHA eller tekniske sperrer</li>
				<li>Vi kopierer aldri kreativt innhold — alle beskrivelser er egenproduserte</li>
				<li>Vi arkiverer ikke historiske data fra kildene</li>
			{:else}
				<li>We don't collect personal data (no emails, attendee lists, or user accounts)</li>
				<li>We never bypass authentication, CAPTCHA, or technical barriers</li>
				<li>We never copy creative content — all descriptions are self-generated</li>
				<li>We don't archive historical data from sources</li>
			{/if}
		</ul>
	</section>

	<!-- Opt out form -->
	<section class="mb-10 border-t border-[var(--color-border)] pt-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Opt-out / fjern dine arrangementer' : 'Opt out / remove your events'}
		</h2>
		<p class="mb-5 leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Er du arrangør og ønsker ikke at dine arrangementer vises på Gåri? Fyll ut skjemaet under,
				så fjerner vi kildene dine innen 48 timer. Ingen spørsmål stilt.
			{:else}
				Are you an organizer and don't want your events shown on Gåri? Fill out the form below and
				we'll remove your sources within 48 hours. No questions asked.
			{/if}
		</p>

		{#if optOutStatus === 'success'}
			<div class="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800" role="status">
				{$lang === 'no'
					? 'Forespørselen din er mottatt. Vi behandler den innen 48 timer.'
					: 'Your request has been received. We\'ll process it within 48 hours.'}
			</div>
		{:else}
			<form
				method="POST"
				action="?/optout"
				use:enhance={() => {
					optOutStatus = 'submitting';
					return async ({ result }) => {
						if (result.type === 'success') {
							optOutStatus = 'success';
						} else {
							optOutStatus = 'error';
						}
					};
				}}
				class="space-y-5 rounded-lg border border-[var(--color-border)] p-5"
			>
				<!-- Honeypot field — hidden from users, bots will fill it -->
				<div class="absolute -left-[9999px]" aria-hidden="true">
					<input type="text" name="website" tabindex="-1" autocomplete="off" />
				</div>
				<div>
					<label for="organization" class="mb-1.5 block text-sm font-medium">
						{$lang === 'no' ? 'Organisasjon / stedsnavn' : 'Organization / venue name'}
					</label>
					<input
						type="text"
						id="organization"
						name="organization"
						aria-required="true"
						required
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm"
						placeholder={$lang === 'no' ? 'F.eks. Bergen Kunsthall' : 'E.g. Bergen Kunsthall'}
					/>
				</div>
				<div>
					<label for="domain" class="mb-1.5 block text-sm font-medium">
						{$lang === 'no' ? 'Nettside (domene)' : 'Website (domain)'}
					</label>
					<input
						type="text"
						id="domain"
						name="domain"
						aria-required="true"
						required
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm"
						placeholder={$lang === 'no' ? 'F.eks. kunsthall.no' : 'E.g. kunsthall.no'}
					/>
				</div>
				<div>
					<label for="email" class="mb-1.5 block text-sm font-medium">
						{$lang === 'no' ? 'Kontakt-e-post' : 'Contact email'}
					</label>
					<input
						type="email"
						id="email"
						name="email"
						aria-required="true"
						required
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm"
						placeholder={$lang === 'no' ? 'din@epost.no' : 'your@email.com'}
					/>
				</div>
				<div>
					<label for="reason" class="mb-1.5 block text-sm font-medium">
						{$lang === 'no' ? 'Begrunnelse (valgfritt)' : 'Reason (optional)'}
					</label>
					<textarea
						id="reason"
						name="reason"
						rows="2"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm"
					></textarea>
				</div>
				<button
					type="submit"
					disabled={optOutStatus === 'submitting'}
					class="rounded-xl bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-70"
				>
					{#if optOutStatus === 'submitting'}
						{$lang === 'no' ? 'Sender...' : 'Submitting...'}
					{:else}
						{$lang === 'no' ? 'Send forespørsel' : 'Submit request'}
					{/if}
				</button>
				{#if optOutStatus === 'error'}
					<p class="text-sm text-red-600" role="alert">
						{$lang === 'no'
							? 'Noe gikk galt. Prøv igjen eller send e-post til gaari.bergen@proton.me.'
							: 'Something went wrong. Please try again or email gaari.bergen@proton.me.'}
					</p>
				{/if}
			</form>
		{/if}
	</section>

	<!-- Contact & last updated -->
	<section class="border-t border-[var(--color-border)] pt-8">
		<h2 class="mb-3 text-xl font-semibold">{$t('contact')}</h2>
		<a
			href="mailto:gaari.bergen@proton.me"
			class="inline-flex items-center gap-2 text-[var(--color-text-primary)] underline"
		>
			<Mail size={16} />
			gaari.bergen@proton.me
		</a>
		<p class="mt-8 text-sm text-[var(--color-text-muted)]">
			{$lang === 'no' ? 'Sist oppdatert: 25. februar 2026' : 'Last updated: February 25, 2026'}
		</p>
	</section>
</div>
</div>
