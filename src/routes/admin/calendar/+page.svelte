<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import type { PageData } from './$types';
	import type { CalendarItem } from './+page.server';

	let { data }: { data: PageData } = $props();
	let items: CalendarItem[] = $derived(data.items);

	let showForm = $state(false);
	let filter = $state<'all' | 'pending' | 'in_progress' | 'done'>('all');

	const today = new Date().toISOString().slice(0, 10);

	const STATUS_LABELS: Record<string, string> = {
		pending: 'Ventende',
		in_progress: 'Pågår',
		done: 'Ferdig',
		skipped: 'Hoppet over'
	};

	const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
		pending: { bg: '#f5f5f5', text: '#737373' },
		in_progress: { bg: '#EFF6FF', text: '#1D4ED8' },
		done: { bg: '#F0FDF4', text: '#15803D' },
		skipped: { bg: '#FFF7ED', text: '#9A3412' }
	};

	const CATEGORY_ICONS: Record<string, string> = {
		milestone: '◆',
		deadline: '⏰',
		task: '○',
		recurring: '↻',
		meeting: '●'
	};

	const CATEGORY_LABELS: Record<string, string> = {
		milestone: 'Milepæl',
		deadline: 'Frist',
		task: 'Oppgave',
		recurring: 'Gjentakende',
		meeting: 'Møte'
	};

	function formatDate(d: string): string {
		return new Date(d + 'T00:00:00').toLocaleDateString('nb-NO', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}

	function isOverdue(item: CalendarItem): boolean {
		return item.due_date < today && item.status !== 'done' && item.status !== 'skipped';
	}

	function nextStatus(current: string): string {
		if (current === 'pending') return 'in_progress';
		if (current === 'in_progress') return 'done';
		return 'pending';
	}

	// Group items by month
	function groupByMonth(list: CalendarItem[]): Map<string, CalendarItem[]> {
		const groups = new Map<string, CalendarItem[]>();
		for (const item of list) {
			const monthKey = item.due_date.slice(0, 7); // YYYY-MM
			const label = new Date(item.due_date + 'T00:00:00').toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });
			if (!groups.has(label)) groups.set(label, []);
			groups.get(label)!.push(item);
		}
		return groups;
	}

	let filteredItems = $derived(
		filter === 'all' ? items : items.filter(i => i.status === filter)
	);

	let grouped = $derived(groupByMonth(filteredItems));

	// Stats
	let totalPending = $derived(items.filter(i => i.status === 'pending').length);
	let totalInProgress = $derived(items.filter(i => i.status === 'in_progress').length);
	let totalDone = $derived(items.filter(i => i.status === 'done').length);
	let totalOverdue = $derived(items.filter(i => isOverdue(i)).length);
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>Prosjektkalender — Admin</title>
</svelte:head>

<main style="max-width: 900px; margin: 0 auto; padding: 24px 16px; font-family: Inter, system-ui, sans-serif;">
	<header style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
		<div>
			<h1 style="font-family: 'Barlow Condensed', sans-serif; font-size: 36px; color: #141414; margin: 0 0 4px;">
				Prosjektkalender
			</h1>
			<p style="color: #737373; font-size: 14px; margin: 0;">
				Milepæler, frister og oppgaver for Gåri
			</p>
		</div>
		<div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
			<AdminNav />
			<button
				onclick={() => { showForm = !showForm; }}
				style="padding: 10px 20px; border-radius: 8px; border: none; background: #C82D2D; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;"
			>
				{showForm ? 'Avbryt' : '+ Ny oppgave'}
			</button>
		</div>
	</header>

	<!-- Stats bar -->
	<div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
		<button onclick={() => { filter = 'all'; }} style="flex: 1; min-width: 100px; padding: 12px 16px; border-radius: 8px; border: 2px solid {filter === 'all' ? '#141414' : '#e5e5e5'}; background: #fff; cursor: pointer; text-align: left;">
			<div style="font-size: 24px; font-weight: 700; color: #141414; font-variant-numeric: tabular-nums;">{items.length}</div>
			<div style="font-size: 12px; color: #737373;">Totalt</div>
		</button>
		<button onclick={() => { filter = 'pending'; }} style="flex: 1; min-width: 100px; padding: 12px 16px; border-radius: 8px; border: 2px solid {filter === 'pending' ? '#141414' : '#e5e5e5'}; background: #fff; cursor: pointer; text-align: left;">
			<div style="font-size: 24px; font-weight: 700; color: #737373; font-variant-numeric: tabular-nums;">{totalPending}</div>
			<div style="font-size: 12px; color: #737373;">Ventende</div>
		</button>
		<button onclick={() => { filter = 'in_progress'; }} style="flex: 1; min-width: 100px; padding: 12px 16px; border-radius: 8px; border: 2px solid {filter === 'in_progress' ? '#141414' : '#e5e5e5'}; background: #fff; cursor: pointer; text-align: left;">
			<div style="font-size: 24px; font-weight: 700; color: #1D4ED8; font-variant-numeric: tabular-nums;">{totalInProgress}</div>
			<div style="font-size: 12px; color: #737373;">Pågår</div>
		</button>
		<button onclick={() => { filter = 'done'; }} style="flex: 1; min-width: 100px; padding: 12px 16px; border-radius: 8px; border: 2px solid {filter === 'done' ? '#141414' : '#e5e5e5'}; background: #fff; cursor: pointer; text-align: left;">
			<div style="font-size: 24px; font-weight: 700; color: #15803D; font-variant-numeric: tabular-nums;">{totalDone}</div>
			<div style="font-size: 12px; color: #737373;">Ferdig</div>
		</button>
		{#if totalOverdue > 0}
		<div style="flex: 1; min-width: 100px; padding: 12px 16px; border-radius: 8px; border: 2px solid #DC2626; background: #FEF2F2; text-align: left;">
			<div style="font-size: 24px; font-weight: 700; color: #DC2626; font-variant-numeric: tabular-nums;">{totalOverdue}</div>
			<div style="font-size: 12px; color: #DC2626;">Forfalt</div>
		</div>
		{/if}
	</div>

	<!-- Add item form -->
	{#if showForm}
	<section style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
		<h2 style="font-family: 'Barlow Condensed', sans-serif; font-size: 22px; color: #141414; margin: 0 0 20px;">
			Ny oppgave
		</h2>
		<form method="POST" action="?/create" use:enhance={() => { return async ({ update }) => { showForm = false; await update(); }; }} style="display: grid; gap: 16px;">
			<div>
				<label for="title" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 6px;">
					Tittel <span style="color: #C82D2D;">*</span>
				</label>
				<input
					id="title"
					name="title"
					type="text"
					required
					placeholder="Hva skal gjøres?"
					style="width: 100%; padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; min-height: 40px; box-sizing: border-box;"
				/>
			</div>
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
				<div>
					<label for="due_date" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 6px;">
						Dato <span style="color: #C82D2D;">*</span>
					</label>
					<input
						id="due_date"
						name="due_date"
						type="date"
						required
						value={today}
						style="width: 100%; padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; min-height: 40px; box-sizing: border-box;"
					/>
				</div>
				<div>
					<label for="category" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 6px;">
						Kategori
					</label>
					<select
						id="category"
						name="category"
						style="width: 100%; padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; min-height: 40px; box-sizing: border-box; background: #fff;"
					>
						<option value="task">Oppgave</option>
						<option value="milestone">Milepæl</option>
						<option value="deadline">Frist</option>
						<option value="meeting">Møte</option>
						<option value="recurring">Gjentakende</option>
					</select>
				</div>
			</div>
			<div>
				<label for="description" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 6px;">
					Beskrivelse
				</label>
				<textarea
					id="description"
					name="description"
					rows="2"
					placeholder="Detaljer, kontekst, akseptkriterier..."
					style="width: 100%; padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; resize: vertical; box-sizing: border-box;"
				></textarea>
			</div>
			<div>
				<button
					type="submit"
					style="padding: 10px 24px; border-radius: 8px; border: none; background: #141414; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; min-height: 44px;"
				>
					Opprett
				</button>
			</div>
		</form>
	</section>
	{/if}

	<!-- Calendar items grouped by month -->
	{#if filteredItems.length === 0}
	<div style="text-align: center; padding: 64px 24px; color: #737373;">
		<p style="font-size: 18px; margin: 0 0 8px;">Ingen oppgaver å vise</p>
		<p style="font-size: 14px; margin: 0;">
			{filter !== 'all' ? 'Prøv et annet filter.' : 'Legg til en oppgave for å komme i gang.'}
		</p>
	</div>
	{:else}
	{#each [...grouped.entries()] as [month, monthItems] (month)}
	<section style="margin-bottom: 32px;">
		<h2 style="font-family: 'Barlow Condensed', sans-serif; font-size: 20px; color: #141414; margin: 0 0 12px; text-transform: capitalize; border-bottom: 2px solid #e5e5e5; padding-bottom: 8px;">
			{month}
		</h2>
		<div style="display: flex; flex-direction: column; gap: 8px;">
			{#each monthItems as item (item.id)}
			<div style="
				display: flex;
				align-items: flex-start;
				gap: 12px;
				padding: 12px 16px;
				border-radius: 8px;
				border: 1px solid {isOverdue(item) ? '#FECACA' : '#e5e5e5'};
				background: {isOverdue(item) ? '#FEF2F2' : item.status === 'done' ? '#FAFAFA' : '#fff'};
				{item.status === 'done' || item.status === 'skipped' ? 'opacity: 0.6;' : ''}
			">
				<!-- Status toggle -->
				<form method="POST" action="?/updateStatus" use:enhance style="flex-shrink: 0; margin-top: 2px;">
					<input type="hidden" name="id" value={item.id} />
					<input type="hidden" name="status" value={nextStatus(item.status)} />
					<button
						type="submit"
						title="{STATUS_LABELS[item.status]} → {STATUS_LABELS[nextStatus(item.status)]}"
						aria-label="Endre status til {STATUS_LABELS[nextStatus(item.status)]}"
						style="
							width: 24px; height: 24px; border-radius: 50%;
							border: 2px solid {item.status === 'done' ? '#15803D' : item.status === 'in_progress' ? '#1D4ED8' : '#d0d0d0'};
							background: {item.status === 'done' ? '#15803D' : 'transparent'};
							cursor: pointer; display: flex; align-items: center; justify-content: center;
							color: #fff; font-size: 12px;
						"
					>
						{#if item.status === 'done'}✓{/if}
						{#if item.status === 'in_progress'}
						<span style="width: 10px; height: 10px; border-radius: 50%; background: #1D4ED8;"></span>
						{/if}
					</button>
				</form>

				<!-- Content -->
				<div style="flex: 1; min-width: 0;">
					<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
						<span style="font-size: 14px; font-weight: 500; color: #141414; {item.status === 'done' ? 'text-decoration: line-through;' : ''}">
							{item.title}
						</span>
						<span style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: {STATUS_COLORS[item.status].bg}; color: {STATUS_COLORS[item.status].text}; font-weight: 600;">
							{STATUS_LABELS[item.status]}
						</span>
						<span style="font-size: 11px; color: #737373;">
							{CATEGORY_ICONS[item.category]} {CATEGORY_LABELS[item.category]}
						</span>
					</div>
					{#if item.description}
					<p style="font-size: 13px; color: #737373; margin: 4px 0 0; line-height: 1.4;">
						{item.description}
					</p>
					{/if}
				</div>

				<!-- Date + delete -->
				<div style="flex-shrink: 0; text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
					<span style="font-size: 12px; color: {isOverdue(item) ? '#DC2626' : '#737373'}; font-weight: {isOverdue(item) ? '600' : '400'}; white-space: nowrap;">
						{formatDate(item.due_date)}
					</span>
					<form method="POST" action="?/delete" use:enhance={() => { return async ({ update }) => { if (confirm('Slett denne oppgaven?')) await update(); }; }}>
						<input type="hidden" name="id" value={item.id} />
						<button
							type="submit"
							title="Slett"
							aria-label="Slett oppgave"
							style="background: none; border: none; cursor: pointer; color: #d0d0d0; font-size: 14px; padding: 2px;"
						>
							×
						</button>
					</form>
				</div>
			</div>
			{/each}
		</div>
	</section>
	{/each}
	{/if}
</main>
