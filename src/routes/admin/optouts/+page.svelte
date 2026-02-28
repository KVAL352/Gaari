<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import type { PageData } from './$types';
	import type { OptOutRow } from './+page.server';

	let { data }: { data: PageData } = $props();
	let optouts: OptOutRow[] = $derived(data.optouts);

	let rejectingId = $state<string | null>(null);

	function formatDate(d: string | null): string {
		if (!d) return '–';
		return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function impactColor(count: number): string {
		if (count === 0) return '#16a34a';
		if (count <= 5) return '#d97706';
		return '#dc2626';
	}

	function impactBg(count: number): string {
		if (count === 0) return '#D1FAE5';
		if (count <= 5) return '#FEF3C7';
		return '#FEE2E2';
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>Datahenvendelser — Admin</title>
</svelte:head>

<main style="max-width: 1100px; margin: 0 auto; padding: 24px 16px; font-family: Inter, system-ui, sans-serif;">
	<header style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start;">
		<div>
			<h1 style="font-family: 'Barlow Condensed', sans-serif; font-size: 36px; color: #141414; margin: 0 0 4px;">
				Datahenvendelser
			</h1>
			<p style="color: #737373; font-size: 14px; margin: 0;">
				Gjennomgå henvendelser fra arrangører om datainnsamling
			</p>
		</div>
		<AdminNav />
	</header>

	{#if optouts.length === 0}
	<div style="text-align: center; padding: 64px 24px; color: #737373;">
		<p style="font-size: 18px; margin: 0 0 8px;">Ingen ventende henvendelser</p>
		<p style="font-size: 14px; margin: 0;">Alle henvendelser er behandlet.</p>
	</div>
	{:else}
	<p style="font-size: 13px; color: #737373; margin-bottom: 16px;">
		{optouts.length} ventende {optouts.length === 1 ? 'henvendelse' : 'henvendelser'}
	</p>
	<div style="overflow-x: auto;">
		<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
			<thead>
				<tr style="border-bottom: 2px solid #e5e5e5; text-align: left;">
					<th style="padding: 10px 12px; font-weight: 600; white-space: nowrap;">Dato</th>
					<th style="padding: 10px 12px; font-weight: 600;">Organisasjon</th>
					<th style="padding: 10px 12px; font-weight: 600;">Domene</th>
					<th style="padding: 10px 12px; font-weight: 600;">E-post</th>
					<th style="padding: 10px 12px; font-weight: 600;">Melding</th>
					<th style="padding: 10px 12px; font-weight: 600; text-align: center; white-space: nowrap;">Events</th>
					<th style="padding: 10px 12px; font-weight: 600; text-align: center;">Handling</th>
				</tr>
			</thead>
			<tbody>
				{#each optouts as o (o.id)}
				<tr style="border-bottom: 1px solid #f0f0f0;">
					<td style="padding: 12px; white-space: nowrap; font-size: 13px; color: #737373;">
						{formatDate(o.created_at)}
					</td>
					<td style="padding: 12px; font-weight: 500;">
						{o.organization}
					</td>
					<td style="padding: 12px; font-family: 'Courier New', monospace; font-size: 13px; color: #4D4D4D;">
						{o.domain}
					</td>
					<td style="padding: 12px;">
						<a href="mailto:{o.contact_email}" style="color: #C82D2D; text-decoration: underline; font-size: 13px;">
							{o.contact_email}
						</a>
					</td>
					<td style="padding: 12px; font-size: 13px; color: #4D4D4D; max-width: 240px; word-break: break-word;">
						{o.reason || '(ingen melding)'}
					</td>
					<td style="padding: 12px; text-align: center;">
						<span style="display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; background: {impactBg(o.affected_event_count)}; color: {impactColor(o.affected_event_count)};">
							{o.affected_event_count}
						</span>
					</td>
					<td style="padding: 12px; text-align: center;">
						{#if rejectingId !== o.id}
						<div style="display: flex; gap: 8px; justify-content: center;">
							<form method="POST" action="?/approve" use:enhance style="display: inline;">
								<input type="hidden" name="id" value={o.id} />
								<button type="submit" style="padding: 6px 16px; border-radius: 6px; border: none; background: #16a34a; color: #fff; cursor: pointer; font-size: 13px; font-weight: 600; min-height: 36px; white-space: nowrap;">
									Fjern events
								</button>
							</form>
							<button type="button" onclick={() => rejectingId = o.id} style="padding: 6px 16px; border-radius: 6px; border: 1px solid #C82D2D; background: #fff; color: #C82D2D; cursor: pointer; font-size: 13px; font-weight: 600; min-height: 36px; white-space: nowrap;">
								Svar
							</button>
						</div>
						{/if}
					</td>
				</tr>
				{#if rejectingId === o.id}
				<tr style="background: #f9f9f9;">
					<td colspan="7" style="padding: 16px 20px;">
						<form method="POST" action="?/reject" use:enhance={() => {
							return async ({ update }) => {
								rejectingId = null;
								await update();
							};
						}}>
							<input type="hidden" name="id" value={o.id} />
							<div style="margin-bottom: 12px;">
								<label for="feedback-{o.id}" style="display: block; font-size: 13px; font-weight: 600; color: #4D4D4D; margin-bottom: 6px;">
									Svar til {o.organization}
								</label>
								<textarea
									id="feedback-{o.id}"
									name="feedback"
									rows="3"
									placeholder="Skriv et svar..."
									style="width: 100%; border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; font-size: 14px; font-family: Inter, system-ui, sans-serif; resize: vertical; box-sizing: border-box;"
								></textarea>
							</div>
							<div style="display: flex; gap: 8px;">
								<button type="submit" style="padding: 10px 24px; border-radius: 8px; border: none; background: #C82D2D; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;">
									Send svar
								</button>
								<button type="button" onclick={() => rejectingId = null} style="padding: 10px 24px; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; color: #4D4D4D; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;">
									Avbryt
								</button>
							</div>
						</form>
					</td>
				</tr>
				{/if}
				{/each}
			</tbody>
		</table>
	</div>
	{/if}
</main>
