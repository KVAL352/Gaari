<script lang="ts">
	interface Props {
		label: string;
		selected: boolean;
		onclick: () => void;
		disabled?: boolean;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
		count?: number;
		sublabel?: string;
		color?: string;
		variant?: 'default' | 'category';
	}

	let {
		label,
		selected,
		onclick,
		disabled = false,
		icon,
		count,
		sublabel,
		color,
		variant = 'default'
	}: Props = $props();

	let isCategory = $derived(variant === 'category' && !!color);

	// Compute inline styles for category variant
	let pillStyle = $derived.by(() => {
		if (!isCategory) return '';
		if (selected) {
			return `background: ${color}; border-color: ${color}; color: var(--funkis-iron); box-shadow: 0 2px 8px ${color}40;`;
		}
		return '';
	});

	let pillHoverStyle = $derived.by(() => {
		if (!isCategory || selected) return '';
		return `${color}22`;
	});
</script>

<button
	type="button"
	aria-pressed={selected}
	{disabled}
	{onclick}
	class="filter-pill"
	class:selected
	class:has-sublabel={!!sublabel}
	class:category-variant={isCategory}
	class:category-selected={isCategory && selected}
	style={pillStyle}
	onmouseenter={(e) => {
		if (pillHoverStyle && !selected) {
			(e.currentTarget as HTMLElement).style.backgroundColor = pillHoverStyle;
			(e.currentTarget as HTMLElement).style.borderColor = color || '';
		}
	}}
	onmouseleave={(e) => {
		if (isCategory && !selected) {
			(e.currentTarget as HTMLElement).style.backgroundColor = '';
			(e.currentTarget as HTMLElement).style.borderColor = '';
		}
	}}
>
	{#if isCategory && !selected}
		<span class="color-dot" style="background: {color}"></span>
	{/if}
	{#if icon}
		{@const Icon = icon}
		<span class="pill-icon"><Icon size={14} strokeWidth={1.5} /></span>
	{/if}
	<span class="pill-content">
		<span class="pill-label">
			{label}
			{#if count !== undefined}
				<span class="pill-count">{count}</span>
			{/if}
		</span>
		{#if sublabel}
			<span class="pill-sublabel">{sublabel}</span>
		{/if}
	</span>
</button>

<style>
	.filter-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 44px;
		padding: 0.5rem 1rem;
		border-radius: 9999px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-surface);
		color: var(--color-text-primary);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.18s ease;
		white-space: nowrap;
		user-select: none;
	}

	.filter-pill.has-sublabel {
		padding: 0.375rem 1rem;
	}

	.filter-pill:hover:not(:disabled):not(.selected) {
		transform: translateY(-1px);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
		border-color: var(--color-border);
		color: var(--color-text-primary);
	}

	.filter-pill.selected {
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
	}

	.filter-pill.selected:hover:not(:disabled) {
		background: var(--color-accent-hover);
		border-color: var(--color-accent-hover);
	}

	/* Category variant overrides — selected state uses inline styles for bg/border/color */
	.filter-pill.category-selected {
		background: unset;
		border-color: unset;
		color: unset;
	}

	.filter-pill.category-selected:hover:not(:disabled) {
		background: unset;
		border-color: unset;
		filter: brightness(0.95);
	}

	.filter-pill:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.filter-pill:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.color-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.pill-icon {
		font-size: 0.875rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.pill-content {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		line-height: 1.2;
	}

	.pill-label {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.pill-count {
		font-size: 11px;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
		font-weight: 400;
	}

	.filter-pill.selected .pill-count {
		color: rgba(255, 255, 255, 0.8);
	}

	.filter-pill.category-selected .pill-count {
		color: var(--funkis-iron);
		opacity: 0.7;
	}

	.pill-sublabel {
		font-size: 11px;
		font-weight: 400;
		color: var(--color-text-muted);
	}

	.filter-pill.selected .pill-sublabel {
		color: rgba(255, 255, 255, 0.7);
	}
</style>
