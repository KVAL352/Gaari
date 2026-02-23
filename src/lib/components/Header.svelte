<script lang="ts">
	import { lang, t } from '$lib/i18n';
	import LanguageSwitch from './LanguageSwitch.svelte';
	import { Plus } from 'lucide-svelte';
</script>

<header class="sticky top-0 z-50 border-b border-[var(--color-border)] backdrop-blur-sm" style="background: color-mix(in srgb, var(--color-bg-surface) 95%, transparent)">
	<a href="#events" class="skip-link">{$t('skipToEvents')}</a>
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
		<!-- Logo -->
		<a href="/{$lang}" class="text-[22px] font-bold uppercase tracking-[0.12em] text-[var(--color-accent)]" style="font-family: var(--font-display)">GÅRI</a>

		<!-- Right side: language + CTA -->
		<nav aria-label={$lang === 'no' ? 'Navigasjon' : 'Navigation'} class="flex items-center gap-3">
			<LanguageSwitch />
			<a
				href="/{$lang}/submit"
				class="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
			>
				<Plus size={16} />
				<span class="hidden sm:inline">{$t('submitEvent')}</span>
				<span class="sm:hidden">{$lang === 'no' ? 'Send inn' : 'Submit'}</span>
			</a>
		</nav>
	</div>
</header>
