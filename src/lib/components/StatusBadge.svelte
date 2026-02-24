<script lang="ts">
	import type { BadgeType } from '$lib/types';
	import { t } from '$lib/i18n';
	import { Check, X, AlertTriangle, Ban, CalendarDays } from 'lucide-svelte';

	interface Props {
		type: BadgeType;
	}

	let { type }: Props = $props();

	const colorClasses: Record<BadgeType, string> = {
		today: 'bg-[var(--color-today)] text-white',
		free: 'bg-[var(--color-free)] text-white',
		soldout: 'bg-[var(--color-soldout)] text-white',
		lasttickets: 'bg-[var(--color-lasttickets-bg)] text-[var(--color-lasttickets-text)]',
		cancelled: 'bg-[var(--color-cancelled)] text-white'
	};

	const labelKeys: Record<BadgeType, string> = {
		today: 'todayBadge',
		free: 'freeBadge',
		soldout: 'soldOut',
		lasttickets: 'lastTickets',
		cancelled: 'cancelled'
	};

	const iconComponents: Partial<Record<BadgeType, typeof Check>> = {
		today: CalendarDays,
		free: Check,
		soldout: X,
		lasttickets: AlertTriangle,
		cancelled: Ban
	};
</script>

<span
	class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium {colorClasses[type]}"
	aria-label={$t(labelKeys[type])}
>
	{#if iconComponents[type]}
		{@const Icon = iconComponents[type]}
		<Icon size={12} strokeWidth={2} aria-hidden="true" />
	{/if}
	{$t(labelKeys[type])}
</span>
