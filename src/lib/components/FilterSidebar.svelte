<script lang="ts">
	import { t, lang } from '$lib/i18n';
	import { CATEGORIES, BYDELER, type Category, type Bydel } from '$lib/types';
	import { X } from 'lucide-svelte';

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

<aside class="sticky top-16 h-fit w-56 shrink-0 overflow-y-auto pb-8">
	<!-- Event counts -->
	<div class="mb-4 space-y-1 text-sm">
		<p>
			<span class="tabular-nums font-semibold text-[var(--color-text-primary)]">{todayCount}</span>
			<span class="text-[var(--color-text-secondary)]">{$lang === 'no' ? 'i dag' : 'today'}</span>
		</p>
		<p>
			<span class="tabular-nums font-semibold text-[var(--color-text-primary)]">{thisWeekCount}</span>
			<span class="text-[var(--color-text-secondary)]">{$lang === 'no' ? 'denne uken' : 'this week'}</span>
		</p>
	</div>

	<!-- Filters -->
	<div class="space-y-3">
		<div>
			<label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
				{$t('allCategories')}
			</label>
			<select
				value={category}
				onchange={(e) => handleSelect('category', e)}
				class="w-full rounded-md border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-sm"
			>
				<option value="">{$t('allCategories')}</option>
				{#each CATEGORIES as cat}
					<option value={cat}>{$t(`cat.${cat}` as any)}</option>
				{/each}
			</select>
		</div>

		<div>
			<label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
				{$t('allAreas')}
			</label>
			<select
				value={bydel}
				onchange={(e) => handleSelect('bydel', e)}
				class="w-full rounded-md border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-sm"
			>
				<option value="">{$t('allAreas')}</option>
				{#each BYDELER as b}
					<option value={b}>{b}</option>
				{/each}
			</select>
		</div>

		<div>
			<label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
				{$t('allPrices')}
			</label>
			<select
				value={price}
				onchange={(e) => handleSelect('price', e)}
				class="w-full rounded-md border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-sm"
			>
				{#each priceOptions as opt}
					<option value={opt.value}>{$t(opt.label)}</option>
				{/each}
			</select>
		</div>

		<div>
			<label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
				{$t('allAudiences')}
			</label>
			<select
				value={audience}
				onchange={(e) => handleSelect('audience', e)}
				class="w-full rounded-md border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-sm"
			>
				{#each audienceOptions as opt}
					<option value={opt.value}>{$t(opt.label)}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Clear all -->
	{#if hasActiveFilters}
		<button
			onclick={onClearAll}
			class="mt-4 text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]"
		>
			{$t('clearAll')}
		</button>
	{/if}
</aside>
