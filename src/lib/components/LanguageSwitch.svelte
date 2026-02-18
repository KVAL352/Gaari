<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { lang, setLang } from '$lib/i18n';
	import type { Lang } from '$lib/types';

	function switchLang() {
		const newLang: Lang = $lang === 'no' ? 'en' : 'no';
		setLang(newLang);
		// Update URL prefix
		const currentPath = $page.url.pathname;
		const newPath = currentPath.replace(/^\/(no|en)/, `/${newLang}`);
		goto(newPath + $page.url.search, { replaceState: true });
	}
</script>

<button
	onclick={switchLang}
	class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--color-surface)]"
	aria-label={$lang === 'no' ? 'Switch to English' : 'Bytt til norsk'}
>
	<span class={$lang === 'no' ? 'font-bold' : 'text-[var(--color-text-secondary)]'}>Norsk</span>
	<span class="text-[var(--color-text-secondary)]">|</span>
	<span class={$lang === 'en' ? 'font-bold' : 'text-[var(--color-text-secondary)]'}>English</span>
</button>
