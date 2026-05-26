<script lang="ts">
	import { page } from '$app/stores';
	import { lang } from '$lib/i18n';
	import { getCanonicalUrl } from '$lib/seo';

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/personvern`));

	let pageTitle = $derived($lang === 'no' ? 'Personvern' : 'Privacy Policy');
	let metaDesc = $derived($lang === 'no'
		? 'Personvernerklæring for Gåri — arrangementsaggregator for Bergen. Vi samler minimalt med persondata og forklarer her hva som lagres, hvor lenge og hvorfor.'
		: 'Privacy policy for Gåri — event aggregator for Bergen. We collect minimal personal data and explain here what is stored, for how long and why.');
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
		{$lang === 'no' ? 'Sist oppdatert: mai 2026' : 'Last updated: May 2026'}
	</p>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Behandlingsansvarlig' : 'Data controller'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Behandlingsansvarlig for personopplysninger på gaari.no er
				<strong>Kjersti V. Therkildsen</strong>, som driver Gåri som et personlig prosjekt fra Bergen.
				Kontakt: <a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>
			{:else}
				The data controller for personal information on gaari.no is
				<strong>Kjersti V. Therkildsen</strong>, who runs Gåri as a personal project from Bergen, Norway.
				Contact: <a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Om Gåri' : 'About Gåri'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Gåri er en gratis arrangementsaggregator for Bergen. Vi samler automatisk informasjon om
				offentlige arrangementer fra lokale arrangører og viser dem på ett sted. Vi samler minimalt
				med persondata ved vanlig bruk — du trenger ikke konto eller innlogging for å bruke siden.
			{:else}
				Gåri is a free event aggregator for Bergen. We automatically collect information about public
				events from local organizers and display them in one place. We collect minimal personal data
				during normal use — no account or login is required.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Analyse — ingen informasjonskapsler, ingen persondata' : 'Analytics — no cookies, no personal data'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Vi bruker <strong>Umami Analytics</strong> for å forstå trafikkmønstre. Umami plasserer ingen
				informasjonskapsler, samler ikke inn IP-adresser og lagrer ingen personidentifiserbar informasjon.
				Ingen samtykke er nødvendig. Data behandles innenfor EU.
				Les mer på <a href="https://umami.is/privacy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">umami.is/privacy</a>.
			{:else}
				We use <strong>Umami Analytics</strong> to understand traffic patterns. Umami places no
				cookies, does not collect IP addresses, and stores no personally identifiable information.
				No consent is required. Data is processed within the EU.
				Learn more at <a href="https://umami.is/privacy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">umami.is/privacy</a>.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Klikk-logg for arrangører' : 'Click log for organisers'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Når du klikker på et arrangement-kort lagrer vi et anonymt klikk-signal: arrangementets slug, venue-navn, hvilken side klikket skjedde på, og hvorvidt kortet stod som Fremhevet eller i vanlig sortering. Dette brukes kun for å gi arrangørene aggregerte rapporter om hvor mange som oppdaget arrangementene deres.
				<strong>Ingen personidentifiserende data lagres</strong> — ingen IP, ingen cookies, ingen bruker-ID.
			{:else}
				When you click an event card we log an anonymous click signal: the event slug, venue name, which page the click happened on, and whether the card was shown as Featured or in its natural sort position. This is used only to give organisers aggregated reports on how many people discovered their events.
				<strong>No personally identifiable data is stored</strong> — no IP, no cookies, no user ID.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Skjemadata og nyhetsbrev' : 'Form data and newsletter'}
		</h2>
		<p class="mb-3 leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Gåri tilbyr fire frivillige skjemaer og et nyhetsbrev. Tabellen viser hvilke data som lagres, hvorfor, lovlig grunnlag etter GDPR Art. 6, og hvor lenge.'
				: 'Gåri offers four voluntary forms and a newsletter. The table below shows what data is stored, why, the legal basis under GDPR Art. 6, and for how long.'}
		</p>
		<ul class="space-y-4 text-[var(--color-text-secondary)]">
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Send inn arrangement' : 'Submit an event'}</strong><br />
				{#if $lang === 'no'}
					<em>Data:</em> Tittel, dato, sted, beskrivelse og e-postadresse (valgfritt).<br />
					<em>Formål:</em> Behandle innsendingen og varsle om publisering/avvisning.<br />
					<em>Lovlig grunnlag:</em> Avtale / forespørsel fra registrert (Art. 6(1)(b)).<br />
					<em>Lagringstid:</em> E-posten slettes når innsendingen er publisert eller avvist.
				{:else}
					<em>Data:</em> Title, date, venue, description and email (optional).<br />
					<em>Purpose:</em> Process the submission and notify about publication/rejection.<br />
					<em>Legal basis:</em> Contract / request from the data subject (Art. 6(1)(b)).<br />
					<em>Retention:</em> The email is deleted when the submission is published or rejected.
				{/if}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Reservasjonsrett (opt-out)' : 'Opt-out request'}</strong><br />
				{#if $lang === 'no'}
					<em>Data:</em> Organisasjonsnavn, domene, e-postadresse, begrunnelse.<br />
					<em>Formål:</em> Dokumentere at vi har sluttet å samle fra en kilde.<br />
					<em>Lovlig grunnlag:</em> Berettiget interesse (Art. 6(1)(f)) — å føre logg over reservasjoner.<br />
					<em>Lagringstid:</em> Lagres så lenge reservasjonen er aktiv. Slettes innen 6 måneder etter at reservasjonen er trukket tilbake skriftlig.
				{:else}
					<em>Data:</em> Organization name, domain, email, reason.<br />
					<em>Purpose:</em> Document that we have stopped collecting from a source.<br />
					<em>Legal basis:</em> Legitimate interest (Art. 6(1)(f)) — to keep a record of opt-outs.<br />
					<em>Retention:</em> Kept as long as the opt-out is active. Deleted within 6 months after the opt-out is withdrawn in writing.
				{/if}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Rettelsesforslag' : 'Correction suggestion'}</strong><br />
				{#if $lang === 'no'}
					<em>Data:</em> Arrangementets ID og din rettelse. E-post valgfritt.<br />
					<em>Formål:</em> Rette feil i arrangementsdata.<br />
					<em>Lovlig grunnlag:</em> Berettiget interesse (Art. 6(1)(f)) — datakvalitet.<br />
					<em>Lagringstid:</em> Slettes når rettelsen er behandlet.
				{:else}
					<em>Data:</em> Event ID and your correction. Email optional.<br />
					<em>Purpose:</em> Correct errors in event data.<br />
					<em>Legal basis:</em> Legitimate interest (Art. 6(1)(f)) — data quality.<br />
					<em>Retention:</em> Deleted once the correction has been processed.
				{/if}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Henvendelse fra arrangører (B2B)' : 'Organizer enquiry (B2B)'}</strong><br />
				{#if $lang === 'no'}
					<em>Data:</em> Navn, organisasjon, e-postadresse, melding.<br />
					<em>Formål:</em> Svare på henvendelser om markedsføring og samarbeid.<br />
					<em>Lovlig grunnlag:</em> Tiltak før avtaleinngåelse (Art. 6(1)(b)) / berettiget interesse (Art. 6(1)(f)).<br />
					<em>Lagringstid:</em> 2 år etter siste kontakt. Lengre hvis det fører til et kundeforhold (se "Betalt fremheving" nedenfor).
				{:else}
					<em>Data:</em> Name, organization, email, message.<br />
					<em>Purpose:</em> Respond to enquiries about marketing and partnerships.<br />
					<em>Legal basis:</em> Pre-contractual steps (Art. 6(1)(b)) / legitimate interest (Art. 6(1)(f)).<br />
					<em>Retention:</em> 2 years after last contact. Longer if it leads to a customer relationship (see "Paid promotion" below).
				{/if}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Nyhetsbrev' : 'Newsletter'}</strong><br />
				{#if $lang === 'no'}
					<em>Data:</em> E-postadresse + valgfrie preferanser (publikum, kategorier, bydel, pris, språk).<br />
					<em>Formål:</em> Sende ukentlig oversikt over arrangementer i Bergen.<br />
					<em>Lovlig grunnlag:</em> Samtykke (Art. 6(1)(a)) — gitt ved aktiv påmelding på siden. Kan trekkes tilbake når som helst via avmeldingslenken i hver e-post.<br />
					<em>Lagringstid:</em> Så lenge du er abonnent. Slettes hos oss og hos MailerLite innen 30 dager etter avmelding.
				{:else}
					<em>Data:</em> Email address + optional preferences (audience, categories, neighbourhood, price, language).<br />
					<em>Purpose:</em> Send a weekly overview of events in Bergen.<br />
					<em>Legal basis:</em> Consent (Art. 6(1)(a)) — given by active sign-up on the site. Can be withdrawn at any time via the unsubscribe link in each email.<br />
					<em>Retention:</em> For as long as you are subscribed. Deleted from our systems and from MailerLite within 30 days of unsubscribing.
				{/if}
			</li>
		</ul>
		<p class="mt-4 leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				<strong>Betalt fremheving:</strong> Hvis en arrangør betaler for plassert visning ("Fremhevet"),
				lagrer vi kontakt-e-post og en referanse til betalingen i <strong>Stripe</strong>. Fakturadata
				lagres i 5 år som påkrevd av bokføringsloven § 13. Lovlig grunnlag: avtale (Art. 6(1)(b)) +
				rettslig forpliktelse (Art. 6(1)(c)).
			{:else}
				<strong>Paid promotion:</strong> If an organizer pays for placed visibility ("Featured"),
				we store the contact email and a reference to the payment in <strong>Stripe</strong>. Invoice
				data is retained for 5 years as required by the Norwegian Bookkeeping Act § 13. Legal basis:
				contract (Art. 6(1)(b)) + legal obligation (Art. 6(1)(c)).
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Informasjonskapsler' : 'Cookies'}
		</h2>
		<p class="mb-3 leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Gåri bruker ingen sporings- eller markedsføringscookies. Følgende cookies kan settes:'
				: 'Gåri uses no tracking or marketing cookies. The following cookies may be set:'}
		</p>
		<ul class="space-y-2 text-[var(--color-text-secondary)]">
			<li class="leading-relaxed">
				<strong>ai_ref</strong> —
				{#if $lang === 'no'}
					kortvarig cookie (30 sekunder) som settes hvis du kommer fra en AI-søketjeneste (ChatGPT, Claude, Perplexity, Copilot eller liknende). Brukes utelukkende til å attribuere første-treff til riktig kilde i intern statistikk. Inneholder kun navn på AI-tjenesten, ingen personidentifiserbar informasjon.
				{:else}
					short-lived cookie (30 seconds) set if you arrive from an AI search service (ChatGPT, Claude, Perplexity, Copilot or similar). Used solely to attribute the first hit to the correct source in internal statistics. Contains only the AI service name, no personally identifiable information.
				{/if}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Admin-øktcookie' : 'Admin session cookie'}</strong> —
				{$lang === 'no'
					? 'kun på /admin-sider for innloggede administratorer. Aldri for vanlige besøkende.'
					: 'only on /admin pages for logged-in administrators. Never for regular visitors.'}
			</li>
		</ul>
		<p class="mt-3 leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Analysetjenesten Umami plasserer ingen cookies.'
				: 'The Umami analytics service places no cookies.'}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Databehandlere' : 'Data processors'}
		</h2>
		<p class="mb-3 leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Disse tjenestene kan behandle personopplysninger på vegne av Gåri:'
				: 'These services may process personal data on behalf of Gåri:'}
		</p>
		<ul class="space-y-2 text-[var(--color-text-secondary)]">
			<li>
				<strong>Supabase</strong> —
				{$lang === 'no' ? 'databasevert (EU-region). Lagring av skjemadata.' : 'database host (EU region). Storage of form data.'}
				<a href="https://supabase.com/privacy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">supabase.com/privacy</a>
			</li>
			<li>
				<strong>Vercel</strong> —
				{$lang === 'no' ? 'nettvert og CDN. Standardiserte serverlogger (sti, status, user-agent, IP) lagres for feilsøking i henhold til Vercels retensjonspolicy.' : 'hosting and CDN. Standard server logs (path, status, user-agent, IP) are kept for debugging according to Vercel\'s retention policy.'}
				<a href="https://vercel.com/legal/privacy-policy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">vercel.com/legal/privacy-policy</a>
			</li>
			<li>
				<strong>Umami Analytics</strong> —
				{$lang === 'no' ? 'personvernvennlig analyse, ingen cookies, ingen IP.' : 'privacy-friendly analytics, no cookies, no IP.'}
				<a href="https://umami.is/privacy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">umami.is/privacy</a>
			</li>
			<li>
				<strong>MailerLite</strong> —
				{$lang === 'no' ? 'utsending av nyhetsbrev. Lagrer e-post + preferanser.' : 'newsletter delivery. Stores email + preferences.'}
				<a href="https://www.mailerlite.com/legal/privacy-policy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">mailerlite.com/legal/privacy-policy</a>
			</li>
			<li>
				<strong>Resend</strong> —
				{$lang === 'no' ? 'transaksjonsepost (velkomst, bekreftelse, varsler).' : 'transactional email (welcome, confirmation, notifications).'}
				<a href="https://resend.com/legal/privacy-policy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">resend.com/legal/privacy-policy</a>
			</li>
			<li>
				<strong>Stripe</strong> —
				{$lang === 'no' ? 'betalingsbehandling for promoted placements. Stripe håndterer kortdata; Gåri lagrer kun referanse og fakturakontakt.' : 'payment processing for promoted placements. Stripe handles card data; Gåri stores only a reference and the invoice contact.'}
				<a href="https://stripe.com/privacy" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">stripe.com/privacy</a>
			</li>
		</ul>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Dine rettigheter (GDPR)' : 'Your rights (GDPR)'}
		</h2>
		<p class="mb-3 leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no' ? 'Etter GDPR har du rett til:' : 'Under GDPR you have the right to:'}
		</p>
		<ul class="mb-3 space-y-1 text-[var(--color-text-secondary)]">
			<li>{$lang === 'no' ? 'Innsyn i hvilke personopplysninger vi har om deg (Art. 15)' : 'Access the personal data we hold about you (Art. 15)'}</li>
			<li>{$lang === 'no' ? 'Retting av feilaktige opplysninger (Art. 16)' : 'Rectification of inaccurate data (Art. 16)'}</li>
			<li>{$lang === 'no' ? 'Sletting — "retten til å bli glemt" (Art. 17)' : 'Erasure — the "right to be forgotten" (Art. 17)'}</li>
			<li>{$lang === 'no' ? 'Begrensning av behandlingen (Art. 18)' : 'Restriction of processing (Art. 18)'}</li>
			<li>{$lang === 'no' ? 'Dataportabilitet — motta dine data i et strukturert format (Art. 20)' : 'Data portability — receive your data in a structured format (Art. 20)'}</li>
			<li>{$lang === 'no' ? 'Innsigelse mot behandling basert på berettiget interesse (Art. 21)' : 'Object to processing based on legitimate interest (Art. 21)'}</li>
			<li>{$lang === 'no' ? 'Trekke tilbake samtykke når som helst — gjelder nyhetsbrev (Art. 7)' : 'Withdraw consent at any time — applies to the newsletter (Art. 7)'}</li>
		</ul>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				For å utøve dine rettigheter, kontakt
				<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>.
				Vi svarer normalt innen 30 dager. Du har også rett til å klage til Datatilsynet
				(<a href="https://datatilsynet.no" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">datatilsynet.no</a>).
			{:else}
				To exercise your rights, contact
				<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>.
				We normally respond within 30 days. You also have the right to file a complaint with the
				Norwegian Data Protection Authority
				(<a href="https://datatilsynet.no" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">datatilsynet.no</a>).
			{/if}
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
