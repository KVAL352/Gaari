<script lang="ts">
	import { page } from '$app/stores';
	import { lang } from '$lib/i18n';
	import { getCanonicalUrl } from '$lib/seo';

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/personvern`));

	let pageTitle = $derived($lang === 'no' ? 'Personvern' : 'Privacy Policy');
	let metaDesc = $derived($lang === 'no'
		? 'Personvernerklæring for Gåri — arrangementsaggregator for Bergen. Vi samler ikke persondata ved vanlig bruk.'
		: 'Privacy policy for Gåri — event aggregator for Bergen. We collect no personal data during normal use.');
</script>

<svelte:head>
	<title>{pageTitle} — Gåri</title>
	<meta name="description" content={metaDesc} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content={`${pageTitle} — Gåri`} />
	<meta property="og:description" content={metaDesc} />
	<meta property="og:image" content={`${$page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={`${pageTitle} — Gåri`} />
	<meta name="twitter:description" content={metaDesc} />
	<meta name="twitter:image" content={`${$page.url.origin}/og/default.png`} />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">
	<h1 class="mb-6 text-3xl font-bold">
		{$lang === 'no' ? 'Personvern' : 'Privacy Policy'}
	</h1>

	<p class="mb-8 text-sm text-[var(--color-text-muted)]">
		{$lang === 'no' ? 'Sist oppdatert: februar 2026' : 'Last updated: February 2026'}
	</p>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Hvem vi er' : 'Who we are'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Gåri er en gratis arrangementsaggregator for Bergen, drevet som et personlig prosjekt.
				Vi samler automatisk informasjon om offentlige arrangementer fra lokale arrangører og viser dem på ett sted.
				Kontakt: <a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>
			{:else}
				Gåri is a free event aggregator for Bergen, operated as a personal project.
				We automatically collect information about public events from local organizers and display them in one place.
				Contact: <a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Analyse — ingen informasjonskapsler, ingen persondata' : 'Analytics — no cookies, no personal data'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Vi bruker <strong>Plausible Analytics</strong> for å forstå trafikkmønstre. Plausible plasserer ingen
				informasjonskapsler, samler ikke inn IP-adresser og lagrer ingen personidentifiserbar informasjon.
				Ingen samtykke er nødvendig. Data behandles innenfor EU/EØS.
				Les mer på <a href="https://plausible.io/privacy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">plausible.io/privacy</a>.
			{:else}
				We use <strong>Plausible Analytics</strong> to understand traffic patterns. Plausible places no
				cookies, does not collect IP addresses, and stores no personally identifiable information.
				No consent is required. Data is processed within the EU/EEA.
				Learn more at <a href="https://plausible.io/privacy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">plausible.io/privacy</a>.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Skjemadata' : 'Form data'}
		</h2>
		<p class="mb-3 leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Gåri tilbyr tre frivillige skjemaer. Data lagres i Supabase (PostgreSQL, EU-dataregion).'
				: 'Gåri offers three voluntary forms. Data is stored in Supabase (PostgreSQL, EU data region).'}
		</p>
		<ul class="space-y-3 text-[var(--color-text-secondary)]">
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Send inn arrangement' : 'Submit an event'}</strong> —
				{$lang === 'no'
					? 'Tittel, dato, sted, beskrivelse og e-postadresse. E-posten brukes kun for å bekrefte/avvise innsendingen og slettes etterpå.'
					: 'Title, date, venue, description and email address. The email is used only to confirm or reject the submission and is deleted afterwards.'}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Reservasjonsrett (opt-out)' : 'Opt-out request'}</strong> —
				{$lang === 'no'
					? 'Organisasjonsnavn, nettstedsdomene, e-postadresse og begrunnelse. Lagres så lenge reservasjonen er aktiv.'
					: 'Organization name, website domain, email address and reason. Stored for as long as the opt-out is active.'}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Rettelsesforslag' : 'Correction suggestion'}</strong> —
				{$lang === 'no'
					? 'Arrangementets ID og din rettelse. Ingen persondata lagres med mindre du frivillig oppgir kontaktinformasjon i meldingsfeltet.'
					: 'The event ID and your correction. No personal data is stored unless you voluntarily include contact information in the message field.'}
			</li>
		</ul>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Informasjonskapsler' : 'Cookies'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Gåri bruker ingen informasjonskapsler for vanlige besøkende. Analysetjenesten (Plausible) bruker heller ikke informasjonskapsler. Den eneste informasjonskapselen som plasseres er en admin-øktcookie — kun for interne administrasjonsider, aldri for vanlige besøkende.'
				: 'Gåri uses no cookies for regular visitors. The analytics service (Plausible) also uses no cookies. The only cookie placed is an admin session cookie — only for internal administration pages, never for regular visitors.'}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Tredjepartstjenester' : 'Third-party services'}
		</h2>
		<ul class="space-y-2 text-[var(--color-text-secondary)]">
			<li><strong>Supabase</strong> — {$lang === 'no' ? 'databasevert (EU-region). Personvernerklæring:' : 'database host (EU region). Privacy policy:'} <a href="https://supabase.com/privacy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">supabase.com/privacy</a></li>
			<li><strong>Vercel</strong> — {$lang === 'no' ? 'nettvert og CDN. Anonymiserte loggdata for feilsøking.' : 'hosting and CDN. Anonymized log data for debugging.'} <a href="https://vercel.com/legal/privacy-policy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">vercel.com/legal/privacy-policy</a></li>
			<li><strong>Plausible Analytics</strong> — {$lang === 'no' ? 'personvernvennlig analyse, ingen informasjonskapsler.' : 'privacy-friendly analytics, no cookies.'} <a href="https://plausible.io/privacy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">plausible.io/privacy</a></li>
		</ul>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Dine rettigheter (GDPR)' : 'Your rights (GDPR)'}
		</h2>
		<p class="mb-3 leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Etter GDPR har du rett til innsyn i, retting av og sletting av personopplysninger vi måtte ha om deg. Siden vi samler minimalt med persondata ved vanlig bruk, vil dette typisk bare gjelde deg som har sendt inn et skjema.'
				: 'Under GDPR you have the right to access, correct and delete any personal data we hold about you. Since we collect minimal personal data during normal use, this will typically only apply if you have submitted a form.'}
		</p>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'For å utøve dine rettigheter, kontakt oss på'
				: 'To exercise your rights, contact us at'}
			<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>.
			{$lang === 'no'
				? 'Du kan også klage til Datatilsynet (datatilsynet.no).'
				: 'You can also file a complaint with the Norwegian Data Protection Authority (datatilsynet.no).'}
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Endringer' : 'Changes'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Vesentlige endringer i denne erklæringen vil bli annonsert på siden. Datoen øverst viser siste oppdatering.'
				: 'Material changes to this statement will be announced on the page. The date at the top shows the last update.'}
		</p>
	</section>
</div>
