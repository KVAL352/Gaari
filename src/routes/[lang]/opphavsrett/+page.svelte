<script lang="ts">
	import { page } from '$app/stores';
	import { lang } from '$lib/i18n';
	import { getCanonicalUrl } from '$lib/seo';

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/opphavsrett`));

	let pageTitle = $derived($lang === 'no' ? 'Opphavsrett' : 'Copyright');
	let metaDesc = $derived($lang === 'no'
		? 'Opphavsrettspolicy for Gåri — hvordan vi behandler bilder og innhold, og hvordan du melder fra om brudd.'
		: 'Copyright policy for Gåri — how we handle images and content, and how to report infringement.');
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
		{$lang === 'no' ? 'Sist oppdatert: april 2026' : 'Last updated: April 2026'}
	</p>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Om Gåri og innhold' : 'About Gåri and content'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Gåri er en arrangementsaggregator for Bergen. Vi samler offentlig tilgjengelig
				informasjon om arrangementer fra lokale arrangører og viser dem på ett sted.
				Vi skriver aldri av beskrivelser fra kildene — alle tekster er enten AI-genererte
				oppsummeringer eller maler.
			{:else}
				Gåri is an event aggregator for Bergen. We collect publicly available event
				information from local organizers and display it in one place. We never copy
				descriptions from sources — all texts are either AI-generated summaries or
				templates.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Bilder' : 'Images'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Gåri viser kun bilder fra arrangører som har gitt oss uttrykkelig tillatelse
				til å bruke deres bilder. Vi hoster ingen bilder selv. Dersom vi ikke har
				tillatelse, viser vi en kategoribasert plassholdergrafikk i stedet.
			{:else}
				Gåri only displays images from organizers who have given us explicit permission
				to use their images. We do not host any images ourselves. Where we do not have
				permission, we show a category-based placeholder graphic instead.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Meld fra om brudd' : 'Report infringement'}
		</h2>
		<p class="mb-4 leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Dersom du mener at innhold på Gåri krenker dine opphavsrettigheter, ber vi deg
				ta kontakt direkte med oss. Vi behandler alle henvendelser innen 24 timer og
				fjerner materiale umiddelbart ved berettigede krav.
			{:else}
				If you believe that content on Gåri infringes your copyright, please contact us
				directly. We process all inquiries within 24 hours and remove material
				immediately upon valid claims.
			{/if}
		</p>
		<p class="mb-4 leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Send en e-post til <a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a> med:
			{:else}
				Send an email to <a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a> with:
			{/if}
		</p>
		<ul class="mb-4 list-inside list-disc space-y-2 text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				<li>URL-en til siden på Gåri der materialet vises</li>
				<li>Beskrivelse av det beskyttede verket</li>
				<li>Dokumentasjon på at du er rettighetshaver eller representant</li>
			{:else}
				<li>The URL of the page on Gåri where the material is displayed</li>
				<li>Description of the protected work</li>
				<li>Documentation that you are the rights holder or their representative</li>
			{/if}
		</ul>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'For arrangører' : 'For organizers'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Er du arrangør og vil at arrangementene dine skal vises med bilder på Gåri?
				Vi samarbeider gjerne. Ta kontakt på
				<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>
				for å avtale bildebruk.
			{:else}
				Are you an organizer and want your events to be displayed with images on Gåri?
				We'd love to work with you. Get in touch at
				<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>
				to arrange image usage.
			{/if}
		</p>
	</section>
</div>
