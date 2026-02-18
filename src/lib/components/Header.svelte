<script lang="ts">
	import { lang, t } from '$lib/i18n';
	import LanguageSwitch from './LanguageSwitch.svelte';
	import { Menu, X } from 'lucide-svelte';

	let menuOpen = $state(false);
</script>

<header class="sticky top-0 z-50 border-b border-[var(--color-border)] bg-white/95 backdrop-blur-sm">
	<a href="#events" class="skip-link">{$t('skipToEvents')}</a>
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
		<!-- Logo -->
		<a href="/{$lang}" class="text-xl font-bold tracking-tight">Gåri</a>

		<!-- Desktop nav -->
		<nav class="hidden items-center gap-6 md:flex" aria-label="Main">
			<a href="/{$lang}" class="text-sm font-medium hover:text-[var(--color-today)]">{$t('explore')}</a>
			<a href="/{$lang}/about" class="text-sm font-medium hover:text-[var(--color-today)]">{$t('about')}</a>
			<a href="/{$lang}/submit" class="text-sm font-medium hover:text-[var(--color-today)]">{$t('submitEvent')}</a>
		</nav>

		<!-- Right side -->
		<div class="flex items-center gap-2">
			<LanguageSwitch />
			<button
				class="rounded-lg p-2 md:hidden hover:bg-[var(--color-surface)]"
				onclick={() => menuOpen = !menuOpen}
				aria-label={menuOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={menuOpen}
			>
				{#if menuOpen}
					<X size={20} />
				{:else}
					<Menu size={20} />
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile menu -->
	{#if menuOpen}
		<nav class="border-t border-[var(--color-border)] bg-white px-4 py-3 md:hidden" aria-label="Mobile">
			<a href="/{$lang}" class="block py-2 text-sm font-medium" onclick={() => menuOpen = false}>{$t('explore')}</a>
			<a href="/{$lang}/about" class="block py-2 text-sm font-medium" onclick={() => menuOpen = false}>{$t('about')}</a>
			<a href="/{$lang}/submit" class="block py-2 text-sm font-medium" onclick={() => menuOpen = false}>{$t('submitEvent')}</a>
		</nav>
	{/if}
</header>
