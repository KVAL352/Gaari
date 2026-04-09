<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let copyState = $state<Record<string, 'idle' | 'copied' | 'error'>>({});

	// localStorage-backed posted state, keyed per week so multiple weeks don't bleed.
	const storageKey = `gaari-posted-${data.manifest.startMonday}`;
	let posted = $state<Record<string, boolean>>({});

	onMount(() => {
		try {
			const raw = localStorage.getItem(storageKey);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (parsed && typeof parsed === 'object') {
					for (const k of Object.keys(parsed)) posted[k] = parsed[k];
				}
			}
		} catch { /* ignore */ }
	});

	function persist() {
		try { localStorage.setItem(storageKey, JSON.stringify(posted)); } catch { /* ignore */ }
	}

	function togglePosted(key: string) {
		posted[key] = !posted[key];
		persist();
	}

	function resetWeek() {
		if (confirm('Nullstille hele uka?')) {
			for (const k of Object.keys(posted)) delete posted[k];
			try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
		}
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

	// Total progress across all days (stories + FB groups)
	const totalTasks = $derived(
		activeDays.reduce((sum, d) => {
			const storyDay = storiesForDay(d.dateStr, d.slug);
			return sum + (storyDay?.stories.length ?? 0) + groupsForSlug(d.slug).length;
		}, 0)
	);
	const doneTasks = $derived(
		activeDays.reduce((sum, d) => {
			const storyDay = storiesForDay(d.dateStr, d.slug);
			const storiesDone = storyDay?.stories.filter((_, i) => posted[`${d.dateStr}-${d.slug}-${i}`]).length ?? 0;
			const groupsDone = groupsForSlug(d.slug).filter(g => posted[`${d.dateStr}-${d.slug}-fb-${g.id}`]).length;
			return sum + storiesDone + groupsDone;
		}, 0)
	);

	function carouselThumbUrl(dateStr: string, slug: string): string {
		return `https://rilwtpluofguyjpzdezi.supabase.co/storage/v1/object/public/social-media/${dateStr}/${slug}/carousel-01.jpg`;
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
			<button type="button" class="reset-btn" onclick={resetWeek}>Nullstill alt</button>
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
					<p class="day-meta">
						{day.frameCount} carousel-bilder · {day.storyCount} stories{#if day.mp4Url} · reel{/if}
					</p>

					<div class="day-actions">
						{#if day.dayZipUrl}
							<a class="zip-btn" href={day.dayZipUrl} download={`gaari-${day.dateStr}-${day.slug}.zip`}>
								Last ned dagens innhold (ZIP)
							</a>
						{/if}
						{#if day.caption}
							<button type="button" class="caption-btn" onclick={() => copyCaption(day.slug, day.caption!)}>
								{#if copyState[day.slug] === 'copied'}Kopiert
								{:else if copyState[day.slug] === 'error'}Feilet
								{:else}Kopier caption{/if}
							</button>
						{/if}
					</div>

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
						{@const storyDone = storyDay.stories.filter((_, i) => posted[`${day.dateStr}-${day.slug}-${i}`]).length}
						<div class="subsection">
							<div class="subsection-header">
								<h3>Stories</h3>
								<span class="checklist-day-count" class:complete={storyDone === storyDay.stories.length}>
									{storyDone}/{storyDay.stories.length}
								</span>
							</div>
							<div class="checklist-grid">
								{#each storyDay.stories as story, i (story.url)}
									{@const key = `${day.dateStr}-${day.slug}-${i}`}
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

	.day-header-actions {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
		align-items: center;
	}

	.zip-btn {
		display: block;
		width: 100%;
		text-align: center;
		background: #C82D2D;
		color: #fff;
		text-decoration: none;
		padding: 14px 24px;
		border-radius: 10px;
		font-family: 'Barlow Condensed', sans-serif;
		font-weight: 700;
		font-size: 18px;
		letter-spacing: 0.02em;
	}

	.zip-btn:active {
		transform: scale(0.98);
	}

	.caption-btn {
		display: block;
		width: 100%;
		text-align: center;
		background: #fff;
		color: #C82D2D;
		border: 2px solid #C82D2D;
		padding: 12px 24px;
		border-radius: 10px;
		font-weight: 700;
		font-size: 15px;
		cursor: pointer;
	}

	.caption-btn:active {
		transform: scale(0.98);
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

	.day-meta {
		margin: 0 0 8px;
		font-size: 13px;
		color: #595959;
	}

	.day-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 20px;
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

	.footer {
		text-align: center;
		font-size: 12px;
		color: #595959;
		padding: 16px 0 32px;
	}
</style>
