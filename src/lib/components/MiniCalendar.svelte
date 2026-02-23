<script lang="ts">
	import type { Lang } from '$lib/types';

	interface Props {
		selectedDate?: string;
		selectedRange?: { from: string; to: string };
		onSelect: (date: string | { from: string; to: string }) => void;
		lang: Lang;
	}

	let { selectedDate, selectedRange, onSelect, lang }: Props = $props();

	const WEEKDAYS_NO = ['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'];
	const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const MONTHS_NO = [
		'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
		'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
	];
	const MONTHS_EN = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	// Oslo timezone for "today"
	function getOsloToday(): string {
		return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
	}

	let todayStr = $state(getOsloToday());
	let viewYear = $state(Number(todayStr.slice(0, 4)));
	let viewMonth = $state(Number(todayStr.slice(5, 7)) - 1); // 0-indexed

	// Range selection state
	let rangeStart: string | null = $state(null);

	let weekdays = $derived(lang === 'no' ? WEEKDAYS_NO : WEEKDAYS_EN);
	let months = $derived(lang === 'no' ? MONTHS_NO : MONTHS_EN);
	let monthLabel = $derived(`${months[viewMonth]} ${viewYear}`);

	// Build calendar grid
	let calendarDays = $derived.by(() => {
		const firstDay = new Date(viewYear, viewMonth, 1);
		const lastDay = new Date(viewYear, viewMonth + 1, 0);
		const daysInMonth = lastDay.getDate();

		// Monday=0 based day of week
		let startDow = firstDay.getDay() - 1;
		if (startDow < 0) startDow = 6;

		const days: (string | null)[] = [];

		// Empty cells before the first day
		for (let i = 0; i < startDow; i++) {
			days.push(null);
		}

		// Actual days
		for (let d = 1; d <= daysInMonth; d++) {
			const mm = String(viewMonth + 1).padStart(2, '0');
			const dd = String(d).padStart(2, '0');
			days.push(`${viewYear}-${mm}-${dd}`);
		}

		return days;
	});

	function isPast(dateStr: string): boolean {
		return dateStr < todayStr;
	}

	function isSelected(dateStr: string): boolean {
		if (selectedDate === dateStr) return true;
		if (selectedRange && dateStr >= selectedRange.from && dateStr <= selectedRange.to) return true;
		return false;
	}

	function isRangeEdge(dateStr: string): boolean {
		if (!selectedRange) return false;
		return dateStr === selectedRange.from || dateStr === selectedRange.to;
	}

	function handleDayClick(dateStr: string) {
		if (isPast(dateStr)) return;

		if (rangeStart === null) {
			// First click — could be single date or start of range
			rangeStart = dateStr;
			onSelect(dateStr);
		} else if (rangeStart === dateStr) {
			// Clicked same date again — confirm single date
			rangeStart = null;
		} else {
			// Second click — create range
			const from = rangeStart < dateStr ? rangeStart : dateStr;
			const to = rangeStart < dateStr ? dateStr : rangeStart;
			rangeStart = null;
			onSelect({ from, to });
		}
	}

	function prevMonth() {
		if (viewMonth === 0) {
			viewMonth = 11;
			viewYear--;
		} else {
			viewMonth--;
		}
	}

	function nextMonth() {
		if (viewMonth === 11) {
			viewMonth = 0;
			viewYear++;
		} else {
			viewMonth++;
		}
	}

	// Don't allow navigating to past months
	let canGoPrev = $derived(
		viewYear > Number(todayStr.slice(0, 4)) ||
		(viewYear === Number(todayStr.slice(0, 4)) && viewMonth > Number(todayStr.slice(5, 7)) - 1)
	);
</script>

<div class="mini-calendar" role="application" aria-label={lang === 'no' ? 'Velg dato' : 'Choose date'}>
	<!-- Month navigation -->
	<div class="cal-header">
		<button
			type="button"
			onclick={prevMonth}
			disabled={!canGoPrev}
			aria-label={lang === 'no' ? 'Forrige måned' : 'Previous month'}
			class="cal-nav"
		>
			&#8592;
		</button>
		<span class="cal-month-label">{monthLabel}</span>
		<button
			type="button"
			onclick={nextMonth}
			aria-label={lang === 'no' ? 'Neste måned' : 'Next month'}
			class="cal-nav"
		>
			&#8594;
		</button>
	</div>

	<!-- Weekday headers -->
	<div class="cal-grid cal-weekdays" role="row">
		{#each weekdays as day}
			<span class="cal-weekday" role="columnheader">{day}</span>
		{/each}
	</div>

	<!-- Days grid -->
	<div class="cal-grid" role="grid">
		{#each calendarDays as day}
			{#if day === null}
				<span class="cal-empty"></span>
			{:else}
				<button
					type="button"
					class="cal-day"
					class:past={isPast(day)}
					class:today={day === todayStr}
					class:selected={isSelected(day)}
					class:range-edge={isRangeEdge(day)}
					class:range-start={rangeStart === day}
					disabled={isPast(day)}
					onclick={() => handleDayClick(day)}
					aria-label={new Date(day + 'T12:00:00').toLocaleDateString(lang === 'no' ? 'nb-NO' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
					aria-pressed={isSelected(day)}
				>
					{Number(day.slice(8, 10))}
				</button>
			{/if}
		{/each}
	</div>

	{#if rangeStart}
		<p class="cal-hint">
			{lang === 'no' ? 'Klikk en annen dato for periode, eller samme dato for enkeltdag' : 'Click another date for a range, or same date for single day'}
		</p>
	{/if}
</div>

<style>
	.mini-calendar {
		width: 100%;
		max-width: 320px;
		padding: 0.75rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
	}

	.cal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.cal-month-label {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 0.9375rem;
		color: var(--color-text-primary);
	}

	.cal-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: none;
		border-radius: 50%;
		cursor: pointer;
		color: var(--color-text-secondary);
		font-size: 1rem;
	}

	.cal-nav:hover:not(:disabled) {
		background: var(--color-bg);
	}

	.cal-nav:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.cal-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}

	.cal-weekdays {
		margin-bottom: 2px;
	}

	.cal-weekday {
		text-align: center;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-text-muted);
		text-transform: uppercase;
		padding: 0.25rem 0;
	}

	.cal-empty {
		aspect-ratio: 1;
	}

	.cal-day {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		aspect-ratio: 1;
		border: none;
		background: none;
		border-radius: 50%;
		font-size: 0.8125rem;
		cursor: pointer;
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
		transition: background-color 0.1s;
	}

	.cal-day:hover:not(:disabled):not(.selected) {
		background: var(--color-bg);
	}

	.cal-day:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}

	.cal-day.past {
		color: var(--color-text-muted);
		opacity: 0.4;
		cursor: not-allowed;
	}

	.cal-day.today:not(.selected) {
		font-weight: 700;
		color: var(--color-accent);
	}

	.cal-day.selected {
		background: var(--color-accent);
		color: white;
		font-weight: 600;
	}

	.cal-day.range-edge {
		background: var(--color-accent);
		color: white;
	}

	.cal-day.selected:not(.range-edge) {
		background: var(--color-accent-subtle);
		color: var(--color-accent);
	}

	.cal-day.range-start {
		background: var(--color-accent);
		color: white;
	}

	.cal-hint {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-align: center;
	}
</style>
