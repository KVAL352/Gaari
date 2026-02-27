<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import type { PageData } from './$types';
	import type { PlacementRow } from './+page.server';

	let { data }: { data: PageData } = $props();
	let placements: PlacementRow[] = $derived(data.placements);

	const ALL_COLLECTIONS = [
		{ slug: 'denne-helgen', label: 'Denne helgen (NO)' },
		{ slug: 'this-weekend', label: 'This Weekend (EN)' },
		{ slug: 'i-kveld', label: 'I kveld (NO)' },
		{ slug: 'i-dag', label: 'I dag (NO)' },
		{ slug: 'today-in-bergen', label: 'Today in Bergen (EN)' },
		{ slug: 'gratis', label: 'Gratis (NO)' },
		{ slug: 'free-things-to-do-bergen', label: 'Free Things (EN)' },
		{ slug: 'familiehelg', label: 'Familiehelg (NO)' },
		{ slug: 'konserter', label: 'Konserter (NO)' },
		{ slug: 'studentkveld', label: 'Studentkveld (NO)' },
		{ slug: 'regndagsguide', label: 'Regndagsguide (NO)' },
		{ slug: 'sentrum', label: 'Sentrum (NO)' },
		{ slug: 'voksen', label: 'Voksen (NO)' }
	];

	const TIER_LABELS: Record<string, string> = {
		basis: 'Basis (15%)',
		standard: 'Standard (25%)',
		partner: 'Partner (35%)'
	};

	function formatDate(d: string | null): string {
		if (!d) return '–';
		return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	// Today's date in YYYY-MM-DD for default start_date
	const today = new Date().toISOString().slice(0, 10);

	let showForm = $state(false);
	let selectedTier = $state('basis');
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>Fremhevede plasseringer — Admin</title>
</svelte:head>

<main style="max-width: 1100px; margin: 0 auto; padding: 24px 16px; font-family: Inter, system-ui, sans-serif;">
	<header style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start;">
		<div>
			<h1 style="font-family: 'Barlow Condensed', sans-serif; font-size: 36px; color: #141414; margin: 0 0 4px;">
				Fremhevede plasseringer
			</h1>
			<p style="color: #737373; font-size: 14px; margin: 0;">
				Betalende venues — topp-plassering på samlingsider
			</p>
		</div>
		<div style="display: flex; gap: 8px; align-items: center;">
		<AdminNav />
		<button
			onclick={() => { showForm = !showForm; }}
			style="padding: 10px 20px; border-radius: 8px; border: none; background: #C82D2D; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;"
		>
			{showForm ? 'Avbryt' : '+ Legg til plassering'}
		</button>
		</div>
	</header>

	<!-- Add placement form -->
	{#if showForm}
	<section style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
		<h2 style="font-family: 'Barlow Condensed', sans-serif; font-size: 22px; color: #141414; margin: 0 0 20px;">
			Ny plassering
		</h2>
		<form method="POST" action="?/create" use:enhance style="display: grid; gap: 16px;">
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
				<div>
					<label for="venue_name" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 6px;">
						Venue-navn <span style="color: #C82D2D;">*</span>
					</label>
					<input
						id="venue_name"
						name="venue_name"
						type="text"
						required
						placeholder="Eksakt venue_name fra events-tabellen"
						style="width: 100%; padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; min-height: 40px; box-sizing: border-box;"
					/>
				</div>
				<div>
					<label for="tier" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 6px;">
						Tier <span style="color: #C82D2D;">*</span>
					</label>
					<select
						id="tier"
						name="tier"
						required
						bind:value={selectedTier}
						style="width: 100%; padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; min-height: 40px; box-sizing: border-box; background: #fff;"
					>
						<option value="basis">Basis — 1 500 kr/mnd (15% slot)</option>
						<option value="standard">Standard — 3 500 kr/mnd (25% slot)</option>
						<option value="partner">Partner — 7 000 kr/mnd (35% slot)</option>
					</select>
				</div>
			</div>

			<div>
				<fieldset style="border: 1px solid #d0d0d0; border-radius: 8px; padding: 12px 16px;">
					<legend style="font-size: 13px; font-weight: 600; color: #141414; padding: 0 4px;">
						Samlingsider <span style="color: #C82D2D;">*</span>
					</legend>
					<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin-top: 8px;">
						{#each ALL_COLLECTIONS as col (col.slug)}
						<label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
							<input type="checkbox" name="collection_slugs" value={col.slug} style="width: 16px; height: 16px;" />
							{col.label}
						</label>
						{/each}
					</div>
				</fieldset>
			</div>

			<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
				<div>
					<label for="start_date" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 6px;">
						Startdato <span style="color: #C82D2D;">*</span>
					</label>
					<input
						id="start_date"
						name="start_date"
						type="date"
						required
						value={today}
						style="width: 100%; padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; min-height: 40px; box-sizing: border-box;"
					/>
				</div>
				<div>
					<label for="end_date" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 6px;">
						Sluttdato (tom = løpende)
					</label>
					<input
						id="end_date"
						name="end_date"
						type="date"
						style="width: 100%; padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; min-height: 40px; box-sizing: border-box;"
					/>
				</div>
				<div>
					<label for="contact_email" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 6px;">
						Kontakt-e-post
					</label>
					<input
						id="contact_email"
						name="contact_email"
						type="email"
						placeholder="venue@example.com"
						style="width: 100%; padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; min-height: 40px; box-sizing: border-box;"
					/>
				</div>
			</div>

			<div>
				<label for="notes" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 6px;">
					Notater
				</label>
				<textarea
					id="notes"
					name="notes"
					rows="2"
					placeholder="Faktura-info, avtalereferanse, osv."
					style="width: 100%; padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; resize: vertical; box-sizing: border-box;"
				></textarea>
			</div>

			<div>
				<button
					type="submit"
					style="padding: 10px 24px; border-radius: 8px; border: none; background: #141414; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;"
				>
					Opprett plassering
				</button>
			</div>
		</form>
	</section>
	{/if}

	<!-- Placements table -->
	{#if placements.length === 0}
	<div style="text-align: center; padding: 64px 24px; color: #737373;">
		<p style="font-size: 18px; margin: 0 0 8px;">Ingen aktive plasseringer</p>
		<p style="font-size: 14px; margin: 0;">Legg til en plassering for å komme i gang.</p>
	</div>
	{:else}
	<div style="overflow-x: auto;">
		<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
			<thead>
				<tr style="border-bottom: 2px solid #e5e5e5; text-align: left;">
					<th style="padding: 10px 12px; font-weight: 600; color: #141414; white-space: nowrap;">Venue</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414;">Samlinger</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414; white-space: nowrap;">Tier</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414; white-space: nowrap;">Start</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414; white-space: nowrap;">Slutt</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414; text-align: right; white-space: nowrap;">Imp. denne mnd</th>
					<th style="padding: 10px 12px; font-weight: 600; color: #141414; text-align: center; white-space: nowrap;">Aktiv</th>
				</tr>
			</thead>
			<tbody>
				{#each placements as p (p.id)}
				<tr style="border-bottom: 1px solid #f0f0f0; {!p.active ? 'opacity: 0.5;' : ''}">
					<td style="padding: 12px; font-weight: 500; color: #141414; white-space: nowrap;">{p.venue_name}</td>
					<td style="padding: 12px; color: #4d4d4d; font-size: 12px;">
						{p.collection_slugs.join(', ')}
					</td>
					<td style="padding: 12px; white-space: nowrap;">
						<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: {p.tier === 'partner' ? '#FDF0E0' : p.tier === 'standard' ? '#E8F4FD' : '#F0F0F0'}; color: {p.tier === 'partner' ? '#7A4F00' : p.tier === 'standard' ? '#0A4A7A' : '#4D4D4D'};">
							{TIER_LABELS[p.tier]}
						</span>
					</td>
					<td style="padding: 12px; white-space: nowrap; color: #4d4d4d;">{formatDate(p.start_date)}</td>
					<td style="padding: 12px; white-space: nowrap; color: #4d4d4d;">{formatDate(p.end_date)}</td>
					<td style="padding: 12px; text-align: right; font-variant-numeric: tabular-nums; color: #141414;">
						{p.impressions_this_month.toLocaleString('nb-NO')}
					</td>
					<td style="padding: 12px; text-align: center;">
						<form method="POST" action="?/toggle" use:enhance style="display: inline;">
							<input type="hidden" name="id" value={p.id} />
							<input type="hidden" name="active" value={String(p.active)} />
							<button
								type="submit"
								title={p.active ? 'Deaktiver' : 'Aktiver'}
								style="width: 40px; height: 24px; border-radius: 12px; border: none; cursor: pointer; background: {p.active ? '#22c55e' : '#d1d5db'}; transition: background 0.2s; position: relative;"
								aria-label={p.active ? 'Deaktiver' : 'Aktiver'}
							>
								<span style="position: absolute; top: 3px; {p.active ? 'right: 3px;' : 'left: 3px;'} width: 18px; height: 18px; border-radius: 50%; background: #fff;"></span>
							</button>
						</form>
					</td>
				</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{/if}
</main>
