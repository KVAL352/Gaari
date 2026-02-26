<script lang="ts">
	import { page } from '$app/stores';
	import { lang } from '$lib/i18n';
	import { getCanonicalUrl } from '$lib/seo';
	import ForArrangorerPage from '$lib/components/ForArrangorerPage.svelte';

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/for-organizers`));

	let title = $derived($lang === 'no' ? 'For arrangører — Gåri' : 'For organizers — Gåri');
	let metaDesc = $derived($lang === 'no'
		? 'Nå flere i Bergen med Gåri. Synlig i AI-søk, på Google og på 13 kuraterte landingssider. Fremhevet synlighet for arrangører.'
		: 'Reach more people in Bergen with Gåri. Visible in AI search, on Google and across 13 curated landing pages. Promoted visibility for organizers.');
	let ogDesc = $derived($lang === 'no'
		? 'Når noen spør ChatGPT hva som skjer i Bergen, er det Gåri som blir sitert. Vi hjelper arrangører å nå flere.'
		: "When someone asks ChatGPT what's on in Bergen, Gåri is cited. We help organizers reach more people.");
	let ogImage = $derived($lang === 'no'
		? `${$page.url.origin}/og/for-arrangorer.png`
		: `${$page.url.origin}/og/for-organizers.png`);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={metaDesc} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="nb" href="https://gaari.no/no/for-arrangorer" />
	<link rel="alternate" hreflang="en" href="https://gaari.no/en/for-organizers" />
	<link rel="alternate" hreflang="x-default" href="https://gaari.no/no/for-arrangorer" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={ogDesc} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={ogDesc} />
</svelte:head>

<ForArrangorerPage />
