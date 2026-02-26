<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import type { SubmissionRow } from './+page.server';

	let { data }: { data: PageData } = $props();
	let submissions: SubmissionRow[] = $derived(data.submissions);

	let expandedId = $state<string | null>(null);
	let rejectingId = $state<string | null>(null);

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function formatDate(d: string | null): string {
		if (!d) return '–';
		return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function formatDateTime(d: string | null): string {
		if (!d) return '–';
		return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	const CATEGORY_LABELS: Record<string, string> = {
		music: 'Musikk',
		culture: 'Kultur',
		theatre: 'Teater',
		family: 'Familie',
		food: 'Mat & drikke',
		festival: 'Festival',
		sports: 'Sport',
		nightlife: 'Uteliv',
		workshop: 'Workshop',
		student: 'Student',
		tours: 'Omvisning'
	};
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>Innsendte arrangementer — Admin</title>
</svelte:head>

<main style="max-width: 1100px; margin: 0 auto; padding: 24px 16px; font-family: Inter, system-ui, sans-serif;">
	<header style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start;">
		<div>
			<h1 style="font-family: 'Barlow Condensed', sans-serif; font-size: 36px; color: #141414; margin: 0 0 4px;">
				Innsendte arrangementer
			</h1>
			<p style="color: #737373; font-size: 14px; margin: 0;">
				Gjennomgå og godkjenn brukerinnsendte arrangementer
			</p>
		</div>
		<div style="display: flex; gap: 8px; align-items: center;">
			<a href="/admin/promotions" style="padding: 10px 16px; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; color: #737373; font-size: 13px; text-decoration: none; min-height: 44px; display: flex; align-items: center;">
				Plasseringer
			</a>
			<a href="/admin/logout" style="padding: 10px 16px; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; color: #737373; font-size: 13px; text-decoration: none; min-height: 44px; display: flex; align-items: center;">
				Logg ut
			</a>
		</div>
	</header>

	{#if submissions.length === 0}
	<div style="text-align: center; padding: 64px 24px; color: #737373;">
		<p style="font-size: 18px; margin: 0 0 8px;">Ingen ventende innsendelser</p>
		<p style="font-size: 14px; margin: 0;">Alle arrangementer er gjennomgått.</p>
	</div>
	{:else}
	<p style="font-size: 13px; color: #737373; margin-bottom: 16px;">
		{submissions.length} ventende {submissions.length === 1 ? 'innsendelse' : 'innsendelser'}
	</p>
	<div style="display: flex; flex-direction: column; gap: 12px;">
		{#each submissions as s (s.id)}
		<div style="border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; background: #fff;">
			<!-- Summary row -->
			<button
				onclick={() => toggleExpand(s.id)}
				style="width: 100%; display: grid; grid-template-columns: 1fr auto; align-items: center; padding: 16px 20px; background: none; border: none; cursor: pointer; text-align: left; gap: 16px; min-height: 44px;"
			>
				<div style="display: flex; flex-direction: column; gap: 4px; min-width: 0;">
					<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
						<span style="font-weight: 600; color: #141414; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
							{s.title_no}
						</span>
						<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #F0F0F0; color: #4D4D4D;">
							{CATEGORY_LABELS[s.category] ?? s.category}
						</span>
					</div>
					<div style="font-size: 13px; color: #737373; display: flex; gap: 12px; flex-wrap: wrap;">
						<span>{s.venue_name}</span>
						<span>{formatDateTime(s.date_start)}</span>
						<span>Innsendt {formatDate(s.created_at)}</span>
					</div>
				</div>
				<span style="font-size: 18px; color: #999; transition: transform 0.2s; transform: {expandedId === s.id ? 'rotate(180deg)' : 'rotate(0)'};">
					&#9660;
				</span>
			</button>

			<!-- Expanded detail -->
			{#if expandedId === s.id}
			<div style="padding: 0 20px 20px; border-top: 1px solid #f0f0f0;">
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
					<div>
						<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Tittel (NO)</p>
						<p style="font-size: 14px; color: #141414; margin: 0;">{s.title_no}</p>
					</div>
					{#if s.title_en}
					<div>
						<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Tittel (EN)</p>
						<p style="font-size: 14px; color: #141414; margin: 0;">{s.title_en}</p>
					</div>
					{/if}
				</div>

				<div style="margin-top: 16px;">
					<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Beskrivelse (NO)</p>
					<p style="font-size: 14px; color: #141414; margin: 0; line-height: 1.5;">{s.description_no}</p>
				</div>

				{#if s.description_en}
				<div style="margin-top: 12px;">
					<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Beskrivelse (EN)</p>
					<p style="font-size: 14px; color: #141414; margin: 0; line-height: 1.5;">{s.description_en}</p>
				</div>
				{/if}

				<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-top: 16px;">
					<div>
						<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Dato</p>
						<p style="font-size: 14px; color: #141414; margin: 0;">{formatDateTime(s.date_start)}{s.date_end ? ` – ${formatDateTime(s.date_end)}` : ''}</p>
					</div>
					<div>
						<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Adresse</p>
						<p style="font-size: 14px; color: #141414; margin: 0;">{s.address}</p>
					</div>
					<div>
						<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Bydel</p>
						<p style="font-size: 14px; color: #141414; margin: 0;">{s.bydel}</p>
					</div>
					<div>
						<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Pris</p>
						<p style="font-size: 14px; color: #141414; margin: 0;">{s.price || '–'}</p>
					</div>
				</div>

				{#if s.ticket_url}
				<div style="margin-top: 12px;">
					<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Billett-URL</p>
					<a href={s.ticket_url} target="_blank" rel="noopener noreferrer" style="font-size: 14px; color: #C82D2D; word-break: break-all;">{s.ticket_url}</a>
				</div>
				{/if}

				{#if s.image_url}
				<div style="margin-top: 16px;">
					<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Bilde</p>
					<img
						src={s.image_url}
						alt={s.title_no}
						style="max-width: 400px; width: 100%; border-radius: 8px; aspect-ratio: 16/9; object-fit: cover;"
					/>
				</div>
				{/if}

				<!-- Submitter email -->
				{#if s.submitter_email}
				<div style="margin-top: 12px;">
					<p style="font-size: 12px; font-weight: 600; color: #737373; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Innsenders e-post</p>
					<p style="font-size: 14px; color: #141414; margin: 0;">{s.submitter_email}</p>
				</div>
				{/if}

				<!-- Action buttons -->
				<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #f0f0f0;">
					{#if rejectingId === s.id}
					<!-- Reject feedback form -->
					<form method="POST" action="?/reject" use:enhance={() => {
						return async ({ update }) => {
							rejectingId = null;
							await update();
						};
					}}>
						<input type="hidden" name="id" value={s.id} />
						<div style="margin-bottom: 12px;">
							<label for="feedback-{s.id}" style="display: block; font-size: 13px; font-weight: 600; color: #4D4D4D; margin-bottom: 6px;">
								Tilbakemelding til innsender
								{#if !s.submitter_email}
									<span style="font-weight: 400; color: #999;"> (ingen e-post oppgitt — sendes ikke)</span>
								{/if}
							</label>
							<textarea
								id="feedback-{s.id}"
								name="feedback"
								rows="3"
								placeholder="Forklar hvorfor arrangementet ikke godkjennes..."
								style="width: 100%; border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; font-size: 14px; font-family: Inter, system-ui, sans-serif; resize: vertical; box-sizing: border-box;"
							></textarea>
						</div>
						<div style="display: flex; gap: 8px;">
							<button
								type="submit"
								style="padding: 10px 24px; border-radius: 8px; border: none; background: #dc2626; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;"
							>
								{s.submitter_email ? 'Avvis og send e-post' : 'Avvis og slett'}
							</button>
							<button
								type="button"
								onclick={() => rejectingId = null}
								style="padding: 10px 24px; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; color: #4D4D4D; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;"
							>
								Avbryt
							</button>
						</div>
					</form>
					{:else}
					<!-- Normal action buttons -->
					<div style="display: flex; gap: 12px;">
						<form method="POST" action="?/approve" use:enhance>
							<input type="hidden" name="id" value={s.id} />
							<button
								type="submit"
								style="padding: 10px 24px; border-radius: 8px; border: none; background: #16a34a; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;"
							>
								Godkjenn
							</button>
						</form>
						<button
							type="button"
							onclick={() => rejectingId = s.id}
							style="padding: 10px 24px; border-radius: 8px; border: 1px solid #dc2626; background: #fff; color: #dc2626; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;"
						>
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
