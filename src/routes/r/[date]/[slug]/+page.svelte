<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let copyState = $state<'idle' | 'copied' | 'error'>('idle');
	let saveState = $state<'idle' | 'loading' | 'shared' | 'error'>('idle');

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

	/**
	 * iOS Safari (15+) and modern Android Chrome support sharing files via the
	 * Web Share API. Fetching the MP4 as a Blob and passing it through
	 * navigator.share opens the native share sheet — on iOS that includes a
	 * "Save Video" action that drops the file straight into Photos, which is
	 * what Instagram Reels reads from. Falls back to opening the MP4 in a new
	 * tab on browsers that lack file-sharing support.
	 */
	async function shareVideo() {
		saveState = 'loading';
		try {
			const res = await fetch(data.mp4Url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const blob = await res.blob();
			const file = new File([blob], `reel-${data.slug}.mp4`, { type: 'video/mp4' });
			const canShareFiles =
				typeof navigator !== 'undefined' &&
				typeof navigator.canShare === 'function' &&
				navigator.canShare({ files: [file] });
			if (canShareFiles) {
				await navigator.share({ files: [file], title: data.collectionTitle });
				saveState = 'shared';
			} else {
				window.location.href = data.mp4Url;
				saveState = 'idle';
				return;
			}
		} catch (err) {
			// User cancellation throws AbortError — treat as idle, not error
			if ((err as Error)?.name === 'AbortError') {
				saveState = 'idle';
				return;
			}
			saveState = 'error';
		} finally {
			setTimeout(() => {
				if (saveState === 'shared' || saveState === 'error') saveState = 'idle';
			}, 3000);
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

		<button type="button" class="save-btn" onclick={shareVideo} disabled={saveState === 'loading'}>
			{#if saveState === 'loading'}Henter video...
			{:else if saveState === 'shared'}Delt
			{:else if saveState === 'error'}Noe gikk galt
			{:else}Lagre videoen{/if}
		</button>

		<section class="instructions">
			<h2>Slik lagrer du videoen</h2>
			<ol>
				<li>Trykk <strong>Lagre videoen</strong> over.</li>
				<li><strong>iPhone:</strong> i delemenyen som åpnes, velg <strong>Lagre video</strong>. Videoen havner i Bilder.</li>
				<li><strong>Android:</strong> velg <strong>Lagre i Galleri</strong> eller en filbehandler.</li>
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
