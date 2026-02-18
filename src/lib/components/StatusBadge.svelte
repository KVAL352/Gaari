<script lang="ts">
	import type { BadgeType, Lang } from '$lib/types';
	import { t } from '$lib/i18n';

	interface Props {
		type: BadgeType;
	}

	let { type }: Props = $props();

	const icons: Record<BadgeType, string> = {
		today: '📅',
		free: '✓',
		soldout: '✕',
		lasttickets: '⚠',
		cancelled: '🚫'
	};

	const colorClasses: Record<BadgeType, string> = {
		today: 'bg-blue-600 text-white',
		free: 'bg-green-600 text-white',
		soldout: 'bg-red-600 text-white',
		lasttickets: 'bg-orange-600 text-white',
		cancelled: 'bg-gray-500 text-white'
	};

	const labelKeys: Record<BadgeType, string> = {
		today: 'todayBadge',
		free: 'freeBadge',
		soldout: 'soldOut',
		lasttickets: 'lastTickets',
		cancelled: 'cancelled'
	};
</script>

<span
	class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium {colorClasses[type]}"
	aria-label={$t(labelKeys[type] as any)}
>
	<span aria-hidden="true">{icons[type]}</span>
	{$t(labelKeys[type] as any)}
</span>
