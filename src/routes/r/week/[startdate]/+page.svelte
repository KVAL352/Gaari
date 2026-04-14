<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let copyState = $state<Record<string, 'idle' | 'copied' | 'error'>>({});

	// Posting state backed by Supabase (via /api/posting-status)
	const weekId = data.manifest.startMonday;
	let posted = $state<Record<string, boolean>>({});
	let loaded = $state(false);

	onMount(async () => {
		try {
			const res = await fetch(`/api/posting-status?week=${weekId}`);
			if (res.ok) {
				const state = await res.json();
				for (const k of Object.keys(state)) posted[k] = state[k];
			}
		} catch { /* fall back to empty */ }
		loaded = true;
	});

	function togglePosted(key: string) {
		posted[key] = !posted[key];
		// Fire-and-forget sync to Supabase
		fetch('/api/posting-status', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ week: weekId, key, done: posted[key] })
		}).catch(() => {});
	}

	let resetConfirmPending = $state(false);
	let resetTimeout: ReturnType<typeof setTimeout> | null = null;

	function resetWeek() {
		if (!resetConfirmPending) {
			resetConfirmPending = true;
			resetTimeout = setTimeout(() => { resetConfirmPending = false; }, 3000);
			return;
		}
		// Second click within 3s — actually reset
		if (resetTimeout) clearTimeout(resetTimeout);
		resetConfirmPending = false;
		for (const k of Object.keys(posted)) delete posted[k];
		fetch(`/api/posting-status?week=${weekId}`, { method: 'DELETE' }).catch(() => {});
	}

	async function copyCaption(slug: string, caption: string) {
		try {
			await navigator.clipboard.writeText(caption);
			copyState[slug] = 'copied';
			setTimeout(() => (copyState[slug] = 'idle'), 2500);
		} catch {
			copyState[slug] = 'error';
			setTimeout(() => (copyState[slug] = 'idle'), 2500);
		}
	}

	const successCount = $derived(data.manifest.days.filter((d) => !d.skipped).length);
	const activeDays = $derived(data.manifest.days.filter(d => !d.skipped));

	// Carousel checklist: one row per day. Each FB group can be restricted to
	// specific collection slugs (e.g. "Hva skjer i bergen i dag" only accepts
	// today-content like i-dag/today-in-bergen).
	type FbGroupConfig = { id: string; name: string; allowSlugs?: string[] };
	const FB_GROUPS: FbGroupConfig[] = [
		{ id: 'hva-skjer-bergen', name: 'Hva skjer i Bergen' },
		{ id: 'hva-skjer-bergen-i-dag', name: 'Hva skjer i bergen i dag', allowSlugs: ['i-dag', 'today-in-bergen'] },
		{ id: 'det-skjer-bergen', name: 'Det Skjer i Bergen' },
		{ id: 'bergen-expats', name: 'Bergen Expats' }
	];

	function groupsForSlug(slug: string): FbGroupConfig[] {
		return FB_GROUPS.filter(g => !g.allowSlugs || g.allowSlugs.includes(slug));
	}

	/** Stories checklist data for a given day */
	function storiesForDay(dateStr: string, slug: string) {
		return data.checklist.find(c => c.dateStr === dateStr && c.slug === slug);
	}

	/** Stable key for a story — uses filename from URL instead of array index */
	function storyTaskKey(dateStr: string, slug: string, storyUrl: string): string {
		const filename = storyUrl.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
		return `${dateStr}-${slug}-s-${filename}`;
	}

	// Total progress across all days (stories + FB groups)
	const totalTasks = $derived(
		activeDays.reduce((sum, d) => {
			const storyDay = storiesForDay(d.dateStr, d.slug);
			return sum + 2 + (storyDay?.stories.length ?? 0) + groupsForSlug(d.slug).length; // +2 for reel IG + FB
		}, 0)
	);
	const doneTasks = $derived(
		activeDays.reduce((sum, d) => {
			const storyDay = storiesForDay(d.dateStr, d.slug);
			const reelDone = (posted[`${d.dateStr}-${d.slug}-reel-ig`] ? 1 : 0) + (posted[`${d.dateStr}-${d.slug}-reel-fb`] ? 1 : 0);
			const storiesDone = storyDay?.stories.filter((s) => posted[storyTaskKey(d.dateStr, d.slug, s.url)]).length ?? 0;
			const groupsDone = groupsForSlug(d.slug).filter(g => posted[`${d.dateStr}-${d.slug}-fb-${g.id}`]).length;
			return sum + reelDone + storiesDone + groupsDone;
		}, 0)
	);

	const STORAGE_BASE = 'https://rilwtpluofguyjpzdezi.supabase.co/storage/v1/object/public/social-media';

	function carouselThumbUrl(dateStr: string, slug: string): string {
		return `${STORAGE_BASE}/${dateStr}/${slug}/carousel-01.jpg`;
	}

	function reelFrameUrl(dateStr: string, slug: string, idx: number): string {
		return `${STORAGE_BASE}/${dateStr}/${slug}/frame-${String(idx).padStart(2, '0')}.png`;
	}
</script>

<svelte:head>
	<title>Ukens reels · {data.manifest.startMonday} – {data.manifest.endSaturday} · Gåri</title>
	<meta name="robots" content="noindex" />
	<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
</svelte:head>

<div class="page">
	<header class="header">
		<a href="/" class="brand">Gåri</a>
		<span class="date">{data.manifest.startMonday} – {data.manifest.endSaturday}</span>
	</header>

	<main class="main">
		<h1 class="title">Ukens innhold</h1>
		<p class="sub">{successCount} av {data.manifest.days.length} dager klare · {doneTasks} av {totalTasks} oppgaver ferdig</p>

		<div class="progress-bar">
			<div class="progress-fill" style="width: {totalTasks > 0 ? (doneTasks / totalTasks * 100) : 0}%"></div>
		</div>

		<div class="top-actions">
			<button type="button" class="reset-btn" class:confirm-pending={resetConfirmPending} onclick={resetWeek}>
				{resetConfirmPending ? 'Trykk igjen for å bekrefte' : 'Nullstill alt'}
			</button>
		</div>

		{#each data.manifest.days as day (day.dateStr + day.slug)}
			<section class="day-section" class:skipped={day.skipped}>
				<header class="day-section-header">
					<div>
						<h2 class="day-name">{day.dayName} {day.dateStr.slice(8, 10)}.{day.dateStr.slice(5, 7)}</h2>
						<p class="day-label">{day.label}</p>
					</div>
					{#if day.skipped}
						<span class="status-pill skip">Skippet</span>
					{/if}
				</header>

				{#if day.skipped}
					<p class="skip-reason">{day.skipReason || 'Ingen events tilgjengelig'}</p>
				{:else}
					<!-- Download -->
					{#if day.dayZipUrl}
						<div class="download-row">
							<a class="dl-btn day-zip" href={day.dayZipUrl} download={`gaari-${day.dateStr}-${day.slug}.zip`}>
								Last ned alt
							</a>
						</div>
					{/if}

					<!-- Copy buttons -->
					<div class="copy-row">
						{#if day.storyLink}
							<button type="button" class="copy-btn" onclick={() => copyCaption(`${day.slug}-link`, day.storyLink!)}>
								{#if copyState[`${day.slug}-link`] === 'copied'}Kopiert
								{:else}Kopier story-lenke{/if}
							</button>
						{/if}
						{#if day.captionNo}
							<button type="button" class="copy-btn" onclick={() => copyCaption(`${day.slug}-no`, day.captionNo!)}>
								{#if copyState[`${day.slug}-no`] === 'copied'}Kopiert
								{:else}Kopier caption (NO){/if}
							</button>
						{/if}
						{#if day.captionEn}
							<button type="button" class="copy-btn" onclick={() => copyCaption(`${day.slug}-en`, day.captionEn!)}>
								{#if copyState[`${day.slug}-en`] === 'copied'}Kopiert
								{:else}Kopier caption (EN){/if}
							</button>
						{/if}
					</div>

					<!-- Reel checklist -->
					{#if day.frameCount > 0}
						<div class="subsection">
							<div class="subsection-header">
								<h3>Reel</h3>
								<img class="reel-thumb" src={reelFrameUrl(day.dateStr, day.slug, 1)} alt={day.label} loading="lazy" />
							</div>
							<div class="reel-checks">
								<button type="button" class="reel-pill" class:done={posted[`${day.dateStr}-${day.slug}-reel-ig`]} onclick={() => togglePosted(`${day.dateStr}-${day.slug}-reel-ig`)}>
									Instagram
									{#if posted[`${day.dateStr}-${day.slug}-reel-ig`]}<span class="group-done">Lagt ut</span>{/if}
								</button>
								<button type="button" class="reel-pill" class:done={posted[`${day.dateStr}-${day.slug}-reel-fb`]} onclick={() => togglePosted(`${day.dateStr}-${day.slug}-reel-fb`)}>
									Facebook
									{#if posted[`${day.dateStr}-${day.slug}-reel-fb`]}<span class="group-done">Lagt ut</span>{/if}
								</button>
							</div>
						</div>
					{/if}

					<!-- FB group carousel checklist -->
					{@const eligibleGroups = groupsForSlug(day.slug)}
					{#if eligibleGroups.length > 0 && day.frameCount > 0}
						<div class="subsection">
							<div class="subsection-header">
								<h3>Carousel i FB-grupper</h3>
								<img class="carousel-thumb" src={carouselThumbUrl(day.dateStr, day.slug)} alt={day.label} loading="lazy" />
							</div>
							<div class="group-grid">
								{#each eligibleGroups as group (group.id)}
									{@const key = `${day.dateStr}-${day.slug}-fb-${group.id}`}
									{@const isDone = posted[key]}
									<button type="button" class="group-pill" class:done={isDone} onclick={() => togglePosted(key)}>
										{group.name}
										{#if isDone}<span class="group-done">Lagt ut</span>{/if}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Stories checklist -->
					{@const storyDay = storiesForDay(day.dateStr, day.slug)}
					{#if storyDay && storyDay.stories.length > 0}
						{@const storyDone = storyDay.stories.filter((s) => posted[storyTaskKey(day.dateStr, day.slug, s.url)]).length}
						<div class="subsection">
							<div class="subsection-header">
								<h3>Stories</h3>
								<span class="checklist-day-count" class:complete={storyDone === storyDay.stories.length}>
									{storyDone}/{storyDay.stories.length}
								</span>
							</div>
							<div class="checklist-grid">
								{#each storyDay.stories as story (story.url)}
									{@const key = storyTaskKey(day.dateStr, day.slug, story.url)}
									{@const isDone = posted[key]}
									<button type="button" class="checklist-item" class:done={isDone} onclick={() => togglePosted(key)}>
										<img src={story.url} alt={story.title} loading="lazy" />
										<div class="checklist-item-overlay">
											{#if isDone}<span class="check-mark">Lagt ut</span>{/if}
										</div>
										<p class="checklist-item-venue">{story.venue}</p>
										{#if story.igHandle}
											<p class="checklist-item-handle">@{story.igHandle}</p>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				{/if}
			</section>
		{/each}

		<footer class="footer">
			Generert {new Date(data.manifest.generatedAt).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })}
		</footer>
	</main>
</div>

<style>
	.page {
		min-height: 100dvh;
		background: #fafaf7;
		padding: env(safe-area-inset-top) 16px env(safe-area-inset-bottom);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 800px;
		margin: 0 auto;
		padding: 16px 0;
	}

	.brand {
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 28px;
		font-weight: 700;
		color: #C82D2D;
		text-decoration: none;
	}

	.date {
		font-size: 13px;
		color: #595959;
	}

	.main {
		max-width: 800px;
		margin: 0 auto;
	}

	.title {
		margin: 8px 0 4px;
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 40px;
		font-weight: 700;
		line-height: 1.05;
	}

	.sub {
		margin: 0 0 12px;
		font-size: 16px;
		color: #4D4D4D;
	}

	.progress-bar {
		height: 6px;
		background: #e6e3da;
		border-radius: 3px;
		margin-bottom: 16px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: #1A6B35;
		border-radius: 3px;
		transition: width 200ms ease;
	}

	.top-actions {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 24px;
	}

	.day-section {
		background: #fff;
		border: 2px solid #e6e3da;
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 20px;
	}

	.day-section.skipped {
		opacity: 0.5;
	}

	.day-section-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}

	.download-row {
		display: flex;
		gap: 8px;
		margin-bottom: 10px;
	}

	.dl-btn {
		flex: 1;
		text-align: center;
		text-decoration: none;
		padding: 12px 8px;
		border-radius: 10px;
		font-family: 'Barlow Condensed', sans-serif;
		font-weight: 700;
		font-size: 16px;
		color: #fff;
	}

	.dl-btn.day-zip { background: #C82D2D; flex: 1; }


	.dl-btn:active {
		transform: scale(0.98);
	}

	.copy-row {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}

	.copy-btn {
		flex: 1;
		text-align: center;
		background: #fff;
		color: #141414;
		border: 2px solid #e6e3da;
		padding: 10px 8px;
		border-radius: 10px;
		font-weight: 600;
		font-size: 13px;
		cursor: pointer;
	}

	.copy-btn:active {
		transform: scale(0.98);
		background: #f5f4f0;
	}

	.day-name {
		margin: 0;
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 24px;
		font-weight: 700;
	}

	.day-label {
		margin: 4px 0 0;
		font-size: 14px;
		color: #4D4D4D;
	}

	.status-pill {
		flex-shrink: 0;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		padding: 4px 10px;
		border-radius: 999px;
	}

	.status-pill.skip {
		background: #e6e3da;
		color: #595959;
	}

	.skip-reason {
		margin: 0;
		font-size: 13px;
		color: #595959;
		font-style: italic;
	}

	.subsection {
		margin-bottom: 20px;
		padding-top: 16px;
		border-top: 1px solid #e6e3da;
	}

	.subsection:first-of-type {
		border-top: none;
		padding-top: 0;
	}

	.subsection:last-child {
		margin-bottom: 0;
	}

	.subsection-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.subsection-header h3 {
		margin: 0;
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 17px;
		font-weight: 700;
		color: #4D4D4D;
	}

	.reset-btn {
		background: transparent;
		border: 1px solid #e6e3da;
		color: #4D4D4D;
		padding: 8px 14px;
		border-radius: 8px;
		font-size: 13px;
		cursor: pointer;
	}

	.reset-btn:hover {
		border-color: #C82D2D;
		color: #C82D2D;
	}

	.reset-btn.confirm-pending {
		border-color: #C82D2D;
		background: #C82D2D;
		color: #fff;
	}

	.checklist-day-count {
		font-size: 13px;
		font-weight: 700;
		color: #595959;
		padding: 2px 10px;
		border-radius: 999px;
		background: #fff;
		border: 1px solid #e6e3da;
	}

	.checklist-day-count.complete {
		background: #1A6B35;
		color: #fff;
		border-color: #1A6B35;
	}

	.checklist-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 12px;
	}

	.checklist-item {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 0;
		background: #fff;
		border: 2px solid #e6e3da;
		border-radius: 8px;
		overflow: hidden;
		cursor: pointer;
		text-align: left;
		transition: border-color 120ms ease, opacity 120ms ease;
	}

	.checklist-item img {
		display: block;
		width: 100%;
		aspect-ratio: 9 / 16;
		object-fit: cover;
		background: #1c1c1e;
	}

	.checklist-item.done {
		border-color: #1A6B35;
		opacity: 0.65;
	}

	.checklist-item-overlay {
		position: absolute;
		top: 6px;
		right: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.check-mark {
		background: #1A6B35;
		color: #fff;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 4px 8px;
		border-radius: 999px;
	}

	.checklist-item-venue {
		margin: 4px 8px 0;
		font-size: 12px;
		font-weight: 600;
		color: #141414;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.checklist-item-handle {
		margin: 0 8px 8px;
		font-size: 11px;
		color: #C82D2D;
	}

	.carousel-thumb {
		flex-shrink: 0;
		width: 64px;
		height: 64px;
		object-fit: cover;
		border-radius: 8px;
		background: #1c1c1e;
	}

	.group-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 8px;
	}

	.group-pill {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		background: #fff;
		border: 2px solid #e6e3da;
		color: #141414;
		font-size: 13px;
		font-weight: 600;
		padding: 10px 14px;
		border-radius: 999px;
		cursor: pointer;
		text-align: left;
		transition: border-color 120ms ease, background 120ms ease;
	}

	.group-pill:hover {
		border-color: #C82D2D;
	}

	.group-pill.done {
		background: #1A6B35;
		border-color: #1A6B35;
		color: #fff;
	}

	.group-done {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		opacity: 0.85;
	}

	.reel-thumb {
		flex-shrink: 0;
		width: 48px;
		height: 85px;
		object-fit: cover;
		border-radius: 8px;
		background: #1c1c1e;
	}

	.reel-pill {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		width: 100%;
		background: #fff;
		border: 2px solid #e6e3da;
		color: #141414;
		font-size: 13px;
		font-weight: 600;
		padding: 10px 14px;
		border-radius: 999px;
		cursor: pointer;
		text-align: left;
		transition: border-color 120ms ease, background 120ms ease;
	}

	.reel-checks {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.reel-pill:hover { border-color: #C82D2D; }

	.reel-pill.done {
		background: #1A6B35;
		border-color: #1A6B35;
		color: #fff;
	}

	.footer {
		text-align: center;
		font-size: 12px;
		color: #595959;
		padding: 16px 0 32px;
	}
</style>
