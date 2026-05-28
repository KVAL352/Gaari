<script lang="ts">
	import { page } from '$app/stores';
	import { lang } from '$lib/i18n';
	import { getCanonicalUrl } from '$lib/seo';

	let canonicalUrl = $derived(getCanonicalUrl(`/${$lang}/vilkar`));

	let pageTitle = $derived($lang === 'no' ? 'Bruksvilkår' : 'Terms of Use');
	let metaDesc = $derived($lang === 'no'
		? 'Bruksvilkår for gaari.no — hva du har lov til, hva som ikke er tillatt, og hvordan vi beskytter arbeidet bak siden.'
		: 'Terms of use for gaari.no — what you may do, what is not permitted, and how we protect the work behind the site.');
</script>

<svelte:head>
	<title>{pageTitle} — Gåri</title>
	<meta name="description" content={metaDesc} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content={`${pageTitle} — Gåri`} />
	<meta property="og:description" content={metaDesc} />
	<meta property="og:image" content={`${$page.url.origin}/og/default.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={`${pageTitle} — Gåri`} />
	<meta name="twitter:description" content={metaDesc} />
	<meta name="twitter:image" content={`${$page.url.origin}/og/default.png`} />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">
	<h1 class="mb-6 text-3xl font-bold">{pageTitle}</h1>

	<p class="mb-8 text-sm text-[var(--color-text-muted)]">
		{$lang === 'no' ? 'Sist oppdatert: 28. mai 2026' : 'Last updated: 28 May 2026'}
	</p>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? '1. Om disse vilkårene' : '1. About these terms'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Gaari.no (heretter «Gåri») er en arrangementskalender for Bergen drevet av
				<strong>Kjersti V. Therkildsen</strong>. Når du bruker siden, godtar du
				vilkårene nedenfor. Vilkårene gjelder hele tjenesten, inkludert nettsiden,
				nyhetsbrevet, RSS- og kalenderfeeder, og APIer.
			{:else}
				Gaari.no ("Gåri") is an event calendar for Bergen operated by
				<strong>Kjersti V. Therkildsen</strong>. By using the site you accept
				the terms below. These terms cover the entire service — the website,
				the newsletter, RSS and calendar feeds, and APIs.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? '2. Det du har lov til' : '2. What you may do'}
		</h2>
		<p class="mb-3 leading-relaxed text-[var(--color-text-secondary)]">
			{$lang === 'no' ? 'Som vanlig besøkende kan du fritt:' : 'As a regular visitor you may freely:'}
		</p>
		<ul class="list-inside list-disc space-y-2 text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				<li>Lese, søke og bla i alle offentlige sider på Gåri</li>
				<li>Dele lenker til enkeltarrangementer, samlingssider og forsiden i sosiale medier, e-post og samtaler</li>
				<li>Abonnere på nyhetsbrev, RSS-feed og kalenderfeed for personlig bruk</li>
				<li>Sitere korte utdrag fra Gåri-innhold i pressedekning, blogginnlegg og oppgaver, så lenge du oppgir Gåri som kilde og lenker tilbake</li>
				<li>Sende inn rettelser og forslag via skjemaene på siden</li>
			{:else}
				<li>Read, search and browse all public pages on Gåri</li>
				<li>Share links to individual events, collection pages and the homepage in social media, email and conversations</li>
				<li>Subscribe to the newsletter, RSS feed and calendar feed for personal use</li>
				<li>Quote short excerpts from Gåri content in press coverage, blog posts and academic work, as long as you credit Gåri and link back</li>
				<li>Submit corrections and suggestions via the forms on the site</li>
			{/if}
		</ul>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? '3. Det som ikke er tillatt' : '3. What is not permitted'}
		</h2>
		<p class="mb-3 leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Følgende krever skriftlig avtale med oss på forhånd
				(<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>):
			{:else}
				The following requires written agreement with us in advance
				(<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>):
			{/if}
		</p>
		<ul class="list-inside list-disc space-y-2 text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				<li>
					<strong>Systematisk innhenting (scraping, crawling, bulk-nedlasting)</strong>
					av arrangementsdata, beskrivelser, bilder, venue-lister, bydels-klassifiseringer
					eller andre strukturerte data fra Gåri — uavhengig av metode (HTTP, headless browser, API).
				</li>
				<li>
					<strong>Gjenbruk av en vesentlig del</strong> av databasen vår — også når dataene
					hver for seg er offentlige fakta — i et konkurrerende eller substituerende produkt.
					Dette gjelder også å hente data fra Gåri og berike det med eget innhold.
				</li>
				<li>
					<strong>Kopiering av AI-genererte beskrivelser, samlingssidetekster, kategori- og
					bydelsmapping</strong>, kuraterte venue-lister, FAQ-er og redaksjonelt materiale
					skrevet av Gåri.
				</li>
				<li>
					<strong>Re-hosting av bilder.</strong> Vi hot-linker bilder fra kildens egen server
					— vi har ikke rett til å gi videre lisens til disse. Hvis du vil bruke et bilde,
					må du gå til den opprinnelige kilden.
				</li>
				<li>
					<strong>Bruk av Gåri-data for å trene maskinlæringsmodeller</strong> uten avtale.
					Dette gjelder også finjustering, embeddings og syntetiske datasett.
				</li>
				<li>
					<strong>Tekniske omgåelser</strong> — å omgå rate limiting, IP-blokkeringer,
					bot-deteksjon eller andre tekniske tiltak vi har for å beskytte tjenesten.
				</li>
				<li>
					<strong>Markedsføring som villeder</strong> om forholdet til Gåri — for eksempel
					å fremstille seg selv som tilknyttet, sponset av eller godkjent av Gåri uten avtale.
				</li>
			{:else}
				<li>
					<strong>Systematic collection (scraping, crawling, bulk download)</strong>
					of event data, descriptions, images, venue lists, neighbourhood classifications
					or other structured data from Gåri — regardless of method (HTTP, headless browser, API).
				</li>
				<li>
					<strong>Reuse of a substantial part</strong> of our database — even when the data
					are individually public facts — in a competing or substitute product. This applies
					also to retrieving data from Gåri and enriching it with your own content.
				</li>
				<li>
					<strong>Copying of AI-generated descriptions, collection-page texts, category
					and neighbourhood mappings</strong>, curated venue lists, FAQs and editorial material
					written by Gåri.
				</li>
				<li>
					<strong>Re-hosting of images.</strong> We hot-link images from the source's own
					server — we do not have the right to sub-license them. To use an image, you must
					go to the original source.
				</li>
				<li>
					<strong>Use of Gåri data to train machine-learning models</strong> without agreement.
					This includes fine-tuning, embeddings and synthetic datasets.
				</li>
				<li>
					<strong>Technical circumvention</strong> — bypassing rate limiting, IP blocks,
					bot detection or other technical measures we use to protect the service.
				</li>
				<li>
					<strong>Misleading marketing</strong> about the relationship to Gåri — for example
					presenting yourself as affiliated with, sponsored by or endorsed by Gåri without
					agreement.
				</li>
			{/if}
		</ul>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? '4. Hva som er beskyttet — og hvorfor' : '4. What is protected — and why'}
		</h2>
		<p class="mb-4 leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Gåri har lagt vesentlig innsats i å samle, kuratere og strukturere
				arrangementsinformasjon fra over 40 kilder i Bergen. Det inkluderer egne
				AI-genererte beskrivelser, en kuratert liste over venues med adresse- og
				bydels-mapping, redaksjonelt innhold på over 50 samlingssider, og et system
				for kategorisering og dedupliseríng som er utviklet og vedlikeholdt løpende.
			{:else}
				Gåri has invested substantial effort in collecting, curating and structuring
				event information from over 40 sources in Bergen. This includes our own
				AI-generated descriptions, a curated list of venues with address and
				neighbourhood mapping, editorial content across more than 50 collection pages,
				and a categorization and deduplication system developed and maintained on an ongoing basis.
			{/if}
		</p>
		<p class="mb-4 leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Denne investeringen er etter vår vurdering beskyttet av:
			{:else}
				In our view this investment is protected by:
			{/if}
		</p>
		<ul class="mb-4 list-inside list-disc space-y-2 text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				<li>
					<strong>Åndsverksloven § 24</strong> — databaser med vesentlig investering i
					innsamling, kontroll eller presentasjon er beskyttet mot uttrekk og gjenbruk
					av vesentlige deler (sui generis-vern, jf. EU-direktiv 96/9/EF).
				</li>
				<li>
					<strong>Åndsverksloven §§ 2–3</strong> — våre egne tekster, kategori- og
					bydels-taksonomier, samlingssider og redaksjonelt innhold er åndsverk og
					kan ikke kopieres uten samtykke.
				</li>
				<li>
					<strong>Markedsføringsloven § 25 og § 30</strong> — utnyttelse av en
					konkurrents arbeid på en utilbørlig måte, eller etterligning som skaper
					forvekslingsfare, er forbudt. Praksisen er bekreftet i flere norske dommer
					(blant annet Finn.no v Supersøk).
				</li>
			{:else}
				<li>
					<strong>Norwegian Copyright Act § 24</strong> — databases with substantial
					investment in collection, verification or presentation are protected against
					extraction and reuse of substantial parts (sui generis protection, cf. EU
					Directive 96/9/EC).
				</li>
				<li>
					<strong>Norwegian Copyright Act §§ 2–3</strong> — our own texts, category
					and neighbourhood taxonomies, collection pages and editorial content are
					copyrighted works and may not be copied without consent.
				</li>
				<li>
					<strong>Norwegian Marketing Control Act §§ 25 and 30</strong> — exploiting
					a competitor's work in an improper manner, or imitation that creates a
					likelihood of confusion, is prohibited. This is established in Norwegian
					case law (including Finn.no v Supersøk).
				</li>
			{/if}
		</ul>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Vi er en gratis tjeneste og setter pris på samarbeid. Hvis du jobber med
				noe relatert og lurer på hva som er greit, er det bare å spørre.
			{:else}
				We are a free service and value collaboration. If you're working on something
				related and wondering what's acceptable, just ask.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? '5. AI-treningsdata' : '5. AI training data'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Vi tillater at AI-søkemotorer (ChatGPT, Claude, Perplexity, Gemini m.fl.)
				henter og siterer Gåri-innhold for å besvare brukerspørsmål med kreditering
				og lenke tilbake. Vi tillater ikke bruk av Gåri-data i treningssett for
				språkmodeller eller andre maskinlæringssystemer. Skillet er teknisk signalisert
				via Cloudflare Content Signals i robots.txt: <code>search=yes, ai-input=yes, ai-train=no</code>.
			{:else}
				We permit AI search engines (ChatGPT, Claude, Perplexity, Gemini and others)
				to retrieve and cite Gåri content when answering user questions, with
				attribution and a link back. We do not permit Gåri data in training sets for
				language models or other machine-learning systems. The distinction is signalled
				technically via Cloudflare Content Signals in robots.txt: <code>search=yes, ai-input=yes, ai-train=no</code>.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? '6. Brukerbidrag' : '6. User submissions'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Når du sender inn et arrangement, en rettelse eller en henvendelse,
				bekrefter du at innholdet er ditt eget eller at du har rett til å dele det.
				Du gir Gåri en gratis, ikke-eksklusiv rett til å vise, redigere og
				videreformidle innholdet i forbindelse med tjenesten. Personopplysninger
				behandles etter <a href="/{$lang}/personvern" class="text-[var(--color-accent)] underline">personvernerklæringen</a>.
			{:else}
				When you submit an event, a correction or an enquiry, you confirm that
				the content is your own or that you have the right to share it. You grant
				Gåri a free, non-exclusive right to display, edit and redistribute the
				content in connection with the service. Personal data is handled according
				to the <a href="/{$lang}/personvern" class="text-[var(--color-accent)] underline">privacy policy</a>.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? '7. Ansvarsbegrensning' : '7. Limitation of liability'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Gåri viser arrangementsinformasjon hentet fra andre kilder. Vi gjør vårt
				beste for at dataene skal være riktige, men kan ikke garantere
				fullstendighet, oppdatert pris, tilgjengelige billetter eller at
				arrangementet faktisk finner sted. Sjekk alltid hos arrangøren før du
				gjør planer som koster tid eller penger. Gåri har ikke ansvar for tap
				eller skade som følge av feil eller utdaterte opplysninger.
			{:else}
				Gåri displays event information retrieved from other sources. We do our
				best to keep the data accurate, but cannot guarantee completeness, current
				prices, ticket availability or that the event will actually take place.
				Always check with the organizer before making plans that cost time or money.
				Gåri is not liable for losses or damages arising from incorrect or outdated
				information.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? '8. Endringer' : '8. Changes'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Vi kan oppdatere disse vilkårene. Vesentlige endringer annonseres på siden,
				og dato øverst viser siste oppdatering. Fortsatt bruk av Gåri etter en
				endring regnes som aksept av de oppdaterte vilkårene.
			{:else}
				We may update these terms. Material changes are announced on the page,
				and the date at the top shows the last update. Continued use of Gåri
				after a change constitutes acceptance of the updated terms.
			{/if}
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? '9. Lovvalg og verneting' : '9. Governing law and venue'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Vilkårene er underlagt norsk rett. Eventuelle tvister søkes løst i minnelighet.
				Hvis det ikke lykkes, er Hordaland tingrett verneting.
			{:else}
				These terms are governed by Norwegian law. Any disputes will first be
				sought resolved amicably. Failing that, Hordaland District Court (Hordaland
				tingrett) shall be the venue.
			{/if}
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold">
			{$lang === 'no' ? '10. Kontakt' : '10. Contact'}
		</h2>
		<p class="leading-relaxed text-[var(--color-text-secondary)]">
			{#if $lang === 'no'}
				Spørsmål om vilkårene, ønske om lisens eller samarbeid, eller varsling om
				mulig brudd — send en e-post til
				<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>.
				Vi svarer normalt innen noen virkedager.
			{:else}
				Questions about these terms, licensing or partnership requests, or notices
				of possible breach — send an email to
				<a href="mailto:post@gaari.no" class="text-[var(--color-accent)] underline">post@gaari.no</a>.
				We normally respond within a few business days.
			{/if}
		</p>
	</section>
</div>
