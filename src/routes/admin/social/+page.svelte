<script lang="ts">
	import AdminNav from '$lib/components/AdminNav.svelte';
	import type { PageData } from './$types';
	import type { SocialPost, SocialInsight } from './+page.server';

	let { data }: { data: PageData } = $props();
	let posts: SocialPost[] = $derived(data.posts);
	let insights: SocialInsight[] = $derived(data.insights);
	let copiedId: string | null = $state(null);
	let expandedId: string | null = $state(null);
	let activeTab: 'posts' | 'insights' = $state('posts');

	/** Find insight metrics for a social_post by matching IDs */
	function getInsightsForPost(post: SocialPost): { ig: SocialInsight | null; fb: SocialInsight | null } {
		const ig = post.instagram_id ? insights.find(i => i.platform === 'ig' && i.platform_id === post.instagram_id) ?? null : null;
		const fb = post.facebook_id ? insights.find(i => i.platform === 'fb' && i.platform_id === post.facebook_id) ?? null : null;
		return { ig, fb };
	}

	/** Standalone insights (manual posts, not linked to social_posts) */
	let standaloneInsights: SocialInsight[] = $derived(
		insights.filter(i => !i.social_post_id)
	);

	function formatMetric(val: number | undefined): string {
		if (val === undefined || val === null) return '-';
		if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
		return String(val);
	}

	const collectionNames: Record<string, string> = {
		'denne-helgen': 'Denne helgen i Bergen',
		'i-kveld': 'I kveld i Bergen',
		'gratis': 'Gratis i Bergen',
		'today-in-bergen': 'Today in Bergen',
		'familiehelg': 'Familiehelg i Bergen',
		'konserter': 'Konserter i Bergen',
		'studentkveld': 'Studentkveld i Bergen',
		'this-weekend': 'This Weekend in Bergen',
		'teater': 'Teater i Bergen',
		'utstillinger': 'Utstillinger i Bergen',
		'mat-og-drikke': 'Mat og drikke i Bergen'
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
		<AdminNav />
	</header>

	<!-- Tab navigation -->
	<div style="display: flex; gap: 0; margin-bottom: 24px; border-bottom: 2px solid #e5e5e5;">
		<button
			onclick={() => activeTab = 'posts'}
			style="padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 600; color: {activeTab === 'posts' ? '#C82D2D' : '#737373'}; border-bottom: 2px solid {activeTab === 'posts' ? '#C82D2D' : 'transparent'}; margin-bottom: -2px;"
		>
			Genererte poster ({posts.length})
		</button>
		<button
			onclick={() => activeTab = 'insights'}
			style="padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 600; color: {activeTab === 'insights' ? '#C82D2D' : '#737373'}; border-bottom: 2px solid {activeTab === 'insights' ? '#C82D2D' : 'transparent'}; margin-bottom: -2px;"
		>
			Innsikt ({insights.length})
		</button>
	</div>

	{#if activeTab === 'posts'}
		{#if posts.length === 0}
			<div style="text-align: center; padding: 64px 24px; color: #737373;">
				<p style="font-size: 18px; margin: 0 0 8px;">Ingen innlegg generert enda</p>
				<p style="font-size: 14px; margin: 0;">Kjor <code>npm run social</code> i <code>scripts/</code> for a generere.</p>
			</div>
		{:else}
			<div style="display: flex; flex-direction: column; gap: 24px;">
				{#each posts as post (post.id)}
					{@const postInsights = getInsightsForPost(post)}
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
									{#if post.instagram_id}
										&middot; <span style="color: #16a34a;">IG</span>
									{/if}
									{#if post.facebook_id}
										&middot; <span style="color: #2563eb;">FB</span>
									{/if}
								</p>
							</div>
							<button
								onclick={() => copyCaption(post)}
								style="padding: 8px 16px; border-radius: 8px; border: 1px solid #e5e5e5; background: {copiedId === post.id ? '#d4edda' : '#fff'}; cursor: pointer; font-size: 13px; color: {copiedId === post.id ? '#155724' : '#141414'}; min-height: 36px;"
							>
								{copiedId === post.id ? 'Kopiert!' : 'Kopier caption'}
							</button>
						</div>

						<!-- Metrics row (if insights available) -->
						{#if postInsights.ig || postInsights.fb}
							<div style="padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #f0f0f0; display: flex; gap: 24px; flex-wrap: wrap;">
								{#if postInsights.ig}
									{@const m = postInsights.ig.metrics}
									<div style="font-size: 13px;">
										<strong style="color: #E1306C;">IG</strong>
										{#if m.reach !== undefined}<span style="margin-left: 8px;">Rekkevidde: <strong>{formatMetric(m.reach)}</strong></span>{/if}
										{#if m.impressions !== undefined}<span style="margin-left: 8px;">Visninger: <strong>{formatMetric(m.impressions)}</strong></span>{/if}
										{#if m.likes !== undefined}<span style="margin-left: 8px;">Likes: <strong>{formatMetric(m.likes)}</strong></span>{/if}
										{#if m.comments !== undefined && m.comments > 0}<span style="margin-left: 8px;">Kommentarer: <strong>{m.comments}</strong></span>{/if}
										{#if m.saved !== undefined && m.saved > 0}<span style="margin-left: 8px;">Lagret: <strong>{m.saved}</strong></span>{/if}
										{#if m.shares !== undefined && m.shares > 0}<span style="margin-left: 8px;">Delt: <strong>{m.shares}</strong></span>{/if}
									</div>
								{/if}
								{#if postInsights.fb}
									{@const m = postInsights.fb.metrics}
									<div style="font-size: 13px;">
										<strong style="color: #1877F2;">FB</strong>
										{#if m.reactions !== undefined}<span style="margin-left: 8px;">Reaksjoner: <strong>{formatMetric(m.reactions)}</strong></span>{/if}
										{#if m.comments !== undefined && m.comments > 0}<span style="margin-left: 8px;">Kommentarer: <strong>{m.comments}</strong></span>{/if}
										{#if m.shares !== undefined && m.shares > 0}<span style="margin-left: 8px;">Delinger: <strong>{m.shares}</strong></span>{/if}
									</div>
								{/if}
							</div>
						{/if}

						<!-- Slide thumbnails -->
						<div class="slide-row">
							{#each post.image_urls as url, i (url)}
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

	{:else}
		<!-- Insights tab -->
		{#if insights.length === 0}
			<div style="text-align: center; padding: 64px 24px; color: #737373;">
				<p style="font-size: 18px; margin: 0 0 8px;">Ingen innsiktsdata enda</p>
				<p style="font-size: 14px; margin: 0;">Kjor <code>npx tsx social/fetch-social-insights.ts</code> i <code>scripts/</code></p>
			</div>
		{:else}
			<div style="overflow-x: auto;">
				<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
					<thead>
						<tr style="background: #f5f5f5;">
							<th style="text-align: left; padding: 10px 12px; border-bottom: 2px solid #e5e5e5;"></th>
							<th style="text-align: left; padding: 10px 12px; border-bottom: 2px solid #e5e5e5;">Dato</th>
							<th style="text-align: left; padding: 10px 12px; border-bottom: 2px solid #e5e5e5;">Innhold</th>
							<th style="text-align: right; padding: 10px 12px; border-bottom: 2px solid #e5e5e5;">Rekkevidde</th>
							<th style="text-align: right; padding: 10px 12px; border-bottom: 2px solid #e5e5e5;">Engasjement</th>
							<th style="text-align: right; padding: 10px 12px; border-bottom: 2px solid #e5e5e5;">Delinger</th>
							<th style="text-align: center; padding: 10px 12px; border-bottom: 2px solid #e5e5e5;">Kilde</th>
						</tr>
					</thead>
					<tbody>
						{#each insights as insight (insight.id)}
							{@const m = insight.metrics}
							{@const reach = m.reach}
							{@const engagement = insight.platform === 'ig' ? m.likes : m.reactions}
							{@const shares = m.shares}
							<tr style="border-bottom: 1px solid #f0f0f0;">
								<td style="padding: 10px 12px;">
									{#if insight.platform === 'ig'}
										<span style="color: #E1306C; font-weight: 600;">IG</span>
									{:else}
										<span style="color: #1877F2; font-weight: 600;">FB</span>
									{/if}
								</td>
								<td style="padding: 10px 12px; white-space: nowrap;">
									{new Date(insight.posted_at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}
								</td>
								<td style="padding: 10px 12px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #555;">
									{#if insight.permalink}
										<a href={insight.permalink} target="_blank" rel="noopener noreferrer" style="color: #C82D2D; text-decoration: underline;">
											{insight.caption?.split('\n')[0]?.slice(0, 50) || 'Se post'}
										</a>
									{:else}
										{insight.caption?.split('\n')[0]?.slice(0, 50) || '-'}
									{/if}
								</td>
								<td style="padding: 10px 12px; text-align: right; font-weight: 600;">{reach !== undefined ? formatMetric(reach) : '-'}</td>
								<td style="padding: 10px 12px; text-align: right;">{engagement !== undefined ? formatMetric(engagement) : '-'}</td>
								<td style="padding: 10px 12px; text-align: right;">{shares !== undefined ? formatMetric(shares) : '-'}</td>
								<td style="padding: 10px 12px; text-align: center;">
									{#if insight.social_post_id}
										<span style="background: #D1FAE5; color: #065F46; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Auto</span>
									{:else}
										<span style="background: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Manuell</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
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
