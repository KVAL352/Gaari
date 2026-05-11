<script lang="ts">
	import { page } from '$app/stores';
	import { lang } from '$lib/i18n';
	import { getCanonicalUrl } from '$lib/seo';

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/opphavsrett`));

	let pageTitle = $derived($lang === 'no' ? 'Opphavsrett' : 'Copyright');
	let metaDesc = $derived($lang === 'no'
		? 'Opphavsrettspolicy for Gåri — hvordan vi behandler bilder og tekst, og hvordan du melder fra eller velger bort.'
		: 'Copyright policy for Gåri — how we handle images and text, and how to opt out or report issues.');
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
	<h1 class="mb-6 text-3xl font-bold">{pageTitle}</h1>

	<p class="mb-8 text-sm text-[var(--color-text-muted)]">
		{$lang === 'no' ? 'Sist oppdatert: 11. mai 2026' : 'Last updated: 11 May 2026'}
	</p>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Hva Gåri er' : 'What Gåri is'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Gåri er en arrangementskalender for Bergen. Vi samler offentlig tilgjengelig
				informasjon om arrangementer fra lokale arrangører — venues, festivaler, museer,
				kulturhus, offentlige institusjoner og frivillige organisasjoner — og viser dem
				på ett sted. Hvert arrangement lenker tilbake til den opprinnelige kilden så
				billettkjøp og påmelding går rett til arrangøren.
			{:else}
				Gåri is an event calendar for Bergen. We collect publicly available event
				information from local organizers — venues, festivals, museums, cultural houses,
				public institutions and non-profits — and display them in one place. Every event
				links back to its original source so ticket sales and registration go directly
				to the organizer.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Tekst' : 'Text'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Vi skriver aldri av beskrivelser fra kildene. Hver arrangementstekst på Gåri er
				enten en AI-generert oppsummering basert på faktaopplysninger (tittel, sted, dato,
				kategori, pris) eller en mal vi har laget selv. Titler beholdes som de står hos
				arrangøren.
			{:else}
				We never copy descriptions from sources. Every event text on Gåri is either an
				AI-generated summary based on factual data (title, location, date, category, price)
				or a template we've written ourselves. Titles are kept as the organizer wrote them.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Bilder' : 'Images'}
		</h2>
		<p class="mb-4 leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Vi hoster aldri bilder. Når et bilde vises på Gåri, lenker vi direkte til kildens
				egen server eller CDN — på samme måte som en nettleser viser et innebygd bilde
				fra en annen side. Hvis bildet endres eller fjernes fra kilden, oppdateres det
				også på Gåri automatisk.
			{:else}
				We never host images. When an image is shown on Gåri, we link directly to the
				source's own server or CDN — the same way a browser displays an embedded image
				from another site. If the image is changed or removed at the source, it updates
				on Gåri automatically too.
			{/if}
		</p>
		<p class="mb-4 leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				EU-domstolen har slått fast at lenking til verk som allerede er offentliggjort
				på nett ikke utgjør en ny offentliggjøring og dermed ikke krever ny tillatelse
				(Svensson C-466/12, BestWater C-348/13). Samme rettstilstand gjelder i Norge via
				EØS-avtalen og åndsverkslovens regler om tilgjengeliggjøring.
			{:else}
				The EU Court of Justice has established that linking to works already made
				available online does not constitute a new act of communication and therefore
				requires no new permission (Svensson C-466/12, BestWater C-348/13). The same legal
				position applies in Norway through the EEA Agreement and the Norwegian Copyright Act.
			{/if}
		</p>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Vi skiller mellom tre typer kilder. Offentlige institusjoner og venues med egne
				ansatte som kuraterer innholdet aktiveres med en varsling og opt-out. Aggregatorer
				der eksterne arrangører laster opp innhold, krever skriftlig tillatelse per
				arrangør før vi viser bilder.
			{:else}
				We distinguish between three types of sources. Public institutions and venues with
				staff who curate their content are activated with a notification and opt-out option.
				Aggregators where external organizers upload content require written permission
				per organizer before we display images.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Hvis du vil velge bort' : 'If you want to opt out'}
		</h2>
		<p class="mb-4 leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Er du arrangør, eier du en kilde vi henter fra, eller har du rettigheter til et
				spesifikt bilde — og ønsker ikke å vises på Gåri? Send en epost til
				<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>.
				Du kan velge nivå:
			{:else}
				If you're an organizer, own a source we collect from, or hold rights to a specific
				image — and don't want to appear on Gåri? Send an email to
				<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>.
				You can choose the level:
			{/if}
		</p>
		<ul class="mb-4 list-inside list-disc space-y-2 text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				<li><strong>Fjern alle bilder fra en kilde</strong> — vi slutter å vise bilder fra hele kilden</li>
				<li><strong>Fjern ett bilde</strong> — send URL-en til arrangementet på gaari.no</li>
				<li><strong>Fjern arrangementet helt</strong> — vi fjerner hele oppføringen og hindrer at den dukker opp igjen</li>
			{:else}
				<li><strong>Remove all images from a source</strong> — we stop showing images from the entire source</li>
				<li><strong>Remove a single image</strong> — send the URL to the event on gaari.no</li>
				<li><strong>Remove the event entirely</strong> — we remove the whole entry and prevent it from reappearing</li>
			{/if}
		</ul>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Alle henvendelser behandles innen 24 timer. Vi ber ikke om begrunnelse.
			{:else}
				All requests are processed within 24 hours. We don't ask for justification.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Meld fra om opphavsrettsbrudd' : 'Report copyright infringement'}
		</h2>
		<p class="mb-4 leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Mener du at et bilde eller en tekst på Gåri krenker dine rettigheter, send en
				epost til
				<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>
				med:
			{:else}
				If you believe an image or text on Gåri infringes your rights, send an email to
				<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>
				with:
			{/if}
		</p>
		<ul class="mb-4 list-inside list-disc space-y-2 text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				<li>URL-en til siden på gaari.no</li>
				<li>Beskrivelse av det beskyttede verket</li>
				<li>Dokumentasjon på at du er rettighetshaver eller representant</li>
			{:else}
				<li>The URL of the page on gaari.no</li>
				<li>Description of the protected work</li>
				<li>Documentation that you are the rights holder or representative</li>
			{/if}
		</ul>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Vi behandler henvendelsen innen 24 timer og fjerner materiale ved berettigede krav.
			{:else}
				We process the inquiry within 24 hours and remove material upon valid claims.
			{/if}
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'For arrangører' : 'For organizers'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Arrangerer du noe i Bergen og vil at det skal vises på Gåri? De fleste kommer på
				automatisk via scraperne våre. Hvis arrangementet ditt ikke dukker opp eller du
				vil ha kontroll over hvilket bilde som vises, send en epost til
				<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>.
			{:else}
				Are you running an event in Bergen and want it on Gåri? Most are picked up
				automatically by our scrapers. If your event doesn't appear or you'd like
				control over which image is shown, send an email to
				<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>.
			{/if}
		</p>
	</section>
</div>
