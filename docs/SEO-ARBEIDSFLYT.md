# SEO-arbeidsflyt

Sist oppdatert: 25. august 2026. Bygget på en full gjennomgang av Umami,
Search Console, Bing Webmaster og databasen samme dag.

Dette dokumentet er arbeidslisten *og* sperrelisten. Sperrelisten nederst er
den viktigste delen — den holder styr på alt jeg ikke kan gjøre selv, slik at
det ikke forsvinner mellom økter.

---

## Det ene funnet som styrer rekkefølgen

Vanlig SEO-råd sier: flytt deg fra plass 6 til plass 3, så tredobles klikkene.
Det stemmer ikke for Gåri. Målt på våre egne 90 dager i Search Console:

| Plassering | CTR    |
|-----------:|-------:|
| 1          | 38,81 % |
| 2          | 9,95 % |
| **3**      | **4,58 %** |
| 4          | 3,56 % |
| 5          | 2,89 % |
| 6          | 1,85 % |
| 7          | 0,69 % |
| 8          | 0,45 % |
| 9          | 0,87 % |
| 10–15      | 0,64 % |

Fallet fra plass 2 til plass 3 er brattere enn hele strekket fra 3 til 15.
Grunnen er synlig i søkeresultatet: på «hva skjer i Bergen»-søk legger Google
sin egen arrangementsmodul og et AI-sammendrag over de organiske treffene, så
organisk plass 3 ligger ofte under skjermkanten.

Modellert på hele «hva skjer i Bergen»-klyngen — 65 søkeord, 22 020
visninger, 825 klikk på vektet plass 7,0 — gir en flytting til plass 3 rundt
**+184 klikk på 90 dager. To om dagen.**

**Konsekvens:** arbeid som flytter sider fra plass 7 til plass 4 lønner seg
dårlig. Arbeid som gjør oss kvalifisert til boksen øverst — som er et
spørsmål om strukturerte data og datakvalitet, ikke om tekst — sikter mot
plassen over den organiske lista. Hele fase 1 følger av dette.

Kurven skal regnes ut på nytt hvert kvartal. Den flytter seg når Google
endrer utformingen av søkeresultatene.

---

## Fase 0 — gjort 25. august

| Commit | Hva |
|---|---|
| `deaffe1` | llms.txt viste arrangementer fra mai 2025 som «live data». Sorterte på `date_start` med et `date_end`-filter, så faste serier fra 2025 lå øverst. |
| `2aca61c` | robots.txt sa `ai-train=no` og slapp samtidig inn hver eneste trenings-crawler. Nå sier signalet ja, i tråd med beslutningen om å bli kjent av modellene. |
| `f0ad010` | Umami fikk aldri riktig land. Nå sendes `x-umami-client-*` fra Vercels geo-headere. |
| `db1d81e` | `scripts/backfill-title-en.ts` — satsvis backfill av engelske titler. |

Alle 1 232 tester passerer etter endringene.

---

## Fase 1 — datagrunnlaget (høyest verdi)

Dette er veien inn i Googles arrangementsboks. Schema-generatoren i
`src/lib/seo.ts` er allerede god: den håndterer `MusicEvent`/`TheaterEvent`,
`performer`, prisintervaller og bilde. Hvert felt er betinget av data som
ofte mangler.

Målt på 1 979 kommende arrangementer 25. august:

| Mangler | Antall | Følge |
|---|---:|---|
| `image_url` | 410 (21 %) | Svakest mulige kandidat til rich result |
| `price` | 1 128 (57 %) | `offers.price` utelates |
| `title_en` | 1 720 (87 %) | Engelske sider viser norske titler |
| `ticket_url` | 246 (12 %) | Ingen `offers.url` |

1. **Kjør `backfill-title-en.ts` til køen er tom.** Idempotent, så den kan
   kjøres om igjen. Se sperrelisten om kvote.
2. **Kategorisering.** `culture` har 477 kommende arrangementer mot `music`
   146. Otis Gibbs på Ole Bull Scene ligger som `culture`, får generisk
   `Event` i stedet for `MusicEvent`, og mister `performer` samtidig. Ta en
   stikkprøve på 30 `culture`-rader på konsertsteder og mål hvor galt det er
   **før** `mapCategory` endres.
3. **Bilder og pris** løftes som rangert SEO-arbeid, ikke som opprydding.

---

## Fase 2 — engelsk som eget spor

Engelske søk konverterer omtrent tre ganger bedre enn norske. Målt:

| Søk | CTR | Plass |
|---|---:|---:|
| whats on in bergen | 17,0 % | 4,9 |
| events in bergen today | 14,7 % | 3,6 |
| bergen events today | 13,9 % | 5,4 |
| live music in bergen tonight | 12,6 % | 2,4 |
| *hva skjer i bergen i helgen* | *4,9 %* | *5,6* |

Turister planlegger kort og bestemmer seg fort. Engelske sider har allerede
2 371 klikk mot norske 5 679, med langt færre arrangementer som faktisk er
på engelsk.

- `title_en`-backfillen er hovedtiltaket (fase 1).
- **Ikke rør `/en/i-kveld`.** Slugen er norsk fordi `i-kveld` mangler i
  `HREFLANG_PAIRS`, men sida ligger på plass 2,4 med 149 klikk. Gevinsten ved
  en engelsk slug er liten, risikoen ved å flytte en side som virker er ikke.
- Legg engelske par på de *svake* uparede samlingene først. `sentrum` ligger
  på plass 23,3 og har ingenting å tape.

---

## Fase 3 — festivaler

Her lå den største overraskelsen. Søkeetterspørselen er enorm og vi svarer
nesten ikke:

| Søk | Visninger | Klikk | CTR | Plass |
|---|---:|---:|---:|---:|
| hallaien 2026 | 5 424 | 6 | 0,11 % | 8,9 |
| bergenfest program | 5 202 | 8 | 0,15 % | 9,3 |
| bergenfest 2026 | 4 878 | 14 | 0,29 % | 7,2 |
| bergen ølfestival 2026 | 1 585 | **0** | 0,00 % | 9,5 |
| grieghallen program | 1 674 | 3 | 0,18 % | 9,6 |

**Hub-sida finnes allerede** — `/no/festivaler` og
`/en/festivals-in-bergen`, med sju festivaler, redaksjonell tekst og FAQ, og
den viser alle sju året rundt med månedshint. Den skal ikke bygges på nytt.

Problemet er at sidene er tomme. `/no/bergenfest` svarer i dag med
`"numberOfItems":0`. Telling i basen: Hallaien 0, Bergenfest 0, Nattjazz 0,
Borealis 0, Pride 0, Bergen Ølfestival 0, BIFF 2.

En evigvarende URL som er tom ti måneder i året kan ikke rangere. Derfor:

1. **Gi festivalsidene innhold som virker med null arrangementer.** Historie,
   normale datoer, hvor den holder til, når programmet slippes, hvor
   billettene selges. Det kan rangere hele året. `offSeasonHint` finnes
   allerede, men en linje er ikke nok innhold til plass 1–2.
2. **Hallaien og Bergen Ølfestival mangler helt** — ingen samling, ingen
   arrangementer, til sammen 7 000 visninger i kvartalet. De er de to mest
   åpenbare hullene i katalogen.
3. **Lag en slippkalender** — når annonserer hver festival programmet sitt?
   Det er da arrangementene må inn, ikke når festivalen går av stabelen.
4. **Satsingen er `program`-varianten.** «bergenfest program» og «grieghallen
   program» vil ha en programoversikt, og den har vi. Rene merkenavnsøk
   («bergenfest 2026») taper alltid mot arrangørens egen side, uansett
   plassering — de er en luftspeiling, ikke en mulighet.

---

## Fase 4 — måling

- **Sesong, ikke uke.** Juni ga 4 360 klikk (145/dag), juli 1 355 (44/dag).
  Festivalsesongen er 3,3× juli. En nedgang uke over uke i august sier
  ingenting. Sammenlign mot samme sesong i fjor.
- **Land leses fra Search Console**, ikke fra Umami, til geo-fiksen er
  verifisert i drift.
- **Kryssjekk alt som styrer en beslutning.** Umami-landfeilen overlevde
  fordi ingenting motsa den. Det tok tretti sekunders sammenligning med
  Search Console å avsløre.
- Samlingssider er 46 % av klikkene fra 99 sider; arrangementssider 31 % fra
  4 844. Per side er en samling rundt 72× mer produktiv. Samling-først er
  empirisk riktig og skal fortsette.

---

## SPERRELISTE

Alt som ikke kan lukkes av meg alene. Denne lista skal vedlikeholdes, ikke
tømmes i stillhet: et punkt fjernes bare når det faktisk er gjort.

### Krever at Kjersti gjør noe — jeg har ikke tilgang

| # | Sak | Hvorfor jeg ikke kan | Tid |
|---|---|---|---|
| S1 | **Gemini-kvoten er 20 kall i døgnet. Ta stilling til betalt nivå.** Se eget avsnitt under — dette er trolig den største enkeltsaken i hele gjennomgangen. | Krever et betalingskort på Google-prosjektet. | 15 min |
| S2 | **Bing-feil.** 46–135 feil per dag, 1 714 sider indeksert mot 3 656 i sitemap. Hent de faktiske feil-URL-ene i Bing Webmaster Tools. | API-et gir bare aggregerte tall, ikke URL-lista. | 20 min |
| S3 | **Core Web Vitals.** Ikke målt. Kjør PageSpeed Insights i nettleseren på `/no`, `/en` og en samlingsside. | API-et svarte `Quota exceeded` på det delte prosjektet. | 10 min |
| S4 | **Verifiser Umami-geo etter deploy.** Sjekk at land viser Norge og ikke USA. | Fiksen virker først i drift, og historikken retter seg ikke bakover. | 5 min |
| S5 | **Bekreft indeksering i Search Console-UI-et.** `seo-report.ts` skriver «0 indexed / 3532 submitted». Jeg mener feltet er utgått i API-et og alltid er null. | API-et gir ingen dekningsrapport. | 5 min |
| S6 | **MailerLite double opt-in** — finnes ikke i koden. Fra før. | Innstilling i MailerLite. | 5 min |

### S1 utdypet — Gemini-kvoten er trolig rotårsaken til hele innholdsgapet

API-et svarte selv med tallet 25. august:

```
Quota exceeded for metric: generate_content_free_tier_requests
limit: 20, model: gemini-2.5-flash
quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier
quotaValue: "20"
```

**Tjue kall i døgnet, for hele prosjektet.** Det er ikke bare en sperre for
backfillen. Den daglige scrapen kaller `generateDescription()` én gang per
nytt arrangement, og bruker opp kvoten på de første tjue. Alt etter det faller
tilbake på maltekst.

Det stemmer med tallene: bare **469 av 1 979** kommende arrangementer har en
ekte AI-beskrivelse. De øvrige 76 % har mal. Og mal gir ingen `title_en`,
som er nettopp funn 4.

Vi har altså trodd at vi hadde AI-genererte beskrivelser på hele katalogen.
Det har vi ikke hatt på lenge.

*Forbehold: jeg vet ikke når grensen ble 20. Hvis Google kuttet gratisnivået
i sommer, forklarer det både at 469 eldre rader har beskrivelse og at det har
stoppet opp siden. Det er en rimelig slutning, ikke noe jeg har målt.*

**To veier ut. De utelukker ikke hverandre.**

**A — betal for Gemini.** Pris bekreftet fra Googles prisside: 0,30 USD per
million inn-tokens, 2,50 USD per million ut-tokens for `gemini-2.5-flash`.
Batch-modus koster halvparten.

| | Anslag |
|---|---|
| Hele tittel-backfillen, 86 kall | ~0,45 USD, altså under fem kroner, én gang |
| Løpende drift, anslagsvis 50 nye arrangementer per dag | ~2–4 USD i måneden |

Anslagene er usikre i én retning: `gemini-2.5-flash` bruker *thinking
tokens*, som faktureres som ut-tokens, og jeg vet ikke hvor mange den bruker
per kall. Regn med at driftstallet kan bli dobbelt så høyt. Det er fortsatt
under femti kroner i måneden.

Dette bryter ikke med regelen om ingen betalte verktøy for inntekt — det er
infrastruktur til kaffepenger, og den betaler for datagrunnlaget hele fase 1
hviler på.

**B — la scrapen sende flere arrangementer per kall.** Det er nøyaktig
grepet `backfill-title-en.ts` gjør: tjue titler i ett kall i stedet for tjue
kall. Femti nye arrangementer blir tre kall i stedet for femti, og da holder
til og med gratisnivået. Krever en ombygging av `generateDescription()` og
kallstedet i `scrape.ts`, og bør gjøres uansett om vi betaler — det er
raskere og mer robust.

**Anbefaling: gjør A nå og B etterpå.** A låser opp fase 1 i dag for under
fem kroner. B gjør oss uavhengige av kvoten på sikt.

### Krever verktøy vi ikke har

| # | Sak | Status |
|---|---|---|
| V1 | **AI-siteringsmåling.** Hvor ofte ChatGPT og Perplexity siterer gaari.no. | Det finnes ikke noe API. De 20 henvisningene på 30 dager er et gulv, ikke en måling — assistenter fjerner ofte referrer, og en sitering som leses uten klikk gir ingen spor. Verktøy som selger «AI-synlighetsscore» sampler spørsmål og ekstrapolerer. Det er en modell, ikke en måling, og det koster penger. |
| V2 | **Treff fra AI-crawlere.** | Krever serverlogger. Vercels gratisnivå gir dem ikke brukbart. |
| V3 | **Søkevolum for ord vi ikke rangerer på.** | Search Console viser bare søk der vi allerede vises. Uten Keyword Planner eller tilsvarende er blindsonen reell — vi kan ikke se etterspørsel vi ikke allerede fanger. |
| V4 | **Konkurrentenes plasseringer.** | Ingen tilgang. Kan bare anslås ved manuelle søk. |

### Kan ikke avgjøres av dataene vi har

| # | Sak |
|---|---|
| U1 | **Bing rapporterer 0 klikk** på hvert eneste søk, mens Umami samtidig teller 151 besøk fra bing.com på 30 dager. De to kildene motsier hverandre og jeg vet ikke hvilken som har rett. Ikke bygg noe på Bings klikktall før dette er avklart. |
| U2 | **237 arrangementer hadde AI-beskrivelse men ingen `title_en`.** Stikkprøven på tolv ga tolv treff, så de ble trolig generert før feltet fantes i prompten. Det er en slutning, ikke et bevis. |

### Ømtålig — annen økt jobber i samme tre

| # | Sak |
|---|---|
| T1 | **`scripts/reminders.json`** har ukommiterte endringer fra en annen økt. Punktene S1–S6 over burde ligge der som påminnelser, men fila skal ikke røres før den andre økta har landet sitt. En test krever likt antall og like datoer i sporet og privat utgave. |

### Regler som gjelder før noe av dette utvides

- **Ny scraper krever robots.txt-sjekk først**, rapportert før kode skrives
  eller kilden anbefales. Gjelder Hallaien og Bergen Ølfestival i fase 3 —
  samlingssider er greit, scraping av dem er ikke avklart.
- **Ingen kopierte beskrivelser.** Alltid AI-generert eller mal.
- **`SOURCE_RANK` i `scripts/lib/dedup.ts`** må inkludere enhver ny kilde,
  ellers scorer den 0 og slettes av dedup.

---

## Fallgruver som allerede har kostet oss

- **Visninger er ikke muligheter.** 5 424 visninger på 0,11 % CTR ser ut som
  et hull. På et navigasjonssøk — noen skriver festivalnavnet for å komme til
  festivalens side — finnes det ingen oppnåelig plassering som konverterer.
  Skill navigasjons- fra informasjonssøk før et søkeord får verdi.
- **Generiske CTR-kurver villeder.** Se toppen av dokumentet.
- **AI-henting og AI-trening er to systemer.** Å bli *sitert live* avhenger
  av hentekrawlere og av å være indeksert der assistenten søker — for ChatGPT
  er det Bing. Å bli *kjent* av en modell avhenger av treningsgrunnlaget, styrt
  av helt andre agentnavn som `Google-Extended`. Det var nettopp den
  sammenblandingen robots.txt-en vår led av.
- **Et 200-svar er ikke bevis.** Se `docs/`-notatet om KODE-lenkene.
