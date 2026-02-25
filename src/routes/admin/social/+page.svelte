<script lang="ts">
	import type { PageData } from './$types';
	import type { SocialPost } from './+page.server';

	let { data }: { data: PageData } = $props();
	let posts: SocialPost[] = $derived(data.posts);
	let copiedId: string | null = $state(null);
	let expandedId: string | null = $state(null);

	const collectionNames: Record<string, string> = {
		'denne-helgen': 'Denne helgen i Bergen',
		'i-kveld': 'I kveld i Bergen',
		'gratis': 'Gratis i Bergen denne uken',
		'today-in-bergen': 'Today in Bergen',
		'familiehelg': 'Familiehelg i Bergen',
		'konserter': 'Konserter i Bergen denne uken',
		'studentkveld': 'Studentkveld i Bergen',
		'this-weekend': 'This Weekend in Bergen'
	};

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('nb-NO', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	}

	async function copyCaption(post: SocialPost) {
		try {
			await navigator.clipboard.writeText(post.caption);
			copiedId = post.id;
			setTimeout(() => { copiedId = null; }, 2000);
		} catch {
			// Fallback for older browsers
			const ta = document.createElement('textarea');
			ta.value = post.caption;
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
			copiedId = post.id;
			setTimeout(() => { copiedId = null; }, 2000);
		}
	}

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>Social Posts — Admin</title>
</svelte:head>

<main style="max-width: 960px; margin: 0 auto; padding: 24px 16px; font-family: Inter, system-ui, sans-serif;">
	<header style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start;">
		<div>
			<h1 style="font-family: 'Barlow Condensed', sans-serif; font-size: 36px; color: #141414; margin: 0 0 8px;">
				Social Posts
			</h1>
			<p style="color: #737373; font-size: 14px; margin: 0;">
				{new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
			</p>
		</div>
		<a href="/admin/logout" style="padding: 10px 16px; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; color: #737373; font-size: 13px; text-decoration: none; min-height: 44px; display: flex; align-items: center;">
			Logg ut
		</a>
	</header>

	{#if posts.length === 0}
		<div style="text-align: center; padding: 64px 24px; color: #737373;">
			<p style="font-size: 18px; margin: 0 0 8px;">Ingen innlegg generert enda</p>
			<p style="font-size: 14px; margin: 0;">Kjor <code>npm run social</code> i <code>scripts/</code> for a generere.</p>
		</div>
	{:else}
		<div style="display: flex; flex-direction: column; gap: 24px;">
			{#each posts as post (post.id)}
				<article style="border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; background: #fff;">
					<!-- Header -->
					<div style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
						<div>
							<h2 style="font-family: 'Barlow Condensed', sans-serif; font-size: 20px; color: #141414; margin: 0 0 4px;">
								{collectionNames[post.collection_slug] || post.collection_slug}
							</h2>
							<p style="color: #737373; font-size: 13px; margin: 0;">
								{formatDate(post.generated_date)}
								{#if post.post_time}
									&middot; {post.post_time}
								{/if}
								&middot; {post.event_count} arrangementer &middot; {post.slide_count} slides
							</p>
						</div>
						<button
							onclick={() => copyCaption(post)}
							style="padding: 8px 16px; border-radius: 8px; border: 1px solid #e5e5e5; background: {copiedId === post.id ? '#d4edda' : '#fff'}; cursor: pointer; font-size: 13px; color: {copiedId === post.id ? '#155724' : '#141414'}; min-height: 36px;"
						>
							{copiedId === post.id ? 'Kopiert!' : 'Kopier caption'}
						</button>
					</div>

					<!-- Slide thumbnails -->
					<div class="slide-row">
						{#each post.image_urls as url, i}
							<a href={url} target="_blank" rel="noopener noreferrer" class="slide-link">
								<img
									src={url}
									alt="Slide {i + 1}"
									width="140"
									height="140"
									class="slide-thumb"
								/>
							</a>
						{/each}
					</div>

					<!-- Caption preview -->
					<div style="padding: 0 20px 16px;">
						<button
							onclick={() => toggleExpand(post.id)}
							style="background: none; border: none; cursor: pointer; color: #C82D2D; font-size: 13px; padding: 4px 0;"
						>
							{expandedId === post.id ? 'Skjul caption' : 'Vis caption'}
						</button>
						{#if expandedId === post.id}
							<pre style="background: #f9f9f9; padding: 12px 16px; border-radius: 8px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; margin: 8px 0 0; color: #141414; overflow-x: auto;">{post.caption}</pre>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	{/if}
</main>

<style>
	.slide-row {
		padding: 16px 20px;
		display: flex;
		gap: 8px;
		overflow-x: auto;
	}

	.slide-link {
		flex-shrink: 0;
		display: block;
		width: 140px;
		height: 140px;
	}

	.slide-thumb {
		width: 140px;
		height: 140px;
		min-width: 140px;
		min-height: 140px;
		max-width: 140px;
		max-height: 140px;
		object-fit: cover;
		border-radius: 8px;
		border: 1px solid #d0d0d0;
		background: #f5f5f5;
		display: block;
	}
</style>
