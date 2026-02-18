<script lang="ts">
	import { t } from '$lib/i18n';
	import { ArrowUp } from 'lucide-svelte';

	let visible = $state(false);

	function handleScroll() {
		visible = window.scrollY > window.innerHeight * 2;
	}

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	$effect(() => {
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	});
</script>

{#if visible}
	<button
		onclick={scrollToTop}
		class="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[var(--color-text-primary)] px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
		aria-label={$t('backToTop')}
	>
		<ArrowUp size={16} />
		<span class="hidden sm:inline">{$t('backToTop')}</span>
	</button>
{/if}
