# Søke- og konverteringsanalyse — 1. september 2026

Full lesbar rapport: publisert som artifact 1. september 2026 («Søkebildet for Gåri»).
Denne fila er tallgrunnlaget, så neste analyse har noe å sammenligne mot.

**Vinduer**: GSC 1. juni – 29. august 2026 (90 d). Umami siste 30 døgn per 1. september.
`venue_clicks` fra loggingen startet i april.

## Baseline å måle mot neste gang

| Mål | Verdi | Kilde |
|---|---:|---|
| Google-klikk, august | 2 341 | GSC dagsdimensjon |
| Google-klikk per dag, august | 80,7 | GSC |
| Snittposisjon, august | 7,7 | GSC |
| CTR, august | 2,28 % | GSC |
| Merkevareandel av navngitte klikk | 3,7 % | GSC 90 d |
| Andel klikk knyttet til navngitt søk | 34 % | GSC 90 d |
| Unike sider med visninger, 90 d | 5 467 | GSC |
| Andel sider med visninger og null klikk | 80,7 % | GSC |
| Besøkende, 30 d | 4 086 | Umami |
| Besøkende, forrige 30 d | 2 388 | Umami |
| Avvisningsrate | 42 % | Umami |
| Snitt besøkstid | 155 s | Umami |
| Utklikk til arrangør, 30 d | 686 | `venue_clicks` |
| Utklikk til arrangør, totalt | 2 522 | `venue_clicks` |
| Interne kortklikk, totalt | 6 284 | `venue_clicks` |
| Konvertering arrangementsside → utklikk, per hendelse | 21,0 % | Umami `ticket-click` / `event-view` |
| Konvertering arrangementsside → utklikk, **per økt** | 20,2 % | Umami `/events` rå, distinkt `sessionId` |
| Andel av alle økter som klikket ut | **11,8 %** | Umami `/events` rå — hendelsestallet 16,8 % var 42 % for høyt |
| Indeksdekning samlesider | 89 % (16/18) | GSC URL Inspection, utvalg |
| Indeksdekning arrangementssider | 58 % (15/26) | GSC URL Inspection, utvalg — vid feilmargin |
| Indeksdekning scenesider | 100 % (6/6) | GSC URL Inspection, utvalg |
| AI-henvisninger, august | 23 | Umami `ai-referral` |
| AI-andel av søketrafikk, 90 d | ca. 1 % | Umami henvisere |

## Månedskurve, Google

| måned | klikk | klikk/dag | visninger | CTR | snittpos |
|---|---:|---:|---:|---:|---:|
| 2026-02 (5 d) | 10 | 2,0 | 689 | 1,45 % | 8,1 |
| 2026-03 | 453 | 14,6 | 25 080 | 1,81 % | 7,9 |
| 2026-04 | 1 033 | 34,4 | 37 415 | 2,76 % | 7,4 |
| 2026-05 | 1 654 | 53,4 | 77 603 | 2,13 % | 7,5 |
| 2026-06 | 4 360 | 145,3 | 133 798 | 3,26 % | 7,2 |
| 2026-07 | 1 355 | 43,7 | 58 531 | 2,32 % | 8,1 |
| 2026-08 (29 d) | 2 341 | 80,7 | 102 649 | 2,28 % | 7,7 |

Juni er sankthans, ikke et nivå. Posisjonen står stille — veksten kommer fra flere
sider som rangerer, ikke fra bedre rangering.

## Konvertering per måned

| måned | besøkende | event-view | ticket-click | konvertering |
|---|---:|---:|---:|---:|
| 2026-04 | 3 278 | 1 955 | 474 | 24,2 % |
| 2026-05 | 3 015 | 2 354 | 553 | 23,5 % |
| 2026-06 | 4 839 | 4 132 | 737 | 17,8 % |
| 2026-07 | 2 470 | 1 624 | 343 | 21,1 % |
| 2026-08 | 4 184 | 3 211 | 675 | 21,0 % |

## Hvor klikkene lander (GSC 90 d)

| sidetype | sider | klikk | andel |
|---|---:|---:|---:|
| samlesider | 113 | 3 734 | 45,6 % |
| arrangementssider | 5 290 | 2 444 | 29,9 % |
| forsiden | 31 | 1 868 | 22,8 % |
| scenesider | 30 | 133 | 1,6 % |

## Billettlenker, 2 131 kommende arrangementer

| mål | antall | andel |
|---|---:|---:|
| arrangørens egen side | 1 112 | 52,2 % |
| billettbutikk/plattform | 763 | 35,8 % |
| ingen lenke | 256 | 12,0 % |

De 256 uten lenke: bookibud 71, dnt 67, bodega 51, bergenpride 35, øvrige 32.

## Datakvalitet på kommende arrangementer

| felt | mangler | andel |
|---|---:|---:|
| pris | 1 212 | 56,9 % |
| bilde | 390 | 18,3 % |
| billettlenke | 256 | 12,0 % |
| `title_en` | 86 | 4,0 % |
| koordinater i schema (via `venue-locations.ts`) | 998 | 46,8 % |

## RETTELSE 2. september: «256 blindveier» var feil

Første utgave sa at 256 arrangementer uten `ticket_url` var blindveier. Det stemte ikke.
Event-siden bruker `ticket_url || source_url`, og alle 256 har en `source_url`. Knappen
sier «Mer info» i stedet for «Kjøp billett», og 69 av Bookibuds 71 er gratis — riktig oppførsel.

**Men under feilen lå en verre en.** Alle elleve *betalte* Bookibud-arrangementer sendte
klikk til en lenke uten `marketing=gaari` — de elleve som kan utløse kickback. Opprydningen
1. september oppdaterte `source_url`, ikke `ticket_url`, og det er `ticket_url` siden
foretrekker. `ticket_url` settes bare når noe koster penger, så feilen traff presis de
radene det var penger i.

Invarianten `henvisningskode-mangler` leste også bare `source_url`. Den sto på 11 av 82 og
så ut til å bedre seg mens pengene lakk ved siden av.

Rettet 2. september:

- `scripts/scrapers/bookibud.ts` oppdaterer nå begge lenkekolonnene
- `scripts/lib/datakonsistens.ts` leser `ticket_url || source_url` — samme uttrykk som malen.
  `ticket_url` lagt til i `KonsistensRad` og i spørringen i `datakonsistens-sjekk.ts`
- `scripts/rett-bookibud-henvisningskode.ts` kjørt: 11 av 11 betalte rader ryddet.
  73 av 82 lenker har nå koden, mot 62 før
- Grensa strammet 43 → 9

**Ti dubletter står igjen, og venter på et ja.** Bookibud døpte om nattklubbkveldene
(«Nattklubb» → «Kveldstid») samtidig som lenka fikk koden. `eventExists()` slår opp på
nøyaktig `source_url`, bommet, og la raden inn på nytt. Dedup så to ulike titler.
Ett par er verre enn de andre: «Konsert: Duvèt» 3. september ved siden av «Kansellert: Duvèt».
Tørrkjørt i `scripts/rydd-bookibud-dubletter.ts`.

## Hullene i «hva tallene ikke sier» — hva som lot seg fylle

| Hull | Status | Resultat |
|---|---|---|
| Hendelser, ikke personer | **fylt** | Umami `/events` gir `sessionId`. Konvertering holder (20,2 %), men «andel besøkende som klikker ut» var 42 % for høyt: 11,8 %, ikke 16,8 % |
| Indeksdekning ukjent | **fylt** | URL Inspection API virker. 50 adresser inspisert, se tabellen over |
| Umami kuttet på 500 | **fylt** | 500 var min egen parameter, ikke API-ets grense. `limit=5000` gir alle 1 614 |
| Anonymiserte søk | lar seg ikke fylle | Testet dagsoppdeling mot samlet vindu for august: nøyaktig samme 948 klikk, 40,5 % dekning begge veier |
| Bergenfest-effekten | krever tid | Påminnelse 6. oktober |

**Indeksmålingen endret én diagnose:** de seks foreldreløse engelske sidene *er* indeksert,
også de som ikke ligger i sitemapen — Google fant dem via hreflang. Problemet er ikke
oppdagelse, men at ingen lenker til dem. Å legge dem i sitemapen alene løser lite.

## Salgstall (kun målte, jf. `feedback_only_real_data`)

2 525 utgående klikk til arrangører siden 16. april 2026. Per sted er tallet eksakt for alle
2 525, fordi `venue_name` ligger på klikkraden. Per måldomene kan bare 279 (11 %) spores,
fordi arrangementssider slettes når de er over.

Topp steder: Cornerteateret 187, Grieghallen 160, Madam Felle 105, Bodega 90, Fløyen 75,
Forum Scene 69, Ole Bull Scene 69, Bergenhus Festning 55.

Per plattform (klikk av 279 sporbare / kommende arrangementer i dag):
TicketCo 73 / 286, Ticketmaster 59 / 196, billett.bergen.kommune.no 21 / 63,
Billetto 17 / 14, Bookibud 10 / 11 (+71 gratis), Harmonien 9 / 15, Hoopla 7 / 14,
KODE 6 / 55, Eventim 5 / 12, Tix 4 / 41, EasyTicket 4 / 33.

TicketCo + Ticketmaster = 482 av 2 131 kommende, altså 22,6 % av alt vi lister.

**Migrasjon klar, ikke kjørt:** `supabase/migrations/20260902090000_venue_clicks_destination.sql`
legger `destination_domain` på `venue_clicks`, og `/api/track-click` fyller den.
Fra den kjører er måldomenet målt for all framtid i stedet for 11 %.
Migrasjonen må kjøres **før** koden deployes, ellers feiler innsettingen.

## Utført 2. september

**Tiltak 1 — de seks engelske aliassidene.** Årsaken satt to steder:

- `sitemap.xml` itererte over `getAllCollectionSlugs()` og skrev bare språk der sluggen var
  sin egen kanoniske adresse. Motparten kom med bare hvis den selv var en samling —
  `this-weekend` er det, `rainy-day-bergen` er bare et alias i `HREFLANG_PAIRS`.
  Løst med `getCollectionSitemapPaths()` i `collections.ts`, som går veien om paret.
- Alle interne lenker ble bygget som `/${lang}/${col.slug}` med den kanoniske sluggen.
  På engelsk traff de en 301. Ny hjelper `collectionHref(slug, lang)` brukes nå i footeren,
  forsiden, guide-siden, samlesidenes krysslenker og arrangementssidens kategorilenke.
- `CATEGORY_COLLECTIONS` på arrangementssiden hadde en håndskrevet `slug: { no, en }` som
  alt hadde glidd: `family` pekte på `familiehelg` også på engelsk, der kanonisk er
  `family-bergen`. Erstattet med én slug + `collectionHref()`.
- Låst med `src/lib/__tests__/sitemap-samlinger.test.ts` (5 tester).

**Tiltak 2 — «55 kilder» og Bergenfest.** Seks tekstfelt i `collections.ts` utleder nå
`SOURCE_COUNT`. Bergenfest-beskrivelsen er skrevet om uten datoer og artistnavn, og den
engelske tittelen «Bergenfest Bergen — Lineup 10–13 June» er erstattet.

Underveis viste det seg at problemet var større enn beskrivelsesfeltene: **fire festivaler**
hadde årsspesifikke datoer i `dateHint` på hub-lista (festspillene, nattjazz, bergenfest,
beyond-the-gates), mens tre andre allerede oppga bare måned. Alle er nå på månedsnivå.
Låst med `src/lib/__tests__/samlinger-aarsuavhengig.test.ts` — forbyr årstall i
tittel/beskrivelse, tall i `dateHint`, og artistnavn i festivalbeskrivelser.
Faste datoer som 17. mai, 23. juni og 31. desember er fortsatt tillatt: de flytter seg ikke.

**Tiltak 3 — dublettene.** Slettet (ikke av meg; en parallell økt kjørte skriptet).
`henvisningskode-mangler` står nå på 0 og er gjort **sperrende**. Verifisert mot basen.

**Bonus — ny sperre i `insertEvent`.** Den sperrende sjekken `slutt-foer-start` slo ut
2. september: «Petrichor skrivegruppe — tirsdag 22. september» hadde `date_end` 15. september.
Litteraturhuset lister serien med et skjult `input.event-end-date` per rad, og for den ene
raden holdt det forrige ukes dato. Konsekvensen er ikke bare en rar dato — `removeExpiredEvents()`
rydder på `date_end`, så raden ville blitt slettet en uke før arrangementet.
`insertEvent()` dropper nå `date_end` når den ligger før `date_start`, **plassert før**
sperra for utløpte arrangementer (den slipper gjennom fortidige rader når `date_end` finnes).
Invarianten fantes allerede, så paringen er komplett.

**Tiltak 5 — koordinatdekning 53,2 % → 68,5 %.** Ni steder lagt til i `venue-locations.ts`
(48 → 57 oppslag, 1 133 → 1 460 arrangementer med `GeoCoordinates`).

Koordinatene er slått opp mot OpenStreetMap (Nominatim) med vår egen User-Agent, og
**godtatt bare der stedets eget navn sto igjen i svaret** — ikke bare en gate i nærheten.
Tolv steder ble avvist av den regelen, blant dem «Sentralbadet Scenekunsthus» (traff
Nøstegaten) og alle DNT-turene (traff Bergen og Omegn Boligbyggerlag). De venter på
manuell kontroll. Et feil koordinat i strukturerte data er verre enn ingen.

Plassholderen `'bergen'` slapp gjennom navnesjekken trivielt og ble **utelatt med vilje**:
`getVenueLocation()` gjør delvis oppslag med `lower.includes(key)`, så nøkkelen `'bergen'`
ville matchet nesten hvert eneste sted vi har. Advarsel lagt inn i doc-kommentaren.

`street` står tomt på de ni: Nominatim ga veinavn uten husnummer, og `seo.ts` faller
tilbake på arrangementets eget `address`-felt når street er tomt. Kildens adresse er bedre.

Størst gjenstående hull: **Cinemateket i Bergen, 60 arrangementer** — OpenStreetMap kjenner
den ikke under det navnet.

**Tiltak 4 — tidssøkene samles på forsiden, på norsk.** Besluttet av Kjersti 2. september,
etter at tallene viste at de to språkene peker motsatt vei:

| | posisjon | klikk 90 d | avgjørelse |
|---|---:|---:|---|
| `/no/i-kveld` | 32,2 | 5 | 301 → `/no` |
| `/no/i-dag` | 22,8 | 10 | 301 → `/no` |
| `/en/i-kveld` | 6,2 | **268** (151 siste 28 d mot 58 før) | beholdes |
| `/en/today-in-bergen` | 9,1 | 54 | beholdes |

Forsiden tok allerede de norske søkene på plass 5–6, så de to sidene delte signalet uten å
vinne noe. På engelsk rangerer ikke forsiden på de søkene — å fjerne `/en/i-kveld` ville gitt
bort trafikken, ikke flyttet den.

Løst med ett nytt felt, `Collection.langs`, i stedet for unntak spredt utover:

- `i-kveld` → `langs: ['en']`, `i-dag` → `langs: []` (den engelske utgaven er den egne
  samlingen `today-in-bergen`)
- ruta 301-er til `/${lang}` når språket ikke er med — **etter** hreflang-omskrivingen, så
  `/en/i-dag` fortsatt blir `/en/today-in-bergen`
- `getCollectionSitemapPaths()` sjekker sluggen slik den står i adressen; ellers ble
  `/no/i-dag` skrevet inn igjen når vi itererte over `today-in-bergen`
- `collectionHref()` returnerer `/${lang}` når siden ikke lever der
- `hreflangPaths` utelater døde språk, og layouten skriver **ingen** alternate når den
  mangler — fallbacken der ville gjenskapt `/no/i-kveld`
- `WHEN_COLLECTION.no` mistet `today`: `/no?when=today` kanoniserte til `/no/i-dag`, altså
  til en omdirigering. Nå `/no` + noindex
- `relatedSlugs` filtreres per språk — `i-kveld` står i tretten lister, og hver av dem ville
  gitt en «utforsk videre»-lenke rett tilbake til forsiden
- footer, guide, `getGroupedCollections`, llms.txt, sticker-QR-en i `hooks.server.ts` og
  kategorilenken `nightlife` (`i-kveld` → `uteliv`) er ryddet
- `/en/i-kveld` fikk sin første footerlenke noensinne, og llms.txt nevner den nå — sammen
  med de fem andre engelske sidene som manglet der

Låst med `src/lib/__tests__/tidssider-paa-forsiden.test.ts` (9 tester). Den eksisterende
testen `canonicals ?when=today to /no/i-dag` er skrevet om, ikke omgått.

## Åpne funn

1. **Seks engelske aliassider mangler i sitemapen og har null interne lenker** —
   `things-to-do-bergen`, `rainy-day-bergen`, `family-bergen`, `nightlife-bergen`,
   `festivals-in-bergen`, `tomorrow-in-bergen`. Årsak: `sitemap.xml` bygges fra
   `getAllCollectionSlugs()`, som ikke kjenner aliasene i `HREFLANG_PAIRS`.
   To av dem tjener allerede klikk (39 og 16) funnet via hreflang alene.
2. **«55 kilder» hardkodet i seks tekstfelt** i `collections.ts` mens `SOURCE_COUNT` er 60.
   Rammer meta-beskrivelsen på `denne-helgen`, `konserter`, `this-weekend`.
3. **Bergenfest-beskrivelsen har 2026-lineup under 2027-tittel** — `collections.ts:2612` og `:2674`.
   Eneste samling med hardkodet årsinnhold.
4. **Forsiden spiser tidssidene på norsk.** «hva skjer i bergen i helgen»: `/no` på pos 5,9
   med 6 716 visninger, `/no/denne-helgen` på pos 2,9 med 309. Forsidetittelen sier
   «Arrangementer i dag og denne uken». På engelsk, der forsiden ikke gjør dette,
   er `/en/i-kveld` vår mest klikkede samleside.
5. **Navnesøk konverterer ikke.** Bergenfest 20 136 visn / 0,68 % CTR, Hallaien 6 894 / 0,19 %,
   Grieghallen 6 009 / 0,48 %, Bergen Pride 4 273 / 0,26 %. Til sammen ca. 38 000 visninger
   som gir under 200 klikk. Vi rangerer (pos 8), vi blir ikke klikket.
6. **`/no/denne-helgen` falt fra pos 7,5 til 17,7** mellom 1.–14. og 25.–29. august.
   Kan være sesong. Sjekk igjen.

## Søkeord uten samleside (GSC 90 d)

| forslag | visninger | klikk | pos |
|---|---:|---:|---:|
| ølfestival | 1 865 | 0 | 9,6 |
| sport / Brann | 1 606 | 6 | 9,4 |
| Koengen (sceneside) | 800 | 0 | 9,3 |
| spillmesse / Otocon | 716 | 2 | 6,5 |
| julegøy | 714 | 2 | 8,4 |
| Åsane kulturhus (sceneside) | 702 | 5 | 10,2 |
| kino / film | 512 | 2 | 9,0 |
| Next Fyllingsdalen (sceneside) | 191 | 0 | 3,3 |

## Forbehold

- Bare 34 % av Google-klikkene kan knyttes til et navngitt søk. Google anonymiserer halen.
- Umami-tallene er hendelser, ikke unike personer.
- Umamis `metrics?type=url` returnerer maks 500 adresser. Andeler mellom sider holder,
  absolutte summer over hele siden gjør det ikke.
- Bergenfest-CTR gikk 0,57 % → 1,25 % → 2,00 % over tre augustperioder rundt tidspunktet
  årstallet begynte å rulle, men visningene falt fra 1 048 til 150 samtidig. **Ikke bevist.**
  Mål igjen i oktober.
- Sitemapstatus «0 indexed» i Search Console er et særtrekk ved deres API, ikke et problem.

## Hvordan tallene ble hentet

Midlertidige skript kjørt og slettet. Metode:

- GSC: JWT fra `GSC_SERVICE_ACCOUNT` mot `searchAnalytics/query`, paginert med
  `startRow` i bolker på 5 000 — **rowLimit 1 000 kutter halen og skjuler
  nullklikk-søkene**, som er der mulighetene ligger.
- Umami: `stats`, `metrics?type=url|referrer|event`, og `event-data/events?event=<navn>`
  for egenskaper per hendelse (slug, venue).
- `venue_clicks` via `fetchAllRows()`. `placement_context` skiller interne kortklikk
  (`organic`/`promoted`) fra utgående billettklikk (`direct`/`newsletter`/`social`).

Rådata lå i `c:/tmp/gaari-analyse/` under kjøringen.
