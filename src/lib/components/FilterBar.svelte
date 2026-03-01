<script lang="ts">
	import { t } from '$lib/i18n';
	import { CATEGORIES, BYDELER, type Category, type Bydel } from '$lib/types';

	interface Props {
		category?: Category | '';
		bydel?: Bydel | '';
		price?: string;
		audience?: string;
		hideFields?: string[];
		onFilterChange?: (key: string, value: string) => void;
		onClearAll?: () => void;
	}

	let {
		category = '',
		bydel = '',
		price = '',
		audience = '',
		hideFields = [],
		onFilterChange,
		onClearAll
	}: Props = $props();

	let showCategory = $derived(!hideFields.includes('category'));
	let showAudience = $derived(!hideFields.includes('audience'));

	let hasActiveFilters = $derived(!!category || !!bydel || !!price || !!audience);

	const priceOptions = [
		{ value: '', label: 'allPrices' },
		{ value: 'free', label: 'free' },
		{ value: 'paid', label: 'paid' }
	] as const;

	const audienceOptions = [
		{ value: '', label: 'allAudiences' },
		{ value: 'tourist', label: 'touristHighlights' },
		{ value: 'student', label: 'studentDeals' },
		{ value: 'family', label: 'familyFriendly' },
		{ value: 'ungdom', label: 'youth' },
		{ value: 'free', label: 'freeEvents' }
	] as const;

	function handleSelect(key: string, e: Event) {
		const select = e.target as HTMLSelectElement;
		onFilterChange?.(key, select.value);
	}
</script>

<div class="border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
	<div class="mx-auto max-w-7xl px-4 py-3">
		<!-- Top row: counts + dropdowns -->
		<div class="flex flex-wrap items-center gap-3">
			<!-- Dropdowns -->
			{#if showCategory}
			<select
				value={category}
				onchange={(e) => handleSelect('category', e)}
				aria-label={$t('allCategories')}
				class="min-h-[44px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)]"
			>
				<option value="">{$t('allCategories')}</option>
				{#each CATEGORIES as cat (cat)}
					<option value={cat}>{$t(`cat.${cat}`)}</option>
				{/each}
			</select>
			{/if}

			<select
				value={bydel}
				onchange={(e) => handleSelect('bydel', e)}
				aria-label={$t('allAreas')}
				class="min-h-[44px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)]"
			>
				<option value="">{$t('allAreas')}</option>
				{#each BYDELER as b (b)}
					<option value={b}>{b}</option>
				{/each}
			</select>

			<select
				value={price}
				onchange={(e) => handleSelect('price', e)}
				aria-label={$t('allPrices')}
				class="min-h-[44px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)]"
			>
				{#each priceOptions as opt (opt.value)}
					<option value={opt.value}>{$t(opt.label)}</option>
				{/each}
			</select>

			{#if showAudience}
			<select
				value={audience}
				onchange={(e) => handleSelect('audience', e)}
				aria-label={$t('allAudiences')}
				class="min-h-[44px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)]"
			>
				{#each audienceOptions as opt (opt.value)}
					<option value={opt.value}>{$t(opt.label)}</option>
				{/each}
			</select>
			{/if}

			{#if hasActiveFilters}
				<button
					onclick={onClearAll}
					class="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]"
				>
					{$t('clearAll')}
				</button>
			{/if}
		</div>
	</div>
</div>
