<script lang="ts">
	import { enhance } from '$app/forms';
	import { lang, t } from '$lib/i18n';
	import { CATEGORIES, BYDELER } from '$lib/types';
	import { CATEGORY_HEX_COLORS } from '$lib/utils';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let status: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');

	const prefs = data.preferences;
	let selectedAudience = $state(prefs?.audience || '');
	let selectedCategories = $state<string[]>(prefs?.categories ? prefs.categories.split(',') : []);
	let selectedBydel = $state(prefs?.bydel || '');
	let selectedPrice = $state(prefs?.price || '');
	let selectedLang = $state(prefs?.lang || 'no');

	let categoriesValue = $derived(selectedCategories.join(','));

	const audienceOptions = [
		{ value: '', labelNo: 'Alle', labelEn: 'All' },
		{ value: 'family', labelNo: 'Familie', labelEn: 'Family' },
		{ value: 'voksen', labelNo: 'Voksen', labelEn: 'Adult' },
		{ value: 'student', labelNo: 'Student', labelEn: 'Student' },
		{ value: 'adult', labelNo: '18+', labelEn: '18+' },
		{ value: 'tourist', labelNo: 'Turist', labelEn: 'Tourist' }
	];

	const priceOptions = [
		{ value: '', labelNo: 'Alle priser', labelEn: 'All prices' },
		{ value: 'free', labelNo: 'Trolig gratis', labelEn: 'Likely free' },
		{ value: 'paid', labelNo: 'Koster penger', labelEn: 'Costs money' }
	];

	function toggleCategory(cat: string) {
		if (selectedCategories.includes(cat)) {
			selectedCategories = selectedCategories.filter(c => c !== cat);
		} else {
			selectedCategories = [...selectedCategories, cat];
		}
	}
</script>

<svelte:head>
	<title>{$t('nlPrefsTitle')} — Gåri</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="mx-auto max-w-xl px-4 py-12">
	<h1 class="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">{$t('nlPrefsTitle')}</h1>
	<p class="mb-8 text-[var(--color-text-secondary)]">{$t('nlPrefsDesc')}</p>

	{#if !data.email}
		<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 text-center">
			<p class="text-[var(--color-text-secondary)]">{$t('nlPrefsNoEmail')}</p>
		</div>
	{:else}
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				status = 'submitting';
				return async ({ result }) => {
					if (result.type === 'success') {
						status = 'success';
					} else {
						status = 'error';
					}
				};
			}}
		>
			<input type="hidden" name="email" value={data.email} />
			<input type="hidden" name="categories" value={categoriesValue} />

			<!-- Email (read-only) -->
			<div class="mb-6">
				<label class="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">E-post</label>
				<p class="rounded-md bg-[var(--color-bg-muted)] px-3 py-2 text-[var(--color-text-primary)]">{data.email}</p>
			</div>

			<!-- Language -->
			<fieldset class="mb-6">
				<legend class="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">{$t('nlPrefsLang')}</legend>
				<div class="flex gap-3">
					<label class="flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors {selectedLang === 'no' ? 'border-[var(--color-primary)] bg-red-50 font-medium' : 'border-[var(--color-border)]'}">
						<input type="radio" name="preference_lang" value="no" bind:group={selectedLang} class="sr-only" />
						Norsk
					</label>
					<label class="flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors {selectedLang === 'en' ? 'border-[var(--color-primary)] bg-red-50 font-medium' : 'border-[var(--color-border)]'}">
						<input type="radio" name="preference_lang" value="en" bind:group={selectedLang} class="sr-only" />
						English
					</label>
				</div>
			</fieldset>

			<!-- Audience -->
			<fieldset class="mb-6">
				<legend class="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">{$t('whoLabel')}</legend>
				<div class="flex flex-wrap gap-2">
					{#each audienceOptions as opt}
						<label class="flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm transition-colors {selectedAudience === opt.value ? 'border-[var(--color-primary)] bg-red-50 font-medium' : 'border-[var(--color-border)]'}">
							<input type="radio" name="audience" value={opt.value} bind:group={selectedAudience} class="sr-only" />
							{$lang === 'no' ? opt.labelNo : opt.labelEn}
						</label>
					{/each}
				</div>
			</fieldset>

			<!-- Categories -->
			<fieldset class="mb-6">
				<legend class="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">{$t('whatLabel')}</legend>
				<div class="flex flex-wrap gap-2">
					{#each CATEGORIES as cat}
						{@const selected = selectedCategories.includes(cat)}
						<button
							type="button"
							onclick={() => toggleCategory(cat)}
							class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors {selected ? 'border-[var(--color-primary)] bg-red-50 font-medium' : 'border-[var(--color-border)]'}"
						>
							<span class="inline-block h-2.5 w-2.5 rounded-full" style="background:{CATEGORY_HEX_COLORS[cat]}"></span>
							{$t(`cat.${cat}`)}
						</button>
					{/each}
				</div>
				<p class="mt-1 text-xs text-[var(--color-text-muted)]">
					{$lang === 'no' ? 'Ingen valgt = alle kategorier' : 'None selected = all categories'}
				</p>
			</fieldset>

			<!-- Bydel -->
			<fieldset class="mb-6">
				<legend class="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">{$t('whereLabel')}</legend>
				<select
					name="bydel"
					bind:value={selectedBydel}
					class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
					style="min-height:44px;"
				>
					<option value="">{$t('allAreas')}</option>
					{#each BYDELER as b}
						<option value={b}>{b}</option>
					{/each}
				</select>
			</fieldset>

			<!-- Price -->
			<fieldset class="mb-8">
				<legend class="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">{$t('priceLabel')}</legend>
				<div class="flex flex-wrap gap-2">
					{#each priceOptions as opt}
						<label class="flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm transition-colors {selectedPrice === opt.value ? 'border-[var(--color-primary)] bg-red-50 font-medium' : 'border-[var(--color-border)]'}">
							<input type="radio" name="price" value={opt.value} bind:group={selectedPrice} class="sr-only" />
							{$lang === 'no' ? opt.labelNo : opt.labelEn}
						</label>
					{/each}
				</div>
			</fieldset>

			<!-- Submit -->
			<button
				type="submit"
				disabled={status === 'submitting'}
				class="w-full rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
				style="min-height:44px;background:#C82D2D;"
			>
				{status === 'submitting'
					? ($lang === 'no' ? 'Lagrer...' : 'Saving...')
					: $t('nlPrefsSave')}
			</button>

			{#if status === 'success' || form?.success}
				<div class="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
					{$t('nlPrefsSaved')}
				</div>
			{/if}

			{#if status === 'error' || form?.error}
				<div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
					{$t('nlPrefsError')}
				</div>
			{/if}
		</form>
	{/if}
</main>
