<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let copyState = $state<Record<string, 'idle' | 'copied' | 'error'>>({});

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
				ZIP-en inneholder alle MP4-er navngitt som <code>YYYY-MM-DD-ukedag-slug.mp4</code> så de sorterer seg
				automatisk i mappen din.
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

	.footer {
		text-align: center;
		font-size: 12px;
		color: var(--color-text-muted);
		padding: 16px 0 32px;
	}
</style>
