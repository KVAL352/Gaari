<script lang="ts">
	import { page } from '$app/stores';
	import { lang, t } from '$lib/i18n';
	import { generateOrganizationJsonLd, generateFaqJsonLd, getFaqItems, getCanonicalUrl } from '$lib/seo';
	import { Mail } from 'lucide-svelte';
	import NewsletterCTA from '$lib/components/NewsletterCTA.svelte';

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/about`));
	let orgJsonLd = generateOrganizationJsonLd();
	let faqJsonLd = $derived(generateFaqJsonLd($lang));
	let faqItems = $derived(getFaqItems($lang));
</script>

<svelte:head>
	<title>{$t('aboutTitle')} — Gåri</title>
	<meta name="description" content={$t('aboutText')} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content={`${$t('aboutTitle')} — Gåri`} />
	<meta property="og:description" content={$t('aboutText')} />
	<meta property="og:image" content={`${$page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={`${$t('aboutTitle')} — Gåri`} />
	<meta name="twitter:description" content={$t('aboutText')} />
	<meta name="twitter:image" content={`${$page.url.origin}/og/default.png`} />
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + orgJsonLd + '</scr' + 'ipt>'}
	{@html '<script type="application/ld+json">' + faqJsonLd + '</scr' + 'ipt>'}
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">
	<h1 class="mb-6 text-3xl font-bold">{$t('aboutTitle')}</h1>

	<section class="mb-8">
		<p class="text-lg leading-relaxed text-[var(--color-text-secondary)]">
			{$t('aboutText')}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">{$t('howItWorks')}</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{$t('howItWorksText')}
		</p>
		<p class="mt-3 text-sm">
			<a
				href="/{$lang}/datainnsamling"
				class="text-[var(--color-accent)] underline"
			>
				{$lang === 'no' ? 'Les mer om datainnsamling og juridisk grunnlag' : 'Read more about data collection and legal basis'}
			</a>
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-4 text-xl font-semibold">
			{$lang === 'no' ? 'Ofte stilte spørsmål' : 'Frequently asked questions'}
		</h2>
		<dl class="space-y-2">
			{#each faqItems as item (item.q)}
				<details class="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
					<summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)]">
						<span>{item.q}</span>
						<span class="ml-4 shrink-0 text-[var(--color-text-muted)] transition-transform group-open:rotate-180" aria-hidden="true">↓</span>
					</summary>
					<p class="px-5 pb-4 text-[var(--color-text-secondary)] leading-relaxed">
						{item.a}
					</p>
				</details>
			{/each}
		</dl>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">{$t('contact')}</h2>
		<a
			href="mailto:post@gaari.no"
			class="inline-flex items-center gap-2 text-[var(--color-text-primary)] underline"
		>
			<Mail size={16} />
			post@gaari.no
		</a>
	</section>

	<!-- Newsletter -->
	<section class="mb-8">
		<h2 class="mb-4 text-xl font-semibold">
			{$lang === 'no' ? 'Nyhetsbrev' : 'Newsletter'}
		</h2>
		<NewsletterCTA id="about" variant="card" />
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold">{$t('submitEvent')}</h2>
		<p class="mb-4 text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Er du arrangør? Del ditt arrangement med Bergen!'
				: 'Are you an organizer? Share your event with Bergen!'}
		</p>
		<a
			href="/{$lang}/submit"
			class="inline-block rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
		>
			{$t('submitEvent')}
		</a>
	</section>
</div>
