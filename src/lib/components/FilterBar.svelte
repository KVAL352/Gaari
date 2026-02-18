<script lang="ts">
	import { t, lang } from '$lib/i18n';
	import { CATEGORIES, BYDELER, type Category, type Bydel } from '$lib/types';
	import { X, LayoutGrid, List, SlidersHorizontal } from 'lucide-svelte';

	interface Props {
		category?: Category | '';
		bydel?: Bydel | '';
		price?: string;
		audience?: string;
		view?: 'grid' | 'list';
		resultCount?: number;
		onFilterChange?: (key: string, value: string) => void;
		onClearAll?: () => void;
		onViewChange?: (view: 'grid' | 'list') => void;
	}

	let {
		category = '',
		bydel = '',
		price = '',
		audience = '',
		view = 'grid',
		resultCount = 0,
		onFilterChange,
		onClearAll,
		onViewChange
	}: Props = $props();

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
		{ value: 'free', label: 'freeEvents' }
	] as const;

	function handleSelect(key: string, e: Event) {
		const select = e.target as HTMLSelectElement;
		onFilterChange?.(key, select.value);
	}

	function removeFilter(key: string) {
		onFilterChange?.(key, '');
	}

	interface ActiveChip {
		key: string;
		label: string;
	}

	let activeChips = $derived.by((): ActiveChip[] => {
		const chips: ActiveChip[] = [];
		if (category) chips.push({ key: 'category', label: $t(`cat.${category}` as any) });
		if (bydel) chips.push({ key: 'bydel', label: bydel });
		if (price) chips.push({ key: 'price', label: $t(price === 'free' ? 'free' : 'paid') });
		if (audience) {
			const opt = audienceOptions.find(o => o.value === audience);
			if (opt) chips.push({ key: 'audience', label: $t(opt.label) });
		}
		return chips;
	});
</script>

<div class="border-b border-[var(--color-border)] bg-white">
	<div class="mx-auto max-w-7xl px-4 py-3">
		<!-- Filter dropdowns -->
		<div class="flex flex-wrap items-center gap-3">
			<!-- Category -->
			<select
				value={category}
				onchange={(e) => handleSelect('category', e)}
				class="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
			>
				<option value="">{$t('allCategories')}</option>
				{#each CATEGORIES as cat}
					<option value={cat}>{$t(`cat.${cat}` as any)}</option>
				{/each}
			</select>

			<!-- Bydel -->
			<select
				value={bydel}
				onchange={(e) => handleSelect('bydel', e)}
				class="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
			>
				<option value="">{$t('allAreas')}</option>
				{#each BYDELER as b}
					<option value={b}>{b}</option>
				{/each}
			</select>

			<!-- Price -->
			<select
				value={price}
				onchange={(e) => handleSelect('price', e)}
				class="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
			>
				{#each priceOptions as opt}
					<option value={opt.value}>{$t(opt.label)}</option>
				{/each}
			</select>

			<!-- Audience -->
			<select
				value={audience}
				onchange={(e) => handleSelect('audience', e)}
				class="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
			>
				{#each audienceOptions as opt}
					<option value={opt.value}>{$t(opt.label)}</option>
				{/each}
			</select>

			<!-- Spacer -->
			<div class="hidden flex-1 md:block"></div>

			<!-- Result count + View toggle -->
			<div class="flex items-center gap-3">
				<span class="tabular-nums text-sm text-[var(--color-text-secondary)]" aria-live="polite">
					{resultCount} {$t('eventsFound')}
				</span>
				<div class="flex rounded-lg border border-[var(--color-border)]">
					<button
						class="rounded-l-lg p-2 transition-colors {view === 'grid' ? 'bg-[var(--color-surface)]' : 'hover:bg-[var(--color-surface)]'}"
						onclick={() => onViewChange?.('grid')}
						aria-label={$t('gridView')}
						aria-pressed={view === 'grid'}
					>
						<LayoutGrid size={16} />
					</button>
					<button
						class="rounded-r-lg p-2 transition-colors {view === 'list' ? 'bg-[var(--color-surface)]' : 'hover:bg-[var(--color-surface)]'}"
						onclick={() => onViewChange?.('list')}
						aria-label={$t('listView')}
						aria-pressed={view === 'list'}
					>
						<List size={16} />
					</button>
				</div>
			</div>
		</div>

		<!-- Active filter chips -->
		{#if hasActiveFilters}
			<div class="mt-2 flex flex-wrap items-center gap-2">
				{#each activeChips as chip}
					<span class="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] px-3 py-1 text-sm">
						{chip.label}
						<button
							onclick={() => removeFilter(chip.key)}
							class="ml-0.5 rounded-full p-0.5 hover:bg-[var(--color-border)]"
							aria-label="Remove {chip.label} filter"
						>
							<X size={12} />
						</button>
					</span>
				{/each}
				<button
					onclick={onClearAll}
					class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
				>
					{$t('clearAll')}
				</button>
			</div>
		{/if}
	</div>
</div>
