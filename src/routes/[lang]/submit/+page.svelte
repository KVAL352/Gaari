<script lang="ts">
	import { lang, t } from '$lib/i18n';
	import { CATEGORIES, BYDELER } from '$lib/types';
	import { supabase } from '$lib/supabase';
	import { slugify } from '$lib/utils';

	let submitted = $state(false);
	let submitting = $state(false);
	let submitError = $state('');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		submitError = '';

		const form = e.target as HTMLFormElement;
		const fd = new FormData(form);

		const titleNo = fd.get('title-no') as string;
		const slug = slugify(titleNo) + '-' + Date.now().toString(36);

		const { error } = await supabase.from('events').insert({
			slug,
			title_no: titleNo,
			title_en: (fd.get('title-en') as string) || null,
			category: fd.get('category') as string,
			date_start: fd.get('date-start') as string,
			date_end: (fd.get('date-end') as string) || null,
			venue_name: fd.get('venue') as string,
			address: fd.get('address') as string,
			bydel: fd.get('bydel') as string,
			price: (fd.get('price') as string) || '0',
			description_no: fd.get('desc-no') as string,
			description_en: (fd.get('desc-en') as string) || null,
			ticket_url: (fd.get('ticket-url') as string) || null,
			image_url: (fd.get('image-url') as string) || null,
			age_group: 'all',
			language: 'both',
			status: 'pending'
		});

		submitting = false;

		if (error) {
			submitError = $lang === 'no'
				? 'Noe gikk galt. Prøv igjen.'
				: 'Something went wrong. Please try again.';
			return;
		}

		submitted = true;
	}
</script>

<svelte:head>
	<title>{$t('submitTitle')} — Gåri</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">{$t('submitTitle')}</h1>
	<p class="mb-8 text-[var(--color-text-secondary)]">{$t('submitDescription')}</p>

	{#if submitted}
		<div class="rounded-xl bg-[var(--funkis-green-subtle)] p-6 text-center">
			<p class="text-lg font-semibold text-green-800">
				{$lang === 'no' ? 'Takk! Arrangementet ditt er sendt inn til gjennomgang.' : 'Thank you! Your event has been submitted for review.'}
			</p>
			<a href="/{$lang}" class="mt-4 inline-block text-sm text-[var(--color-text-primary)] hover:underline">
				← {$t('explore')}
			</a>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="space-y-6">
			<!-- Title NO -->
			<div>
				<label for="title-no" class="mb-1 block text-sm font-medium">{$t('titleNo')} *</label>
				<input id="title-no" name="title-no" type="text" required
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20" />
			</div>

			<!-- Title EN -->
			<div>
				<label for="title-en" class="mb-1 block text-sm font-medium">{$t('titleEn')}</label>
				<input id="title-en" name="title-en" type="text"
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20" />
			</div>

			<!-- Category -->
			<div>
				<label for="category" class="mb-1 block text-sm font-medium">{$t('category')} *</label>
				<select id="category" name="category" required
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
					{#each CATEGORIES as cat}
						<option value={cat}>{$t(`cat.${cat}` as any)}</option>
					{/each}
				</select>
			</div>

			<!-- Dates -->
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="date-start" class="mb-1 block text-sm font-medium">{$t('startDate')} *</label>
					<input id="date-start" name="date-start" type="datetime-local" required
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20" />
				</div>
				<div>
					<label for="date-end" class="mb-1 block text-sm font-medium">{$t('endDate')}</label>
					<input id="date-end" name="date-end" type="datetime-local"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20" />
				</div>
			</div>

			<!-- Venue + Address -->
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="venue" class="mb-1 block text-sm font-medium">{$t('venueName')} *</label>
					<input id="venue" name="venue" type="text" required
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20" />
				</div>
				<div>
					<label for="address" class="mb-1 block text-sm font-medium">{$t('address')} *</label>
					<input id="address" name="address" type="text" required
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20" />
				</div>
			</div>

			<!-- Bydel -->
			<div>
				<label for="bydel" class="mb-1 block text-sm font-medium">{$t('bydel')} *</label>
				<select id="bydel" name="bydel" required
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
					{#each BYDELER as b}
						<option value={b}>{b}</option>
					{/each}
				</select>
			</div>

			<!-- Price -->
			<div>
				<label for="price" class="mb-1 block text-sm font-medium">{$t('priceLabel')}</label>
				<input id="price" name="price" type="text" placeholder={$lang === 'no' ? '0 = gratis' : '0 = free'}
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20" />
			</div>

			<!-- Descriptions -->
			<div>
				<label for="desc-no" class="mb-1 block text-sm font-medium">{$t('descriptionNo')} *</label>
				<textarea id="desc-no" name="desc-no" rows="4" required
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20"></textarea>
			</div>
			<div>
				<label for="desc-en" class="mb-1 block text-sm font-medium">{$t('descriptionEn')}</label>
				<textarea id="desc-en" name="desc-en" rows="4"
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20"></textarea>
			</div>

			<!-- URLs -->
			<div>
				<label for="ticket-url" class="mb-1 block text-sm font-medium">{$t('ticketUrl')}</label>
				<input id="ticket-url" name="ticket-url" type="url"
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20" />
			</div>
			<div>
				<label for="image-url" class="mb-1 block text-sm font-medium">{$t('imageUrl')}</label>
				<input id="image-url" name="image-url" type="url"
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20" />
			</div>

			{#if submitError}
				<p class="text-sm text-red-600">{submitError}</p>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="w-full rounded-xl bg-[var(--color-accent)] py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
			>
				{submitting ? ($lang === 'no' ? 'Sender inn...' : 'Submitting...') : $t('submit')}
			</button>
		</form>
	{/if}
</div>
