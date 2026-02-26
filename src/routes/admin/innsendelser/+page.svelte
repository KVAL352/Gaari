<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import type { InquiryRow } from './+page.server';

	let { data }: { data: PageData } = $props();
	let inquiries: InquiryRow[] = $derived(data.inquiries);

	function formatDateTime(d: string | null): string {
		if (!d) return '–';
		return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function isWebsiteSubmission(message: string | null): boolean {
		return !!message && message.startsWith('Nettside-innsendelse');
	}

	function cleanMessage(message: string | null): string {
		if (!message) return '–';
		return message.replace(/^Nettside-innsendelse\n?\n?/, '').trim() || '–';
	}

	const STATUS_LABELS: Record<string, string> = {
		new: 'Ny',
		contacted: 'Kontaktet',
		converted: 'Konvertert',
		declined: 'Avslått'
	};

	const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
		new: { bg: '#DBEAFE', text: '#1E40AF' },
		contacted: { bg: '#FEF3C7', text: '#92400E' },
		converted: { bg: '#D1FAE5', text: '#065F46' },
		declined: { bg: '#FEE2E2', text: '#991B1B' }
	};

	let decliningId = $state<string | null>(null);

	function handleStatusChange(e: Event, inquiry: InquiryRow) {
		const select = e.currentTarget as HTMLSelectElement;
		if (select.value === 'declined') {
			// Don't auto-submit — open the decline feedback form instead
			select.value = inquiry.status;
			decliningId = inquiry.id;
		} else {
			select.form?.requestSubmit();
		}
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>Innsendelser — Admin</title>
</svelte:head>

<main style="max-width: 1100px; margin: 0 auto; padding: 24px 16px; font-family: Inter, system-ui, sans-serif;">
	<header style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start;">
		<div>
			<h1 style="font-family: 'Barlow Condensed', sans-serif; font-size: 36px; color: #141414; margin: 0 0 4px;">
				Innsendelser
			</h1>
			<p style="color: #737373; font-size: 14px; margin: 0;">
				Henvendelser fra arrangører og nettside-innsendelser
			</p>
		</div>
		<div style="display: flex; gap: 8px; align-items: center;">
			<a href="/admin/promotions" style="padding: 10px 16px; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; color: #737373; font-size: 13px; text-decoration: none; min-height: 44px; display: flex; align-items: center;">
				Plasseringer
			</a>
			<a href="/admin/submissions" style="padding: 10px 16px; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; color: #737373; font-size: 13px; text-decoration: none; min-height: 44px; display: flex; align-items: center;">
				Arrangementer
			</a>
			<a href="/admin/logout" style="padding: 10px 16px; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; color: #737373; font-size: 13px; text-decoration: none; min-height: 44px; display: flex; align-items: center;">
				Logg ut
			</a>
		</div>
	</header>

	{#if inquiries.length === 0}
	<div style="text-align: center; padding: 64px 24px; color: #737373;">
		<p style="font-size: 18px; margin: 0 0 8px;">Ingen henvendelser</p>
		<p style="font-size: 14px; margin: 0;">Henvendelser fra arrangører og nettside-innsendelser vises her.</p>
	</div>
	{:else}
	<p style="font-size: 13px; color: #737373; margin-bottom: 16px;">
		{inquiries.length} {inquiries.length === 1 ? 'henvendelse' : 'henvendelser'}
	</p>
	<div style="overflow-x: auto;">
		<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
			<thead>
				<tr style="border-bottom: 2px solid #e5e5e5; text-align: left;">
					<th style="padding: 10px 12px; font-weight: 600; color: #141414; white-space: nowrap;">Dato</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414; white-space: nowrap;">Type</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414; white-space: nowrap;">Organisasjon</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414; white-space: nowrap;">Navn</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414; white-space: nowrap;">E-post</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414;">Melding</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414; white-space: nowrap;">Status</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414;">Notater</th>
				</tr>
			</thead>
			<tbody>
				{#each inquiries as inquiry (inquiry.id)}
				<tr style="border-bottom: 1px solid #f0f0f0; vertical-align: top;">
					<td style="padding: 12px; white-space: nowrap; color: #4d4d4d; font-size: 13px;">
						{formatDateTime(inquiry.created_at)}
					</td>
					<td style="padding: 12px; white-space: nowrap;">
						{#if isWebsiteSubmission(inquiry.message)}
						<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #E8F4FD; color: #0A4A7A;">
							Nettside
						</span>
						{:else}
						<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #F3E8FD; color: #5B21B6;">
							Kontakt
						</span>
						{/if}
					</td>
					<td style="padding: 12px; font-weight: 500; color: #141414; max-width: 160px;">
						{#if isWebsiteSubmission(inquiry.message) && inquiry.organization.startsWith('http')}
						<a href={inquiry.organization} target="_blank" rel="noopener noreferrer" style="color: #C82D2D; word-break: break-all;">
							{inquiry.organization}
						</a>
						{:else}
						<span style="word-break: break-word;">{inquiry.organization}</span>
						{/if}
					</td>
					<td style="padding: 12px; color: #141414; white-space: nowrap;">{inquiry.name}</td>
					<td style="padding: 12px;">
						<a href="mailto:{inquiry.email}" style="color: #C82D2D; word-break: break-all;">{inquiry.email}</a>
					</td>
					<td style="padding: 12px; color: #4d4d4d; max-width: 240px; font-size: 13px;">
						<span style="word-break: break-word;">{cleanMessage(inquiry.message)}</span>
					</td>
					<td style="padding: 12px; white-space: nowrap;">
						<form method="POST" action="?/updateStatus" use:enhance style="display: inline;">
							<input type="hidden" name="id" value={inquiry.id} />
							<select
								name="status"
								onchange={(e) => handleStatusChange(e, inquiry)}
								style="padding: 4px 8px; border: 1px solid #d0d0d0; border-radius: 6px; font-size: 12px; font-weight: 600; min-height: 32px; cursor: pointer; background: {STATUS_COLORS[inquiry.status]?.bg ?? '#f0f0f0'}; color: {STATUS_COLORS[inquiry.status]?.text ?? '#4d4d4d'};"
							>
								{#each Object.entries(STATUS_LABELS) as [value, label] (value)}
								<option {value} selected={inquiry.status === value}>{label}</option>
								{/each}
							</select>
						</form>
					</td>
					<td style="padding: 12px; min-width: 180px;">
						<form method="POST" action="?/updateNotes" use:enhance style="display: flex; gap: 4px; align-items: flex-start;">
							<input type="hidden" name="id" value={inquiry.id} />
							<textarea
								name="notes"
								rows="2"
								placeholder="Interne notater..."
								style="flex: 1; padding: 6px 8px; border: 1px solid #d0d0d0; border-radius: 6px; font-size: 12px; font-family: Inter, system-ui, sans-serif; resize: vertical; box-sizing: border-box;"
							>{inquiry.notes ?? ''}</textarea>
							<button
								type="submit"
								style="padding: 6px 10px; border-radius: 6px; border: 1px solid #d0d0d0; background: #fff; color: #4d4d4d; cursor: pointer; font-size: 12px; white-space: nowrap; min-height: 32px;"
							>
								Lagre
							</button>
						</form>
					</td>
				</tr>
				{#if decliningId === inquiry.id}
				<tr style="border-bottom: 1px solid #f0f0f0; background: #fef2f2;">
					<td colspan="8" style="padding: 16px 12px;">
						<form method="POST" action="?/decline" use:enhance={() => {
							return async ({ update }) => {
								decliningId = null;
								await update();
							};
						}}>
							<input type="hidden" name="id" value={inquiry.id} />
							<div style="max-width: 600px;">
								<p style="font-size: 14px; font-weight: 600; color: #141414; margin: 0 0 8px;">
									Avslå henvendelse fra {inquiry.name}
								</p>
								<p style="font-size: 13px; color: #737373; margin: 0 0 12px;">
									Skriv en tilbakemelding som sendes til {inquiry.email}.
								</p>
								<textarea
									name="feedback"
									rows="3"
									placeholder="Forklar hvorfor henvendelsen avslås..."
									style="width: 100%; border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; font-size: 14px; font-family: Inter, system-ui, sans-serif; resize: vertical; box-sizing: border-box; margin-bottom: 12px;"
								></textarea>
								<div style="display: flex; gap: 8px;">
									<button
										type="submit"
										style="padding: 10px 24px; border-radius: 8px; border: none; background: #dc2626; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;"
									>
										Avslå og send e-post
									</button>
									<button
										type="button"
										onclick={() => decliningId = null}
										style="padding: 10px 24px; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; color: #4D4D4D; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;"
									>
										Avbryt
									</button>
								</div>
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
