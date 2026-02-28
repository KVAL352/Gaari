<script lang="ts">
	import { page } from '$app/state';

	let open = $state(false);

	const links = [
		{ href: '/admin/calendar', label: 'Kalender' },
		{ href: '/admin/promotions', label: 'Plasseringer' },
		{ href: '/admin/submissions', label: 'Arrangementer' },
		{ href: '/admin/innsendelser', label: 'Innsendelser' },
		{ href: '/admin/corrections', label: 'Rettelser' },
		{ href: '/admin/optouts', label: 'Opt-outs' },
		{ href: '/admin/social', label: 'Social' },
		{ href: '/admin/logout', label: 'Logg ut' }
	];

	function isCurrent(href: string): boolean {
		return page.url.pathname === href;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<nav style="position: relative;">
	<button
		onclick={() => { open = !open; }}
		aria-label={open ? 'Lukk meny' : 'Åpne meny'}
		aria-expanded={open}
		style="
			width: 44px; height: 44px; border-radius: 8px;
			border: 1px solid #e5e5e5; background: #fff;
			cursor: pointer; display: flex; align-items: center; justify-content: center;
			flex-direction: column; gap: 4px; padding: 0;
		"
	>
		<span style="display: block; width: 18px; height: 2px; background: #737373; border-radius: 1px; transition: transform 0.2s, opacity 0.2s; {open ? 'transform: translateY(6px) rotate(45deg);' : ''}"></span>
		<span style="display: block; width: 18px; height: 2px; background: #737373; border-radius: 1px; transition: opacity 0.2s; {open ? 'opacity: 0;' : ''}"></span>
		<span style="display: block; width: 18px; height: 2px; background: #737373; border-radius: 1px; transition: transform 0.2s, opacity 0.2s; {open ? 'transform: translateY(-6px) rotate(-45deg);' : ''}"></span>
	</button>

	{#if open}
	<!-- Backdrop -->
	<button
		onclick={() => { open = false; }}
		aria-label="Lukk meny"
		style="position: fixed; inset: 0; background: transparent; border: none; cursor: default; z-index: 99;"
	></button>

	<!-- Dropdown -->
	<div style="
		position: absolute; top: 52px; right: 0; z-index: 100;
		background: #fff; border: 1px solid #e5e5e5; border-radius: 12px;
		box-shadow: 0 4px 24px rgba(0,0,0,0.1); min-width: 200px;
		padding: 8px 0; overflow: hidden;
	">
		{#each links as link (link.href)}
		{#if link.href === '/admin/logout'}
		<div style="border-top: 1px solid #e5e5e5; margin: 4px 0;"></div>
		{/if}
		<a
			href={link.href}
			onclick={() => { open = false; }}
			style="
				display: block; padding: 10px 16px;
				font-size: 14px; text-decoration: none;
				color: {isCurrent(link.href) ? '#C82D2D' : '#141414'};
				font-weight: {isCurrent(link.href) ? '600' : '400'};
				background: {isCurrent(link.href) ? '#FEF2F2' : 'transparent'};
			"
			aria-current={isCurrent(link.href) ? 'page' : undefined}
		>
			{link.label}
		</a>
		{/each}
	</div>
	{/if}
</nav>
