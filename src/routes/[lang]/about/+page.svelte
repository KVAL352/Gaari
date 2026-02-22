<script lang="ts">
	import { page } from '$app/stores';
	import { lang, t } from '$lib/i18n';
	import { Mail } from 'lucide-svelte';
</script>

<svelte:head>
	<title>{$t('aboutTitle')} — Gåri</title>
	<meta name="description" content={$t('aboutText')} />
	<meta property="og:title" content={`${$t('aboutTitle')} — Gåri`} />
	<meta property="og:description" content={$t('aboutText')} />
	<meta property="og:image" content={`${$page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
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
				class="text-[var(--color-accent)] hover:underline"
			>
				{$lang === 'no' ? 'Les mer om datainnsamling og juridisk grunnlag' : 'Read more about data collection and legal basis'}
			</a>
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">{$t('contact')}</h2>
		<a
			href="mailto:gaari.bergen@proton.me"
			class="inline-flex items-center gap-2 text-[var(--color-text-primary)] hover:underline"
		>
			<Mail size={16} />
			gaari.bergen@proton.me
		</a>
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
