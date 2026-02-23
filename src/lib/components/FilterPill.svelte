<script lang="ts">
	interface Props {
		label: string;
		selected: boolean;
		onclick: () => void;
		disabled?: boolean;
	}

	let { label, selected, onclick, disabled = false }: Props = $props();
</script>

<button
	type="button"
	aria-pressed={selected}
	{disabled}
	{onclick}
	class="filter-pill"
	class:selected
>
	{label}
</button>

<style>
	.filter-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0.5rem 1rem;
		border-radius: 9999px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-surface);
		color: var(--color-text-primary);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: border-color 0.15s, background-color 0.15s, color 0.15s;
		white-space: nowrap;
		user-select: none;
	}

	.filter-pill:hover:not(:disabled) {
		border-color: var(--color-border-strong);
	}

	.filter-pill:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.filter-pill.selected {
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
	}

	.filter-pill.selected:hover:not(:disabled) {
		background: var(--color-accent-hover);
		border-color: var(--color-accent-hover);
	}

	.filter-pill:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
