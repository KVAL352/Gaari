<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { lang, t } from '$lib/i18n';

	interface Props {
		variant?: 'card' | 'inline';
		/** Unique id suffix for email input — needed for label association when multiple forms on page */
		id: string;
		/** Override the default heading (bilingual object) */
		heading?: { no: string; en: string };
		/** Override the default subtext (bilingual object) */
		subtext?: { no: string; en: string };
	}

	let {
		variant = 'card',
		id,
		heading,
		subtext
	}: Props = $props();

	let displayHeading = $derived(heading ? heading[$lang] : $t('nlHeading'));
	let displaySubtext = $derived(subtext ? subtext[$lang] : $t('nlSubtext'));

	let status: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');

	let filterAudience = $derived(browser ? page.url.searchParams.get('audience') || '' : '');
	let filterCategory = $derived(browser ? page.url.searchParams.get('category') || '' : '');
	let filterBydel = $derived(browser ? page.url.searchParams.get('bydel') || '' : '');
	let filterPrice = $derived(browser ? page.url.searchParams.get('price') || '' : '');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const formData = new FormData(form);

		status = 'submitting';
		try {
			const res = await fetch('/api/newsletter', {
				method: 'POST',
				body: formData
			});
			const data = await res.json();
			status = data.success ? 'success' : 'error';
		} catch {
			status = 'error';
		}
	}

	let successMessage = $derived(
		$lang === 'no' ? 'Takk! Du er påmeldt.' : 'Thanks! You\'re subscribed.'
	);
	let errorMessage = $derived(
		$lang === 'no' ? 'Noe gikk galt. Prøv igjen.' : 'Something went wrong. Please try again.'
	);
</script>

{#if variant === 'card'}
	<div class="rounded-xl border border-[var(--color-border)] border-l-4 border-l-[var(--funkis-red)] bg-[var(--funkis-red-subtle)] p-6">
		<p class="text-lg font-semibold text-[var(--color-text-primary)]">{displayHeading}</p>
		<p class="mt-1 text-sm text-[var(--color-text-secondary)]">{displaySubtext}</p>

		{#if status === 'success'}
			<p class="mt-4 text-sm font-medium text-[var(--funkis-green)]">{successMessage}</p>
		{:else}
			<form
				action="/api/newsletter"
				method="post"
				onsubmit={handleSubmit}
				class="mt-4 flex max-w-md flex-col gap-2 sm:flex-row"
			>
				<label for="nl-{id}" class="sr-only">
					{$t('nlPlaceholder')}
				</label>
				<input type="hidden" name="lang" value={$lang} />
				{#if filterAudience}<input type="hidden" name="audience" value={filterAudience} />{/if}
				{#if filterCategory}<input type="hidden" name="categories" value={filterCategory} />{/if}
				{#if filterBydel}<input type="hidden" name="bydel" value={filterBydel} />{/if}
				{#if filterPrice}<input type="hidden" name="price" value={filterPrice} />{/if}
				<input
					type="email"
					name="email"
					id="nl-{id}"
					required
					autocomplete="email"
					placeholder={$t('nlPlaceholder')}
					class="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm"
					style="height: 44px;"
				/>
				<button
					type="submit"
					disabled={status === 'submitting'}
					class="rounded-lg bg-[var(--funkis-red)] px-5 text-sm font-semibold text-white hover:bg-[var(--funkis-red-hover)] disabled:opacity-70"
					style="height: 44px;"
				>
					{$t('nlSubscribe')}
				</button>
			</form>

			{#if status === 'error'}
				<p class="mt-2 text-sm text-[var(--funkis-red)]" role="alert">{errorMessage}</p>
			{/if}
		{/if}
	</div>
{:else}
	<!-- inline variant (footer) -->
	<p class="text-sm font-semibold text-[var(--color-text-primary)]">{displayHeading}</p>
	<p class="mt-1 text-sm text-[var(--color-text-secondary)]">{displaySubtext}</p>

	{#if status === 'success'}
		<p class="mt-3 text-sm font-medium text-[var(--funkis-green)]">{successMessage}</p>
	{:else}
		<form
			action="/api/newsletter"
			method="post"
			onsubmit={handleSubmit}
			class="mx-auto mt-3 flex max-w-md flex-col gap-2 sm:flex-row"
		>
			<label for="nl-{id}" class="sr-only">
				{$t('nlPlaceholder')}
			</label>
			<input type="hidden" name="lang" value={$lang} />
			{#if filterAudience}<input type="hidden" name="audience" value={filterAudience} />{/if}
			{#if filterCategory}<input type="hidden" name="categories" value={filterCategory} />{/if}
			{#if filterBydel}<input type="hidden" name="bydel" value={filterBydel} />{/if}
			{#if filterPrice}<input type="hidden" name="price" value={filterPrice} />{/if}
			<input
				type="email"
				name="email"
				id="nl-{id}"
				required
				autocomplete="email"
				placeholder={$t('nlPlaceholder')}
				class="flex-1 rounded-lg border border-[var(--color-border)] px-3 text-sm"
				style="height: 44px;"
			/>
			<button
				type="submit"
				disabled={status === 'submitting'}
				class="rounded-lg bg-[var(--funkis-red)] px-5 text-sm font-semibold text-white hover:bg-[var(--funkis-red-hover)] disabled:opacity-70"
				style="height: 44px;"
			>
				{$t('nlSubscribe')}
			</button>
		</form>

		{#if status === 'error'}
			<p class="mt-2 text-center text-sm text-[var(--funkis-red)]" role="alert">{errorMessage}</p>
		{/if}
	{/if}
{/if}
