<script lang="ts">
	import { t, lang } from '$lib/i18n';
	import { CATEGORIES, BYDELER, type Category, type Bydel } from '$lib/types';

	interface Props {
		category?: Category | '';
		bydel?: Bydel | '';
		price?: string;
		audience?: string;
		todayCount?: number;
		thisWeekCount?: number;
		onFilterChange?: (key: string, value: string) => void;
		onClearAll?: () => void;
	}

	let {
		category = '',
		bydel = '',
		price = '',
		audience = '',
		todayCount = 0,
		thisWeekCount = 0,
		onFilterChange,
		onClearAll
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

	function toggleCategory(cat: Category) {
		onFilterChange?.('category', category === cat ? '' : cat);
	}
</script>

<div class="border-b border-[var(--color-border)] bg-white">
	<div class="mx-auto max-w-7xl px-4 py-3">
		<!-- Top row: counts + dropdowns -->
		<div class="flex flex-wrap items-center gap-3">
			<!-- Event counts -->
			<p class="mr-auto text-sm">
				<span class="tabular-nums font-semibold">{todayCount}</span>
				<span class="text-[var(--color-text-secondary)]">{$lang === 'no' ? 'i dag' : 'today'}</span>
				<span class="mx-1 text-[var(--color-text-muted)]">&middot;</span>
				<span class="tabular-nums font-semibold">{thisWeekCount}</span>
				<span class="text-[var(--color-text-secondary)]">{$lang === 'no' ? 'denne uken' : 'this week'}</span>
			</p>

			<!-- Dropdowns -->
			<select
				value={category}
				onchange={(e) => handleSelect('category', e)}
				class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)]"
			>
				<option value="">{$t('allCategories')}</option>
				{#each CATEGORIES as cat}
					<option value={cat}>{$t(`cat.${cat}` as any)}</option>
				{/each}
			</select>

			<select
				value={bydel}
				onchange={(e) => handleSelect('bydel', e)}
				class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)]"
			>
				<option value="">{$t('allAreas')}</option>
				{#each BYDELER as b}
					<option value={b}>{b}</option>
				{/each}
			</select>

			<select
				value={price}
				onchange={(e) => handleSelect('price', e)}
				class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)]"
			>
				{#each priceOptions as opt}
					<option value={opt.value}>{$t(opt.label)}</option>
				{/each}
			</select>

			<select
				value={audience}
				onchange={(e) => handleSelect('audience', e)}
				class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)]"
			>
				{#each audienceOptions as opt}
					<option value={opt.value}>{$t(opt.label)}</option>
				{/each}
			</select>

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
