<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let copyState = $state<Record<string, 'idle' | 'copied' | 'error'>>({});

	// localStorage-backed posted state, keyed per week so multiple weeks don't bleed.
	const storageKey = `gaari-posted-${data.manifest.startMonday}`;
	let posted = $state<Record<string, boolean>>({});

	$effect(() => {
		try {
			const raw = localStorage.getItem(storageKey);
			if (raw) posted = JSON.parse(raw);
		} catch { /* ignore */ }
	});

	function togglePosted(key: string) {
		posted = { ...posted, [key]: !posted[key] };
		try { localStorage.setItem(storageKey, JSON.stringify(posted)); } catch { /* ignore */ }
	}

	function resetWeek() {
		if (confirm('Nullstille hele uka?')) {
			posted = {};
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

	async function copyHandle(handle: string) {
		try {
			await navigator.clipboard.writeText(`@${handle}`);
		} catch { /* ignore */ }
	}

	const successCount = $derived(data.manifest.days.filter((d) => !d.skipped).length);

	const checklistTotal = $derived(
		data.checklist.reduce((sum, d) => sum + d.stories.length, 0)
	);
	const checklistDone = $derived(
		data.checklist.reduce((sum, d) => {
			return sum + d.stories.filter((_, i) => posted[`${d.dateStr}-${d.slug}-${i}`]).length;
		}, 0)
	);

	// Carousel checklist: one row per day. Each FB group can be restricted to
	// specific collection slugs (e.g. "Hva skjer i bergen i dag" only accepts
	// today-content like i-dag/today-in-bergen — kept in sync with FB_GROUPS
	// in scripts/social/generate-week.ts).
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

	const carouselDays = $derived(
		data.manifest.days.filter(d => !d.skipped)
	);

	const carouselTotal = $derived(
		carouselDays.reduce((sum, d) => sum + groupsForSlug(d.slug).length, 0)
	);
	const carouselDone = $derived(
		carouselDays.reduce((sum, d) => {
			return sum + groupsForSlug(d.slug).filter(g => posted[`${d.dateStr}-${d.slug}-fb-${g.id}`]).length;
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
		<h1 class="title">Ukens reels</h1>
		<p class="sub">{successCount} av {data.manifest.days.length} reels klare for Meta Business Suite</p>

		{#if data.manifest.zipUrl}
			<a class="bulk-download" href={data.manifest.zipUrl} download={`gaari-reels-uke-${data.manifest.startMonday}.zip`}>
				Last ned alle reels (ZIP)
			</a>
			<p class="bulk-hint">
				MP4-er navngitt som <code>YYYY-MM-DD-ukedag-slug.mp4</code> så de sorterer seg
				automatisk i mappen din. Last opp i Meta Business Suite og planlegg.
			</p>
		{/if}

		{#if data.manifest.storiesZipUrl}
			<a class="bulk-download stories" href={data.manifest.storiesZipUrl} download={`gaari-stories-uke-${data.manifest.startMonday}.zip`}>
				Last ned alle stories (ZIP)
			</a>
			<p class="bulk-hint">
				JPG-er navngitt som <code>YYYY-MM-DD-ukedag-slug-NN.jpg</code> + en
				<code>handles.txt</code> med @-handle og collection-link per story. Lagre i kamerarullen
				og post manuelt fra IG-appen med link sticker + @-mention sticker.
			</p>
		{/if}

		{#if data.manifest.carouselsZipUrl}
			<a class="bulk-download carousels" href={data.manifest.carouselsZipUrl} download={`gaari-carousels-uke-${data.manifest.startMonday}.zip`}>
				Last ned alle carousels for FB-grupper (ZIP)
			</a>
			<p class="bulk-hint">
				1080×1080 carousel-slides per dag + en <code>captions.txt</code> med fire caption-varianter
				per dag — én per FB-gruppe (Hva skjer i Bergen, Hva skjer i bergen i dag, Det Skjer i Bergen,
				Bergen Expats). Hver caption har sin egen UTM-tag så Umami kan attribuere klikk per gruppe.
			</p>
		{/if}

		<section class="instructions">
			<h2>Hvordan bruke denne siden</h2>
			<ol>
				<li>Trykk <strong>Last ned alle reels</strong> for å hente alle 6 i én ZIP, eller last ned per dag under.</li>
				<li>Åpne <strong>Meta Business Suite</strong> på desktop.</li>
				<li>For hver dag: dra MP4-en inn, kopier caption fra reel-siden, planlegg til riktig dag.</li>
				<li>Stories (link sticker + @-mention) må fortsatt postes manuelt fra mobilen den dagen.</li>
			</ol>
		</section>

		<div class="days-grid">
			{#each data.manifest.days as day (day.slug)}
				<article class="day-card" class:skipped={day.skipped}>
					<header class="day-header">
						<div>
							<h3 class="day-name">{day.dayName} {day.dateStr.slice(8, 10)}.{day.dateStr.slice(5, 7)}</h3>
							<p class="day-label">{day.label}</p>
						</div>
						{#if day.skipped}
							<span class="status-pill skip">Skippet</span>
						{:else}
							<span class="status-pill ok">Klar</span>
						{/if}
					</header>

					{#if day.skipped}
						<p class="skip-reason">{day.skipReason || 'Ingen events tilgjengelig'}</p>
					{:else}
						<p class="day-meta">
							{day.frameCount} frames · {day.durationSec} sek · {day.storyCount} stories
						</p>
						<div class="day-actions">
							<a class="primary-btn" href={day.landingUrl}>Åpne reel-side</a>
							{#if day.caption}
								<button type="button" class="secondary-btn" onclick={() => copyCaption(day.slug, day.caption!)}>
									{#if copyState[day.slug] === 'copied'}Kopiert
									{:else if copyState[day.slug] === 'error'}Feilet
									{:else}Kopier caption{/if}
								</button>
							{/if}
						</div>
					{/if}
				</article>
			{/each}
		</div>

		{#if data.checklist.length > 0}
			<section class="checklist-section">
				<header class="checklist-header">
					<div>
						<h2>Sjekkliste — hva er lagt ut</h2>
						<p class="checklist-progress">{checklistDone} av {checklistTotal} stories ferdig denne uka</p>
					</div>
					<button type="button" class="reset-btn" onclick={resetWeek}>Nullstill</button>
				</header>
				<p class="checklist-hint">
					Trykk på et bilde når du har lagt det ut. Status lagres lokalt i nettleseren din,
					så du ser det igjen når du åpner siden senere.
				</p>

				{#each data.checklist as day (day.dateStr + day.slug)}
					{@const dayDone = day.stories.filter((_, i) => posted[`${day.dateStr}-${day.slug}-${i}`]).length}
					<div class="checklist-day">
						<header class="checklist-day-header">
							<h3>{day.dayName} {day.dateStr.slice(8, 10)}.{day.dateStr.slice(5, 7)} — {day.label}</h3>
							<span class="checklist-day-count" class:complete={dayDone === day.stories.length}>
								{dayDone}/{day.stories.length}
							</span>
						</header>
						<div class="checklist-grid">
							{#each day.stories as story, i (story.url)}
								{@const key = `${day.dateStr}-${day.slug}-${i}`}
								{@const isDone = posted[key]}
								<button
									type="button"
									class="checklist-item"
									class:done={isDone}
									onclick={() => togglePosted(key)}
								>
									<img src={story.url} alt={story.title} loading="lazy" />
									<div class="checklist-item-overlay">
										{#if isDone}
											<span class="check-mark">Lagt ut</span>
										{/if}
									</div>
									<p class="checklist-item-venue">{story.venue}</p>
									{#if story.igHandle}
										<p class="checklist-item-handle">@{story.igHandle}</p>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</section>
		{/if}

		{#if carouselDays.length > 0 && data.manifest.carouselsZipUrl}
			<section class="checklist-section">
				<header class="checklist-header">
					<div>
						<h2>Sjekkliste — carousels i FB-grupper</h2>
						<p class="checklist-progress">{carouselDone} av {carouselTotal} gruppe-poster ferdig</p>
					</div>
				</header>
				<p class="checklist-hint">
					Hver dag har én carousel som skal postes til fire FB-grupper med ulik UTM-tag.
					Trykk på en gruppe når du har postet i den.
				</p>

				{#each carouselDays as day (day.dateStr + day.slug)}
					{@const eligibleGroups = groupsForSlug(day.slug)}
					{@const dayDone = eligibleGroups.filter(g => posted[`${day.dateStr}-${day.slug}-fb-${g.id}`]).length}
					<div class="carousel-day">
						<img
							class="carousel-thumb"
							src={carouselThumbUrl(day.dateStr, day.slug)}
							alt={day.label}
							loading="lazy"
						/>
						<div class="carousel-day-body">
							<header class="checklist-day-header">
								<h3>{day.dayName} {day.dateStr.slice(8, 10)}.{day.dateStr.slice(5, 7)} — {day.label}</h3>
								<span class="checklist-day-count" class:complete={dayDone === eligibleGroups.length}>
									{dayDone}/{eligibleGroups.length}
								</span>
							</header>
							<div class="group-grid">
								{#each eligibleGroups as group (group.id)}
									{@const key = `${day.dateStr}-${day.slug}-fb-${group.id}`}
									{@const isDone = posted[key]}
									<button
										type="button"
										class="group-pill"
										class:done={isDone}
										onclick={() => togglePosted(key)}
									>
										{group.name}
										{#if isDone}<span class="group-done">Lagt ut</span>{/if}
									</button>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</section>
		{/if}

		<footer class="footer">
			Generert {new Date(data.manifest.generatedAt).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })}
		</footer>
	</main>
</div>

<style>
	.page {
		min-height: 100dvh;
		background: var(--color-bg-base);
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
		color: var(--color-primary);
		text-decoration: none;
	}

	.date {
		font-size: 13px;
		color: var(--color-text-muted);
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
		margin: 0 0 24px;
		font-size: 16px;
		color: var(--color-text-secondary);
	}

	.bulk-download {
		display: block;
		text-align: center;
		background: var(--color-primary);
		color: #fff;
		text-decoration: none;
		padding: 16px 24px;
		border-radius: 12px;
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 22px;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		margin-bottom: 8px;
	}

	.bulk-download:active {
		transform: scale(0.99);
	}

	.bulk-hint {
		margin: 0 0 24px;
		font-size: 13px;
		color: var(--color-text-secondary);
		text-align: center;
		line-height: 1.5;
	}

	.bulk-hint code {
		background: var(--color-bg-surface);
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 12px;
	}

	.instructions {
		background: var(--color-bg-surface);
		border: 2px solid var(--color-border);
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 24px;
	}

	.instructions h2 {
		margin: 0 0 12px;
		font-size: 18px;
		font-weight: 700;
	}

	.instructions ol {
		margin: 0;
		padding-left: 22px;
		font-size: 15px;
		line-height: 1.6;
		color: var(--color-text-secondary);
	}

	.instructions li {
		margin-bottom: 6px;
	}

	.days-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
		margin-bottom: 32px;
	}

	@media (min-width: 640px) {
		.days-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.day-card {
		background: #fff;
		border: 2px solid var(--color-border);
		border-radius: 12px;
		padding: 20px;
	}

	.day-card.skipped {
		opacity: 0.6;
	}

	.day-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}

	.day-name {
		margin: 0;
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 22px;
		font-weight: 700;
	}

	.day-label {
		margin: 4px 0 0;
		font-size: 14px;
		color: var(--color-text-secondary);
	}

	.day-meta {
		margin: 0 0 14px;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.day-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.primary-btn {
		display: inline-block;
		text-align: center;
		background: var(--color-primary);
		color: #fff;
		text-decoration: none;
		padding: 12px 18px;
		border-radius: 8px;
		font-weight: 700;
		font-size: 15px;
	}

	.secondary-btn {
		background: #fff;
		color: var(--color-primary);
		border: 2px solid var(--color-primary);
		padding: 10px 18px;
		border-radius: 8px;
		font-weight: 600;
		font-size: 14px;
		cursor: pointer;
	}

	.secondary-btn:active {
		transform: scale(0.98);
	}

	.status-pill {
		flex-shrink: 0;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		padding: 4px 10px;
		border-radius: 999px;
	}

	.status-pill.ok {
		background: #1A6B35;
		color: #fff;
	}

	.status-pill.skip {
		background: #e6e3da;
		color: #595959;
	}

	.skip-reason {
		margin: 0;
		font-size: 13px;
		color: var(--color-text-muted);
		font-style: italic;
	}

	.checklist-section {
		background: var(--color-bg-surface);
		border: 2px solid var(--color-border);
		border-radius: 12px;
		padding: 24px;
		margin-bottom: 32px;
	}

	.checklist-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		margin-bottom: 8px;
	}

	.checklist-header h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 700;
	}

	.checklist-progress {
		margin: 4px 0 0;
		font-size: 14px;
		color: var(--color-text-secondary);
	}

	.reset-btn {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		padding: 8px 14px;
		border-radius: 8px;
		font-size: 13px;
		cursor: pointer;
	}

	.reset-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.checklist-hint {
		margin: 0 0 24px;
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.5;
	}

	.checklist-day {
		margin-bottom: 28px;
	}

	.checklist-day:last-child {
		margin-bottom: 0;
	}

	.checklist-day-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--color-border);
	}

	.checklist-day-header h3 {
		margin: 0;
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 18px;
		font-weight: 700;
	}

	.checklist-day-count {
		font-size: 13px;
		font-weight: 700;
		color: var(--color-text-muted);
		padding: 2px 10px;
		border-radius: 999px;
		background: #fff;
		border: 1px solid var(--color-border);
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
		border: 2px solid var(--color-border);
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
		color: var(--color-text-primary);
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.checklist-item-handle {
		margin: 0 8px 8px;
		font-size: 11px;
		color: var(--color-primary);
	}

	.carousel-day {
		display: flex;
		gap: 16px;
		padding: 16px;
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		margin-bottom: 16px;
	}

	.carousel-day:last-child {
		margin-bottom: 0;
	}

	.carousel-thumb {
		flex-shrink: 0;
		width: 96px;
		height: 96px;
		object-fit: cover;
		border-radius: 8px;
		background: #1c1c1e;
	}

	.carousel-day-body {
		flex: 1;
		min-width: 0;
	}

	.carousel-day-body .checklist-day-header {
		margin-bottom: 12px;
		padding-bottom: 8px;
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
		border: 2px solid var(--color-border);
		color: var(--color-text-primary);
		font-size: 13px;
		font-weight: 600;
		padding: 10px 14px;
		border-radius: 999px;
		cursor: pointer;
		text-align: left;
		transition: border-color 120ms ease, background 120ms ease;
	}

	.group-pill:hover {
		border-color: var(--color-primary);
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
		color: var(--color-text-muted);
		padding: 16px 0 32px;
	}
</style>
