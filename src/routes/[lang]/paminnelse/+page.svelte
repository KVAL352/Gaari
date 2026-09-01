<script lang="ts">
	import { page } from '$app/state';
	import { lang } from '$lib/i18n';

	// Landingsside for bekreftelseslenka i påminnelses-e-posten.
	// /api/remind/confirm sender hit med ?status=ok|ugyldig|feil.
	let status = $derived(page.url.searchParams.get('status') ?? 'ugyldig');
	let arrangement = $derived(page.url.searchParams.get('arrangement') ?? '');

	let tekst = $derived(
		{
			ok: {
				no: {
					tittel: 'Påminnelsen er bekreftet',
					brod: 'Du får en e-post dagen før arrangementet. Adressen brukes ikke til noe annet.'
				},
				en: {
					tittel: 'Reminder confirmed',
					brod: 'You will get an email the day before the event. The address is not used for anything else.'
				}
			},
			ugyldig: {
				no: {
					tittel: 'Lenken virker ikke',
					brod: 'Den er enten brukt fra før, eller den er utløpt. Du kan be om en ny påminnelse fra arrangementssiden.'
				},
				en: {
					tittel: 'This link does not work',
					brod: 'It has either been used already, or it has expired. You can request a new reminder from the event page.'
				}
			},
			feil: {
				no: {
					tittel: 'Noe gikk galt',
					brod: 'Prøv igjen om litt. Skjer det på nytt, send en e-post til post@gaari.no.'
				},
				en: {
					tittel: 'Something went wrong',
					brod: 'Please try again shortly. If it keeps happening, send an email to post@gaari.no.'
				}
			}
		}[status as 'ok' | 'ugyldig' | 'feil']?.[$lang === 'en' ? 'en' : 'no'] ?? {
			tittel: 'Lenken virker ikke',
			brod: 'Du kan be om en ny påminnelse fra arrangementssiden.'
		}
	);
</script>

<svelte:head>
	<title>{tekst.tittel} · Gåri</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="wrap">
	<h1>{tekst.tittel}</h1>
	<p>{tekst.brod}</p>

	{#if status === 'ok' && arrangement}
		<a class="lenke" href="/{$lang}/events/{arrangement}">
			{$lang === 'en' ? 'Back to the event' : 'Tilbake til arrangementet'}
		</a>
	{:else}
		<a class="lenke" href="/{$lang}">
			{$lang === 'en' ? 'Back to the front page' : 'Tilbake til forsiden'}
		</a>
	{/if}
</main>

<style>
	.wrap {
		max-width: 34rem;
		margin: 0 auto;
		padding: 4rem 1.25rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
		color: var(--color-text-primary);
	}

	p {
		color: var(--color-text-secondary);
		line-height: 1.6;
	}

	.lenke {
		display: inline-block;
		margin-top: 1.5rem;
		color: var(--color-accent);
		text-decoration: underline;
	}
</style>
