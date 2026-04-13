<script lang="ts">
	import { lang, t } from '$lib/i18n';
	import type { GaariEvent } from '$lib/types';
	import { optimizedSrc } from '$lib/image';
	import { SOURCE_COUNT } from '$lib/constants';

	interface Props {
		/** Sample events to show as a preview collage in the hero area */
		sampleEvents?: GaariEvent[];
	}

	let { sampleEvents = [] }: Props = $props();

	// Top 3 audience pills by actual usage (Umami 30d):
	// family (1579), voksen (786), ungdom (285). Dropped "adult" (18+) to avoid
	// voksen/18+ confusion — they're semantically distinct but visually ambiguous.
	const AUDIENCE_OPTIONS = [
		{ value: 'family', labelKey: 'familyShort' },
		{ value: 'voksen', labelKey: 'grownups' },
		{ value: 'ungdom', labelKey: 'youth' }
	] as const;

	// Show up to 5 events with images: 3 in front, 2 smaller behind for depth
	let eventsWithImages = $derived(sampleEvents.filter(e => !!e.image_url));
	let previewEvents = $derived(eventsWithImages.slice(0, 3));
	let backgroundEvents = $derived(eventsWithImages.slice(3, 5));

	// Current ISO week number for the "UKE XX" sticker
	function getIsoWeek(date: Date): number {
		const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
		const dayNum = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	}
	const currentWeek = getIsoWeek(new Date());

	let selectedAudience: string = $state('');
	let email = $state('');
	let status: 'idle' | 'submitting' | 'success' | 'error' = $state('idle');

	function toggleAudience(value: string) {
		selectedAudience = selectedAudience === value ? '' : value;
	}

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
				umami.track('newsletter-signup', {
					location: 'homepage-grid-card',
					audience: selectedAudience || ''
				});
			}
		} catch {
			status = 'error';
		}
	}

	let heading = $derived($lang === 'no' ? 'Ukas arrangementer i Bergen' : 'This week\u2019s events in Bergen');
	let subtext = $derived(
		$lang === 'no'
			? `Vi samler fra ${SOURCE_COUNT} lokale kilder. Konserter, mat, kultur — hver torsdag.`
			: `We collect from ${SOURCE_COUNT} local sources. Concerts, food, culture — every Thursday.`
	);
	let successMsg = $derived($lang === 'no' ? 'Takk! Du er påmeldt.' : 'Thanks! You\u2019re subscribed.');
	let successDetail = $derived(
		$lang === 'no'
			? 'Vi sender fra noreply@gaari.no — første utsending kommer torsdag kl. 10.'
			: 'We send from noreply@gaari.no — first newsletter arrives Thursday at 10:00.'
	);
	let errorMsg = $derived(
		$lang === 'no' ? 'Noe gikk galt. Prøv igjen.' : 'Something went wrong. Please try again.'
	);
	let emailPlaceholder = $derived($lang === 'no' ? 'din@epost.no' : 'your@email.com');
	let subscribeLabel = $derived($lang === 'no' ? 'Få ukas arrangementer' : 'Get weekly picks');
	let trustLabel = $derived($lang === 'no' ? 'Gratis · ingen spam' : 'Free · no spam');
</script>

<li class="group list-none h-full">
	<article class="card relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-sm">
		<div class="relative h-32 overflow-hidden bg-[var(--funkis-red-subtle)] sm:aspect-[16/9] sm:h-auto">
			{#if previewEvents.length === 3}
				<div class="absolute inset-0 flex items-center justify-center">
					{#each backgroundEvents as ev, i (ev.id)}
						<div
							class="polaroid-bg"
							style="--rotate: {[-22, 20][i]}deg; --offset-x: {[-80, 80][i]}px; z-index: 0;"
						>
							<span class="washi-tape" style="--tape-color: {['#C4D4A8', '#D4C4A8'][i]}; --tape-rotate: {[-5, 7][i]}deg;"></span>
							<img
								src={optimizedSrc(ev.image_url!, 150)}
								alt=""
								loading="lazy"
							/>
						</div>
					{/each}
					{#each previewEvents as ev, i (ev.id)}
						<div
							class="polaroid"
							style="--rotate: {[-10, 0, 10][i]}deg; --offset-x: {[-42, 0, 42][i]}px; z-index: {i + 1};"
						>
							<span class="washi-tape" style="--tape-color: {['#D4B89A', '#A8C4D4', '#D4A8B8'][i]}; --tape-rotate: {[4, -3, 6][i]}deg;"></span>
							<img
								src={optimizedSrc(ev.image_url!, 200)}
								alt=""
								loading="lazy"
							/>
						</div>
					{/each}
				</div>
				<div class="pointer-events-none absolute left-3 top-2 z-10">
					<span class="rounded bg-white/90 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[var(--funkis-red)] shadow-sm">
						{$lang === 'no' ? 'Gåri-uka' : 'The Gåri week'}
					</span>
				</div>
				<div class="pointer-events-none absolute right-2 top-2 z-10">
					<span class="uke-sticker">
						{$lang === 'no' ? 'UKE' : 'WEEK'} {currentWeek}
					</span>
				</div>
			{:else}
				<div class="flex h-full items-center justify-center text-[var(--funkis-red)]">
					<span class="text-sm font-semibold uppercase tracking-wider">
						{$lang === 'no' ? 'Gåri-uka' : 'The Gåri week'}
					</span>
				</div>
			{/if}
		</div>

		<div class="flex flex-1 flex-col p-4">
			<h3 class="mb-1 line-clamp-2 text-lg font-semibold leading-tight text-[var(--color-text-primary)]" style="min-height: 2.6em;">
				{heading}
			</h3>
			<p class="mb-3 text-sm text-[var(--color-text-secondary)]">{subtext}</p>

			{#if status === 'success'}
				<div class="mt-auto">
					<p class="text-sm font-semibold text-[var(--funkis-green)]">{successMsg}</p>
					<p class="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">{successDetail}</p>
				</div>
			{:else}
				<form onsubmit={handleSubmit} class="mt-auto flex flex-col gap-2">
					<input type="hidden" name="lang" value={$lang} />
					{#if selectedAudience}<input type="hidden" name="audience" value={selectedAudience} />{/if}

					<label for="nl-grid-email" class="sr-only">{emailPlaceholder}</label>
					<input
						type="email"
						name="email"
						id="nl-grid-email"
						required
						bind:value={email}
						autocomplete="email"
						placeholder={emailPlaceholder}
						class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm"
						style="height: 44px;"
					/>

					<p class="text-xs leading-relaxed text-[var(--color-text-muted)]">{trustLabel}</p>

					<button
						type="submit"
						disabled={status === 'submitting'}
						class="w-full rounded-lg bg-[var(--funkis-red)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--funkis-red-hover)] disabled:opacity-70"
						style="height: 44px;"
					>
						{subscribeLabel}
					</button>

					<div class="flex flex-wrap gap-1.5" role="group" aria-label={$lang === 'no' ? 'Hvem er du?' : 'Who are you?'}>
						{#each AUDIENCE_OPTIONS as opt (opt.value)}
							<button
								type="button"
								class="audience-pill"
								class:selected={selectedAudience === opt.value}
								onclick={() => toggleAudience(opt.value)}
								aria-pressed={selectedAudience === opt.value}
							>
								{$t(opt.labelKey)}
							</button>
						{/each}
					</div>

					{#if status === 'error'}
						<p class="text-xs text-[var(--funkis-red)]" role="alert">{errorMsg}</p>
					{/if}
				</form>
			{/if}
		</div>
	</article>
</li>

<style>
	.card {
		transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
	}
	.card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
		border-color: var(--color-accent);
	}

	.polaroid {
		position: absolute;
		width: 72px;
		height: 86px;
		background: white;
		padding: 4px 4px 16px 4px;
		border-radius: 2px;
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.18);
		transform: translateX(var(--offset-x)) rotate(var(--rotate)) scale(1);
		transition: transform 0.3s ease;
	}
	.polaroid img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.card:hover .polaroid {
		transform: translateX(var(--offset-x)) rotate(var(--rotate)) scale(1.05);
	}

	.polaroid-bg {
		position: absolute;
		width: 56px;
		height: 68px;
		background: white;
		padding: 3px 3px 12px 3px;
		border-radius: 2px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
		opacity: 0.72;
		transform: translateX(var(--offset-x)) rotate(var(--rotate)) scale(1);
		transition: transform 0.3s ease, opacity 0.3s ease;
	}
	.polaroid-bg img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		filter: saturate(0.85);
	}
	.card:hover .polaroid-bg {
		opacity: 0.9;
		transform: translateX(var(--offset-x)) rotate(var(--rotate)) scale(1.05);
	}

	.washi-tape {
		position: absolute;
		top: -3px;
		left: 50%;
		width: 28px;
		height: 9px;
		background: var(--tape-color);
		opacity: 0.82;
		transform: translateX(-50%) rotate(var(--tape-rotate));
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
		pointer-events: none;
	}

	.uke-sticker {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		background: #F5E0A0;
		color: #1C1C1E;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		border-radius: 2px;
		transform: rotate(6deg);
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.12);
		font-family: var(--font-display);
	}

	@media (min-width: 640px) {
		.polaroid {
			width: 96px;
			height: 116px;
			padding: 6px 6px 20px 6px;
		}
		.polaroid-bg {
			width: 76px;
			height: 92px;
			padding: 5px 5px 16px 5px;
		}
		.washi-tape {
			width: 36px;
			height: 11px;
		}
		.uke-sticker {
			padding: 0.3rem 0.65rem;
			font-size: 0.8rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.polaroid {
			transition: none;
		}
	}

	.audience-pill {
		display: inline-flex;
		align-items: center;
		min-height: 32px;
		padding: 0.35rem 0.75rem;
		border-radius: 9999px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-surface);
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		user-select: none;
	}
	.audience-pill:hover:not(.selected) {
		border-color: var(--color-text-secondary);
		color: var(--color-text-primary);
	}
	.audience-pill.selected {
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
	}
	.audience-pill:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
	}
</style>
