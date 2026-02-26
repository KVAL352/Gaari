<script lang="ts">
	import { flip } from 'svelte/animate';
	import { backOut, cubicOut } from 'svelte/easing';

	let containerEl: HTMLElement | undefined = $state(undefined);
	let visible = $state(false);
	let showCards = $state(false);
	let reducedMotion = $state(false);

	// Card cycling state
	let currentCardIndex = $state(0);
	let cardInterval: ReturnType<typeof setInterval> | undefined;

	const events = [
		{ title: 'Peer Gynt', venue: 'DNS', time: '19:00', color: '#E8B8C2' },
		{ title: 'Bergen Filharmoniske', venue: 'Grieghallen', time: '20:00', color: '#AECDE8' },
		{ title: 'Etter Munch', venue: 'KODE', time: '11:00', color: '#C5B8D9' },
		{ title: 'Pubquiz', venue: 'Kvarteret', time: '20:00', color: '#B8D4A8' },
		{ title: 'Fjelltur Ulriken', venue: 'DNT Bergen', time: '09:00', color: '#A8CCCC' },
		{ title: 'Vinsmaking', venue: 'Colonialen', time: '18:00', color: '#E8C4A0' },
		{ title: 'Brann – Rosenborg', venue: 'Brann Stadion', time: '19:00', color: '#A8D4B8' },
		{ title: 'Jazzkveld', venue: 'USF Verftet', time: '21:00', color: '#AECDE8' }
	];

	// The 4 currently visible cards
	let visibleCards = $derived(
		Array.from({ length: 4 }, (_, i) => events[(currentCardIndex + i) % events.length])
	);

	// IntersectionObserver: trigger when 30% visible
	$effect(() => {
		if (!containerEl) return;
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (reducedMotion) {
			visible = true;
			showCards = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !visible) {
					visible = true;
				}
			},
			{ threshold: 0.3 }
		);
		observer.observe(containerEl);
		return () => observer.disconnect();
	});

	// Staggered startup: cards appear at 2500ms after scroll-trigger
	$effect(() => {
		if (!visible || reducedMotion) return;
		const timer = setTimeout(() => {
			showCards = true;
		}, 2500);
		return () => clearTimeout(timer);
	});

	// Card cycling: starts after cards are shown (not during reduced motion)
	$effect(() => {
		if (!showCards || reducedMotion) return;
		cardInterval = setInterval(() => {
			currentCardIndex = (currentCardIndex + 1) % events.length;
		}, 2500);
		return () => {
			if (cardInterval) clearInterval(cardInterval);
		};
	});

	// Card enter: bounce in from bottom + color ring flash
	function cardIn(node: HTMLElement) {
		if (reducedMotion) return { duration: 0, css: () => '' };
		const color = node.style.getPropertyValue('--card-color') || '#E8E8E4';
		return {
			duration: 600,
			easing: backOut,
			css: (t: number, u: number) => {
				const spreadPx = Math.max(0, u) * 2;
				return `
					opacity: ${Math.min(1, t * 3)};
					transform: translateY(${u * 12}px) scale(${0.93 + t * 0.07});
					box-shadow: 0 0 0 ${spreadPx.toFixed(1)}px ${color};
				`;
			}
		};
	}

	// Card exit: fade up and shrink
	function cardOut(_node: HTMLElement) {
		if (reducedMotion) return { duration: 0, css: () => '' };
		return {
			duration: 300,
			easing: cubicOut,
			css: (t: number) => `
				opacity: ${t};
				transform: translateY(${(1 - t) * -8}px) scale(${0.97 + t * 0.03});
			`
		};
	}
</script>

<div
	bind:this={containerEl}
	class="streaming-container"
	class:animation--active={visible}
	role="img"
	aria-label="Animasjon: arrangementer strømmer inn til Gåri fra steder i Bergen"
>
	<div aria-hidden="true" class="streaming-inner">
		<!-- Background grid: concentric ellipses -->
		<div class="grid-layer">
			<div class="grid-ellipse" style="width: 90%; height: 85%;"></div>
			<div class="grid-ellipse" style="width: 70%; height: 65%;"></div>
			<div class="grid-ellipse" style="width: 50%; height: 45%;"></div>
			<div class="grid-ellipse" style="width: 35%; height: 30%;"></div>
		</div>

		<!--
			Venue pills — staggered entrance + flash synced to particle bursts
			Entrance: 6 pairs × 100ms (200ms–700ms after visible)
			Flash: synced to particle burst timing (22s cycle, 1.2s startup offset)

			Burst 1 (1.2s):   p1 Grieghallen, p2 DNS, p3 Kvarteret
			Burst 2 (5.7s):   p4 USF Verftet, p5 Colonialen
			Burst 3 (10.2s):  p6 Fløyen, p7 KODE, p8 Festspillene
			Burst 4 (14.7s):  p9 Hulen, p10 SK Brann
			Burst 5 (19s):    p11 Loppemarked, p12 Bergen Bibliotek
		-->
		{#each [
			{ name: 'Grieghallen', left: '55%', top: '0%', color: '#AECDE8', entranceDelay: '0.2s', flashDelay: '1.2s', size: 'lg', mobile: true },
			{ name: 'DNS', left: '80%', top: '3%', color: '#E8B8C2', entranceDelay: '0.3s', flashDelay: '1.4s', size: 'lg', mobile: true },
			{ name: 'Kvarteret', left: '76%', top: '28%', color: '#B8D4A8', entranceDelay: '0.4s', flashDelay: '1.65s', size: 'md', mobile: true },
			{ name: 'SK Brann', left: '78%', top: '55%', color: '#A8D4B8', entranceDelay: '0.5s', flashDelay: '14.95s', size: 'sm', mobile: false },
			{ name: 'USF Verftet', left: '72%', top: '85%', color: '#C5B8D9', entranceDelay: '0.6s', flashDelay: '5.7s', size: 'md', mobile: true },
			{ name: 'Colonialen', left: '28%', top: '92%', color: '#E8C4A0', entranceDelay: '0.7s', flashDelay: '5.95s', size: 'sm', mobile: true },
			{ name: 'Bergen Bibliotek', left: '45%', top: '91%', color: '#C5B8D9', entranceDelay: '0.7s', flashDelay: '19.25s', size: 'md', mobile: false },
			{ name: 'Fløyen', left: '2%', top: '82%', color: '#A8CCCC', entranceDelay: '0.6s', flashDelay: '10.2s', size: 'md', mobile: true },
			{ name: 'KODE', left: '2%', top: '40%', color: '#C5B8D9', entranceDelay: '0.4s', flashDelay: '10.4s', size: 'md', mobile: true },
			{ name: 'Hulen', left: '2%', top: '60%', color: '#9BAED4', entranceDelay: '0.5s', flashDelay: '14.7s', size: 'sm', mobile: false },
			{ name: 'Festspillene', left: '2%', top: '14%', color: '#F5E0A0', entranceDelay: '0.3s', flashDelay: '10.65s', size: 'lg', mobile: true },
			{ name: 'Lokalt loppemarked', left: '24%', top: '2%', color: '#F5E0A0', entranceDelay: '0.2s', flashDelay: '19s', size: 'sm', mobile: false }
		] as pill (pill.name)}
			<div
				class="venue-pill pill--{pill.size} {pill.mobile ? '' : 'desktop-only'}"
				style="left: {pill.left}; top: {pill.top}; --pill-color: {pill.color}; --entrance-delay: {pill.entranceDelay}; --flash-delay: {pill.flashDelay};"
			>
				<span class="pill-dot" style="background: {pill.color};"></span>
				<span class="pill-name">{pill.name}</span>
			</div>
		{/each}

		<!-- Flying particles (12, burst rhythm, 22s cycle, 1.2s startup offset) -->
		<div class="particle p1"></div>
		<div class="particle p2"></div>
		<div class="particle p3"></div>
		<div class="particle p4"></div>
		<div class="particle p5"></div>
		<div class="particle p6"></div>
		<div class="particle p7"></div>
		<div class="particle p8"></div>
		<div class="particle p9"></div>
		<div class="particle p10"></div>
		<div class="particle p11"></div>
		<div class="particle p12"></div>

		<!-- Gåri hub (center) -->
		<div class="gaari-hub">
			<!-- Mini browser chrome -->
			<div class="hub-chrome">
				<div class="chrome-dots">
					<span style="background: #FF5F57;"></span>
					<span style="background: #FFBD2E;"></span>
					<span style="background: #28CA41;"></span>
				</div>
				<div class="chrome-url">gaari.no</div>
			</div>

			<!-- Event cards: appear at 2500ms, then cycle every 2.5s -->
			<div class="hub-cards">
				{#if showCards}
					{#each visibleCards as card, i (currentCardIndex + i)}
						<div
							class="event-card"
							style="--card-color: {card.color};"
							in:cardIn
							out:cardOut
							animate:flip={{ duration: 350, easing: cubicOut }}
						>
							<div class="card-color" style="background: {card.color};"></div>
							<div class="card-text">
								<span class="card-title">{card.title}</span>
								<span class="card-sub">{card.venue} · {card.time}</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* === Container === */
	.streaming-container {
		position: relative;
		overflow: hidden;
		width: 100%;
		max-width: 600px;
		height: 420px;
		background: #F5F3EE;
		border-radius: 16px;
	}
	.streaming-inner {
		position: relative;
		width: 100%;
		height: 100%;
	}

	/* === Background Grid === */
	.grid-layer {
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
	}
	.grid-ellipse {
		position: absolute;
		inset: 0;
		margin: auto;
		border: 1px dashed #D8D8D4;
		border-radius: 50%;
		opacity: 0;
		transition: opacity 0.6s ease-out;
	}
	.animation--active .grid-ellipse {
		opacity: 0.08;
	}

	/* =========================================
	   Venue Pills
	   =========================================
	   Before visible: opacity 0, shifted down 4px
	   Entrance: pillEntrance (0.4s) staggered via --entrance-delay (200ms–700ms)
	   Ongoing: pillFlash (22s cycle) synced to particle burst via --flash-delay
	   ========================================= */
	.venue-pill {
		position: absolute;
		z-index: 3;
		display: flex;
		align-items: center;
		gap: 5px;
		background: white;
		border: 1.5px solid var(--pill-color, #D8D8D4);
		border-radius: 20px;
		padding: 4px 10px;
		white-space: nowrap;
		box-shadow: 0 1px 4px rgba(20, 20, 20, 0.06);
		opacity: 0;
		transform: translateY(4px);
	}

	.animation--active .venue-pill {
		animation-name: pillEntrance, pillFlash;
		animation-duration: 0.4s, 22s;
		animation-timing-function: ease-out, ease-out;
		animation-delay: var(--entrance-delay, 0.2s), var(--flash-delay, 1.2s);
		animation-iteration-count: 1, infinite;
		animation-fill-mode: both, none;
	}

	@keyframes pillEntrance {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 0.8;
			transform: translateY(0);
		}
	}

	@keyframes pillFlash {
		0% {
			opacity: 0.8;
			transform: scale(1);
			box-shadow: 0 1px 4px rgba(20, 20, 20, 0.06);
		}
		0.5% { /* ~0.11s — flash peak */
			opacity: 1;
			transform: scale(1.06);
			box-shadow: 0 1px 4px rgba(20, 20, 20, 0.06), 0 0 10px var(--pill-color);
		}
		1.8% { /* ~0.4s — settle back */
			opacity: 0.8;
			transform: scale(1);
			box-shadow: 0 1px 4px rgba(20, 20, 20, 0.06);
		}
		100% {
			opacity: 0.8;
			transform: scale(1);
			box-shadow: 0 1px 4px rgba(20, 20, 20, 0.06);
		}
	}

	.pill-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	/* Dot glow: same timing as pill flash */
	.animation--active .pill-dot {
		animation: dotGlow 22s var(--flash-delay, 1.2s) ease-out infinite;
	}

	@keyframes dotGlow {
		0% { box-shadow: none; }
		0.5% { box-shadow: 0 0 6px var(--pill-color); }
		1.4% { box-shadow: none; }
		100% { box-shadow: none; }
	}

	.pill-name {
		font-size: 11px;
		font-weight: 500;
		color: #141414;
		line-height: 1.2;
	}

	/* Pill size variants — visual hierarchy */
	.pill--lg { padding: 5px 14px; }
	.pill--lg .pill-name { font-size: 12px; }
	.pill--lg .pill-dot { width: 7px; height: 7px; }
	/* .pill--md uses base styles (11px, 4px 10px) */
	.pill--sm { padding: 3px 8px; }
	.pill--sm .pill-name { font-size: 10px; }
	.pill--sm .pill-dot { width: 5px; height: 5px; }

	/* =========================================
	   Gåri Hub
	   =========================================
	   Before visible: opacity 0, scale 0.95
	   Entrance: hubEntrance (0.5s, 0ms delay) — first element to appear
	   Ongoing: hubGlow (4s cycle, starts after entrance)
	   ========================================= */
	.gaari-hub {
		position: absolute;
		z-index: 3;
		inset: 0;
		margin: auto;
		width: 250px;
		height: 230px;
		border-radius: 16px;
		background: white;
		border: 2px solid #D8D8D4;
		border-top: 3px solid #C82D2D;
		box-shadow: 0 8px 24px rgba(20, 20, 20, 0.14);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		opacity: 0;
		scale: 0.95;
	}

	.animation--active .gaari-hub {
		animation-name: hubEntrance, hubGlow;
		animation-duration: 0.5s, 4s;
		animation-timing-function: ease-out, ease-in-out;
		animation-delay: 0s, 0.5s;
		animation-iteration-count: 1, infinite;
		animation-fill-mode: both, none;
	}

	@keyframes hubEntrance {
		from {
			opacity: 0;
			scale: 0.95;
		}
		to {
			opacity: 1;
			scale: 1;
		}
	}

	@keyframes hubGlow {
		0%, 100% { border-color: #D8D8D4; border-top-color: #C82D2D; }
		50% { border-color: rgba(200, 45, 45, 0.3); border-top-color: #C82D2D; }
	}

	/* Mini browser chrome */
	.hub-chrome {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 7px 10px;
		min-height: 30px;
		border-bottom: 1px solid #E8E8E4;
		background: #F5F3EE;
		flex-shrink: 0;
	}
	.chrome-dots {
		display: flex;
		gap: 3px;
	}
	.chrome-dots span {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		display: block;
	}
	.chrome-url {
		font-size: 9px;
		font-weight: 500;
		font-family: ui-monospace, monospace;
		color: #595959;
	}

	/* Event cards area */
	.hub-cards {
		position: relative;
		flex: 1;
		padding: 6px 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		overflow: hidden;
	}
	.event-card {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		min-height: 34px;
		border-radius: 6px;
		background: white;
		border: 1px solid #E8E8E4;
		padding: 4px 8px;
	}
	.card-color {
		width: 20px;
		height: 20px;
		min-width: 20px;
		border-radius: 4px;
	}
	.card-text {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-width: 0;
	}
	.card-title {
		font-size: 10px;
		font-weight: 600;
		color: #141414;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.3;
	}
	.card-sub {
		font-size: 9px;
		color: #4D4D4D;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.3;
	}

	/* =========================================
	   Flying Particles — Burst Rhythm
	   22s cycle, 1.2s startup offset
	   Flight occupies 0–11.5% (= 2.53s), invisible 11.5–100%

	   Burst 1 (1.2s):   p1 @ 1.2s, p2 @ 1.4s, p3 @ 1.65s
	   Burst 2 (5.7s):   p4 @ 5.7s, p5 @ 5.95s
	   Burst 3 (10.2s):  p6 @ 10.2s, p7 @ 10.4s, p8 @ 10.65s
	   Burst 4 (14.7s):  p9 @ 14.7s, p10 @ 14.95s
	   Burst 5 (19s):    p11 @ 19s, p12 @ 19.25s
	   ========================================= */
	.particle {
		position: absolute;
		z-index: 2;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		opacity: 0;
		pointer-events: none;
	}
	.particle::after {
		content: '';
		position: absolute;
		width: 16px;
		height: 4px;
		border-radius: 2px;
		background: inherit;
		opacity: 0.4;
		top: 3px;
		left: -14px;
	}
	.animation--active .particle {
		animation-iteration-count: infinite;
		animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Particle colors with strong glow */
	.p1 { background: #AECDE8; box-shadow: 0 0 12px #AECDE8, 0 0 4px #AECDE8; }
	.p2 { background: #E8B8C2; box-shadow: 0 0 12px #E8B8C2, 0 0 4px #E8B8C2; }
	.p3 { background: #B8D4A8; box-shadow: 0 0 12px #B8D4A8, 0 0 4px #B8D4A8; }
	.p4 { background: #C5B8D9; box-shadow: 0 0 12px #C5B8D9, 0 0 4px #C5B8D9; }
	.p5 { background: #E8C4A0; box-shadow: 0 0 12px #E8C4A0, 0 0 4px #E8C4A0; }
	.p6 { background: #A8CCCC; box-shadow: 0 0 12px #A8CCCC, 0 0 4px #A8CCCC; }
	.p7 { background: #C5B8D9; box-shadow: 0 0 12px #C5B8D9, 0 0 4px #C5B8D9; }
	.p8 { background: #F5E0A0; box-shadow: 0 0 12px #F5E0A0, 0 0 4px #F5E0A0; }
	.p9 { background: #9BAED4; box-shadow: 0 0 12px #9BAED4, 0 0 4px #9BAED4; }
	.p10 { background: #A8D4B8; box-shadow: 0 0 12px #A8D4B8, 0 0 4px #A8D4B8; }
	.p11 { background: #F5E0A0; box-shadow: 0 0 12px #F5E0A0, 0 0 4px #F5E0A0; }
	.p12 { background: #C5B8D9; box-shadow: 0 0 12px #C5B8D9, 0 0 4px #C5B8D9; }

	/* Tail rotation per direction */
	.p1::after { transform: rotate(-80deg); left: -8px; top: -6px; }
	.p2::after { transform: rotate(-45deg); left: -12px; top: -4px; }
	.p3::after { transform: rotate(-10deg); left: -14px; top: 3px; }
	.p4::after { transform: rotate(40deg); left: -12px; top: 8px; }
	.p5::after { transform: rotate(70deg); left: -6px; top: 8px; }
	.p6::after { transform: rotate(130deg); left: 4px; top: 8px; }
	.p7::after { transform: rotate(170deg); left: 8px; top: 3px; }
	.p8::after { transform: rotate(-135deg); left: 4px; top: -6px; }
	.p9::after { transform: rotate(150deg); left: 6px; top: 6px; }
	.p10::after { transform: rotate(10deg); left: -14px; top: 3px; }
	.p11::after { transform: rotate(-90deg); left: -6px; top: -6px; }
	.p12::after { transform: rotate(80deg); left: -4px; top: 8px; }

	/* Burst 1: Grieghallen (1.2s), DNS (1.4s), Kvarteret (1.65s) */
	.animation--active .p1 { animation: fly-grieghallen 22s 1.2s infinite; }
	@keyframes fly-grieghallen {
		0% { left: 58%; top: 3%; opacity: 0; scale: 0.5; }
		0.5% { opacity: 1; }
		2.5% { scale: 1; }
		6% { left: 54%; top: 27%; scale: 1; }
		10% { left: 51%; top: 47%; opacity: 1; scale: 0.3; }
		11.5% { left: 50%; top: 50%; opacity: 0; scale: 0; }
		100% { left: 50%; top: 50%; opacity: 0; scale: 0; }
	}

	.animation--active .p2 { animation: fly-dns 22s 1.4s infinite; }
	@keyframes fly-dns {
		0% { left: 83%; top: 6%; opacity: 0; scale: 0.5; }
		0.5% { opacity: 1; }
		2.5% { scale: 1; }
		6% { left: 66%; top: 28%; scale: 1; }
		10% { left: 52%; top: 47%; opacity: 1; scale: 0.3; }
		11.5% { left: 50%; top: 50%; opacity: 0; scale: 0; }
		100% { left: 50%; top: 50%; opacity: 0; scale: 0; }
	}

	.animation--active .p3 { animation: fly-kvarteret 22s 1.65s infinite; }
	@keyframes fly-kvarteret {
		0% { left: 79%; top: 31%; opacity: 0; scale: 0.5; }
		0.5% { opacity: 1; }
		2.5% { scale: 1; }
		6% { left: 65%; top: 41%; scale: 1; }
		10% { left: 52%; top: 49%; opacity: 1; scale: 0.3; }
		11.5% { left: 50%; top: 50%; opacity: 0; scale: 0; }
		100% { left: 50%; top: 50%; opacity: 0; scale: 0; }
	}

	/* Burst 2: USF Verftet (5.7s), Colonialen (5.95s) */
	.animation--active .p4 { animation: fly-usf 22s 5.7s infinite; }
	@keyframes fly-usf {
		0% { left: 76%; top: 87%; opacity: 0; scale: 0.5; }
		0.5% { opacity: 1; }
		2.5% { scale: 1; }
		6% { left: 63%; top: 69%; scale: 1; }
		10% { left: 52%; top: 53%; opacity: 1; scale: 0.3; }
		11.5% { left: 50%; top: 50%; opacity: 0; scale: 0; }
		100% { left: 50%; top: 50%; opacity: 0; scale: 0; }
	}

	.animation--active .p5 { animation: fly-colonialen 22s 5.95s infinite; }
	@keyframes fly-colonialen {
		0% { left: 33%; top: 94%; opacity: 0; scale: 0.5; }
		0.5% { opacity: 1; }
		2.5% { scale: 1; }
		6% { left: 42%; top: 72%; scale: 1; }
		10% { left: 49%; top: 53%; opacity: 1; scale: 0.3; }
		11.5% { left: 50%; top: 50%; opacity: 0; scale: 0; }
		100% { left: 50%; top: 50%; opacity: 0; scale: 0; }
	}

	/* Burst 3: Fløyen (10.2s), KODE (10.4s), Festspillene (10.65s) */
	.animation--active .p6 { animation: fly-floyen 22s 10.2s infinite; }
	@keyframes fly-floyen {
		0% { left: 6%; top: 85%; opacity: 0; scale: 0.5; }
		0.5% { opacity: 1; }
		2.5% { scale: 1; }
		6% { left: 28%; top: 68%; scale: 1; }
		10% { left: 48%; top: 52%; opacity: 1; scale: 0.3; }
		11.5% { left: 50%; top: 50%; opacity: 0; scale: 0; }
		100% { left: 50%; top: 50%; opacity: 0; scale: 0; }
	}

	.animation--active .p7 { animation: fly-kode 22s 10.4s infinite; }
	@keyframes fly-kode {
		0% { left: 5%; top: 43%; opacity: 0; scale: 0.5; }
		0.5% { opacity: 1; }
		2.5% { scale: 1; }
		6% { left: 28%; top: 46%; scale: 1; }
		10% { left: 48%; top: 49%; opacity: 1; scale: 0.3; }
		11.5% { left: 50%; top: 50%; opacity: 0; scale: 0; }
		100% { left: 50%; top: 50%; opacity: 0; scale: 0; }
	}

	.animation--active .p8 { animation: fly-festspillene 22s 10.65s infinite; }
	@keyframes fly-festspillene {
		0% { left: 5%; top: 17%; opacity: 0; scale: 0.5; }
		0.5% { opacity: 1; }
		2.5% { scale: 1; }
		6% { left: 28%; top: 34%; scale: 1; }
		10% { left: 48%; top: 48%; opacity: 1; scale: 0.3; }
		11.5% { left: 50%; top: 50%; opacity: 0; scale: 0; }
		100% { left: 50%; top: 50%; opacity: 0; scale: 0; }
	}

	/* Burst 4: Hulen (14.7s), SK Brann (14.95s) */
	.animation--active .p9 { animation: fly-hulen 22s 14.7s infinite; }
	@keyframes fly-hulen {
		0% { left: 5%; top: 63%; opacity: 0; scale: 0.5; }
		0.5% { opacity: 1; }
		2.5% { scale: 1; }
		6% { left: 28%; top: 57%; scale: 1; }
		10% { left: 48%; top: 51%; opacity: 1; scale: 0.3; }
		11.5% { left: 50%; top: 50%; opacity: 0; scale: 0; }
		100% { left: 50%; top: 50%; opacity: 0; scale: 0; }
	}

	.animation--active .p10 { animation: fly-brann 22s 14.95s infinite; }
	@keyframes fly-brann {
		0% { left: 82%; top: 58%; opacity: 0; scale: 0.5; }
		0.5% { opacity: 1; }
		2.5% { scale: 1; }
		6% { left: 66%; top: 54%; scale: 1; }
		10% { left: 52%; top: 51%; opacity: 1; scale: 0.3; }
		11.5% { left: 50%; top: 50%; opacity: 0; scale: 0; }
		100% { left: 50%; top: 50%; opacity: 0; scale: 0; }
	}

	/* Burst 5: Loppemarked (19s), Bergen Bibliotek (19.25s) */
	.animation--active .p11 { animation: fly-dnt 22s 19s infinite; }
	@keyframes fly-dnt {
		0% { left: 28%; top: 5%; opacity: 0; scale: 0.5; }
		0.5% { opacity: 1; }
		2.5% { scale: 1; }
		6% { left: 39%; top: 28%; scale: 1; }
		10% { left: 49%; top: 47%; opacity: 1; scale: 0.3; }
		11.5% { left: 50%; top: 50%; opacity: 0; scale: 0; }
		100% { left: 50%; top: 50%; opacity: 0; scale: 0; }
	}

	.animation--active .p12 { animation: fly-bibliotek 22s 19.25s infinite; }
	@keyframes fly-bibliotek {
		0% { left: 49%; top: 93%; opacity: 0; scale: 0.5; }
		0.5% { opacity: 1; }
		2.5% { scale: 1; }
		6% { left: 50%; top: 72%; scale: 1; }
		10% { left: 50%; top: 53%; opacity: 1; scale: 0.3; }
		11.5% { left: 50%; top: 50%; opacity: 0; scale: 0; }
		100% { left: 50%; top: 50%; opacity: 0; scale: 0; }
	}

	/* === Responsive === */
	@media (max-width: 767px) {
		.streaming-container {
			max-width: 100%;
			height: 320px;
		}
		.gaari-hub {
			width: 190px;
			height: 180px;
		}
		.desktop-only {
			display: none;
		}
		.hub-cards {
			padding: 4px 6px;
			gap: 3px;
		}
		.event-card {
			height: 28px;
			min-height: 28px;
			padding: 3px 6px;
			gap: 4px;
		}
		.card-color {
			width: 16px;
			height: 16px;
			min-width: 16px;
		}
	}

	/* === Reduced Motion: everything visible immediately, no animations === */
	@media (prefers-reduced-motion: reduce) {
		.gaari-hub {
			opacity: 1 !important;
			scale: 1 !important;
			animation: none !important;
		}
		.venue-pill {
			opacity: 0.8 !important;
			transform: none !important;
			animation: none !important;
		}
		.pill-dot {
			animation: none !important;
		}
		.grid-ellipse {
			opacity: 0.08 !important;
			transition: none !important;
		}
		.particle, .particle::after {
			display: none !important;
		}
		.event-card {
			opacity: 1 !important;
			transform: none !important;
			animation: none !important;
		}
	}
</style>
