<script lang="ts">
	import { page } from '$app/stores';
	import { lang } from '$lib/i18n';
	import { getCanonicalUrl } from '$lib/seo';
	import { Calendar, Sparkles, Users, Music, Mail, Send, Info, Instagram, Facebook } from 'lucide-svelte';

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/lenker`));

	type LinkItem = {
		href: string;
		label: { no: string; en: string };
		desc: { no: string; en: string };
		icon: typeof Calendar;
		featured?: boolean;
	};

	// Single source of truth: append `?utm_source=instagram&utm_medium=bio` on all hrefs
	// so we can attribute IG-bio traffic in Umami.
	const utm = '?utm_source=instagram&utm_medium=bio&utm_campaign=lenker';

	const primary: LinkItem[] = [
		{
			href: `/${$lang === 'en' ? 'en/today-in-bergen' : 'no/i-kveld'}${utm}`,
			label: { no: 'Hva skjer i kveld', en: 'What\u2019s on tonight' },
			desc: { no: 'Kveldens arrangementer i Bergen', en: 'Tonight\u2019s events in Bergen' },
			icon: Sparkles,
			featured: true
		},
		{
			href: `/${$lang === 'en' ? 'en/this-weekend' : 'no/denne-helgen'}${utm}`,
			label: { no: 'I helgen', en: 'This weekend' },
			desc: { no: 'Hele helgens program', en: 'Everything happening this weekend' },
			icon: Calendar
		},
		{
			href: `/${$lang === 'en' ? 'en/free-things-to-do-bergen' : 'no/gratis'}${utm}`,
			label: { no: 'Gratis arrangementer', en: 'Free things to do' },
			desc: { no: 'Trolig gratis de neste to ukene', en: 'Likely free in the next two weeks' },
			icon: Sparkles
		},
		{
			href: `/${$lang}/familiehelg${utm}`,
			label: { no: 'For familien', en: 'For families' },
			desc: { no: 'Helgens familievennlige tips', en: 'Family-friendly weekend picks' },
			icon: Users
		},
		{
			href: `/${$lang}/konserter${utm}`,
			label: { no: 'Konserter', en: 'Concerts' },
			desc: { no: 'Live musikk i Bergen', en: 'Live music in Bergen' },
			icon: Music
		}
	];

	const secondary: LinkItem[] = [
		{
			href: `/${$lang}/about${utm}`,
			label: { no: 'Bli med p\u00e5 nyhetsbrevet', en: 'Subscribe to the newsletter' },
			desc: { no: 'Ukentlig oppsummering, gratis', en: 'Weekly digest, free' },
			icon: Mail
		},
		{
			href: `/${$lang}/submit${utm}`,
			label: { no: 'Send oss et tips', en: 'Send us a tip' },
			desc: { no: 'Arrangerer du noe? Si fra!', en: 'Hosting something? Let us know.' },
			icon: Send
		},
		{
			href: `/${$lang}/about${utm}`,
			label: { no: 'Om G\u00e5ri', en: 'About G\u00e5ri' },
			desc: { no: 'Hva, hvorfor og hvem', en: 'What, why and who' },
			icon: Info
		}
	];

	const description = $lang === 'no'
		? 'Snarveier til alt som skjer i Bergen — i kveld, i helgen, gratis, konserter og mer.'
		: 'Shortcuts to everything happening in Bergen — tonight, this weekend, free, concerts and more.';

	const titleText = $lang === 'no' ? 'Lenker' : 'Links';
</script>

<svelte:head>
	<title>{titleText} — Gåri</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content={`${titleText} — Gåri`} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={`${$page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="mx-auto max-w-md px-4 py-10 sm:py-14">
	<header class="mb-8 text-center">
		<div class="mb-4 inline-block">
			<span class="font-display text-6xl font-bold tracking-tight text-[var(--color-primary)]">G</span>
		</div>
		<h1 class="font-display text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
			{$lang === 'no' ? 'Hva skjer i Bergen' : 'What\u2019s on in Bergen'}
		</h1>
		<p class="mt-3 text-base text-[var(--color-text-secondary)]">
			{$lang === 'no'
				? 'Velg en snarvei \u2014 alt er gratis og oppdatert daglig.'
				: 'Pick a shortcut \u2014 free and updated daily.'}
		</p>
	</header>

	<nav aria-label={titleText} class="flex flex-col gap-3">
		{#each primary as item}
			{@const Icon = item.icon}
			<a
				href={item.href}
				class="link-card group"
				class:featured={item.featured}
				data-umami-event="bio-link-click"
				data-umami-event-label={item.label.no}
			>
				<Icon class="link-icon" size={24} aria-hidden="true" />
				<span class="link-text">
					<span class="link-title">{item.label[$lang]}</span>
					<span class="link-desc">{item.desc[$lang]}</span>
				</span>
			</a>
		{/each}

		<div class="my-2 h-px w-full bg-[var(--color-border)]"></div>

		{#each secondary as item}
			{@const Icon = item.icon}
			<a
				href={item.href}
				class="link-card secondary"
				data-umami-event="bio-link-click"
				data-umami-event-label={item.label.no}
			>
				<Icon class="link-icon" size={20} aria-hidden="true" />
				<span class="link-text">
					<span class="link-title">{item.label[$lang]}</span>
					<span class="link-desc">{item.desc[$lang]}</span>
				</span>
			</a>
		{/each}
	</nav>

	<footer class="mt-10 flex items-center justify-center gap-4 text-sm text-[var(--color-text-muted)]">
		<a
			href="https://www.instagram.com/gaari_bergen/"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Instagram"
			class="hover:text-[var(--color-primary)]"
		>
			<Instagram size={20} aria-hidden="true" />
		</a>
		<a
			href="https://www.facebook.com/1062018946994640/"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Facebook"
			class="hover:text-[var(--color-primary)]"
		>
			<Facebook size={20} aria-hidden="true" />
		</a>
		<span aria-hidden="true">·</span>
		<a href="/{$lang}" class="underline hover:text-[var(--color-primary)]">gaari.no</a>
	</footer>
</div>

<style>
	.link-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		min-height: 64px;
		background: var(--color-bg-surface);
		border: 2px solid var(--color-border);
		border-radius: 12px;
		text-decoration: none;
		color: var(--color-text-primary);
		transition: transform 120ms ease, border-color 120ms ease, background-color 120ms ease;
	}

	.link-card:hover,
	.link-card:focus-visible {
		border-color: var(--color-primary);
		transform: translateY(-1px);
	}

	.link-card.featured {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: #fff;
	}

	.link-card.featured :global(.link-icon),
	.link-card.featured .link-title,
	.link-card.featured .link-desc {
		color: #fff;
	}

	.link-card.featured .link-desc {
		color: rgba(255, 255, 255, 0.85);
	}

	.link-card.secondary {
		min-height: 56px;
		padding: 0.75rem 1.25rem;
	}

	.link-card.secondary .link-title {
		font-size: 1rem;
	}

	:global(.link-icon) {
		flex-shrink: 0;
		color: var(--color-primary);
	}

	.link-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.link-title {
		font-family: 'Barlow Condensed', sans-serif;
		font-size: 1.375rem;
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.01em;
	}

	.link-desc {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		line-height: 1.3;
	}
</style>
