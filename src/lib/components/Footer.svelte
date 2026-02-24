<script lang="ts">
	import { lang, t } from '$lib/i18n';
	import { CATEGORIES } from '$lib/types';
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
					{#each CATEGORIES.slice(0, 6) as cat (cat)}
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

			<!-- More categories -->
			<div>
				<div class="mb-2 h-5"></div>
				<ul class="space-y-1">
					{#each CATEGORIES.slice(6) as cat (cat)}
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
			</div>

			<!-- Links -->
			<nav aria-label={$lang === 'no' ? 'Om Gåri' : 'About Gåri'}>
				<h4 class="mb-2 text-sm font-semibold">Gåri</h4>
				<ul class="space-y-1">
					<li><a href="/{$lang}/about" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">{$t('about')}</a></li>
					<li><a href="/{$lang}/datainnsamling" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">{$t('dataCollection')}</a></li>
					<li><a href="/{$lang}/submit" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">{$t('submitEvent')}</a></li>
					<li><a href="mailto:gaari.bergen@proton.me" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">{$t('contact')}</a></li>
				</ul>
			</nav>
		</div>
		<div class="mt-8 border-t border-[var(--color-border)] pt-6 text-center text-xs text-[var(--color-text-secondary)]">
			© 2026 Gåri. Bergen, Norway.
		</div>
	</div>
</footer>
