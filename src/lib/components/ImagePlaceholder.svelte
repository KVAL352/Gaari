<script lang="ts">
	import type { Category } from '$lib/types';
	import { getCategoryColor } from '$lib/utils';
	import {
		Music, Palette, Drama, Users, UtensilsCrossed,
		PartyPopper, Dumbbell, Moon, BookOpen, GraduationCap, Map
	} from 'lucide-svelte';

	interface Props {
		category: Category;
		size?: number;
	}

	let { category, size = 48 }: Props = $props();

	const iconMap: Record<Category, typeof Music> = {
		music: Music,
		culture: Palette,
		theatre: Drama,
		family: Users,
		food: UtensilsCrossed,
		festival: PartyPopper,
		sports: Dumbbell,
		nightlife: Moon,
		workshop: BookOpen,
		student: GraduationCap,
		tours: Map
	};

	let IconComponent = $derived(iconMap[category] || Music);
	let bgColor = $derived(getCategoryColor(category));
</script>

<div
	class="flex h-full w-full items-center justify-center"
	style="background-color: {bgColor}"
	aria-hidden="true"
>
	<IconComponent {size} strokeWidth={1.5} color="var(--color-text-primary)" />
</div>
