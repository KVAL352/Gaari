<script lang="ts">
	import { page } from '$app/stores';
	import { lang } from '$lib/i18n';
	import { getCanonicalUrl, generateB2bFaqJsonLd } from '$lib/seo';
	import ForArrangorerPage from '$lib/components/ForArrangorerPage.svelte';

	let { data } = $props();

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/for-arrangorer`));
	let faqJsonLd = $derived(generateB2bFaqJsonLd($lang));

	let title = $derived($lang === 'no' ? 'For arrangører — Gåri' : 'For organizers — Gåri');
	let metaDesc = $derived($lang === 'no'
		? 'Fremhevet plassering i Bergens mest komplette eventkalender. Fra 1 000 kr/mnd. Prøv gratis i 3 måneder. Ingen bindingstid.'
		: 'Promoted placement in Bergen\'s most complete event calendar. From 1,000 NOK/month. Try free for 3 months. No commitment.');
	let ogDesc = $derived($lang === 'no'
		? 'Gjør arrangementet ditt synlig for tusenvis av bergensere. Fremhevet plassering, nyhetsbrev og AI-søk. Prøv gratis.'
		: 'Make your event visible to thousands of people in Bergen. Promoted placement, newsletter and AI search. Try free.');
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
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={ogDesc} />
	<meta name="twitter:image" content={ogImage} />
	{@html faqJsonLd}
</svelte:head>

<ForArrangorerPage heroImages={data.heroImages} />
