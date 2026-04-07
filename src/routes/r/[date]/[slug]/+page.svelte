<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let copyState = $state<'idle' | 'copied' | 'error'>('idle');
	let handleCopyState = $state<'idle' | 'copied' | 'error'>('idle');

	let downloadUrl = $derived(`${data.mp4Url}?download=1`);
	let downloadName = $derived(`reel-${data.slug}.mp4`);

	async function copyCaption() {
		try {
			await navigator.clipboard.writeText(data.caption);
			copyState = 'copied';
			setTimeout(() => (copyState = 'idle'), 2500);
		} catch {
			copyState = 'error';
			setTimeout(() => (copyState = 'idle'), 2500);
		}
	}

	async function copyHandle(handle: string) {
		try {
			await navigator.clipboard.writeText(`@${handle}`);
			handleCopyState = 'copied';
			setTimeout(() => (handleCopyState = 'idle'), 2500);
		} catch {
			handleCopyState = 'error';
			setTimeout(() => (handleCopyState = 'idle'), 2500);
		}
	}
</script>

<svelte:head>
	<title>Reel · {data.collectionTitle} · Gåri</title>
	<meta name="robots" content="noindex" />
	<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
</svelte:head>

<div class="page">
	<header class="header">
		<a href="/" class="brand">Gåri</a>
		<span class="date">{data.date}</span>
	</header>

	<main class="main">
		<h1 class="title">{data.collectionTitle}</h1>
		<p class="sub">Reel klar til publisering</p>

		<div class="video-wrap">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				src={data.mp4Url}
				controls
				playsinline
				preload="metadata"
				class="video"
			></video>
		</div>

		<a class="save-btn" href={downloadUrl} download={downloadName}>Last ned videoen</a>

		<section class="instructions">
			<h2>Slik får du videoen til Instagram</h2>
			<ol>
				<li>Trykk <strong>Last ned videoen</strong> over. Videoen havner i <strong>Safari Downloads</strong>.</li>
				<li>Åpne <strong>Files</strong>-appen → <strong>Downloads</strong> → trykk på reel-videoen.</li>
				<li>Trykk del-ikonet (firkant med pil opp) → velg <strong>Lagre i Bilder</strong>.</li>
				<li>Åpne <strong>Instagram</strong> → Reels → velg klippet fra kamerarullen.</li>
				<li>Trykk <strong>Kopier caption</strong> under, lim inn i Reels og publiser.</li>
				<li>Toggle <strong>Del på Facebook</strong> på publish-skjermen for cross-post.</li>
			</ol>
		</section>

		{#if data.caption}
			<section class="caption-section">
				<div class="caption-header">
					<h2>Caption</h2>
					<button type="button" class="copy-btn" onclick={copyCaption}>
						{#if copyState === 'copied'}Kopiert
						{:else if copyState === 'error'}Feilet
						{:else}Kopier caption{/if}
					</button>
				</div>
				<pre class="caption">{data.caption}</pre>
			</section>
		{/if}

		{#if data.stories.length > 0}
			<section class="stories-section">
				<h2>Stories — én per spillested</h2>
				<p class="stories-intro">
					<strong>iPhone:</strong> trykk og hold på bildet → <strong>Lagre i Bilder</strong>.<br />
					<strong>Android:</strong> trykk og hold → <strong>Last ned bilde</strong>.<br />
					Trykk på @-handlen for å kopiere den, så kan du bruke @-mention-klistremerket i IG Stories.
				</p>
				<div class="stories-grid">
					{#each data.stories as story, i (story.url)}
						<article class="story-card">
							<img
								src={`/r/${data.date}/${data.slug}/story/${i + 1}.png`}
								alt={story.title}
								class="story-img"
								loading="lazy"
							/>
							<div class="story-meta">
								<p class="story-title">{story.title}</p>
								<p class="story-venue">{story.venue}</p>
								{#if story.igHandle}
									<div class="handle-row">
										<span class="handle-pill">@{story.igHandle}</span>
										<button
											type="button"
											class="copy-handle-btn"
											onclick={() => copyHandle(story.igHandle!)}
										>
											Kopier
										</button>
									</div>
								{:else}
									<span class="no-handle">Ingen IG-konto</span>
								{/if}
							</div>
						</article>
					{/each}
				</div>
				{#if handleCopyState !== 'idle'}
					<p class="copy-toast">
						{#if handleCopyState === 'copied'}@-handle kopiert
						{:else}Kopiering feilet{/if}
					</p>
				{/if}
			</section>
		{/if}

		<section class="alt-download">
			<a href={data.mp4DirectUrl} class="alt-link" target="_blank" rel="noopener">Direkte MP4-lenke (CDN)</a>
		</section>
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
		max-width: 720px;
		margin: 0 auto;
		padding: 16px 0;
	}

	.brand {
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 28px;
		font-weight: 700;
		color: var(--color-primary);
		text-decoration: none;
		letter-spacing: -0.01em;
	}

	.date {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.main {
		max-width: 720px;
		margin: 0 auto;
	}

	.title {
		margin: 8px 0 4px;
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 36px;
		font-weight: 700;
		line-height: 1.05;
		color: var(--color-text-primary);
	}

	.sub {
		margin: 0 0 20px;
		font-size: 15px;
		color: var(--color-text-secondary);
	}

	.video-wrap {
		background: #000;
		border-radius: 12px;
		overflow: hidden;
		max-width: 420px;
		margin: 0 auto 24px;
		aspect-ratio: 9 / 16;
	}

	.video {
		display: block;
		width: 100%;
		height: 100%;
	}

	.save-btn {
		display: block;
		width: 100%;
		max-width: 420px;
		margin: 0 auto 24px;
		padding: 18px 24px;
		background: var(--color-primary);
		color: #fff;
		border: none;
		border-radius: 12px;
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 22px;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		cursor: pointer;
		min-height: 56px;
	}

	.save-btn:active {
		transform: scale(0.98);
	}

	.save-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.instructions {
		background: var(--color-bg-surface);
		border: 2px solid var(--color-border);
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 20px;
	}

	.instructions h2 {
		margin: 0 0 12px;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.instructions ol {
		margin: 0;
		padding-left: 20px;
		font-size: 15px;
		line-height: 1.6;
		color: var(--color-text-secondary);
	}

	.instructions li {
		margin-bottom: 8px;
	}

	.caption-section {
		background: var(--color-bg-surface);
		border: 2px solid var(--color-border);
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 20px;
	}

	.caption-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}

	.caption-header h2 {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.copy-btn {
		background: var(--color-primary);
		color: #fff;
		border: none;
		border-radius: 8px;
		padding: 10px 18px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		min-height: 44px;
	}

	.copy-btn:active {
		transform: scale(0.98);
	}

	.caption {
		margin: 0;
		padding: 14px;
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		font-family: ui-monospace, Menlo, Consolas, monospace;
		font-size: 12px;
		line-height: 1.5;
		color: var(--color-text-primary);
		white-space: pre-wrap;
		word-wrap: break-word;
		max-height: 320px;
		overflow-y: auto;
	}

	.stories-section {
		background: var(--color-bg-surface);
		border: 2px solid var(--color-border);
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 20px;
	}

	.stories-section h2 {
		margin: 0 0 8px;
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.stories-intro {
		margin: 0 0 16px;
		font-size: 14px;
		line-height: 1.5;
		color: var(--color-text-secondary);
	}

	.stories-grid {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.story-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		background: #fff;
		border: 1px solid var(--color-border);
		border-radius: 12px;
	}

	.story-img {
		display: block;
		width: 100%;
		max-width: 420px;
		aspect-ratio: 9 / 16;
		object-fit: cover;
		border-radius: 8px;
		background: #1c1c1e;
		margin: 0 auto;
		-webkit-touch-callout: default;
		touch-action: manipulation;
	}

	.story-meta {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: center;
		text-align: center;
	}

	.story-title {
		margin: 0;
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 17px;
		font-weight: 700;
		line-height: 1.15;
		color: var(--color-text-primary);
	}

	.story-venue {
		margin: 0;
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	.handle-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.handle-pill {
		display: inline-flex;
		align-items: center;
		background: #fafaf7;
		border: 2px solid var(--color-primary);
		color: var(--color-primary);
		font-size: 15px;
		font-weight: 700;
		padding: 8px 16px;
		border-radius: 999px;
	}

	.copy-handle-btn {
		background: var(--color-primary);
		border: none;
		color: #fff;
		font-size: 14px;
		font-weight: 700;
		padding: 10px 18px;
		border-radius: 8px;
		cursor: pointer;
		min-height: 40px;
	}

	.copy-handle-btn:active {
		transform: scale(0.97);
	}

	.no-handle {
		font-size: 12px;
		color: var(--color-text-muted);
		font-style: italic;
	}

	.copy-toast {
		margin: 12px 0 0;
		text-align: center;
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	.alt-download {
		text-align: center;
		padding: 12px 0 32px;
	}

	.alt-link {
		font-size: 13px;
		color: var(--color-text-muted);
		text-decoration: underline;
	}
</style>
