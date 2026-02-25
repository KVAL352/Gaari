<script lang="ts">
	import { lang } from '$lib/i18n';
	import { getCanonicalUrl } from '$lib/seo';

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/tilgjengelighet`));
</script>

<svelte:head>
	<title>{$lang === 'no' ? 'Tilgjengelighetserklæring' : 'Accessibility Statement'} — Gåri</title>
	<meta name="description" content={$lang === 'no'
		? 'Tilgjengelighetserklæring for Gåri. Vi følger WCAG 2.2 nivå AA og EAA-kravene som gjelder i Norge.'
		: 'Accessibility statement for Gåri. We follow WCAG 2.2 level AA and the EAA requirements applicable in Norway.'} />
	<link rel="canonical" href={canonicalUrl} />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">
	<h1 class="mb-6 text-3xl font-bold">
		{$lang === 'no' ? 'Tilgjengelighetserklæring' : 'Accessibility Statement'}
	</h1>

	<p class="mb-8 text-sm text-[var(--color-text-muted)]">
		{$lang === 'no' ? 'Sist oppdatert: februar 2026' : 'Last updated: February 2026'}
	</p>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Vårt mål' : 'Our commitment'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Gåri er forpliktet til å følge <strong>WCAG 2.2 nivå AA</strong> og kravene i EUs tilgjengelighetsdirektiv (EAA),
				som gjelder i Norge gjennom EØS-avtalen. Vi ønsker at alle skal kunne bruke nettstedet, uavhengig av
				hjelpemiddel eller funksjonsevne.
			{:else}
				Gåri is committed to meeting <strong>WCAG 2.2 level AA</strong> and the requirements of the European
				Accessibility Act (EAA), which applies in Norway through the EEA Agreement. We want everyone to be
				able to use the site regardless of assistive technology or ability.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Hva vi har bygget inn' : 'What we have built in'}
		</h2>
		<ul class="space-y-2 text-[var(--color-text-secondary)]">
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Hopp til innhold' : 'Skip link'}</strong> —
				{$lang === 'no'
					? 'En skjult lenke øverst på siden lar tastaturbrukere hoppe direkte til arrangementslisten.'
					: 'A hidden link at the top of the page lets keyboard users skip directly to the event list.'}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Fokusindikator' : 'Focus indicator'}</strong> —
				{$lang === 'no'
					? 'Alle interaktive elementer har synlig fokusring (2px, :focus-visible) for tastaturnavigasjon.'
					: 'All interactive elements have a visible focus ring (2px, :focus-visible) for keyboard navigation.'}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Fargekontrast' : 'Color contrast'}</strong> —
				{$lang === 'no'
					? 'All tekst oppfyller WCAG AA-krav: primærtekst 7,88:1, sekundærtekst 6,96:1, dempet tekst 7,01:1.'
					: 'All text meets WCAG AA requirements: primary text 7.88:1, secondary text 6.96:1, muted text 7.01:1.'}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Semantisk HTML og landemerker' : 'Semantic HTML and landmarks'}</strong> —
				{$lang === 'no'
					? 'Sidene bruker semantiske elementer som <code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code> og <code>&lt;footer&gt;</code>.'
					: 'Pages use semantic elements including <code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code> and <code>&lt;footer&gt;</code>.'}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Dynamisk språkattributt' : 'Dynamic language attribute'}</strong> —
				{$lang === 'no'
					? '<code>lang</code>-attributtet på <code>&lt;html&gt;</code> oppdateres automatisk basert på valgt språk (nb/en).'
					: 'The <code>lang</code> attribute on <code>&lt;html&gt;</code> is updated automatically based on the selected language (nb/en).'}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Tastaturnavigasjon' : 'Keyboard navigation'}</strong> —
				{$lang === 'no'
					? '"Legg til kalender"-menyen følger WAI-ARIA-menymønsteret fullt ut: piltaster, Home/End, Escape returnerer fokus.'
					: 'The "Add to Calendar" menu fully implements the WAI-ARIA menu pattern: arrow keys, Home/End, Escape returns focus.'}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'ARIA-attributter' : 'ARIA attributes'}</strong> —
				{$lang === 'no'
					? 'Filterknapper bruker <code>aria-pressed</code>. Dynamisk innhold bruker <code>aria-live="polite"</code>. Alle nødvendige skjemafelt har <code>aria-required="true"</code>.'
					: 'Filter buttons use <code>aria-pressed</code>. Dynamic content uses <code>aria-live="polite"</code>. All required form fields have <code>aria-required="true"</code>.'}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Berøringspunkter' : 'Touch targets'}</strong> —
				{$lang === 'no'
					? 'Alle klikkbare elementer er minst 44×44 px (WCAG 2.5.8).'
					: 'All clickable elements are at least 44×44 px (WCAG 2.5.8).'}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Redusert bevegelse' : 'Reduced motion'}</strong> —
				{$lang === 'no'
					? 'Animasjoner respekterer <code>prefers-reduced-motion</code>.'
					: 'Animations respect <code>prefers-reduced-motion</code>.'}
			</li>
			<li class="leading-relaxed">
				<strong>{$lang === 'no' ? 'Lenker' : 'Links'}</strong> —
				{$lang === 'no'
					? 'Alle lenker i tekst og bunntekst er alltid understreket (ikke bare ved hover), i samsvar med WCAG 1.4.1.'
					: 'All links in body text and footer are always underlined (not just on hover), in accordance with WCAG 1.4.1.'}
			</li>
		</ul>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Kjente begrensninger' : 'Known limitations'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Arrangementbilder hentes automatisk fra kildesider. Alternativtekst genereres fra tittel og sted,
				men kan i noen tilfeller mangle detaljer om bildeinnholdet. Vi arbeider med å forbedre dette.
			{:else}
				Event images are fetched automatically from source sites. Alt text is generated from title and venue,
				but may in some cases lack detail about the image content. We are working to improve this.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Gi oss tilbakemelding' : 'Give us feedback'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Opplever du tilgjengelighetsproblemer på Gåri? Ta kontakt på'
				: 'Do you experience accessibility issues on Gåri? Contact us at'}
			<a href="mailto:gaari.bergen@proton.me" class="text-[var(--color-accent)] underline">gaari.bergen@proton.me</a>.
			{$lang === 'no'
				? 'Vi tar alle tilbakemeldinger på alvor og svarer innen rimelig tid.'
				: 'We take all feedback seriously and respond within a reasonable time.'}
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? 'Tilsynsorgan' : 'Enforcement body'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Dersom du ikke er fornøyd med svaret vårt, kan du klage til
				<strong>Digitaliseringsdirektoratet</strong> (Digdir), som er tilsynsorgan for tilgjengelighet
				på nett i Norge. Mer informasjon på
				<a href="https://www.digdir.no/tilgjengelighet" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">digdir.no/tilgjengelighet</a>.
			{:else}
				If you are not satisfied with our response, you can file a complaint with
				<strong>Digitaliseringsdirektoratet</strong> (Digdir), which is the supervisory body for web
				accessibility in Norway. More information at
				<a href="https://www.digdir.no/tilgjengelighet" class="text-[var(--color-accent)] underline" rel="noopener noreferrer" target="_blank">digdir.no/tilgjengelighet</a>.
			{/if}
		</p>
	</section>
</div>
