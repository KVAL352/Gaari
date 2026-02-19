<script lang="ts">
	import { lang, t } from '$lib/i18n';
	import { Mail } from 'lucide-svelte';
</script>

<svelte:head>
	<title>{$t('aboutTitle')} — Gåri</title>
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
