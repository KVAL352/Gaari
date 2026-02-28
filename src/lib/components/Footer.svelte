<script lang="ts">
	import { lang, t } from '$lib/i18n';
	import { CATEGORIES } from '$lib/types';
	import { getFooterCollections } from '$lib/collections';
	import NewsletterCTA from './NewsletterCTA.svelte';
</script>

<footer class="mt-16 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
	<div class="mx-auto max-w-7xl px-4 py-10">
		<div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Brand -->
			<div>
				<h3 class="mb-2 text-lg font-bold">Gåri</h3>
				<p class="text-sm text-[var(--color-text-secondary)]">{$t('footerTagline')}</p>
			</div>

			<!-- Categories -->
			<nav aria-label={$t('categories')}>
				<h4 class="mb-2 text-sm font-semibold">{$t('categories')}</h4>
				<ul class="space-y-1">
					{#each CATEGORIES as cat (cat)}
						<li>
							<a
								href="/{$lang}?category={cat}"
								class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]"
							>
								{$t(`cat.${cat}`)}
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<!-- Collections -->
			<nav aria-label={$lang === 'no' ? 'Utforsk' : 'Explore'}>
				<h4 class="mb-2 text-sm font-semibold">{$lang === 'no' ? 'Utforsk' : 'Explore'}</h4>
				<ul class="space-y-1">
					{#each getFooterCollections($lang) as col (col.slug)}
						<li>
							<a
								href="/{$lang}/{col.slug}"
								class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]"
							>
								{(col.footerLabel ?? col.title)[$lang]}
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<!-- Links -->
			<nav aria-label={$lang === 'no' ? 'Om Gåri' : 'About Gåri'}>
				<h4 class="mb-2 text-sm font-semibold">Gåri</h4>
				<ul class="space-y-1">
					<li><a href="/{$lang}/about" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">{$t('about')}</a></li>
					<li><a href="/{$lang}/datainnsamling" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">{$t('dataCollection')}</a></li>
					<li><a href="/{$lang}/personvern" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">{$lang === 'no' ? 'Personvern' : 'Privacy Policy'}</a></li>
					<li><a href="/{$lang}/tilgjengelighet" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">{$lang === 'no' ? 'Tilgjengelighet' : 'Accessibility'}</a></li>
					<li><a href="/{$lang}/submit" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">{$t('submitEvent')}</a></li>
					<li><a href="mailto:post@gaari.no" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">{$t('contact')}</a></li>
				</ul>
			</nav>
		</div>
		<!-- Newsletter signup -->
		<div class="mt-8 border-t border-[var(--color-border)] pt-6 text-center">
			<NewsletterCTA id="footer" variant="inline" />
		</div>

		<div class="mt-6 border-t border-[var(--color-border)] pt-6 text-center text-xs text-[var(--color-text-secondary)]">
			© 2026 Gåri. Bergen, Norway.
		</div>
	</div>
</footer>
