<script lang="ts">
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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
			// Return focus to the toggle button
			const btn = (e.currentTarget as HTMLElement).querySelector('button') as HTMLElement;
			btn?.focus();
		}
	}

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside, true);
			return () => document.removeEventListener('click', handleClickOutside, true);
		}
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="calendar-dropdown relative" onkeydown={handleKeydown}>
	{#if compact}
		<button
			onclick={toggle}
			aria-label={$t('addToCalendar')}
			aria-expanded={open}
			class="rounded-full p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
		>
			<CalendarPlus size={18} />
		</button>
	{:else}
		<button
			onclick={toggle}
			aria-expanded={open}
			class="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-6 py-3 text-sm font-semibold transition-colors hover:bg-[var(--color-surface)]"
		>
			<CalendarPlus size={16} />
			{$t('addToCalendar')}
		</button>
	{/if}

	{#if open}
		<div
			role="menu"
			class="absolute {compact ? 'right-0' : 'left-0'} bottom-full mb-2 z-50 min-w-[200px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-1 shadow-lg"
		>
			<a
				href={getGoogleCalendarUrl(event)}
				target="_blank"
				rel="noopener noreferrer"
				role="menuitem"
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
				onclick={handleLinkClick}
				class="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface)]"
			>
				<ExternalLink size={16} class="flex-shrink-0 text-[var(--color-text-secondary)]" />
				{$t('outlookCalendar')}
			</a>
			<button
				onclick={handleICS}
				role="menuitem"
				class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface)]"
			>
				<Download size={16} class="flex-shrink-0 text-[var(--color-text-secondary)]" />
				{$t('appleCalendar')}
			</button>
		</div>
	{/if}
</div>
