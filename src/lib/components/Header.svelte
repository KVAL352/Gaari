<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { lang, t } from '$lib/i18n';
	import LanguageSwitch from './LanguageSwitch.svelte';
	import { Plus, Search, X } from 'lucide-svelte';

	let searchOpen = $state(false);
	let searchQuery = $state('');
	let searchInput: HTMLInputElement | undefined = $state();

	function openSearch() {
		searchOpen = true;
		// Focus after DOM update
		requestAnimationFrame(() => searchInput?.focus());
	}

	function closeSearch() {
		searchOpen = false;
		searchQuery = '';
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const q = searchQuery.trim();
		if (!q) return;
		goto(`/${$lang}?q=${encodeURIComponent(q)}`);
		closeSearch();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeSearch();
	}
</script>

<header class="sticky top-0 z-50 border-b border-[var(--color-border)] backdrop-blur-sm" style="background: color-mix(in srgb, var(--color-bg-surface) 95%, transparent)">
	<a href="#events" class="skip-link">{$t('skipToEvents')}</a>
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
		<!-- Logo -->
		<a href="/{$lang}" class="text-[22px] font-bold uppercase tracking-[0.12em] text-[var(--color-accent)]" style="font-family: var(--font-display)" class:sr-only={searchOpen}>GÅRI</a>

		<!-- Search bar (expanded) -->
		{#if searchOpen}
			<form class="header-search" onsubmit={handleSubmit}>
				<Search size={16} class="search-icon" />
				<input
					bind:this={searchInput}
					bind:value={searchQuery}
					type="search"
					placeholder={$t('searchPlaceholder')}
					class="search-input"
					onkeydown={handleKeydown}
					aria-label={$t('searchPlaceholder')}
				/>
				<button type="button" class="search-close" onclick={closeSearch} aria-label={$lang === 'no' ? 'Lukk søk' : 'Close search'}>
					<X size={18} />
				</button>
			</form>
		{/if}

		<!-- Right side: search + language + CTA -->
		<nav aria-label={$lang === 'no' ? 'Navigasjon' : 'Navigation'} class="flex items-center gap-3">
			{#if !searchOpen}
				<button
					type="button"
					class="search-toggle"
					onclick={openSearch}
					aria-label={$lang === 'no' ? 'Søk' : 'Search'}
				>
					<Search size={18} />
				</button>
			{/if}
			<span class:hidden={searchOpen}>
				<LanguageSwitch />
			</span>
			<a
				href="/{$lang}/submit"
				class="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
				class:hidden={searchOpen}
			>
				<Plus size={16} />
				<span class="hidden sm:inline">{$t('submitEvent')}</span>
				<span class="sm:hidden">{$lang === 'no' ? 'Send inn' : 'Submit'}</span>
			</a>
		</nav>
	</div>
</header>

<style>
	.search-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: color 0.15s, background-color 0.15s;
	}

	.search-toggle:hover {
		color: var(--color-text-primary);
		background: var(--color-surface);
	}

	.header-search {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0.75rem;
		padding: 0.375rem 0.75rem;
		border-radius: 9999px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-surface);
		transition: border-color 0.15s;
	}

	.header-search:focus-within {
		border-color: var(--color-accent);
	}

	:global(.header-search .search-icon) {
		flex-shrink: 0;
		color: var(--color-text-muted);
	}

	.search-input {
		flex: 1;
		border: none;
		background: transparent;
		font-size: 0.875rem;
		color: var(--color-text-primary);
		outline: none;
		min-width: 0;
	}

	.search-input::placeholder {
		color: var(--color-text-muted);
	}

	.search-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		flex-shrink: 0;
	}

	.search-close:hover {
		color: var(--color-text-primary);
		background: var(--color-surface);
	}
</style>
