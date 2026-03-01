<script lang="ts">
	import { page } from '$app/stores';
	import { t } from '$lib/i18n';
	import { CATEGORIES, BYDELER } from '$lib/types';
	import type { Lang, TimeOfDay, GaariEvent } from '$lib/types';
	import { CATEGORY_HEX_COLORS } from '$lib/utils';
	import { isFreeEvent } from '$lib/utils';
	import FilterPill from './FilterPill.svelte';
	import MiniCalendar from './MiniCalendar.svelte';
	import { Users, Drama, GraduationCap, Moon, MapPin, Mail, Sparkle } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { getOsloNow, toOsloDateStr, isSameDay, getWeekendDates, addDays, getEndOfWeekDateStr } from '$lib/event-filters';

	interface Props {
		lang: Lang;
		eventCount: number;
		allEvents: GaariEvent[];
		onFilterChange: (key: string, value: string) => void;
		onClearAll: () => void;
	}

	let { lang, eventCount, allEvents, onFilterChange, onClearAll }: Props = $props();

	// Read current filter state from URL
	let when = $derived($page.url.searchParams.get('when') || '');
	let time = $derived($page.url.searchParams.get('time') || '');
	let audience = $derived($page.url.searchParams.get('audience') || '');
	let category = $derived($page.url.searchParams.get('category') || '');
	let bydel = $derived($page.url.searchParams.get('bydel') || '');
	let price = $derived($page.url.searchParams.get('price') || '');

	// Local UI state
	let showCalendar = $state(false);
	let showAllCategories = $state(false);
	let showAllAudience = $state(false);
	let expandWhen = $state(false);
	let expandCategories = $state(false);
	let expandMoreFilters = $state(false);
	let expandFiltersPanel = $state(false);

	// Count of active secondary filters (when/time/category/price/bydel)
	let secondaryFilterCount = $derived(
		(when ? 1 : 0) + (time ? 1 : 0) + (category ? category.split(',').length : 0) + (price ? 1 : 0) + (bydel ? 1 : 0)
	);
	// On mobile, auto-expand filters panel if any secondary filters are active via URL
	let filtersPanelOpen = $derived(expandFiltersPanel || secondaryFilterCount > 0);

	// Auto-expand when filters active in URL
	let whenOpen = $derived(expandWhen || !!when || !!time);
	let categoriesOpen = $derived(expandCategories || !!category || !!price);
	let moreFiltersOpen = $derived(expandMoreFilters || !!bydel);

	// Active events for count computation (non-cancelled/expired)
	let activeEvents = $derived(allEvents.filter(e => e.status !== 'cancelled' && e.status !== 'expired'));

	// ── Count computation ──

	let audienceCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		counts[''] = activeEvents.length;
		counts.family = activeEvents.filter(e => e.age_group === 'family').length;
		counts.ungdom = activeEvents.filter(e => {
			if (e.age_group === '18+') return false;
			if (e.category === 'nightlife' || e.category === 'food') return false;
			const youthCategories = new Set(['music', 'culture', 'sports', 'workshop', 'festival', 'student']);
			const youthRe = /\bungdom|\btenåring|\bfor\s+unge?\b|\bteen|\b1[0-5]\s*[-–]\s*1[5-9]\s*år|\bfra\s+1[0-5]\s+år/i;
			return youthCategories.has(e.category) || e.age_group === 'family' || e.category === 'family' || youthRe.test(e.title_no) || youthRe.test(e.description_no);
		}).length;
		counts.voksen = activeEvents.filter(e => {
			const adultCategories = new Set(['culture', 'music', 'theatre', 'tours', 'food', 'workshop']);
			return adultCategories.has(e.category);
		}).length;
		counts.student = activeEvents.filter(e => e.age_group === 'students' || e.category === 'student').length;
		counts.adult = activeEvents.filter(e => e.age_group !== 'family' && e.category !== 'family').length;
		counts.tourist = activeEvents.filter(e => e.language === 'en' || e.language === 'both').length;
		return counts;
	});

	let categoryCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const cat of CATEGORIES) {
			counts[cat] = activeEvents.filter(e => e.category === cat).length;
		}
		return counts;
	});

	let whenCounts = $derived.by(() => {
		const now = getOsloNow();
		const todayStr = toOsloDateStr(now);
		const tmrwStr = toOsloDateStr(addDays(now, 1));
		const { start: weekendStart, end: weekendEnd } = getWeekendDates(now);
		const weekEnd = getEndOfWeekDateStr(now);

		return {
			today: activeEvents.filter(e => isSameDay(e.date_start, todayStr)).length,
			tomorrow: activeEvents.filter(e => isSameDay(e.date_start, tmrwStr)).length,
			weekend: activeEvents.filter(e => {
				const d = e.date_start.slice(0, 10);
				return d >= weekendStart && d <= weekendEnd;
			}).length,
			week: activeEvents.filter(e => {
				const d = e.date_start.slice(0, 10);
				return d >= todayStr && d <= weekEnd;
			}).length
		};
	});

	// ── Step 1: When? ──
	const whenOptions = [
		{ value: 'today', labelKey: 'today' },
		{ value: 'tomorrow', labelKey: 'tomorrow' },
		{ value: 'weekend', labelKey: 'thisWeekend' },
		{ value: 'week', labelKey: 'thisWeek' }
	] as const;

	// Date sublabels
	let whenSublabels = $derived.by(() => {
		const now = getOsloNow();
		const fmt = (d: Date) => d.toLocaleDateString(lang === 'no' ? 'nb-NO' : 'en-GB', {
			weekday: 'short', day: 'numeric', month: 'short'
		}).replace(/\.$/, '');
		return {
			today: fmt(now),
			tomorrow: fmt(addDays(now, 1)),
			weekend: lang === 'no' ? 'fre\u2013søn' : 'Fri\u2013Sun',
			week: lang === 'no' ? '7 dager' : '7 days'
		} as Record<string, string>;
	});

	let isCalendarDate = $derived(when.match(/^\d{4}-\d{2}-\d{2}/));

	function handleWhenSelect(value: string) {
		showCalendar = false;
		onFilterChange('when', when === value ? '' : value);
	}

	function handleChooseDateClick() {
		showCalendar = !showCalendar;
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
		const current = selectedTimes.includes(value)
			? selectedTimes.filter(t => t !== value)
			: [...selectedTimes, value];
		if (current.length === timeOptions.length) {
			onFilterChange('time', '');
		} else {
			onFilterChange('time', current.join(','));
		}
	}

	// ── Step 3: Who? ──
	const audienceOptions = [
		{ value: 'family', labelKey: 'familyShort', icon: Users },
		{ value: 'ungdom', labelKey: 'youth', icon: Sparkle },
		{ value: 'voksen', labelKey: 'grownups', icon: Drama },
		{ value: 'student', labelKey: 'students', icon: GraduationCap },
		{ value: 'adult', labelKey: 'adults', icon: Moon },
		{ value: 'tourist', labelKey: 'tourists', icon: MapPin }
	] as const;

	const INITIAL_AUDIENCE_SHOW = 3;
	let hiddenAudienceCount = audienceOptions.length - INITIAL_AUDIENCE_SHOW;
	const hiddenAudienceValues = new Set(audienceOptions.slice(INITIAL_AUDIENCE_SHOW).map(o => o.value));
	let audienceExpanded = $derived(showAllAudience || (!!audience && hiddenAudienceValues.has(audience)));

	function handleAudienceSelect(value: string) {
		onFilterChange('audience', audience === value ? '' : value);
	}

	// ── Step 4: What? (Categories) ──
	const INITIAL_SHOW = 4;
	let selectedCategories = $derived(category ? category.split(',') : []);
	let visibleCategories = $derived(
		showAllCategories ? CATEGORIES : CATEGORIES.slice(0, INITIAL_SHOW)
	);
	let hiddenCount = CATEGORIES.length - INITIAL_SHOW;

	function handleCategoryToggle(cat: string) {
		const current = selectedCategories.includes(cat)
			? selectedCategories.filter(c => c !== cat)
			: [...selectedCategories, cat];
		onFilterChange('category', current.join(','));
	}

	// ── Where (Bydel) ──
	function handleBydelSelect(value: string) {
		onFilterChange('bydel', bydel === value ? '' : value);
	}

	// Any filter active?
	let hasActiveFilters = $derived(!!when || !!time || !!audience || !!category || !!bydel || !!price);
	let hasNlFilters = $derived(!!audience || !!category || !!bydel || !!price);

	// ── Active filter chips ──
	let activeFilterChips = $derived.by(() => {
		const chips: Array<{ label: string; onRemove: () => void }> = [];

		if (audience) {
			const opt = audienceOptions.find(o => o.value === audience);
			if (opt) chips.push({ label: $t(opt.labelKey), onRemove: () => onFilterChange('audience', '') });
		}

		if (when) {
			let label: string;
			if (when === 'today') label = $t('today');
			else if (when === 'tomorrow') label = $t('tomorrow');
			else if (when === 'weekend') label = $t('thisWeekend');
			else if (when === 'week') label = $t('thisWeek');
			else label = when.replace(':', ' \u2013 ');
			chips.push({ label, onRemove: () => { showCalendar = false; onFilterChange('when', ''); } });
		}

		if (category) {
			for (const cat of selectedCategories) {
				chips.push({
					label: $t(`cat.${cat}`),
					onRemove: () => handleCategoryToggle(cat)
				});
			}
		}

		if (price) {
			chips.push({
				label: $t(price === 'free' ? 'likelyFree' : 'paid'),
				onRemove: () => onFilterChange('price', '')
			});
		}

		if (time) {
			const timeLabelMap: Record<string, string> = {
				morning: $t('morning'), daytime: $t('daytime'),
				evening: $t('evening'), night: $t('night')
			};
			chips.push({
				label: selectedTimes.map(tv => timeLabelMap[tv] || tv).join(', '),
				onRemove: () => onFilterChange('time', '')
			});
		}

		if (bydel) {
			chips.push({ label: bydel, onRemove: () => onFilterChange('bydel', '') });
		}

		return chips;
	});

	// Arrow key navigation within pill groups
	function handlePillKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			expandCategories = false;
			expandMoreFilters = false;
			return;
		}
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

	// ── Newsletter prompt ──
	const DISMISS_KEY = 'gaari-newsletter-dismissed';
	const SUBSCRIBE_KEY = 'gaari-newsletter-subscribed';
	const DISMISS_DAYS = 14;

	let nlDismissed = $state(false);
	let nlSubscribed = $state(false);
	let nlEmail = $state('');
	let nlStatus = $state<'idle' | 'submitting' | 'success' | 'error'>('idle');

	// Check localStorage on mount
	$effect(() => {
		if (!browser) return;
		if (localStorage.getItem(SUBSCRIBE_KEY)) { nlSubscribed = true; return; }
		const dismissed = localStorage.getItem(DISMISS_KEY);
		if (dismissed) {
			const elapsed = Date.now() - Number(dismissed);
			nlDismissed = elapsed < DISMISS_DAYS * 86400000;
		}
	});

	let showNewsletter = $derived(hasActiveFilters && !nlSubscribed && !nlDismissed && nlStatus !== 'success');

	function dismissNewsletter() {
		nlDismissed = true;
		if (browser) localStorage.setItem(DISMISS_KEY, String(Date.now()));
	}

	async function submitNewsletter(e: SubmitEvent) {
		e.preventDefault();
		if (!nlEmail.trim()) return;
		nlStatus = 'submitting';
		try {
			const fd = new FormData();
			fd.append('email', nlEmail.trim());
			// Send current filter preferences for personalized newsletters
			if (audience) fd.append('audience', audience);
			if (category) fd.append('categories', category);
			if (bydel) fd.append('bydel', bydel);
			if (price) fd.append('price', price);
			fd.append('lang', lang);
			const res = await fetch('/api/newsletter', { method: 'POST', body: fd });
			if (res.ok) {
				nlStatus = 'success';
				if (browser) localStorage.setItem(SUBSCRIBE_KEY, 'true');
			} else {
				nlStatus = 'error';
			}
		} catch {
			nlStatus = 'error';
		}
	}

	// Personalized newsletter copy
	const categoryLabelsNo: Record<string, string> = {
		music: 'konserter', culture: 'kulturarrangementer', theatre: 'teater',
		family: 'familieaktiviteter', food: 'mat- og drikke', festival: 'festivaler',
		sports: 'sport', nightlife: 'uteliv', workshop: 'kurs og workshops',
		student: 'studentarrangementer', tours: 'turer og opplevelser'
	};
	const categoryLabelsEn: Record<string, string> = {
		music: 'concerts', culture: 'cultural events', theatre: 'theatre',
		family: 'family activities', food: 'food & drink', festival: 'festivals',
		sports: 'sports', nightlife: 'nightlife', workshop: 'workshops',
		student: 'student events', tours: 'tours & experiences'
	};
	const audienceLabelsNo: Record<string, string> = {
		family: 'for familien', ungdom: 'for ungdom', voksen: 'for voksne', student: 'for studenter',
		adult: 'for voksne (18+)', tourist: 'for turister'
	};
	const audienceLabelsEn: Record<string, string> = {
		family: 'for families', ungdom: 'for teens', voksen: 'for adults', student: 'for students',
		adult: 'for adults (18+)', tourist: 'for tourists'
	};

	let nlDescription = $derived.by(() => {
		const no = lang === 'no';
		const parts: string[] = [];

		// Category
		if (selectedCategories.length === 1) {
			const labels = no ? categoryLabelsNo : categoryLabelsEn;
			parts.push(labels[selectedCategories[0]] || (no ? 'arrangementer' : 'events'));
		} else if (selectedCategories.length > 1) {
			parts.push(no ? 'arrangementer' : 'events');
		} else {
			parts.push(no ? 'arrangementer' : 'events');
		}

		// Audience
		if (audience) {
			const labels = no ? audienceLabelsNo : audienceLabelsEn;
			if (labels[audience]) parts.push(labels[audience]);
		}

		// Bydel
		if (bydel) {
			parts.push(no ? `i ${bydel}` : `in ${bydel}`);
		}

		const desc = parts.join(' ');
		return no
			? `Vi sender deg ${desc} — hver torsdag.`
			: `We\u2019ll send you ${desc} — every Thursday.`;
	});
</script>

<section
	aria-label={$t('eventDiscovery')}
	class="mx-auto max-w-7xl px-4 py-2 md:py-4"
>
	<div class="discovery-panel">
		<h2 class="panel-heading">{$t('findEvents')}</h2>

		<!-- Active filter chips -->
		{#if activeFilterChips.length > 0}
			<div class="chip-row">
				{#each activeFilterChips as chip (chip.label)}
					<button
						class="filter-chip"
						onclick={() => chip.onRemove()}
						aria-label="{$t('removeFilter')}: {chip.label}"
					>
						{chip.label}
						<span class="chip-x" aria-hidden="true">×</span>
					</button>
				{/each}
			</div>
		{/if}

		<!-- Who? — always visible, first choice -->
		<fieldset class="discovery-step">
			<legend class="label-caps">{$t('whoLabel')}</legend>
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div class="pill-row" class:audience-collapsed={!audienceExpanded} role="group" aria-label={$t('whoLabel')} onkeydown={handlePillKeydown}>
				{#each audienceOptions as opt, i (opt.value)}
					<span class:audience-extra={i >= INITIAL_AUDIENCE_SHOW}>
						<FilterPill
							label={$t(opt.labelKey)}
							icon={opt.icon}
							count={audienceCounts[opt.value]}
							selected={audience === opt.value}
							onclick={() => handleAudienceSelect(opt.value)}
						/>
					</span>
				{/each}
				<button
					type="button"
					class="show-more-pill"
					onclick={() => { showAllAudience = true; }}
				>+{hiddenAudienceCount} {$t('moreCategories')}</button>
			</div>
		</fieldset>

		<!-- Mobile: single "More filters" button -->
		<button
			type="button"
			class="mobile-filters-toggle"
			class:active={filtersPanelOpen}
			aria-expanded={filtersPanelOpen}
			onclick={() => { expandFiltersPanel = !expandFiltersPanel; }}
		>
			<span>{lang === 'no' ? 'Flere filtre' : 'More filters'}</span>
			{#if secondaryFilterCount > 0}
				<span class="count-badge">{secondaryFilterCount}</span>
			{/if}
			<span class="toggle-chevron" class:open={filtersPanelOpen}>▼</span>
		</button>

		<!-- Toggle row: Når? | Hva? | Hvor? — always visible on desktop, collapsible on mobile -->
		<div class="filters-panel" class:filters-panel-open={filtersPanelOpen}>
			<div class="section-divider desktop-only"></div>
			<div class="toggle-row">
				<button
					type="button"
					class="section-toggle"
					class:active={whenOpen}
					aria-expanded={whenOpen}
					aria-controls="when-section"
					onclick={() => { expandWhen = !expandWhen; }}
				>
					<span>{$t('whenLabel')}</span>
					{#if when || time}
						<span class="count-badge">{(when ? 1 : 0) + (time ? 1 : 0)}</span>
					{/if}
					<span class="toggle-chevron" class:open={whenOpen}>▼</span>
				</button>

				<button
					type="button"
					class="section-toggle"
					class:active={categoriesOpen}
					aria-expanded={categoriesOpen}
					aria-controls="category-section"
					onclick={() => { expandCategories = !expandCategories; }}
				>
					<span>{$t('whatLabel')}</span>
					{#if selectedCategories.length > 0 || !!price}
						<span class="count-badge">{selectedCategories.length + (price ? 1 : 0)}</span>
					{/if}
					<span class="toggle-chevron" class:open={categoriesOpen}>▼</span>
				</button>

				<button
					type="button"
					class="section-toggle"
					class:active={moreFiltersOpen}
					aria-expanded={moreFiltersOpen}
					aria-controls="more-filters-section"
					onclick={() => { expandMoreFilters = !expandMoreFilters; }}
				>
					<span>{$t('whereLabel')}</span>
					{#if bydel}
						<span class="count-badge">1</span>
					{/if}
					<span class="toggle-chevron" class:open={moreFiltersOpen}>▼</span>
				</button>
			</div>

		<!-- Expandable: When + Time of Day -->
		{#if whenOpen}
			<div id="when-section" class="section-content" transition:slide={{ duration: 200 }}>
				<fieldset class="discovery-step">
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<div class="pill-row" role="group" aria-label={$t('whenLabel')} onkeydown={handlePillKeydown}>
						{#each whenOptions as opt (opt.value)}
							<FilterPill
								label={$t(opt.labelKey)}
								sublabel={whenSublabels[opt.value]}
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

				<fieldset class="discovery-step">
					<legend class="label-caps">{$t('timeLabel')}</legend>
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<div class="pill-row" role="group" aria-label={$t('timeLabel')} onkeydown={handlePillKeydown}>
						{#each timeOptions as opt (opt.value)}
							<FilterPill
								label={$t(opt.labelKey)}
								selected={selectedTimes.includes(opt.value)}
								onclick={() => handleTimeToggle(opt.value)}
							/>
						{/each}
					</div>
				</fieldset>
			</div>
		{/if}

		<!-- Expandable: Categories + Price -->
		{#if categoriesOpen}
			<div id="category-section" class="section-content" transition:slide={{ duration: 200 }}>
				<fieldset class="discovery-step">
					<legend class="label-caps">{$t('categoryLabel')}</legend>
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<div class="pill-row" role="group" aria-label={$t('categoryLabel')} onkeydown={handlePillKeydown}>
						{#each visibleCategories as cat (cat)}
							<FilterPill
								label={$t(`cat.${cat}`)}
								count={categoryCounts[cat]}
								color={CATEGORY_HEX_COLORS[cat]}
								variant="category"
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

				<fieldset class="discovery-step">
					<legend class="label-caps">{$t('priceLabel')}</legend>
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<div class="pill-row" role="group" aria-label={$t('priceLabel')} onkeydown={handlePillKeydown}>
						<FilterPill
							label={$t('likelyFree')}
							selected={price === 'free'}
							onclick={() => onFilterChange('price', price === 'free' ? '' : 'free')}
						/>
						<FilterPill
							label={$t('paid')}
							selected={price === 'paid'}
							onclick={() => onFilterChange('price', price === 'paid' ? '' : 'paid')}
						/>
					</div>
					<p class="price-disclaimer">{$t('priceDisclaimer')}</p>
				</fieldset>
			</div>
		{/if}

		<!-- Expandable: Where -->
		{#if moreFiltersOpen}
			<div id="more-filters-section" class="section-content" transition:slide={{ duration: 200 }}>
				<fieldset class="discovery-step">
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<div class="pill-row" role="group" aria-label={$t('whereLabel')} onkeydown={handlePillKeydown}>
						{#each BYDELER as b (b)}
							<FilterPill
								label={b}
								selected={bydel === b}
								onclick={() => handleBydelSelect(b)}
							/>
						{/each}
					</div>
				</fieldset>
			</div>
		{/if}
		</div><!-- end .filters-panel -->

		<!-- Result counter — only shown when filters are active -->
		{#if hasActiveFilters}
			<div class="result-counter" aria-live="polite" aria-atomic="true">
				<div class="result-count-group">
					<span class="result-number">{eventCount}</span>
					<span class="result-label">{$t('arrangementer')}</span>
				</div>
				<button
					type="button"
					class="reset-btn"
					onclick={onClearAll}
				>
					{$t('resetFilters')}
				</button>
			</div>
		{/if}

		<!-- Contextual newsletter prompt -->
		{#if showNewsletter}
			<div class="nl-prompt" transition:slide={{ duration: 250 }}>
				<div class="nl-header">
					<div class="nl-icon"><Mail size={16} strokeWidth={1.5} /></div>
					<p class="nl-text">{nlDescription}</p>
					<button
						type="button"
						class="nl-dismiss"
						onclick={dismissNewsletter}
						aria-label={lang === 'no' ? 'Lukk' : 'Close'}
					>×</button>
				</div>
				<form class="nl-form" onsubmit={submitNewsletter}>
					<input
						type="email"
						class="nl-input"
						placeholder={$t('nlPlaceholder')}
						required
						aria-required="true"
						bind:value={nlEmail}
						disabled={nlStatus === 'submitting'}
					/>
					<button
						type="submit"
						class="nl-submit"
						disabled={nlStatus === 'submitting'}
					>
						{nlStatus === 'submitting'
							? '...'
							: $t('nlSubscribe')}
					</button>
				</form>
				{#if nlStatus === 'error'}
					<p class="nl-error" role="alert">{lang === 'no' ? 'Noe gikk galt. Prøv igjen.' : 'Something went wrong. Try again.'}</p>
				{/if}
			</div>
		{/if}

		{#if nlStatus === 'success'}
			<div class="nl-success" transition:slide={{ duration: 250 }}>
				<p>{lang === 'no' ? 'Du er påmeldt! Sjekk innboksen din.' : 'You\u2019re subscribed! Check your inbox.'}</p>
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
		overflow: hidden;
	}

	.panel-heading {
		font-family: var(--font-display);
		font-size: 1.125rem;
		font-weight: 500;
		color: var(--color-text-primary);
		margin: 0;
		line-height: 1.2;
	}

	/* Active filter chips */
	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		padding-bottom: 0.875rem;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		border: none;
		font-size: 0.75rem;
		font-weight: 600;
		background: var(--funkis-red-subtle);
		color: var(--funkis-red);
		cursor: pointer;
		transition: background-color 0.15s, color 0.15s;
	}

	.filter-chip:hover {
		background: var(--funkis-red);
		color: white;
	}

	.chip-x {
		font-size: 0.875rem;
		line-height: 1;
	}

	/* Fieldset steps */
	.discovery-step {
		border: none;
		padding: 0;
		margin: 0;
		min-width: 0;
	}

	.discovery-step legend {
		margin-bottom: 0.5rem;
	}

	.pill-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.section-divider {
		border-top: 1px solid var(--color-border-subtle);
	}

	/* Toggle row */
	.toggle-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.section-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.875rem;
		border-radius: 9999px;
		border: 1px solid var(--color-border-subtle);
		background: white;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
		align-self: flex-start;
	}

	.section-toggle:hover {
		border-color: var(--color-border);
		color: var(--color-text-primary);
	}

	.section-toggle.active {
		border-color: var(--color-border);
		background: var(--color-surface);
	}

	.section-toggle:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.count-badge {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--funkis-red);
		color: white;
		font-size: 10px;
		font-weight: 700;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.toggle-chevron {
		font-size: 10px;
		color: var(--funkis-granite);
		transition: transform 0.2s;
	}

	.toggle-chevron.open {
		transform: rotate(180deg);
	}

	.section-content {
		margin-top: 0.75rem;
		padding-left: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* Result counter */
	.result-counter {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border-subtle);
		margin-top: 0.375rem;
	}

	.result-count-group {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
	}

	.result-number {
		font-family: var(--font-display);
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--funkis-red);
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.result-label {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		font-weight: 500;
	}

	.reset-btn {
		background: none;
		border: none;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--funkis-red);
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.reset-btn:hover {
		background: var(--funkis-red-subtle);
	}

	/* Shared */
	.filter-select {
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-surface);
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--color-text-primary);
		min-height: 44px;
	}

	.price-disclaimer {
		font-size: 0.6875rem;
		color: var(--color-text-muted);
		font-style: italic;
		margin-top: 0.25rem;
	}

	/* Newsletter prompt */
	.nl-prompt {
		background: var(--funkis-red-subtle);
		border: 1px solid var(--color-border-subtle);
		border-radius: 0.5rem;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.nl-header {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.nl-icon {
		color: var(--funkis-red);
		flex-shrink: 0;
		margin-top: 1px;
	}

	.nl-text {
		font-size: 0.8125rem;
		color: var(--color-text-primary);
		margin: 0;
		flex: 1;
		line-height: 1.4;
	}

	.nl-dismiss {
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 1.125rem;
		line-height: 1;
		cursor: pointer;
		padding: 0 0.25rem;
		flex-shrink: 0;
	}

	.nl-dismiss:hover {
		color: var(--color-text-primary);
	}

	.nl-form {
		display: flex;
		gap: 0.375rem;
	}

	.nl-input {
		flex: 1;
		min-width: 0;
		padding: 0.375rem 0.625rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		background: white;
		min-height: 36px;
	}

	.nl-input:focus {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}

	.nl-submit {
		padding: 0.375rem 0.75rem;
		background: var(--funkis-red);
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		min-height: 36px;
		transition: background-color 0.15s;
	}

	.nl-submit:hover:not(:disabled) {
		background: var(--funkis-red-hover);
	}

	.nl-submit:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.nl-error {
		font-size: 0.75rem;
		color: var(--funkis-red);
		margin: 0;
	}

	.nl-success {
		background: #EBF5EB;
		border: 1px solid #C1DDC1;
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
	}

	.nl-success p {
		font-size: 0.8125rem;
		color: #2D6A2D;
		margin: 0;
		font-weight: 500;
	}

	/* Mobile: single "More filters" toggle — hidden on desktop */
	.mobile-filters-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.875rem;
		border-radius: 9999px;
		border: 1px solid var(--color-border-subtle);
		background: white;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
		align-self: flex-start;
	}

	.mobile-filters-toggle:hover {
		border-color: var(--color-border);
		color: var(--color-text-primary);
	}

	.mobile-filters-toggle.active {
		border-color: var(--color-border);
		background: var(--color-surface);
	}

	.mobile-filters-toggle:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	/* Filters panel — hidden on mobile by default */
	.filters-panel {
		display: contents;
	}

	.desktop-only {
		display: block;
	}

	@media (min-width: 768px) {
		.mobile-filters-toggle {
			display: none;
		}
	}

	@media (max-width: 767px) {
		.desktop-only {
			display: none;
		}

		.filters-panel {
			display: none;
		}

		.filters-panel.filters-panel-open {
			display: contents;
		}
	}

	/* Show more pill — only visible on mobile when collapsed */
	.show-more-pill {
		display: inline-flex;
		align-items: center;
		padding: 0.375rem 0.875rem;
		border-radius: 9999px;
		border: 1px dashed var(--color-border);
		background: transparent;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		cursor: pointer;
		min-height: 44px;
		transition: border-color 0.15s, color 0.15s;
	}

	.show-more-pill:hover {
		border-color: var(--color-text-secondary);
		color: var(--color-text-primary);
	}

	/* On mobile: hide extra audience pills when collapsed */
	@media (max-width: 767px) {
		.audience-collapsed .audience-extra {
			display: none;
		}
	}

	/* Desktop: always show all pills, hide the "+N" button */
	@media (min-width: 768px) {
		.show-more-pill {
			display: none;
		}

		.audience-extra {
			display: contents;
		}
	}

	/* Mobile */
	@media (max-width: 767px) {
		.discovery-panel {
			padding: 0.75rem;
			gap: 0.5rem;
			border-radius: 0;
			box-shadow: none;
			border-bottom: 1px solid var(--color-border);
		}
	}
</style>
