<script lang="ts">
	import { page } from '$app/stores';
	import { lang, t } from '$lib/i18n';
	import { CATEGORIES, BYDELER } from '$lib/types';
	import { getCanonicalUrl } from '$lib/seo';
	import { supabase } from '$lib/supabase';
	import { slugify } from '$lib/utils';
	import { Upload, AlertTriangle, CalendarPlus, Globe } from 'lucide-svelte';

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/submit`));

	// Which form to show: null = choice screen, 'event' = single event, 'website' = website form
	let mode = $state<'event' | 'website' | null>(null);

	// Event form state
	let submitted = $state(false);
	let submitting = $state(false);
	let submitError = $state('');
	let imagePreview = $state('');
	let imageWarning = $state('');
	let processedBlob = $state<Blob | null>(null);

	// Website form state
	let websiteSubmitted = $state(false);
	let websiteSubmitting = $state(false);
	let websiteError = $state('');

	function goBack() {
		mode = null;
		submitError = '';
		websiteError = '';
	}

	function isFacebookUrl(url: string): boolean {
		try {
			const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
			return hostname === 'facebook.com' || hostname === 'fb.com' || hostname.endsWith('.facebook.com');
		} catch {
			return /facebook\.com|fb\.com/i.test(url);
		}
	}

	function normalizeUrl(url: string): string | null {
		if (!url) return null;
		url = url.trim();
		if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
			url = 'https://' + url;
		}
		return url;
	}

	function processImage(file: File): Promise<{ blob: Blob; warning: string }> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				let warning = '';
				const w = img.naturalWidth;
				const h = img.naturalHeight;

				// Check minimum width
				if (w < 800) {
					reject(new Error($lang === 'no'
						? `Bildet er for lite (${w}px bredt). Minimum 800px bredde.`
						: `Image is too small (${w}px wide). Minimum 800px width.`));
					return;
				}

				// Aspect ratio check
				const ratio = w / h;
				if (ratio < 1.2) {
					warning = $lang === 'no'
						? 'Tips: Liggende format (16:9) ser best ut på siden.'
						: 'Tip: Landscape format (16:9) looks best on the site.';
				}

				// Resize if wider than 1200px
				const maxWidth = 1200;
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d')!;

				if (w > maxWidth) {
					const scale = maxWidth / w;
					canvas.width = maxWidth;
					canvas.height = Math.round(h * scale);
				} else {
					canvas.width = w;
					canvas.height = h;
				}

				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

				canvas.toBlob(
					(blob) => {
						if (blob) {
							resolve({ blob, warning });
						} else {
							reject(new Error('Failed to process image'));
						}
					},
					'image/jpeg',
					0.85
				);
			};
			img.onerror = () => reject(new Error('Failed to load image'));
			img.src = URL.createObjectURL(file);
		});
	}

	async function handleImageSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		submitError = '';
		imageWarning = '';

		// Max 5MB raw
		if (file.size > 5 * 1024 * 1024) {
			submitError = $lang === 'no'
				? 'Bildet er for stort. Maks 5 MB.'
				: 'Image is too large. Max 5 MB.';
			input.value = '';
			return;
		}

		try {
			const { blob, warning } = await processImage(file);
			processedBlob = blob;
			imageWarning = warning;
			if (imagePreview) URL.revokeObjectURL(imagePreview);
			imagePreview = URL.createObjectURL(blob);
		} catch (err: unknown) {
			submitError = err instanceof Error ? err.message : 'Failed to process image';
			input.value = '';
		}
	}

	function removeImage() {
		processedBlob = null;
		imageWarning = '';
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		imagePreview = '';
	}

	async function uploadImage(slug: string): Promise<string | null> {
		if (!processedBlob) return null;

		const path = `events/${slug}.jpg`;

		const { error } = await supabase.storage
			.from('event-images')
			.upload(path, processedBlob, {
				contentType: 'image/jpeg',
				upsert: true
			});

		if (error) return null;

		const { data } = supabase.storage
			.from('event-images')
			.getPublicUrl(path);

		return data.publicUrl;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		submitError = '';

		const form = e.target as HTMLFormElement;
		const fd = new FormData(form);

		const titleNo = fd.get('title-no') as string;
		const slug = slugify(titleNo) + '-' + Date.now().toString(36);

		// Combine date + time
		const startDate = fd.get('date-start') as string;
		const startTime = (fd.get('time-start') as string) || '12:00';
		const endDate = fd.get('date-end') as string;
		const endTime = fd.get('time-end') as string;

		const dateStart = startDate ? `${startDate}T${startTime}` : null;
		const dateEnd = (endDate && endTime) ? `${endDate}T${endTime}` : null;

		if (!dateStart) {
			submitError = $lang === 'no' ? 'Startdato er påkrevd.' : 'Start date is required.';
			submitting = false;
			return;
		}

		// Upload image if provided
		let imageUrl = await uploadImage(slug);

		const submitterEmail = (fd.get('submitter-email') as string)?.trim() || null;

		const { error } = await supabase.from('events').insert({
			slug,
			title_no: titleNo,
			title_en: (fd.get('title-en') as string) || null,
			category: fd.get('category') as string,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: fd.get('venue') as string,
			address: fd.get('address') as string,
			bydel: fd.get('bydel') as string,
			price: (fd.get('price') as string) || '0',
			description_no: fd.get('desc-no') as string,
			description_en: (fd.get('desc-en') as string) || null,
			ticket_url: normalizeUrl(fd.get('ticket-url') as string),
			image_url: imageUrl,
			submitter_email: submitterEmail,
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

		fetch('/api/notify-submission', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'event',
				title: titleNo,
				venue: fd.get('venue') as string,
				dateStart,
				ticketUrl: normalizeUrl(fd.get('ticket-url') as string),
				submitterEmail
			})
		}).catch(() => {});

		submitted = true;
	}

	async function handleWebsiteSubmit(e: SubmitEvent) {
		e.preventDefault();
		websiteSubmitting = true;
		websiteError = '';

		const form = e.target as HTMLFormElement;
		const fd = new FormData(form);

		let url = (fd.get('website-url') as string).trim();
		if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
			url = 'https://' + url;
		}

		if (isFacebookUrl(url)) {
			websiteError = $lang === 'no'
				? 'Vi kan dessverre ikke hente arrangementer fra Facebook. Du kan i stedet legge inn arrangementer enkeltvis — gå tilbake og velg «Enkeltarrangement».'
				: 'Unfortunately we cannot import events from Facebook. You can add events individually instead — go back and choose "Single event".';
			websiteSubmitting = false;
			return;
		}

		const name = (fd.get('contact-name') as string).trim();
		const email = (fd.get('contact-email') as string).trim();
		const note = (fd.get('website-note') as string)?.trim() || '';

		const message = note
			? `Nettside-innsendelse\n\n${note}`
			: 'Nettside-innsendelse';

		const { error } = await supabase.from('organizer_inquiries').insert({
			name,
			organization: url,
			email,
			message
		});

		websiteSubmitting = false;

		if (error) {
			websiteError = $lang === 'no'
				? 'Noe gikk galt. Prøv igjen.'
				: 'Something went wrong. Please try again.';
			return;
		}

		fetch('/api/notify-submission', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'website',
				name,
				organization: url,
				email,
				message
			})
		}).catch(() => {});

		websiteSubmitted = true;
	}
</script>

<svelte:head>
	<title>{$t('submitTitle')} — Gåri</title>
	<meta name="description" content={$t('submitDescription')} />
	<meta name="robots" content="noindex, nofollow" />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content={`${$t('submitTitle')} — Gåri`} />
	<meta property="og:description" content={$t('submitDescription')} />
	<meta property="og:image" content={`${$page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={`${$t('submitTitle')} — Gåri`} />
	<meta name="twitter:description" content={$t('submitDescription')} />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">

	{#if mode === null && !submitted && !websiteSubmitted}
		<!-- Choice screen -->
		<p class="mb-8 text-sm text-[var(--color-text-secondary)]">
			{$t('submitDescription')}
		</p>

		<div class="grid gap-4 sm:grid-cols-2">
			<button
				onclick={() => mode = 'event'}
				class="group flex flex-col items-center gap-3 rounded-2xl border-2 border-[var(--color-border)] p-8 text-center transition-all hover:border-[var(--color-accent)] hover:shadow-md"
			>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] transition-colors group-hover:bg-[var(--color-accent)]/20">
					<CalendarPlus size={24} />
				</div>
				<span class="text-lg font-semibold">{$t('submitChoiceSingle')}</span>
				<span class="text-sm text-[var(--color-text-secondary)]">{$t('submitChoiceSingleDesc')}</span>
			</button>

			<button
				onclick={() => mode = 'website'}
				class="group flex flex-col items-center gap-3 rounded-2xl border-2 border-[var(--color-border)] p-8 text-center transition-all hover:border-[var(--color-accent)] hover:shadow-md"
			>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] transition-colors group-hover:bg-[var(--color-accent)]/20">
					<Globe size={24} />
				</div>
				<span class="text-lg font-semibold">{$t('submitChoiceWebsite')}</span>
				<span class="text-sm text-[var(--color-text-secondary)]">{$t('submitChoiceWebsiteDesc')}</span>
			</button>
		</div>

	{:else if mode === 'website' && !websiteSubmitted}
		<!-- Website form -->
		<button
			onclick={goBack}
			class="mb-6 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
		>
			← {$t('back')}
		</button>

		<h2 class="mb-2 text-xl font-bold">{$t('submitChoiceWebsite')}</h2>
		<p class="mb-8 text-sm text-[var(--color-text-secondary)]">
			{$t('submitChoiceWebsiteDesc')}
		</p>

		<form onsubmit={handleWebsiteSubmit} class="space-y-6">
			<div>
				<label for="website-url" class="mb-1 block text-sm font-medium">{$t('websiteUrl')} *</label>
				<input id="website-url" name="website-url" type="text" required aria-required="true"
					placeholder={$t('websiteUrlPlaceholder')}
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
			</div>

			<div>
				<label for="contact-name" class="mb-1 block text-sm font-medium">{$t('contactName')} *</label>
				<input id="contact-name" name="contact-name" type="text" required aria-required="true"
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
			</div>

			<div>
				<label for="contact-email" class="mb-1 block text-sm font-medium">{$t('contactEmail')} *</label>
				<input id="contact-email" name="contact-email" type="email" required aria-required="true"
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
			</div>

			<div>
				<label for="website-note" class="mb-1 block text-sm font-medium">{$t('websiteNote')}</label>
				<textarea id="website-note" name="website-note" rows="3"
					placeholder={$t('websiteNotePlaceholder')}
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20"></textarea>
			</div>

			<p class="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
				<AlertTriangle size={16} class="shrink-0" />
				{$t('websiteNoFacebook')}
			</p>

			{#if websiteError}
				<p class="text-sm text-red-600" role="alert">{websiteError}</p>
			{/if}

			<button
				type="submit"
				disabled={websiteSubmitting}
				class="w-full rounded-xl bg-[var(--color-accent)] py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-70"
			>
				{websiteSubmitting ? ($lang === 'no' ? 'Sender inn...' : 'Submitting...') : $t('submit')}
			</button>
		</form>

	{:else if websiteSubmitted}
		<!-- Website success -->
		<div class="rounded-2xl bg-[var(--color-accent)] p-8 text-center text-white shadow-lg">
			<p class="text-2xl font-bold">
				{$lang === 'no' ? 'Takk!' : 'Thank you!'}
			</p>
			<p class="mt-2 text-white/85">
				{$t('websiteSubmitted')}
			</p>
			<a href="/{$lang}" class="mt-6 inline-block rounded-full bg-[var(--color-bg-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-surface)]">
				← {$lang === 'no' ? 'Tilbake til arrangementer' : 'Back to events'}
			</a>
		</div>

	{:else if submitted}
		<!-- Event success -->
		<div class="rounded-2xl bg-[var(--color-accent)] p-8 text-center text-white shadow-lg">
			<p class="text-2xl font-bold">
				{$lang === 'no' ? 'Takk!' : 'Thank you!'}
			</p>
			<p class="mt-2 text-white/85">
				{$lang === 'no' ? 'Arrangementet ditt er sendt inn til gjennomgang.' : 'Your event has been submitted for review.'}
			</p>
			<a href="/{$lang}" class="mt-6 inline-block rounded-full bg-[var(--color-bg-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-surface)]">
				← {$lang === 'no' ? 'Tilbake til arrangementer' : 'Back to events'}
			</a>
		</div>

	{:else}
		<!-- Single event form -->
		<button
			onclick={goBack}
			class="mb-6 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
		>
			← {$t('back')}
		</button>

		<p class="mb-8 text-sm text-[var(--color-text-secondary)]">
			{$lang === 'no' ? 'Alle innsendte arrangementer gjennomgås før publisering.' : 'All submitted events are reviewed before publishing.'}
		</p>

		<form onsubmit={handleSubmit} class="space-y-6">
			<!-- Title NO -->
			<div>
				<label for="title-no" class="mb-1 block text-sm font-medium">{$t('titleNo')} *</label>
				<input id="title-no" name="title-no" type="text" required aria-required="true"
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
			</div>

			<!-- Title EN -->
			<div>
				<label for="title-en" class="mb-1 block text-sm font-medium">{$t('titleEn')}</label>
				<input id="title-en" name="title-en" type="text"
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
			</div>

			<!-- Category -->
			<div>
				<label for="category" class="mb-1 block text-sm font-medium">{$t('category')} *</label>
				<select id="category" name="category" required aria-required="true"
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
					{#each CATEGORIES as cat (cat)}
						<option value={cat}>{$t(`cat.${cat}` )}</option>
					{/each}
				</select>
			</div>

			<!-- Start date + time -->
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="date-start" class="mb-1 block text-sm font-medium">{$t('startDate')} *</label>
					<input id="date-start" name="date-start" type="date" required aria-required="true"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
				</div>
				<div>
					<label for="time-start" class="mb-1 block text-sm font-medium">{$lang === 'no' ? 'Klokkeslett start' : 'Start time'} *</label>
					<input id="time-start" name="time-start" type="time" required aria-required="true" value="19:00"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
				</div>
			</div>

			<!-- End date + time -->
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="date-end" class="mb-1 block text-sm font-medium">{$t('endDate')}</label>
					<input id="date-end" name="date-end" type="date"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
				</div>
				<div>
					<label for="time-end" class="mb-1 block text-sm font-medium">{$lang === 'no' ? 'Klokkeslett slutt' : 'End time'}</label>
					<input id="time-end" name="time-end" type="time"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
				</div>
			</div>

			<!-- Venue + Address -->
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="venue" class="mb-1 block text-sm font-medium">{$t('venueName')} *</label>
					<input id="venue" name="venue" type="text" required aria-required="true"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
				</div>
				<div>
					<label for="address" class="mb-1 block text-sm font-medium">{$t('address')} *</label>
					<input id="address" name="address" type="text" required aria-required="true"
						class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
				</div>
			</div>

			<!-- Bydel -->
			<div>
				<label for="bydel" class="mb-1 block text-sm font-medium">{$t('bydel')} *</label>
				<select id="bydel" name="bydel" required aria-required="true"
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
					{#each BYDELER as b (b)}
						<option value={b}>{b}</option>
					{/each}
				</select>
			</div>

			<!-- Price -->
			<div>
				<label for="price" class="mb-1 block text-sm font-medium">{$t('priceLabel')}</label>
				<input id="price" name="price" type="text" placeholder={$lang === 'no' ? '0 = gratis' : '0 = free'}
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
			</div>

			<!-- Descriptions -->
			<div>
				<label for="desc-no" class="mb-1 block text-sm font-medium">{$t('descriptionNo')} *</label>
				<textarea id="desc-no" name="desc-no" rows="4" required aria-required="true"
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20"></textarea>
			</div>
			<div>
				<label for="desc-en" class="mb-1 block text-sm font-medium">{$t('descriptionEn')}</label>
				<textarea id="desc-en" name="desc-en" rows="4"
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20"></textarea>
			</div>

			<!-- Ticket URL -->
			<div>
				<label for="ticket-url" class="mb-1 block text-sm font-medium">{$t('ticketUrl')}</label>
				<input id="ticket-url" name="ticket-url" type="text" placeholder={$lang === 'no' ? 'grieghallen.no/billetter' : 'ticketmaster.no/event'}
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
			</div>

			<!-- Submitter email -->
			<div>
				<label for="submitter-email" class="mb-1 block text-sm font-medium">{$t('submitterEmail')}</label>
				<input id="submitter-email" name="submitter-email" type="email" placeholder={$t('submitterEmailPlaceholder')}
					class="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus-visible:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]/20" />
			</div>

			<!-- Image upload -->
			<div>
				<p class="mb-1 block text-sm font-medium">
					{$lang === 'no' ? 'Bilde (valgfritt)' : 'Image (optional)'}
				</p>
				<p class="mb-2 text-xs text-[var(--color-text-muted)]">
					{$lang === 'no' ? 'Anbefalt: liggende format (16:9). Min 800px bredde, maks 5 MB. Bilder skaleres automatisk.' : 'Recommended: landscape (16:9). Min 800px wide, max 5 MB. Images are auto-resized.'}
				</p>
				{#if imagePreview}
					<div class="relative mb-2">
						<img src={imagePreview} alt="" width="800" height="450" class="aspect-[16/9] w-full rounded-lg object-cover" />
						<button
							type="button"
							onclick={removeImage}
							class="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
						>
							{$lang === 'no' ? 'Fjern' : 'Remove'}
						</button>
					</div>
					{#if imageWarning}
						<p class="flex items-center gap-1 text-xs text-amber-600">
							<AlertTriangle size={14} />
							{imageWarning}
						</p>
					{/if}
				{:else}
					<label
						class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[var(--color-border)] p-6 text-center transition-colors hover:border-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
					>
						<Upload size={24} class="text-[var(--color-text-muted)]" />
						<span class="text-sm text-[var(--color-text-secondary)]">
							{$lang === 'no' ? 'Klikk for å laste opp bilde' : 'Click to upload image'}
						</span>
						<span class="text-xs text-[var(--color-text-muted)]">JPG, PNG, WebP — maks 5 MB</span>
						<input
							type="file"
							accept="image/jpeg,image/png,image/webp"
							onchange={handleImageSelect}
							class="hidden"
						/>
					</label>
				{/if}
			</div>

			{#if submitError}
				<p class="text-sm text-red-600" role="alert">{submitError}</p>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="w-full rounded-xl bg-[var(--color-accent)] py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-70"
			>
				{submitting ? ($lang === 'no' ? 'Sender inn...' : 'Submitting...') : $t('submit')}
			</button>
		</form>
	{/if}
</div>
