<script lang="ts">
	import { lang, t } from '$lib/i18n';
	import { CATEGORIES } from '$lib/types';
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
					{#if $lang === 'no'}
						<li><a href="/no/denne-helgen" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Denne helgen</a></li>
						<li><a href="/no/i-kveld" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">I kveld</a></li>
						<li><a href="/no/i-dag" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">I dag</a></li>
						<li><a href="/no/gratis" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Gratis</a></li>
						<li><a href="/no/konserter" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Konserter</a></li>
						<li><a href="/no/familiehelg" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Familiehelg</a></li>
						<li><a href="/no/voksen" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">For voksne</a></li>
						<li><a href="/no/for-ungdom" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">For ungdom</a></li>
						<li><a href="/no/studentkveld" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Studentkveld</a></li>
						<li><a href="/no/sentrum" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Sentrum</a></li>
						<li><a href="/no/regndagsguide" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Regnværsguide</a></li>
					{:else}
						<li><a href="/en/this-weekend" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">This weekend</a></li>
						<li><a href="/en/today-in-bergen" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Today</a></li>
						<li><a href="/en/free-things-to-do-bergen" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Free events</a></li>
						<li><a href="/en/voksen" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">For adults</a></li>
						<li><a href="/en/konserter" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Concerts</a></li>
						<li><a href="/en/familiehelg" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Family weekend</a></li>
						<li><a href="/en/sentrum" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">City centre</a></li>
						<li><a href="/en/for-ungdom" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">For youth</a></li>
						<li><a href="/en/studentkveld" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Student nights</a></li>
						<li><a href="/en/regndagsguide" class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]">Rainy day guide</a></li>
					{/if}
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
