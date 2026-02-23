<script lang="ts">
	import { page } from '$app/stores';
	import { t } from '$lib/i18n';
	import { CATEGORIES, BYDELER } from '$lib/types';
	import type { Lang, TimeOfDay, Bydel } from '$lib/types';
	import FilterPill from './FilterPill.svelte';
	import MiniCalendar from './MiniCalendar.svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		lang: Lang;
		eventCount: number;
		onFilterChange: (key: string, value: string) => void;
		onClearAll: () => void;
	}

	let { lang, eventCount, onFilterChange, onClearAll }: Props = $props();

	// Read current filter state from URL
	let when = $derived($page.url.searchParams.get('when') || '');
	let time = $derived($page.url.searchParams.get('time') || '');
	let audience = $derived($page.url.searchParams.get('audience') || '');
	let category = $derived($page.url.searchParams.get('category') || '');

	// Also read bydel/price for the "more filters" section
	let bydel = $derived($page.url.searchParams.get('bydel') || '');
	let price = $derived($page.url.searchParams.get('price') || '');

	// Local UI state
	let showCalendar = $state(false);
	let showAllCategories = $state(false);
	let showMoreFilters = $state(false);

	// Progressive disclosure: show steps 2-4 when a date is selected
	let dateSelected = $derived(!!when);

	// ── Step 1: When? ──
	const whenOptions = [
		{ value: 'today', labelKey: 'today' },
		{ value: 'tomorrow', labelKey: 'tomorrow' },
		{ value: 'weekend', labelKey: 'thisWeekend' },
		{ value: 'week', labelKey: 'thisWeek' }
	] as const;

	// Check if current 'when' is a calendar date (YYYY-MM-DD or range)
	let isCalendarDate = $derived(when.match(/^\d{4}-\d{2}-\d{2}/));

	function handleWhenSelect(value: string) {
		showCalendar = false;
		onFilterChange('when', when === value ? '' : value);
	}

	function handleChooseDateClick() {
		showCalendar = !showCalendar;
		// If we had a quick filter active, clear it when opening calendar
		if (when && !isCalendarDate) {
			// Keep current selection, just open calendar
		}
	}

	function handleCalendarSelect(date: string | { from: string; to: string }) {
		showCalendar = false;
		if (typeof date === 'string') {
			onFilterChange('when', date);
		} else {
			onFilterChange('when', `${date.from}:${date.to}`);
		}
	}

	// ── Step 2: Time of Day ──
	const timeOptions = [
		{ value: 'morning' as TimeOfDay, labelKey: 'morning' as const },
		{ value: 'daytime' as TimeOfDay, labelKey: 'daytime' as const },
		{ value: 'evening' as TimeOfDay, labelKey: 'evening' as const },
		{ value: 'night' as TimeOfDay, labelKey: 'night' as const }
	];

	let selectedTimes = $derived(time ? time.split(',') as TimeOfDay[] : []);

	function handleTimeToggle(value: TimeOfDay) {
		const current = new Set(selectedTimes);
		if (current.has(value)) {
			current.delete(value);
		} else {
			current.add(value);
		}
		// If all selected, clear (= no filter)
		if (current.size === timeOptions.length) {
			onFilterChange('time', '');
		} else {
			onFilterChange('time', Array.from(current).join(','));
		}
	}

	// ── Step 3: Who? ──
	const audienceOptions = [
		{ value: '', labelKey: 'everyone' },
		{ value: 'family', labelKey: 'familyFriendly' },
		{ value: 'student', labelKey: 'students' },
		{ value: 'adult', labelKey: 'adults' },
		{ value: 'tourist', labelKey: 'tourists' }
	] as const;

	function handleAudienceSelect(value: string) {
		onFilterChange('audience', audience === value ? '' : value);
	}

	// ── Step 4: What? (Categories) ──
	const INITIAL_SHOW = 5;
	let selectedCategories = $derived(category ? category.split(',') : []);
	let visibleCategories = $derived(
		showAllCategories ? CATEGORIES : CATEGORIES.slice(0, INITIAL_SHOW)
	);
	let hiddenCount = CATEGORIES.length - INITIAL_SHOW;

	// ── More filters: Bydel + Price ──
	const priceOptions = [
		{ value: '', labelKey: 'allPrices' },
		{ value: 'free', labelKey: 'free' },
		{ value: 'paid', labelKey: 'paid' }
	] as const;

	function handleBydelSelect(e: Event) {
		const select = e.target as HTMLSelectElement;
		onFilterChange('bydel', select.value);
	}

	function handlePriceSelect(e: Event) {
		const select = e.target as HTMLSelectElement;
		onFilterChange('price', select.value);
	}

	// Any filter active? (for showing clear all)
	let hasActiveFilters = $derived(!!when || !!time || !!audience || !!category || !!bydel || !!price);

	// Auto-expand more filters if bydel or price are set via URL
	$effect(() => {
		if (bydel || price) showMoreFilters = true;
	});

	function handleCategoryToggle(cat: string) {
		const current = new Set(selectedCategories);
		if (current.has(cat)) {
			current.delete(cat);
		} else {
			current.add(cat);
		}
		onFilterChange('category', Array.from(current).join(','));
	}

	// Arrow key navigation within pill groups
	function handlePillKeydown(e: KeyboardEvent) {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

		const target = e.target as HTMLElement;
		const group = target.closest('[role="group"]') || target.closest('fieldset');
		if (!group) return;

		const buttons = Array.from(group.querySelectorAll('button:not(:disabled)')) as HTMLElement[];
		const idx = buttons.indexOf(target);
		if (idx === -1) return;

		e.preventDefault();
		const next = e.key === 'ArrowRight'
			? buttons[(idx + 1) % buttons.length]
			: buttons[(idx - 1 + buttons.length) % buttons.length];
		next.focus();
	}

	// Parse calendar selected date/range for MiniCalendar props
	let calendarDate = $derived.by(() => {
		if (!when || !isCalendarDate) return undefined;
		if (when.includes(':')) return undefined;
		return when;
	});

	let calendarRange = $derived.by(() => {
		if (!when || !when.includes(':')) return undefined;
		const [from, to] = when.split(':');
		return { from, to };
	});
</script>

<section
	aria-label={$t('eventDiscovery')}
	class="mx-auto max-w-7xl px-4 py-4"
>
	<div class="discovery-panel">
		<!-- Step 1: When? — always visible -->
		<fieldset class="discovery-step">
			<legend class="label-caps">{$t('whenLabel')}</legend>
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div class="pill-row" role="group" aria-label={$t('whenLabel')} onkeydown={handlePillKeydown}>
				{#each whenOptions as opt}
					<FilterPill
						label={$t(opt.labelKey)}
						selected={when === opt.value}
						onclick={() => handleWhenSelect(opt.value)}
					/>
				{/each}
				<FilterPill
					label={$t('chooseDates')}
					selected={showCalendar || !!isCalendarDate}
					onclick={handleChooseDateClick}
				/>
			</div>

			{#if showCalendar}
				<div transition:slide={{ duration: 200 }} class="mt-3">
					<MiniCalendar
						{lang}
						selectedDate={calendarDate}
						selectedRange={calendarRange}
						onSelect={handleCalendarSelect}
					/>
				</div>
			{/if}
		</fieldset>

		<!-- Steps 2-4: only visible when a date is selected -->
		{#if dateSelected}
			<!-- Step 2: Time of Day -->
			<fieldset class="discovery-step" transition:slide={{ duration: 250 }}>
				<legend class="label-caps">{$t('timeLabel')}</legend>
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div class="pill-row" role="group" aria-label={$t('timeLabel')} onkeydown={handlePillKeydown}>
					{#each timeOptions as opt}
						<FilterPill
							label={$t(opt.labelKey)}
							selected={selectedTimes.includes(opt.value)}
							onclick={() => handleTimeToggle(opt.value)}
						/>
					{/each}
				</div>
			</fieldset>

			<!-- Step 3: Who? -->
			<fieldset class="discovery-step" transition:slide={{ duration: 250 }}>
				<legend class="label-caps">{$t('whoLabel')}</legend>
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div class="pill-row" role="group" aria-label={$t('whoLabel')} onkeydown={handlePillKeydown}>
					{#each audienceOptions as opt}
						<FilterPill
							label={$t(opt.labelKey)}
							selected={opt.value === '' ? audience === '' : audience === opt.value}
							onclick={() => handleAudienceSelect(opt.value)}
						/>
					{/each}
				</div>
			</fieldset>

			<!-- Step 4: What? -->
			<fieldset class="discovery-step" transition:slide={{ duration: 250 }}>
				<legend class="label-caps">{$t('whatLabel')}</legend>
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div class="pill-row" role="group" aria-label={$t('whatLabel')} onkeydown={handlePillKeydown}>
					{#each visibleCategories as cat}
						<FilterPill
							label={$t(`cat.${cat}` as any)}
							selected={selectedCategories.includes(cat)}
							onclick={() => handleCategoryToggle(cat)}
						/>
					{/each}
					{#if !showAllCategories}
						<FilterPill
							label={`+${hiddenCount} ${$t('moreCategories')}`}
							selected={false}
							onclick={() => { showAllCategories = true; }}
						/>
					{/if}
				</div>
			</fieldset>
		{/if}

		<!-- More filters (bydel + price) — always available -->
		<div class="more-filters-row">
			<button
				type="button"
				class="more-filters-toggle"
				onclick={() => { showMoreFilters = !showMoreFilters; }}
				aria-expanded={showMoreFilters}
			>
				{$t('moreFilters')}
				<span class="toggle-arrow" class:open={showMoreFilters}>&#9662;</span>
			</button>

			{#if hasActiveFilters}
				<button
					type="button"
					onclick={onClearAll}
					class="clear-all-btn"
				>
					{$t('clearAll')}
				</button>
			{/if}

			<p class="event-count" aria-live="polite" role="status">
				<span class="tabular-nums font-semibold">{eventCount}</span>
				{$t('eventsFound')}
			</p>
		</div>

		{#if showMoreFilters}
			<div class="more-filters-content" transition:slide={{ duration: 200 }}>
				<div class="filter-dropdowns">
					<select
						value={bydel}
						onchange={handleBydelSelect}
						class="filter-select"
					>
						<option value="">{$t('allAreas')}</option>
						{#each BYDELER as b}
							<option value={b}>{b}</option>
						{/each}
					</select>

					<select
						value={price}
						onchange={handlePriceSelect}
						class="filter-select"
					>
						{#each priceOptions as opt}
							<option value={opt.value}>{$t(opt.labelKey)}</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}
	</div>
</section>

<style>
	.discovery-panel {
		background: var(--color-bg-surface);
		border-radius: 0.75rem;
		box-shadow: var(--shadow-sm);
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.discovery-step {
		border: none;
		padding: 0;
		margin: 0;
	}

	.discovery-step legend {
		margin-bottom: 0.5rem;
	}

	.pill-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.more-filters-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border-subtle);
	}

	.more-filters-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: none;
		border: none;
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.25rem 0;
	}

	.more-filters-toggle:hover {
		color: var(--color-text-primary);
	}

	.toggle-arrow {
		font-size: 0.625rem;
		transition: transform 0.2s;
	}

	.toggle-arrow.open {
		transform: rotate(180deg);
	}

	.clear-all-btn {
		background: none;
		border: none;
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		text-decoration: underline;
		cursor: pointer;
		padding: 0.25rem 0;
	}

	.clear-all-btn:hover {
		color: var(--color-text-primary);
	}

	.event-count {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		margin-left: auto;
	}

	.more-filters-content {
		padding-top: 0.25rem;
	}

	.filter-dropdowns {
		display: flex;
		gap: 0.5rem;
	}

	.filter-select {
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-surface);
		padding: 0.375rem 0.625rem;
		font-size: 0.8125rem;
		color: var(--color-text-primary);
	}

	/* Mobile: horizontal scroll for pill rows */
	@media (max-width: 767px) {
		.discovery-panel {
			padding: 1rem;
			border-radius: 0;
			box-shadow: none;
			border-bottom: 1px solid var(--color-border);
		}

		.pill-row {
			flex-wrap: nowrap;
			overflow-x: auto;
			scrollbar-width: none;
			-webkit-overflow-scrolling: touch;
			padding-bottom: 2px;
		}

		.pill-row::-webkit-scrollbar {
			display: none;
		}
	}
</style>
