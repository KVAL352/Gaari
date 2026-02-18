<script lang="ts">
	import type { Category } from '$lib/types';
	import { getCategoryColor, getCategoryIcon } from '$lib/utils';

	interface Props {
		category: Category;
	}

	let { category }: Props = $props();
</script>

<div
	class="flex h-full w-full items-center justify-center"
	style="background-color: {getCategoryColor(category)}"
>
	<span class="text-4xl" aria-hidden="true">{getCategoryIcon(category)}</span>
</div>
