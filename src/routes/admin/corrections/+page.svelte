<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import type { PageData } from './$types';
	import type { CorrectionRow } from './+page.server';

	let { data }: { data: PageData } = $props();
	let corrections: CorrectionRow[] = $derived(data.corrections);

	let expandedId = $state<string | null>(null);
	let rejectingId = $state<string | null>(null);

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function formatDate(d: string | null): string {
		if (!d) return '–';
		return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	const FIELD_LABELS: Record<string, string> = {
		title_no: 'Tittel (NO)',
		title_en: 'Tittel (EN)',
		description_no: 'Beskrivelse (NO)',
		description_en: 'Beskrivelse (EN)',
		venue_name: 'Sted',
		address: 'Adresse',
		bydel: 'Bydel',
		price: 'Pris',
		ticket_url: 'Billett-URL',
		category: 'Kategori',
		date_start: 'Startdato',
		date_end: 'Sluttdato',
		image_url: 'Bilde-URL',
		age_group: 'Aldersgruppe',
		language: 'Språk'
	};
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>Rettelser — Admin</title>
</svelte:head>

<main style="max-width: 1100px; margin: 0 auto; padding: 24px 16px; font-family: Inter, system-ui, sans-serif;">
	<header style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start;">
		<div>
			<h1 style="font-family: 'Barlow Condensed', sans-serif; font-size: 36px; color: #141414; margin: 0 0 4px;">
				Rettelser
			</h1>
			<p style="color: #737373; font-size: 14px; margin: 0;">
				Gjennomgå og behandle rettelsesforslag
			</p>
		</div>
		<AdminNav />
	</header>

	{#if corrections.length === 0}
	<div style="text-align: center; padding: 64px 24px; color: #737373;">
		<p style="font-size: 18px; margin: 0 0 8px;">Ingen ventende rettelser</p>
		<p style="font-size: 14px; margin: 0;">Alle rettelsesforslag er behandlet.</p>
	</div>
	{:else}
	<p style="font-size: 13px; color: #737373; margin-bottom: 16px;">
		{corrections.length} ventende {corrections.length === 1 ? 'rettelse' : 'rettelser'}
	</p>
	<div style="display: flex; flex-direction: column; gap: 12px;">
		{#each corrections as c (c.id)}
		<div style="border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; background: #fff;">
			<!-- Summary row -->
			<button
				onclick={() => toggleExpand(c.id)}
				style="width: 100%; display: grid; grid-template-columns: 1fr auto; align-items: center; padding: 16px 20px; background: none; border: none; cursor: pointer; text-align: left; gap: 16px; min-height: 44px;"
			>
				<div style="display: flex; flex-direction: column; gap: 4px; min-width: 0;">
					<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
						<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #DBEAFE; color: #1E40AF;">
							{FIELD_LABELS[c.field] ?? c.field}
						</span>
						<span style="font-weight: 600; color: #141414; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
							{c.event_title}
						</span>
					</div>
					<div style="font-size: 13px; color: #737373;">
						Innsendt {formatDate(c.created_at)}
					</div>
				</div>
				<span style="font-size: 18px; color: #999; transition: transform 0.2s; transform: {expandedId === c.id ? 'rotate(180deg)' : 'rotate(0)'};">
					&#9660;
				</span>
			</button>

			<!-- Expanded detail -->
			{#if expandedId === c.id}
			<div style="padding: 0 20px 20px; border-top: 1px solid #f0f0f0;">
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
					<div>
						<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Nåværende verdi</p>
						<p style="font-size: 14px; color: #141414; margin: 0; line-height: 1.5; padding: 8px 12px; background: #f9f9f9; border-radius: 6px; word-break: break-word;">
							{c.current_value || '(tom)'}
						</p>
					</div>
					<div>
						<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Foreslått verdi</p>
						<p style="font-size: 14px; color: #141414; margin: 0; line-height: 1.5; padding: 8px 12px; background: #FFFBEB; border-radius: 6px; border: 1px solid #FDE68A; word-break: break-word;">
							{c.suggested_value}
						</p>
					</div>
				</div>

				{#if c.reason}
				<div style="margin-top: 12px;">
					<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Begrunnelse</p>
					<p style="font-size: 14px; color: #141414; margin: 0; line-height: 1.5;">{c.reason}</p>
				</div>
				{/if}

				{#if c.email}
				<div style="margin-top: 12px;">
					<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Innsenders e-post</p>
					<p style="font-size: 14px; color: #141414; margin: 0;">{c.email}</p>
				</div>
				{/if}

				{#if c.event_slug}
				<div style="margin-top: 12px;">
					<a href="/no/events/{c.event_slug}" target="_blank" rel="noopener noreferrer" style="font-size: 14px; color: #C82D2D; text-decoration: underline;">
						Se arrangement
					</a>
				</div>
				{/if}

				<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #f0f0f0;">
					{#if rejectingId === c.id}
					<form method="POST" action="?/reject" use:enhance={() => {
						return async ({ update }) => {
							rejectingId = null;
							await update();
						};
					}}>
						<input type="hidden" name="id" value={c.id} />
						<div style="margin-bottom: 12px;">
							<label for="feedback-{c.id}" style="display: block; font-size: 13px; font-weight: 600; color: #4D4D4D; margin-bottom: 6px;">
								Tilbakemelding til innsender
								{#if !c.email}
									<span style="font-weight: 400; color: #999;"> (ingen e-post oppgitt — sendes ikke)</span>
								{/if}
							</label>
							<textarea
								id="feedback-{c.id}"
								name="feedback"
								rows="3"
								placeholder="Forklar hvorfor rettelsen ikke godkjennes..."
								style="width: 100%; border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; font-size: 14px; font-family: Inter, system-ui, sans-serif; resize: vertical; box-sizing: border-box;"
							></textarea>
						</div>
						<div style="display: flex; gap: 8px;">
							<button type="submit" style="padding: 10px 24px; border-radius: 8px; border: none; background: #dc2626; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;">
								{c.email ? 'Avvis og send e-post' : 'Avvis'}
							</button>
							<button type="button" onclick={() => rejectingId = null} style="padding: 10px 24px; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; color: #4D4D4D; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;">
								Avbryt
							</button>
						</div>
					</form>
					{:else}
					<div style="display: flex; gap: 12px;">
						<form method="POST" action="?/apply" use:enhance>
							<input type="hidden" name="id" value={c.id} />
							<button type="submit" style="padding: 10px 24px; border-radius: 8px; border: none; background: #16a34a; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;">
								Godkjenn
							</button>
						</form>
						<button type="button" onclick={() => rejectingId = c.id} style="padding: 10px 24px; border-radius: 8px; border: 1px solid #dc2626; background: #fff; color: #dc2626; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;">
							Avvis
						</button>
					</div>
					{/if}
				</div>
			</div>
			{/if}
		</div>
		{/each}
	</div>
	{/if}
</main>
