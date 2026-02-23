<script lang="ts">
	import { page } from '$app/stores';

	let statusCode = $derived($page.status);
	let isNorwegian = $derived($page.url.pathname.startsWith('/en') ? false : true);

	let title = $derived(
		statusCode === 404
			? (isNorwegian ? 'Siden ble ikke funnet' : 'Page not found')
			: (isNorwegian ? 'Noe gikk galt' : 'Something went wrong')
	);

	let message = $derived(
		statusCode === 404
			? (isNorwegian
				? 'Arrangementet kan ha blitt fjernet eller lenken er feil.'
				: 'The event may have been removed or the link is incorrect.')
			: (isNorwegian
				? 'En uventet feil oppstod. Prøv igjen senere.'
				: 'An unexpected error occurred. Please try again later.')
	);

	let homePath = $derived(isNorwegian ? '/no' : '/en');
	let homeLabel = $derived(isNorwegian ? 'Tilbake til arrangementer' : 'Back to events');
</script>

<svelte:head>
	<title>{statusCode} — Gåri</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
	<p class="mb-2 text-6xl font-bold text-[var(--color-text-muted)]">{statusCode}</p>
	<h1 class="mb-3 text-2xl font-bold">{title}</h1>
	<p class="mb-8 max-w-md text-[var(--color-text-secondary)]">{message}</p>
	<a
		href={homePath}
		class="inline-block rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
	>
		&larr; {homeLabel}
	</a>
</div>
