---
name: detektiv
description: Systematisk detektivarbeid på alle undersider av gaari.no, én sidetype og én nettsiderolle om gangen (datakvalitet, innhold, QA, frontend, SEO, tilgjengelighet, ytelse, UX, UI, personvern/sikkerhet, analytiker). Leter etter feil, ting som må undersøkes, og UX/UI som kan bli bedre. Hver runde ender med rettinger, påminnelser og en rad i loggen. Bruk når Kjersti sier «detektiv», «detektivrunde», «let etter feil på siden», «gå gjennom undersidene», «neste runde», eller når det er tid for neste runde i loggen. Ikke for tekst og overtalelse på én landingsside; det er page-audit.
user-invocable: true
argument-hint: "[sidetype] [rolle]  (tomt = neste ugjorte i loggen)"
---

# Detektiv: systematisk gjennomgang av gaari.no

**Oppgave: $ARGUMENTS**

Målet er å finne det ingen alarm finner: sider som svarer 200 og ser riktige ut,
men lover noe de ikke holder. Alle feilene fra detektivrunden 17.–18. nov hadde
den formen (relaterte arrangementer som var kategoriens eldste, dato to ganger i
tittelen, julemarked med 641 arrangementer). Ingen test var rød.

## Grunnregelen

**Kan instrumentet se det jeg spør om?** Før et funn eller et «ingenting galt»
skrives ned: hvilket verktøy svarte, og er det i stand til å oppdage feilen?
Krev et positivt tall («38 av 38 kort har dato»), ikke fravær av feil. En
`curl` ser ikke JavaScript, en side svarer 200 også når den er tom, og en test
av filteret sier ingenting om hva siden viser. Les
`pattern_ingenting_ser_ut_som_suksess.md` og `pattern_200_er_ikke_bevis.md` i
minnet hvis du ikke har gjort det i økta.

## Slik kjøres en runde

1. **Velg runde.** Med argument: den sidetypen og rollen. Uten: les
   `docs/detektiv/logg.md` og ta neste ugjorte celle i matrisen, i
   rolle-rekkefølgen under. Si kort hvilken runde det er før du begynner.
2. **Hent sidelisten fra sitemapen**, ikke fra hukommelsen:
   `curl -s https://gaari.no/sitemap.xml`. Plukk sidetypen (tabellen under).
   Er det mange sider av typen, velg et utvalg som dekker variantene (NO og EN,
   tom og full, sesong i og utenfor vindu) og skriv utvalget i loggen.
3. **Sjekk at saken ikke er kjent.** `node scripts/finnes-det-alt.mjs <ord>`
   og «Åpne saker» i `OVERLEVERING.md` før et funn regnes som nytt.
4. **Kjør rollen.** Én rolle. Bruk instrumentene rollen lister, og noter for
   hvert funn hvilket instrument som så det.
5. **Sorter funnene i tre klasser:**
   - **Feil:** siden sier eller gjør noe som er galt. Rettes i runden, med test
     (se `feedback_testloop_per_oppgave.md`: testløkke, mutasjonssjekk, sonder
     nabokoden).
   - **Må undersøkes:** mistanke uten bevis, eller noe som krever data jeg ikke
     har. Blir en påminnelse.
   - **Forbedring:** UX, UI eller tekst som kunne vært bedre. Foreslås, rettes
     ikke uten hennes ja. Vis før og etter, og si hva det koster.
   - **Struktur:** feilen kommer av måten noe er bygd på (samme kode kopiert
     flere steder, en regel som er valgt en gang og aldri sett på igjen, en
     kommentar som sier noe annet enn koden). **Avklares med henne før noe
     rettes**, også når rettingen ser liten ut. Legg fram hva strukturen er,
     hvilke problemer den gir, og ett anbefalt valg. Gamle strukturer kan være
     verdt å endre, men det bestemmer vi sammen. **Ett spørsmål om gangen**,
     med `AskUserQuestion`: to til tre løsninger hun kan velge mellom, den
     anbefalte først, og hun kan alltid skrive sitt eget svar. Skriv valgene
     inn i loggen før de bygges.
6. **Lever runden** (se «Hva en runde leverer»).

Én rolle per runde, ikke alle på én gang. Kvaliteten faller når elleve roller
skal holdes i hodet samtidig, og funnene blir en liste ingen leser.

## Sidetypene

| Sidetype | Eksempel | Hva som kjennetegner dem |
|---|---|---|
| Forside | `/no`, `/en` | filtre, dato, mest trafikk |
| Samlingssider | `/no/[collection]` | evergreen, bydel, sesong, festival; lover et tema i tittelen |
| Arrangementssider | `/no/events/[slug]` | mange og like; stikkprøve holder for mal-feil, ikke for data-feil |
| Stedssider | `/no/venue/[slug]` | matcher på `venue_name` |
| Denne uken | `/no/denne-uken` | tidsvindu |
| Skjemaer | `/submit`, `/nyhetsbrev`, `/paminnelse` | skriver til basen eller sender epost |
| Faste sider | `about`, `personvern`, `vilkar`, `opphavsrett`, `tilgjengelighet`, `datainnsamling`, `guide`, `lenker`, `for-arrangorer` | endres sjelden, lover ting om tjenesten |
| Maskinflater | `sitemap.xml`, `llms.txt`, `feed`, `og`, `/api/health` | leses av roboter, ikke mennesker |

Ruteoversikten står i `.claude/docs/routes.md`. Samlingenes definisjoner i
`src/lib/collections.ts`.

## Rollene, i rekkefølge

Rekkefølgen er bevisst: først det som avgjør om siden snakker sant, så om den
virker, så om den blir funnet og kan brukes, til sist om den er fin. En pen
side med feil data er verre enn en stygg side med riktige.

### 1. Datakvalitet
- **Spør:** stemmer det siden viser med basen og med kilden?
- **Instrumenter:** Supabase-spørring (`fetchAllRows()`, aldri en enkel select
  over 1000 rader), `curl` av siden, kildesiden for 2–3 rader.
- **Ser etter:** feil kategori og bydel, utgåtte arrangementer, dubletter
  dedup ikke fanget, klokkeslett som spriker, `is_canary` som lekker,
  pris som påstår «Gratis».
- **Husk:** samme avvik kan peke to veier. Sjekk kilden før du retter
  (`pattern_sjekk_kilden_for_du_retter.md`).

### 2. Innholdsredaktør
- **Spør:** holder siden det tittelen og ingressen lover?
- **Instrumenter:** les titlene på arrangementene som faktisk vises (live), tell
  dem, sammenlign med tittel, FAQ og meta-beskrivelse.
- **Ser etter:** samleside uten temafilter, påstander uten kilde i teksten,
  norsk tekst på engelske sider, dato eller klokkeslett i titler, utdatert
  årstall, FAQ som ikke stemmer med siden.

### 3. QA-tester
- **Spør:** virker alt som kan klikkes, filtreres og fylles ut?
- **Instrumenter:** Chrome (klikk, filtre, tilbake-knapp, språkbytte), `curl`
  på alle lenker fra siden, `scripts/check-site.ts` for sidetypen.
- **Ser etter:** lenker til 404 eller 301-kjeder, filtre som gir tomt uten å si
  det, språkbytte som lander på feil side, tomtilstander uten tekst.
- **Grense:** skjemaer som sender epost eller skriver til basen sendes ikke uten
  hennes ja for akkurat den innsendingen.

### 4. Frontendutvikler
- **Spør:** hva skjer i nettleseren som ikke synes?
- **Instrumenter:** Chrome-konsollen (`read_console_messages`), nettverk
  (`read_network_requests`), `npx svelte-check`.
- **Ser etter:** feil og advarsler i konsollen, hydreringsfeil, kall som feiler
  eller gjøres to ganger, innhold som bare finnes etter JavaScript.

### 5. SEO
- **Spør:** blir siden funnet, og for det den faktisk handler om?
- **Instrumenter:** `curl` av HTML-en (title, meta description, canonical,
  hreflang, JSON-LD), sitemapen, skillen `seo` for dypere spørsmål.
- **Ser etter:** canonical som peker på 301 (`pattern_canonical_av_feil_slug.md`),
  hreflang-par som ikke peker på hverandre, dupliserte titler, tynn tekst,
  sider i sitemapen som ikke skal være der og omvendt.

### 6. Tilgjengelighet
- **Spør:** kan siden brukes med tastatur, skjermleser og forstørrelse?
- **Instrumenter:** Chrome (`read_page` gir tilgjengelighetstreet, tab gjennom
  siden), kontrast fra CSS-variablene.
- **Ser etter:** knapper uten navn, bilder uten alt, fokus som forsvinner,
  overskriftsnivåer som hopper, kontrast under 4,5:1, `lang` som ikke følger
  språket.

### 7. Ytelse
- **Spør:** hvor tung er siden, og hvorfor?
- **Instrumenter:** `curl -w '%{size_download} %{time_total}'`, nettverkslisten
  i Chrome. Mål mot produksjon, ikke seed (CI har 25 arrangementer, produksjon
  ca. 2 000).
- **Ser etter:** HTML over budsjettet, bilder uten størrelse, store bibliotek
  dratt inn av én liten import (`pattern_liten_funksjon_stor_tabell.md`).

### 8. UX
- **Spør:** finner en besøkende det hun kom for, og vet hun hva neste steg er?
- **Instrumenter:** Chrome i mobilbredde (`resize_window` 390×844) og desktop,
  skjermbilder.
- **Ser etter:** viktigste handling under folden, blindveier, filtre som
  nullstilles, lange lister uten struktur, ord en besøkende ikke forstår.
- **Leverer forslag**, ikke rettinger.

### 9. UI og visuell design
- **Spør:** følger siden designsystemet, og ser den ferdig ut?
- **Instrumenter:** skjermbilder, skillen `designer` for Funkis-reglene,
  `vibe-sjekk` og `ferdig-sjekk` ved behov.
- **Ser etter:** avvik fra Funkis, ujevn avstand, brutte bilder, tekst som
  flyter over på mobil, mørk modus.
- **Leverer forslag**, ikke rettinger.

### 10. Personvern og sikkerhet
- **Spør:** lekker siden noe, og stemmer personvernerklæringen med det siden gjør?
- **Instrumenter:** nettverkslisten (tredjepartskall), HTML-kilden, responshoder
  (`curl -I`).
- **Ser etter:** personopplysninger i HTML eller JSON (innsenderadresser,
  navn), kall til tredjeparter som ikke står i erklæringen, manglende
  sikkerhetshoder. Dypere revisjon: skillen `sikkerhetsrevisjon`.

### 11. Analytiker
- **Spør:** blir siden brukt, og måler vi det vi tror?
- **Instrumenter:** Umami (`scripts/umami-via-cloudflare-dns.mjs` hvis VPN-DNS
  stopper), Search Console via skillen `seo`.
- **Ser etter:** sider uten besøk, hendelser som aldri fyres, målinger som ikke
  kan se det de teller (Umami fjerner spørringsparametre).

## Hva en runde leverer

1. **Rettinger av feil**, hver i sin commit (`fix(område): hva og hvorfor`),
   med test. Ikke push før hun sier det.
2. **Én påminnelse per «må undersøkes» og per «ikke sjekket»** i
   `scripts/reminders.json`, med dato, tittel og hvordan det sjekkes. Samme rad
   sist i `private/reminders.json`. Ingen navn eller personopplysninger i den
   offentlige fila. Se `feedback_ikke_sjekket_blir_paaminnelse.md`.
3. **Forbedringsforslag** til henne i svaret, kort, med hva de koster.
4. **En rad i `docs/detektiv/logg.md`**: dato, sidetype, rolle, utvalg,
   antall sider, funn per klasse, commits. Oppdater matrisen.
5. **Svar til henne:** hva runden fant, hva som er rettet, hva som venter på
   henne, og neste runde i matrisen.

Før svaret: les gjennom eget svar etter «ikke sjekket», «ikke undersøkt»,
«ikke sett live». Hver av dem skal ha en påminnelse.

## Det skillen ikke gjør

- Leser ikke scrapere for å finne feil i dem. Et datafeil-funn kan peke på en
  scraper; da blir det en påminnelse eller egen oppgave.
- Sender ingenting, verken skjema eller epost, uten at hun har sett nøyaktig
  den innsendingen.
- Endrer ikke design, tekst eller struktur uten hennes ja.
- Hever ikke grenser i `datakonsistens.ts` for å få noe grønt.
