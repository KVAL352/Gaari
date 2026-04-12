<script lang="ts">
	import { lang, t } from '$lib/i18n';

	interface Props {
		/** Unique location id for analytics tracking */
		location?: string;
	}

	let { location = 'inline-grid' }: Props = $props();

	let status: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const formData = new FormData(form);
		status = 'submitting';
		try {
			const res = await fetch('/api/newsletter', { method: 'POST', body: formData });
			const data = await res.json();
			status = data.success ? 'success' : 'error';
			if (data.success && typeof window !== 'undefined' && window.umami) {
				umami.track('newsletter-signup', { location });
			}
		} catch {
			status = 'error';
		}
	}
</script>

<div class="my-2 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--funkis-red-subtle)] px-5 py-4">
	{#if status === 'success'}
		<p class="text-center text-sm font-medium text-[var(--funkis-green)]">
			{$lang === 'no' ? 'Takk! Du er p\u00e5meldt.' : 'Thanks! You\u2019re subscribed.'}
		</p>
	{:else}
		<form
			onsubmit={handleSubmit}
			class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
		>
			<input type="hidden" name="lang" value={$lang} />
			<p class="text-sm font-medium text-[var(--color-text-primary)]">
				{$lang === 'no' ? 'F\u00e5 disse oppdateringene rett i innboksen' : 'Get these updates straight to your inbox'}
			</p>
			<div class="flex gap-2">
				<label for="nl-inline-grid" class="sr-only">{$t('nlPlaceholder')}</label>
				<input
					type="email"
					name="email"
					id="nl-inline-grid"
					required
					autocomplete="email"
					placeholder={$t('nlPlaceholder')}
					class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm"
					style="height: 40px; min-width: 200px;"
				/>
				<button
					type="submit"
					disabled={status === 'submitting'}
					class="rounded-lg bg-[var(--funkis-red)] px-4 text-sm font-semibold text-white hover:bg-[var(--funkis-red-hover)] disabled:opacity-70"
					style="height: 40px;"
				>
					{$t('nlSubscribe')}
				</button>
			</div>
		</form>
		{#if status === 'error'}
			<p class="mt-2 text-center text-sm text-[var(--funkis-red)]" role="alert">
				{$lang === 'no' ? 'Noe gikk galt. Pr\u00f8v igjen.' : 'Something went wrong. Please try again.'}
			</p>
		{/if}
	{/if}
</div>
