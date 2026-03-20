<script lang="ts">
	import { page } from '$app/stores';

	let statusCode = $derived($page.status);
	let isNorwegian = $derived($page.url.pathname.startsWith('/en') ? false : true);
	let isEventPage = $derived($page.url.pathname.includes('/events/'));
	let lang = $derived(isNorwegian ? 'no' : 'en');

	let title = $derived(
		statusCode === 404
			? (isNorwegian ? 'Siden ble ikke funnet' : 'Page not found')
			: (isNorwegian ? 'Noe gikk galt' : 'Something went wrong')
	);

	let message = $derived(
		statusCode === 404 && isEventPage
			? (isNorwegian
				? 'Dette arrangementet er over eller fjernet. Her er noen alternativer:'
				: 'This event has ended or been removed. Here are some alternatives:')
			: statusCode === 404
				? (isNorwegian
					? 'Siden finnes ikke. Kanskje du leter etter noe av dette?'
					: 'Page not found. Perhaps you were looking for one of these?')
				: (isNorwegian
					? 'En uventet feil oppstod. Prøv igjen senere.'
					: 'An unexpected error occurred. Please try again later.')
	);

	let homePath = $derived(isNorwegian ? '/no' : '/en');
	let homeLabel = $derived(isNorwegian ? 'Se alle arrangementer' : 'See all events');

	const suggestions = [
		{ slug: 'denne-helgen', no: 'Denne helgen', en: 'This weekend' },
		{ slug: 'i-kveld', no: 'I kveld', en: 'Tonight' },
		{ slug: 'konserter', no: 'Konserter', en: 'Concerts' },
		{ slug: 'gratis', no: 'Gratis', en: 'Free events' },
	];
</script>

<svelte:head>
	<title>{statusCode} — Gåri</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
	<p class="mb-2 text-6xl font-bold text-[var(--color-text-muted)]">{statusCode}</p>
	<h1 class="mb-3 text-2xl font-bold">{title}</h1>
	<p class="mb-6 max-w-md text-[var(--color-text-secondary)]">{message}</p>
	{#if statusCode === 404}
	<div class="mb-8 flex flex-wrap justify-center gap-2">
		{#each suggestions as s (s.slug)}
			<a
				href="/{lang}/{s.slug}"
				class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
			>
				{isNorwegian ? s.no : s.en}
			</a>
		{/each}
	</div>
	{/if}
	<a
		href={homePath}
		class="inline-block rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
	>
		&larr; {homeLabel}
	</a>
</main>
