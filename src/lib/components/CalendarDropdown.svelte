<script lang="ts">
	import { tick } from 'svelte';
	import { t } from '$lib/i18n';
	import type { CalendarEventData } from '$lib/utils';
	import { getGoogleCalendarUrl, getOutlookCalendarUrl, downloadICS } from '$lib/utils';
	import { CalendarPlus, ExternalLink, Download } from 'lucide-svelte';

	interface Props {
		event: CalendarEventData;
		/** Compact mode for card buttons (icon only trigger) */
		compact?: boolean;
	}

	let { event, compact = false }: Props = $props();

	let open = $state(false);
	let dropdownEl: HTMLDivElement | undefined = $state();
	let focusedIndex = -1;

	function getMenuItems(): HTMLElement[] {
		if (!dropdownEl) return [];
		return Array.from(dropdownEl.querySelectorAll<HTMLElement>('[role="menuitem"]'));
	}

	function focusItem(index: number) {
		const items = getMenuItems();
		if (items.length === 0) return;
		// Wrap around
		if (index < 0) index = items.length - 1;
		if (index >= items.length) index = 0;
		focusedIndex = index;
		items[focusedIndex]?.focus();
	}

	function toggle(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		open = !open;
	}

	function handleICS(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		downloadICS(event);
		open = false;
	}

	function handleLinkClick(e: MouseEvent) {
		e.stopPropagation();
		open = false;
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.calendar-dropdown')) {
			open = false;
		}
	}

	function handleEscapeKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
			// Return focus to the toggle button
			const btn = (e.currentTarget as HTMLElement).querySelector(
				'button[aria-haspopup]'
			) as HTMLElement;
			btn?.focus();
		}
	}

	function handleMenuKeydown(e: KeyboardEvent) {
		switch (e.key) {
			case 'ArrowDown': {
				e.preventDefault();
				focusItem(focusedIndex + 1);
				break;
			}
			case 'ArrowUp': {
				e.preventDefault();
				focusItem(focusedIndex - 1);
				break;
			}
			case 'Home': {
				e.preventDefault();
				focusItem(0);
				break;
			}
			case 'End': {
				e.preventDefault();
				const items = getMenuItems();
				focusItem(items.length - 1);
				break;
			}
			case 'Tab': {
				// Close menu but let focus leave naturally
				open = false;
				break;
			}
		}
	}

	// Focus the first menu item when menu opens
	$effect(() => {
		if (open) {
			tick().then(() => {
				focusedIndex = -1;
				focusItem(0);
			});
		}
	});

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside, true);
			return () => document.removeEventListener('click', handleClickOutside, true);
		}
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="calendar-dropdown relative" onkeydown={handleEscapeKeydown}>
	{#if compact}
		<button
			onclick={toggle}
			aria-label={$t('addToCalendar')}
			aria-expanded={open}
			aria-haspopup="true"
			class="rounded-full p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
		>
			<CalendarPlus size={18} />
		</button>
	{:else}
		<button
			onclick={toggle}
			aria-expanded={open}
			aria-haspopup="true"
			class="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-6 py-3 text-sm font-semibold transition-colors hover:bg-[var(--color-surface)]"
		>
			<CalendarPlus size={16} />
			{$t('addToCalendar')}
		</button>
	{/if}

	{#if open}
		<div
			bind:this={dropdownEl}
			role="menu"
			tabindex="-1"
			onkeydown={handleMenuKeydown}
			class="absolute {compact ? 'right-0' : 'left-0'} bottom-full mb-2 z-50 min-w-[200px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-1 shadow-lg"
		>
			<a
				href={getGoogleCalendarUrl(event)}
				target="_blank"
				rel="noopener noreferrer"
				role="menuitem"
				tabindex="-1"
				onclick={handleLinkClick}
				class="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface)]"
			>
				<ExternalLink size={16} class="flex-shrink-0 text-[var(--color-text-secondary)]" />
				{$t('googleCalendar')}
			</a>
			<a
				href={getOutlookCalendarUrl(event)}
				target="_blank"
				rel="noopener noreferrer"
				role="menuitem"
				tabindex="-1"
				onclick={handleLinkClick}
				class="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface)]"
			>
				<ExternalLink size={16} class="flex-shrink-0 text-[var(--color-text-secondary)]" />
				{$t('outlookCalendar')}
			</a>
			<button
				onclick={handleICS}
				role="menuitem"
				tabindex="-1"
				class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface)]"
			>
				<Download size={16} class="flex-shrink-0 text-[var(--color-text-secondary)]" />
				{$t('appleCalendar')}
			</button>
		</div>
	{/if}
</div>
