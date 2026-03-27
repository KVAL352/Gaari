<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { lang, t } from '$lib/i18n';
	import type { Category } from '$lib/types';

	interface Props {
		variant?: 'card' | 'inline';
		/** Unique id suffix for email input — needed for label association when multiple forms on page */
		id: string;
		/** Override the default heading (bilingual object) */
		heading?: { no: string; en: string };
		/** Override the default subtext (bilingual object) */
		subtext?: { no: string; en: string };
		/** Pre-select a category from context (e.g. event detail page) */
		contextCategory?: Category;
	}

	let {
		variant = 'card',
		id,
		heading,
		subtext,
		contextCategory
	}: Props = $props();

	// All category pills
	const ALL_PILLS: { key: string; labelKey: string }[] = [
		{ key: 'music', labelKey: 'nlCatMusic' },
		{ key: 'culture', labelKey: 'nlCatCulture' },
		{ key: 'theatre', labelKey: 'nlCatTheatre' },
		{ key: 'family', labelKey: 'nlCatFamily' },
		{ key: 'food', labelKey: 'nlCatFood' },
		{ key: 'festival', labelKey: 'nlCatFestival' },
		{ key: 'sports', labelKey: 'nlCatSports' },
		{ key: 'nightlife', labelKey: 'nlCatNightlife' },
		{ key: 'workshop', labelKey: 'nlCatWorkshop' },
		{ key: 'student', labelKey: 'nlCatStudent' },
		{ key: 'tours', labelKey: 'nlCatTours' },
		{ key: 'free', labelKey: 'nlCatFree' },
	];

	// Complementary suggestions: categories that pair well with the context category
	const COMPLEMENTS: Record<string, string[]> = {
		music: ['nightlife', 'festival', 'food', 'free'],
		culture: ['theatre', 'tours', 'free', 'workshop'],
		theatre: ['culture', 'music', 'festival', 'free'],
		family: ['food', 'tours', 'free', 'workshop'],
		food: ['music', 'culture', 'nightlife', 'free'],
		festival: ['music', 'nightlife', 'food', 'free'],
		sports: ['family', 'free', 'tours', 'food'],
		nightlife: ['music', 'food', 'festival', 'student'],
		workshop: ['culture', 'food', 'family', 'free'],
		student: ['nightlife', 'music', 'free', 'workshop'],
		tours: ['culture', 'family', 'food', 'free'],
	};

	// Show complementary pills (exclude context category, max 4)
	let visiblePills = $derived.by(() => {
		if (!contextCategory) return ALL_PILLS.slice(0, 4);
		const keys = COMPLEMENTS[contextCategory] || ['culture', 'music', 'food', 'free'];
		return ALL_PILLS.filter(p => keys.includes(p.key));
	});

	// Contextual heading based on category
	const CATEGORY_HEADINGS_NO: Record<string, string> = {
		music: 'Få konserter i Bergen rett i innboksen',
		culture: 'Få kulturarrangementer i Bergen rett i innboksen',
		theatre: 'Få teater i Bergen rett i innboksen',
		family: 'Få familieaktiviteter i Bergen rett i innboksen',
		food: 'Få matopplevelser i Bergen rett i innboksen',
		festival: 'Få festivaler i Bergen rett i innboksen',
		sports: 'Få sportsarrangementer i Bergen rett i innboksen',
		nightlife: 'Få utelivet i Bergen rett i innboksen',
		workshop: 'Få kurs og workshops i Bergen rett i innboksen',
		student: 'Få studentarrangementer i Bergen rett i innboksen',
		tours: 'Få turer og opplevelser i Bergen rett i innboksen',
	};
	const CATEGORY_HEADINGS_EN: Record<string, string> = {
		music: 'Get Bergen concerts straight to your inbox',
		culture: 'Get Bergen cultural events straight to your inbox',
		theatre: 'Get Bergen theatre straight to your inbox',
		family: 'Get Bergen family events straight to your inbox',
		food: 'Get Bergen food events straight to your inbox',
		festival: 'Get Bergen festivals straight to your inbox',
		sports: 'Get Bergen sports events straight to your inbox',
		nightlife: 'Get Bergen nightlife straight to your inbox',
		workshop: 'Get Bergen workshops straight to your inbox',
		student: 'Get Bergen student events straight to your inbox',
		tours: 'Get Bergen tours straight to your inbox',
	};

	let displayHeading = $derived.by(() => {
		if (heading) return heading[$lang];
		if (contextCategory) {
			const map = $lang === 'no' ? CATEGORY_HEADINGS_NO : CATEGORY_HEADINGS_EN;
			if (map[contextCategory]) return map[contextCategory];
		}
		return $t('nlHeading');
	});
	let displaySubtext = $derived.by(() => {
		if (subtext) return subtext[$lang];
		if (contextCategory) {
			return $lang === 'no'
				? 'Tilpasset dine interesser, hver torsdag.'
				: 'Tailored to your interests, every Thursday.';
		}
		return $t('nlSubtext');
	});

	let status: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');
	let showPills = $state(false);

	// Selected categories for pills — context pre-selects one
	const initialCategory = contextCategory;
	let selectedCategories: Set<string> = $state(new Set(initialCategory ? [initialCategory] : []));
	let selectedFree = $state(false);

	function toggleCategory(key: string) {
		if (key === 'free') {
			selectedFree = !selectedFree;
			return;
		}
		const next = new Set(selectedCategories);
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		selectedCategories = next;
	}

	// Hidden form values derived from pills
	let categoriesValue = $derived([...selectedCategories].join(','));
	let priceValue = $derived(selectedFree ? 'free' : '');

	let filterAudience = $derived(browser ? page.url.searchParams.get('audience') || '' : '');
	let filterBydel = $derived(browser ? page.url.searchParams.get('bydel') || '' : '');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const formData = new FormData(form);

		status = 'submitting';
		try {
			const res = await fetch('/api/newsletter', {
				method: 'POST',
				body: formData
			});
			const data = await res.json();
			status = data.success ? 'success' : 'error';
			if (data.success && typeof window !== 'undefined' && window.umami) {
				umami.track('newsletter-signup', { location: id, categories: categoriesValue || '' });
			}
		} catch {
			status = 'error';
		}
	}

	let successMessage = $derived(
		$lang === 'no' ? 'Takk! Du er påmeldt.' : 'Thanks! You\'re subscribed.'
	);
	let errorMessage = $derived(
		$lang === 'no' ? 'Noe gikk galt. Prøv igjen.' : 'Something went wrong. Please try again.'
	);

	let hasSelectedPills = $derived(selectedCategories.size > 0 || selectedFree);
</script>

{#snippet pillRow()}
	<div class="mt-3 flex flex-wrap gap-2" role="group" aria-label={$t('nlCustomize')}>
		{#each visiblePills as pill (pill.key)}
			<button
				type="button"
				class="nl-pill"
				class:nl-pill-selected={pill.key === 'free' ? selectedFree : selectedCategories.has(pill.key)}
				onclick={() => toggleCategory(pill.key)}
				aria-pressed={pill.key === 'free' ? selectedFree : selectedCategories.has(pill.key)}
			>
				{$t(pill.labelKey)}
			</button>
		{/each}
	</div>
{/snippet}

{#if variant === 'card'}
	<div class="rounded-xl border border-[var(--color-border)] border-l-4 border-l-[var(--funkis-red)] bg-[var(--funkis-red-subtle)] p-6">
		<p class="text-lg font-semibold text-[var(--color-text-primary)]">{displayHeading}</p>
		<p class="mt-1 text-sm text-[var(--color-text-secondary)]">{displaySubtext}</p>

		{#if status === 'success'}
			<p class="mt-4 text-sm font-medium text-[var(--funkis-green)]">{successMessage}</p>
		{:else}
			<form
				action="/api/newsletter"
				method="post"
				onsubmit={handleSubmit}
				class="mt-4 flex max-w-md flex-col gap-2 sm:flex-row"
			>
				<label for="nl-{id}" class="sr-only">
					{$t('nlPlaceholder')}
				</label>
				<input type="hidden" name="lang" value={$lang} />
				{#if filterAudience}<input type="hidden" name="audience" value={filterAudience} />{/if}
				{#if categoriesValue}<input type="hidden" name="categories" value={categoriesValue} />{/if}
				{#if filterBydel}<input type="hidden" name="bydel" value={filterBydel} />{/if}
				{#if priceValue}<input type="hidden" name="price" value={priceValue} />{/if}
				<input
					type="email"
					name="email"
					id="nl-{id}"
					required
					autocomplete="email"
					placeholder={$t('nlPlaceholder')}
					class="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm"
					style="height: 44px;"
				/>
				<button
					type="submit"
					disabled={status === 'submitting'}
					class="rounded-lg bg-[var(--funkis-red)] px-5 text-sm font-semibold text-white hover:bg-[var(--funkis-red-hover)] disabled:opacity-70"
					style="height: 44px;"
				>
					{$t('nlSubscribe')}
				</button>
			</form>

			<!-- Preference pills toggle -->
			{#if !showPills && !hasSelectedPills}
				<button
					type="button"
					class="mt-3 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline decoration-[var(--color-border)] underline-offset-2"
					onclick={() => showPills = true}
				>
					{$t('nlCustomize')}
				</button>
			{/if}

			{#if showPills || hasSelectedPills}
				{@render pillRow()}
			{/if}

			{#if status === 'error'}
				<p class="mt-2 text-sm text-[var(--funkis-red)]" role="alert">{errorMessage}</p>
			{/if}
		{/if}
	</div>
{:else}
	<!-- inline variant (footer) -->
	<p class="text-sm font-semibold text-[var(--color-text-primary)]">{displayHeading}</p>
	<p class="mt-1 text-sm text-[var(--color-text-secondary)]">{displaySubtext}</p>

	{#if status === 'success'}
		<p class="mt-3 text-sm font-medium text-[var(--funkis-green)]">{successMessage}</p>
	{:else}
		<form
			action="/api/newsletter"
			method="post"
			onsubmit={handleSubmit}
			class="mx-auto mt-3 flex max-w-md flex-col gap-2 sm:flex-row"
		>
			<label for="nl-{id}" class="sr-only">
				{$t('nlPlaceholder')}
			</label>
			<input type="hidden" name="lang" value={$lang} />
			{#if filterAudience}<input type="hidden" name="audience" value={filterAudience} />{/if}
			{#if categoriesValue}<input type="hidden" name="categories" value={categoriesValue} />{/if}
			{#if filterBydel}<input type="hidden" name="bydel" value={filterBydel} />{/if}
			{#if priceValue}<input type="hidden" name="price" value={priceValue} />{/if}
			<input
				type="email"
				name="email"
				id="nl-{id}"
				required
				autocomplete="email"
				placeholder={$t('nlPlaceholder')}
				class="flex-1 rounded-lg border border-[var(--color-border)] px-3 text-sm"
				style="height: 44px;"
			/>
			<button
				type="submit"
				disabled={status === 'submitting'}
				class="rounded-lg bg-[var(--funkis-red)] px-5 text-sm font-semibold text-white hover:bg-[var(--funkis-red-hover)] disabled:opacity-70"
				style="height: 44px;"
			>
				{$t('nlSubscribe')}
			</button>
		</form>

		{#if !showPills && !hasSelectedPills}
			<button
				type="button"
				class="mx-auto mt-3 block text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline decoration-[var(--color-border)] underline-offset-2"
				onclick={() => showPills = true}
			>
				{$t('nlCustomize')}
			</button>
		{/if}

		{#if showPills || hasSelectedPills}
			<div class="mx-auto max-w-md">
				{@render pillRow()}
			</div>
		{/if}

		{#if status === 'error'}
			<p class="mt-2 text-center text-sm text-[var(--funkis-red)]" role="alert">{errorMessage}</p>
		{/if}
	{/if}
{/if}

<style>
	.nl-pill {
		display: inline-flex;
		align-items: center;
		min-height: 32px;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-surface);
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		user-select: none;
	}

	.nl-pill:hover:not(.nl-pill-selected) {
		border-color: var(--color-text-secondary);
		color: var(--color-text-primary);
	}

	.nl-pill-selected {
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
	}

	.nl-pill-selected:hover {
		background: var(--color-accent-hover);
		border-color: var(--color-accent-hover);
	}

	.nl-pill:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
</style>
