<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const CAT_COLORS: Record<string, string> = {
		Musikk: '#AECDE8', Kultur: '#C5B8D9', Teater: '#E8B8C2', Familie: '#F5D49A',
		'Mat og drikke': '#E8C4A0', Festival: '#F5E0A0', Sport: '#A8D4B8', Uteliv: '#9BAED4',
		Kurs: '#D4B89A', Student: '#B8D4A8', Turer: '#7FB8B8'
	};

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
	}

	function catColor(cat: string): string {
		return CAT_COLORS[cat] ?? '#ddd';
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>Gåri — {data.venueName}</title>
</svelte:head>

<div style="margin:0;padding:0;background:#F5F3EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
<div style="background:#FFFFFF;border-radius:12px;overflow:hidden;">

	<!-- Header with event images -->
	<div style="position:relative;">
		<div style="display:flex;height:200px;overflow:hidden;">
			{#if data.heroImages.length >= 3}
				<div style="flex:2;overflow:hidden;"><img src={data.heroImages[0]} alt="" style="width:100%;height:100%;object-fit:cover;"></div>
				<div style="flex:1;display:flex;flex-direction:column;">
					<div style="flex:1;overflow:hidden;"><img src={data.heroImages[1]} alt="" style="width:100%;height:100%;object-fit:cover;"></div>
					<div style="flex:1;overflow:hidden;"><img src={data.heroImages[2]} alt="" style="width:100%;height:100%;object-fit:cover;"></div>
				</div>
			{:else if data.heroImages.length >= 1}
				<div style="flex:1;overflow:hidden;"><img src={data.heroImages[0]} alt="" style="width:100%;height:100%;object-fit:cover;"></div>
			{:else}
				<div style="flex:1;background:#1C1C1E;"></div>
			{/if}
		</div>
		<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent, rgba(28,28,30,0.95));padding:24px 32px 20px;">
			<div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.02em;">GÅRI</div>
			<div style="font-size:22px;font-weight:700;color:#FFFFFF;margin-top:4px;">{data.venueName}</div>
		</div>
	</div>
	<div style="padding:16px 32px 0;">
		<span style="display:inline-block;background:#C82D2D;color:#FFFFFF;padding:8px 20px;border-radius:6px;font-size:14px;font-weight:600;">Invitasjon til gratis prøveprosjekt</span>
	</div>

	<div style="padding:24px 32px 32px;">

		<!-- Section 1: Dere på Gåri i dag -->
		<h2 style="font-size:20px;font-weight:700;color:#141414;margin:0 0 8px;">Dere på Gåri i dag</h2>
		<p style="font-size:14px;color:#4D4D4D;margin:0 0 16px;">{data.venueName} har {data.eventCount} kommende arrangementer på gaari.no. Her er et utvalg:</p>

		<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
			<thead><tr>
				<th style="text-align:left;padding:8px 12px;border-bottom:2px solid #C82D2D;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6B6862;">Dato</th>
				<th style="text-align:left;padding:8px 12px;border-bottom:2px solid #C82D2D;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6B6862;">Arrangement</th>
				<th style="text-align:left;padding:8px 12px;border-bottom:2px solid #C82D2D;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6B6862;">Kategori</th>
			</tr></thead>
			<tbody>
				{#each data.events as event, i}
					<tr style="{i % 2 === 1 ? 'background:#F8F8F6;' : ''}">
						<td style="padding:10px 12px;border-bottom:1px solid #E8E8E4;font-size:14px;white-space:nowrap;color:#4D4D4D;">{formatDate(event.date_start)}</td>
						<td style="padding:10px 12px;border-bottom:1px solid #E8E8E4;font-size:14px;color:#141414;">{event.title_no}</td>
						<td style="padding:10px 12px;border-bottom:1px solid #E8E8E4;font-size:14px;">
							<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:{catColor(event.category)};color:#141414;font-size:12px;font-weight:600;">{event.category}</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if data.eventCount > 6}
			<p style="font-size:13px;color:#6B6862;font-style:italic;margin:8px 0 0;">+ {data.eventCount - 6} arrangementer til</p>
		{/if}

		<div style="border-top:1px solid #E8E8E4;margin:28px 0;"></div>

		<!-- Section 2: Med promotert plassering -->
		<h2 style="font-size:20px;font-weight:700;color:#141414;margin:0 0 8px;">Med promotert plassering</h2>
		<p style="font-size:14px;color:#4D4D4D;margin:0 0 6px;">{data.venueName} havner øverst på {data.firstPageLabel} og tre andre sider. Hver fjerde besøkende på disse sidene ser arrangementene deres øverst (roteres automatisk mellom promoterte venues).</p>

		<div style="display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 20px;">
			{#each data.pages as page}
				<div style="background:#FFFFFF;border:1px solid #E8E8E4;border-radius:8px;padding:14px 16px;flex:1;min-width:120px;">
					<div style="font-size:14px;font-weight:600;color:#141414;">{page.label}</div>
					<div style="font-size:12px;color:#6B6862;margin-top:2px;">gaari.no/no/{page.slug}</div>
				</div>
			{/each}
		</div>

		<!-- Mockup: Collection page -->
		<div style="margin-bottom:24px;">
			<div style="font-size:15px;font-weight:600;color:#141414;margin-bottom:12px;">Slik vises {data.venueName} på samlesiden</div>
			<div style="background:#F5F3EE;border-radius:12px;padding:12px;border:1px solid #E8E8E4;">
				<div style="background:#FFFFFF;border-radius:8px;overflow:hidden;">
					<div style="padding:20px 24px 8px;display:flex;justify-content:space-between;align-items:baseline;">
						<span style="color:#C82D2D;font-size:28px;font-weight:700;font-family:'Arial Narrow',Arial,sans-serif;letter-spacing:-0.02em;">Gåri</span>
						<span style="color:#6B6862;font-size:12px;">NO / EN</span>
					</div>
					<div style="padding:12px 24px 16px;">
						<div style="font-size:22px;font-weight:700;color:#141414;font-family:'Arial Narrow',Arial,sans-serif;line-height:1.2;">{data.firstPageLabel}</div>
						<div style="font-size:13px;color:#4D4D4D;margin-top:4px;">Oppdatert daglig fra lokale kilder i Bergen</div>
					</div>
					<div style="padding:0 24px 8px;">
						<div style="font-size:13px;font-weight:600;color:#6B6862;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #E8E8E4;padding-bottom:6px;">{data.events[0] ? formatDate(data.events[0].date_start) : 'I dag'}</div>
					</div>
					<div style="padding:8px 24px 16px;">
						<div style="display:flex;gap:10px;">
							<div style="flex:1;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E8E8E4;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
								{#if data.events[0]?.image_url}
									<div style="position:relative;height:90px;overflow:hidden;">
										<img src={data.events[0].image_url} alt="" style="width:100%;height:100%;object-fit:cover;display:block;">
										<span style="position:absolute;top:6px;right:6px;background:#FFFFFF;border:1px solid #C82D2D;border-radius:20px;padding:1px 8px;font-size:9px;font-weight:600;color:#141414;">Fremhevet</span>
									</div>
								{/if}
								<div style="padding:10px;">
									<div style="font-size:12px;font-weight:600;color:#141414;line-height:1.3;margin-bottom:3px;">{data.events[0]?.title_no ?? ''}</div>
									<div style="font-size:10px;color:#4D4D4D;margin-bottom:2px;">{data.events[0] ? formatDate(data.events[0].date_start) : ''}</div>
									<div style="font-size:10px;color:#4D4D4D;margin-bottom:4px;">{data.venueName}</div>
									<div style="font-size:10px;color:#C82D2D;font-weight:500;">Les mer &rarr;</div>
								</div>
							</div>
							<div style="flex:1;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E8E8E4;opacity:0.45;">
								<div style="height:90px;background:#e0ddd8;"></div>
								<div style="padding:10px;">
									<div style="height:8px;background:#e0ddd8;border-radius:4px;width:75%;margin-bottom:5px;"></div>
									<div style="height:6px;background:#e0ddd8;border-radius:4px;width:50%;margin-bottom:3px;"></div>
									<div style="height:6px;background:#e0ddd8;border-radius:4px;width:60%;"></div>
								</div>
							</div>
							<div style="flex:1;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E8E8E4;opacity:0.45;">
								<div style="height:90px;background:#e0ddd8;"></div>
								<div style="padding:10px;">
									<div style="height:8px;background:#e0ddd8;border-radius:4px;width:65%;margin-bottom:5px;"></div>
									<div style="height:6px;background:#e0ddd8;border-radius:4px;width:45%;margin-bottom:3px;"></div>
									<div style="height:6px;background:#e0ddd8;border-radius:4px;width:55%;"></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Mockup: Newsletter -->
		<div style="margin-bottom:8px;">
			<div style="font-size:15px;font-weight:600;color:#141414;margin-bottom:12px;">Slik vises {data.venueName} i nyhetsbrevet</div>
			<div style="background:#F5F3EE;border-radius:12px;padding:12px;border:1px solid #E8E8E4;">
				<div style="background:#FFFFFF;border-radius:8px;overflow:hidden;">
					<div style="padding:20px 24px 8px;display:flex;justify-content:space-between;align-items:baseline;">
						<span style="color:#C82D2D;font-size:32px;font-weight:700;font-family:'Arial Narrow',Arial,sans-serif;letter-spacing:-0.02em;">Gåri</span>
						<span style="color:#6B6862;font-size:13px;">Uke 16</span>
					</div>
					<div style="padding:12px 24px 20px;">
						<div style="font-size:20px;font-weight:700;color:#141414;font-family:'Arial Narrow',Arial,sans-serif;line-height:1.2;margin-bottom:4px;">Denne ukens utvalg</div>
						<div style="font-size:13px;color:#4D4D4D;line-height:1.5;">Konserter, uteliv og kultur i Bergen denne uken.</div>
					</div>
					{#if data.events[0]}
					<div style="padding:0 24px;">
						<div style="border-radius:8px;overflow:hidden;border-top:4px solid {catColor(data.events[0].category)};">
							{#if data.events[0].image_url}
								<div style="background-image:url('{data.events[0].image_url}');background-size:cover;background-position:center;height:180px;">
									<div style="background:linear-gradient(to bottom, rgba(28,28,30,0) 30%, rgba(28,28,30,0.85) 100%);height:100%;display:flex;flex-direction:column;justify-content:flex-end;">
										<div style="padding:0 20px 16px;">
											<div style="margin-bottom:6px;">
												<span style="display:inline-block;background:{catColor(data.events[0].category)};color:#141414;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:3px 10px;border-radius:20px;font-family:'Arial Narrow',Arial,sans-serif;">{data.events[0].category}</span>
												<span style="display:inline-block;background:#C82D2D;color:#FFFFFF;font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;margin-left:4px;">Fremhevet</span>
											</div>
											<div style="color:#FFFFFF;font-size:20px;font-weight:700;line-height:1.15;font-family:'Arial Narrow',Arial,sans-serif;">{data.events[0].title_no}</div>
											<div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px;">{formatDate(data.events[0].date_start)} · {data.venueName}</div>
										</div>
									</div>
								</div>
							{/if}
							<div style="background:#C82D2D;padding:12px 20px;text-align:center;">
								<span style="color:#FFFFFF;font-size:13px;font-weight:600;letter-spacing:0.02em;">Les mer &rarr;</span>
							</div>
						</div>
					</div>
					{/if}
					<div style="background:#F5F3EE;padding:16px 24px;margin-top:16px;">
						<div style="display:flex;gap:10px;">
							<div style="flex:1;border-radius:8px;overflow:hidden;background:#FFFFFF;border:1px solid #E8E8E4;border-top:4px solid #C5B8D9;opacity:0.45;">
								<div style="height:75px;background:#ddd;"></div>
								<div style="padding:8px 10px;">
									<div style="margin-bottom:4px;"><span style="display:inline-block;background:#C5B8D9;border-radius:10px;padding:2px 7px;font-size:9px;font-weight:700;color:#141414;">KULTUR</span></div>
									<div style="height:7px;background:#e0ddd8;border-radius:3px;width:80%;margin-bottom:4px;"></div>
									<div style="height:5px;background:#e0ddd8;border-radius:3px;width:55%;"></div>
								</div>
							</div>
							<div style="flex:1;border-radius:8px;overflow:hidden;background:#FFFFFF;border:1px solid #E8E8E4;border-top:4px solid #F5D49A;opacity:0.45;">
								<div style="height:75px;background:#ddd;"></div>
								<div style="padding:8px 10px;">
									<div style="margin-bottom:4px;"><span style="display:inline-block;background:#F5D49A;border-radius:10px;padding:2px 7px;font-size:9px;font-weight:700;color:#141414;">FAMILIE</span></div>
									<div style="height:7px;background:#e0ddd8;border-radius:3px;width:70%;margin-bottom:4px;"></div>
									<div style="height:5px;background:#e0ddd8;border-radius:3px;width:60%;"></div>
								</div>
							</div>
						</div>
					</div>
					<div style="padding:20px 24px;text-align:center;">
						<span style="display:inline-block;background:#C82D2D;color:#FFFFFF;padding:12px 40px;border-radius:8px;font-size:14px;font-weight:600;">Se alle arrangementer</span>
					</div>
				</div>
			</div>
		</div>

		<div style="border-top:1px solid #E8E8E4;margin:28px 0;"></div>

		<!-- Section 3: Standard-programmet -->
		<h2 style="font-size:20px;font-weight:700;color:#141414;margin:0 0 16px;">Hva {data.venueName} får med Standard</h2>

		<div style="margin-bottom:20px;">
			{#each [
				{ n: '1', title: 'Topp 3-plassering på 4 sider', desc: 'Hver fjerde besøkende på de utvalgte sidene ser dere helt øverst' },
				{ n: '2', title: 'Promotert i ukentlig nyhetsbrev', desc: 'Arrangementet deres vises som hero-kort med bilde øverst i nyhetsbrevet' },
				{ n: '3', title: 'Månedlig rapport', desc: 'Se hvor mange som har sett og klikket videre til deres side' },
				{ n: '4', title: 'Null arbeid for dere', desc: 'Alt settes opp og vedlikeholdes av meg. Dere trenger bare å si ja.' }
			] as item}
				<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;{item.n !== '4' ? 'border-bottom:1px solid #E8E8E4;' : ''}">
					<div style="background:#C82D2D;color:#FFFFFF;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">{item.n}</div>
					<div>
						<div style="font-size:14px;font-weight:600;color:#141414;">{item.title}</div>
						<div style="font-size:13px;color:#6B6862;margin-top:2px;">{item.desc}</div>
					</div>
				</div>
			{/each}
		</div>

		<div style="background:#1C1C1E;color:#FFFFFF;border-radius:8px;padding:20px 24px;">
			<div style="font-size:16px;font-weight:700;margin-bottom:4px;">Gratis i 3 måneder</div>
			<div style="font-size:14px;color:#a0a0a0;">Standard-programmet koster normalt 3 500 kr/mnd. Etter prøveperioden velger dere selv om dere vil fortsette. Helt uforpliktende.</div>
		</div>

		<div style="border-top:1px solid #E8E8E4;margin:28px 0;"></div>

		<!-- CTA -->
		<div style="text-align:center;padding:8px 0 16px;">
			<div style="font-size:18px;font-weight:700;color:#141414;margin-bottom:8px;">Svar ja på eposten</div>
			<div style="font-size:14px;color:#4D4D4D;">Jeg setter opp alt. Dere trenger ikke gjøre noe.</div>
		</div>

	</div>

	<div style="padding:16px 32px;background:#F8F8F6;border-top:1px solid #E8E8E4;text-align:center;">
		<div style="font-size:12px;color:#6B6862;">
			Kjersti Valland Therkildsen · <a href="https://gaari.no" style="color:#C82D2D;text-decoration:none;">gaari.no</a> · <a href="https://www.ba.no/s/5-8-3360284" style="color:#C82D2D;text-decoration:none;">Omtalt i BA</a>
		</div>
	</div>

</div>
</div>
</div>
