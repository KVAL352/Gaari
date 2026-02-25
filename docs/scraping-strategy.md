# Gåri scraping-strategi for Bergen

**Sist oppdatert: 2026-02-25**
**Status: 45 aktive scrapere, direkte venue-strategi nesten komplett**

---

## Overordnet strategi: direkte venues fremfor tredjeparter

Gåri prioriterer **dedikerte venue-scrapere** fremfor tredjeparts billettplattformer og aggregatorer. Denne strategien gir:

1. **Full kontroll** — vi kan finjustere kategorier, pris, filtrering og bildeuttrekk per venue
2. **Bedre datakvalitet** — direkte kilder har rikere metadata enn tredjepartslistinger
3. **Uavhengighet** — vi kan disable tredjeparter (TicketCo, Hoopla, Eventbrite, VisitBergen) uten tap av dekning
4. **Mindre juridisk risiko** — direkte scraping av åpne eventsider har sterkere rettslig grunnlag enn plattform-scraping

**Mål:** Alle venues som i dag kun dekkes via TicketCo/Hoopla/Eventbrite/VisitBergen skal ha egne dedikerte scrapere. Tredjepartene beholdes midlertidig som fallback/gap-filler, men kan skrus av når direkte dekning er komplett.

**Facebook-venues er utenfor scope.** Venues som kun kommuniserer via Facebook/Instagram har ingen strukturert eventdata å scrape. Disse ignoreres.

---

## Aktive scrapere (45)

### Direkte venue-scrapere (41)

Disse henter data direkte fra venuens egen nettside/API.

| # | Venue | Fil | Metode | Events (siste kjøring) |
|---|-------|-----|--------|----------------------|
| 1 | Bergen Live | `bergenlive.ts` | HTML | 43 |
| 2 | Bergen Kommune | `bergenkommune.ts` | AJAX + detaljsider | 183 |
| 3 | StudentBergen | `studentbergen.ts` | JSON API | 57 |
| 4 | DNT Bergen | `dnt.ts` | JSON API | 120 |
| 5 | Nordnes Sjøbad / AdO Arena | `nordnessjobad.ts` | HTML | 4 |
| 6 | Råbrent Keramikk | `raabrent.ts` | HTML | 7 |
| 7 | Bergen Næringsråd | `bergenchamber.ts` | HTML | 15 |
| 8 | Colonialen | `colonialen.ts` | HTML | 32 |
| 9 | Bergen Kjøtt | `bergenkjott.ts` | HTML + JSON-LD | 12 |
| 10 | Paint'n Sip Bergen | `paintnsip.ts` | GraphQL API | 13 |
| 11 | Bergen Filmklubb | `bergenfilmklubb.ts` | HTML | 4 |
| 12 | Cornerteateret | `cornerteateret.ts` | HTML | 32 |
| 13 | Det Vestnorske Teateret | `dvrtvest.ts` | HTML (paginert) | 127 |
| 14 | Bergen Kunsthall | `kunsthall.ts` | HTML | 30 |
| 15 | Bergen Brettspillklubb | `brettspill.ts` | JSON API | 20 |
| 16 | Media City Bergen | `mediacity.ts` | iCal feed | 9 |
| 17 | Forum Scene | `forumscene.ts` | HTML (Webflow) | 67 |
| 18 | USF Verftet | `usfverftet.ts` | Next.js `__NEXT_DATA__` | 14 |
| 19 | DNS (Den Nationale Scene) | `dns.ts` | HTML | 145 |
| 20 | Ole Bull Scene | `olebull.ts` | GraphQL API | 65 |
| 21 | Grieghallen | `grieghallen.ts` | HTML/JSON | 80 |
| 22 | KODE | `kode.ts` | Sanity API | 92 |
| 23 | Litteraturhuset | `litthusbergen.ts` | HTML | 79 |
| 24 | Bergen Bibliotek | `bergenbibliotek.ts` | HTML | 480 |
| 25 | Fløyen | `floyen.ts` | HTML | 12 |
| 26 | BIT Teatergarasjen | `bitteater.ts` | HTML | 13 |
| 27 | Bergen Filharmoniske | `harmonien.ts` | HTML | 16 |
| 28 | Oseana | `oseana.ts` | HTML | 57 |
| 29 | Carte Blanche | `carteblanche.ts` | HTML | 6 |
| 30 | Festspillene i Bergen | `festspillene.ts` | HTML | 151 |
| 31 | Bergenfest | `bergenfest.ts` | HTML | 59 |
| 32 | Bjørgvin Blues Club | `bjorgvinblues.ts` | HTML | — |
| 33 | BEK | `bek.ts` | WordPress REST API | — |
| 34 | Beyond the Gates | `beyondthegates.ts` | Squarespace | — |
| 35 | SK Brann | `brann.ts` | HTML tabell | — |
| 36 | Kulturhuset i Bergen | `kulturhusetibergen.ts` | Squarespace | — |
| 37 | VVV (klimafestival) | `vvv.ts` | Squarespace | — |
| 38 | Bymuseet i Bergen | `bymuseet.ts` | WordPress HTML | — |
| 39 | Museum Vest | `museumvest.ts` | Sitemap + detaljsider | — |
| 40 | Akvariet i Bergen | `akvariet.ts` | HTML kalender | — |
| 41 | Det Akademiske Kvarter | `kvarteret.ts` | JSON API | 8 |

### Tredjeparts plattform-scrapere (4)

Disse scraper billettplattformer og aggregatorer. Målet er å fase dem ut etter hvert som direkte venue-scrapere dekker alle venues.

| # | Plattform | Fil | Venues dekket | Events | Nedtrappingsplan |
|---|-----------|-----|---------------|--------|------------------|
| 1 | **TicketCo** | `ticketco.ts` | 14 subdomains | 247 | Se overlap-analyse under |
| 2 | **Hoopla** | `hoopla.ts` | 8 organisasjoner | 15 | Se overlap-analyse under |
| 3 | **Eventbrite** | `eventbrite.ts` | Diverse | 9 | Lav prioritet — få Bergen-events |
| 4 | **VisitBergen** | `visitbergen.ts` | Aggregator | 43 | Siste i pipeline, kan disables når VilVite/Bergen Kino er dekket |

### Deaktiverte scrapere (2)

| Kilde | Grunn |
|-------|-------|
| BarnasNorge | Alle venues dekket av dedikerte scrapere. AI stock-bilder, adressebaserte venue-navn. |
| Kulturikveld | Upålitelig datakvalitet. |

---

## Tredjeparts overlap-analyse og nedtrappingsplan

### TicketCo (14 subdomains) — verifisert status

| Subdomain | Venue | Direkte scraper? | Status (verifisert 2026-02-25) |
|-----------|-------|------------------|-------------------------------|
| `kvarteret` | Det Akademiske Kvarter | **JA** (`kvarteret.ts`) | Kan fjernes fra TicketCo |
| `kulturhusetibergen` | Kulturhuset i Bergen | **JA** (`kulturhusetibergen.ts`) | Kan fjernes |
| `litthus` | Litteraturhuset | **JA** (`litthusbergen.ts`) | Kan fjernes |
| `vestnorsk` | Det Vestnorske Teateret | **JA** (`dvrtvest.ts`) | Kan fjernes |
| `hulen` | Hulen | **NEI** | Nettside: Next.js + Sanity CMS, HARD (se under) |
| `madamefell` | Madam Felle | **NEI** | Nettside har ingen eventliste — KUN TicketCo, behold |
| `7fjell` | 7 Fjell Bryggeri | **NEI** | Nettside er kun corporate — KUN TicketCo, behold |
| `bergenvinfest` | Bergen Vinfest | **NEI** | Sesongbasert, behold i TicketCo |
| `cinemateketbergen` | Cinemateket Bergen | **NEI** | TicketCo-only, behold (cinemateket.no er Oslo) |
| `vic` | Victoria Bergen | **NEI** | victoriapub.no er Kristiansand! Bergen Victoria = KUN TicketCo |
| `kirkemusikkibergen` | Kirkemusikk i Bergen | **NEI** | Nettside er tom/defekt — KUN TicketCo, behold |
| `bergendansesenter` | Bergen Dansesenter | **NEI** | Nettside har ingen strukturerte events — KUN TicketCo, behold |
| `borealis` | Borealis festival | **NEI** | Sesongbasert, behold i TicketCo |
| `nattjazz` | Nattjazz | **NEI** | Sesongbasert, behold i TicketCo |

**Realitet:** 4 av 14 subdomains har direkte scrapere. Av de resterende 10 har **7 ingen egen eventside** (inkl. Bergen Dansesenter, som har Squarespace men ingen strukturerte events) — TicketCo er eneste kilde for disse venues. Kun Hulen kan potensielt erstattes med en direkte scraper.

### Hoopla (8 organisasjoner) — verifisert status

| Subdomain | Venue | Direkte scraper? | Status (verifisert 2026-02-25) |
|-----------|-------|------------------|-------------------------------|
| `studentersamfunnetibergen` | SSiB/Kvarteret | **JA** (`kvarteret.ts`) | Kan fjernes |
| `byscenen` | Byscenen | — | byscenen.no er i TRONDHEIM, ikke Bergen! Hoopla-org er Bergen-relevant? Undersøk |
| `garage` | Garage | — | garage.no returnerer 410 Gone — venue muligens nedlagt. Behold Hoopla inntil avklart |
| `naturvinforbundet` | Naturvinmessa | **NEI** | Sesongbasert, behold i Hoopla |
| `bergenspillfestival` | Bergen Spillfestival | **NEI** | Sesongbasert, behold i Hoopla |
| `biff` | Bergen Filmfestival | **NEI** | Sesongbasert, behold i Hoopla |
| `nxtlvlbergen` | NXT LVL | — | Ingen nettside funnet — kun Instagram. Behold Hoopla |
| `ungmatfest` | Ung Matfest | **NEI** | Sesongbasert, behold i Hoopla |

**Realitet:** Hoopla er vanskelig å fase ut. De fleste venues har enten ingen egen nettside, er sesongbaserte, eller er uavklart. Behold Hoopla-scraperen.

### VisitBergen

Aggregator som dekker mange venues, men med tynnere data. Viktigste unike dekning:
- **VilVite** — Vue.js SPA, ikke mulig å scrape direkte
- **Bergen Kino** — Vue.js SPA, ikke mulig å scrape direkte

VisitBergen kjøres sist i pipeline. Behold inntil VilVite/Bergen Kino eventuelt løses.

### Eventbrite

Generell plattform, få Bergen-spesifikke events (~9). De fleste Eventbrite-events er også listet på venuenes egne sider. Lav prioritet for utfasing.

### Konklusjon om tredjeparter

**TicketCo og Hoopla kan ikke fases ut fullt.** Mange venues (Madam Felle, 7 Fjell, Cinemateket Bergen, Victoria Bergen, Kirkemusikk) har ingen egen eventside — TicketCo ER deres eventliste. Tilsvarende for Hoopla-venues. Strategien justeres til:

1. **Fjern overlappende subdomains** der vi har direkte scrapere (sparer unødvendige requests)
2. **Behold tredjepartene** som nødvendig kilde for venues uten egen nettside
3. **Bygg dedikerte scrapere** kun der det faktisk finnes en scrapbar kilde

---

## Nye scrapere som kan bygges

Basert på undersøkelse av alle gjenværende venues (2026-02-25):

### Mulig å bygge

| Venue | Nåværende kilde | Nettside | Vanskelighet | Strategi |
|-------|-----------------|----------|-------------|----------|
| **Hulen** | TicketCo | hulen.no | HARD | Next.js RSC + Sanity CMS (prosjekt-ID: `gdx7kxvn`). Kan forsøke Sanity API direkte. Viktig venue (~18 events). |

### Behold kun i TicketCo (ingen egen eventside)

Disse venues har **ingen egen eventliste** på nettstedet. TicketCo er eneste strukturerte kilde.

| Venue | Nettside-status | TicketCo subdomain |
|-------|----------------|-------------------|
| Madam Felle | Kun restaurant/bar-side, 0 events | `madamefell` |
| 7 Fjell Bryggeri | Kun corporate side, 0 events | `7fjell` |
| Cinemateket Bergen | cinemateket.no er Oslo-venue! Bergen-programmet kun på TicketCo | `cinemateketbergen` |
| Victoria Bergen | victoriapub.no er Kristiansand-venue! Bergen Victoria kun på TicketCo | `vic` |
| Kirkemusikk i Bergen | Nettside tom/defekt | `kirkemusikkibergen` |
| Bergen Dansesenter | Squarespace, men ingen strukturerte events (kun tekst, ingen datoer/priser) | `bergendansesenter` |

### Behold kun i Hoopla (ingen alternativ kilde)

| Venue | Status |
|-------|--------|
| Garage | garage.no returnerer 410 Gone — venue muligens nedlagt |
| NXT LVL | Ingen nettside, kun Instagram |
| Byscenen | byscenen.no er Trondheim! Bergen Byscenen er Hoopla-only |

### Sesongbaserte (behold i tredjepart, aktive kun i sesong)

| Venue | Plattform | Sesong |
|-------|-----------|--------|
| Bergen Vinfest | TicketCo | Vår/høst |
| Borealis | TicketCo | Mars |
| Nattjazz | TicketCo | Mai/juni |
| Bergen Spillfestival | Hoopla | Årlig |
| BIFF | Hoopla | Oktober |
| Naturvinmessa | Hoopla | Årlig |
| Ung Matfest | Hoopla | Årlig |
| Bergen Matfestival | Ingen | September (matfest.no — sjekk nærmere sesong) |

### Ikke mulig uten headless browser

| Venue | Nettside | Problem |
|-------|----------|---------|
| VilVite | vilvite.no | Vue.js SPA |
| Bergen Kino | bergenkino.no | Vue.js SPA |
| Bergen Klatresenter | bergenklatresenter.no | Webnode JS-rendret |
| Tid for Yoga | tidforyoga.no | Wix Thunderbolt SPA |
| Cruncho / Bergen Sentrum | bergensentrum.cruncho.co | Next.js SPA |
| City Sauna Bergen | citysauna.no | Wix SPA |

### Ikke mulig (undersøkt og avvist)

| Venue | Nettside | Problem |
|-------|----------|---------|
| Bergen Dansesenter | bergendansesenter.no/forestillinger | Squarespace, men `/forestillinger` har kun beskrivende tekst — ingen datoer, tider eller priser. Kurskalenderen er bak innlogging eller i PDF. `?format=json` blokkert av robots.txt. Behold i TicketCo. |
| Stene Matglede | stenematglede.com/matkurs | Squarespace, men `/matkurs` lister kun kurstyper — ingen datoer, tider eller priser. Booking skjer via JS-rendret popup-kalender. `?format=json` blokkert av robots.txt. |

### Ikke relevant / skippet

| Venue | Grunn |
|-------|-------|
| Bergen Kaffebrenneri | Kurs bookes via e-post, ingen datoer |
| Heit Bergen | 0 events på nettside |
| Studio Beist | 0 events på nettside |
| Escape Bryggen | Booking-aktiviteter, ikke events |
| Bergen Base Camp | Booking-aktiviteter |
| Bergen Stressmestringssenter | Tjenesteside, ingen offentlig eventkalender |
| Brettspill fra Bergen | 1 ukentlig event, kan hardkodes |

### Viktige funn fra undersøkelsen

1. **Victoria (victoriapub.no) er i Kristiansand**, ikke Bergen. Bergen Victoria-eventet finnes kun på TicketCo.
2. **Cinemateket (cinemateket.no) er i Oslo**. Bergen Cinemateket finnes kun på TicketCo.
3. **Byscenen (byscenen.no) er i Trondheim**. Bergen Byscenen finnes kun på Hoopla.
4. **Garage (garage.no) returnerer 410 Gone** — venue muligens nedlagt.
5. **Madam Felle og 7 Fjell** har nettsider men ingen eventlister — TicketCo er eneste kilde.
6. **Kirkemusikk i Bergen** sin nettside er tom/defekt.

---

## Nedtrappingsrekkefølge for tredjeparter

Revidert strategi etter verifisering:

1. **Fjern overlappende subdomains** fra TicketCo (`kvarteret`, `kulturhusetibergen`, `litthus`, `vestnorsk`) og Hoopla (`studentersamfunnetibergen`) — dedup håndterer overlap nå, men dette sparer requests
2. **Bygg Hulen-scraper** (Sanity API) — fjern `hulen` fra TicketCo
3. **TicketCo kan IKKE disables helt** — 7 venues har ingen annen kilde (inkl. Bergen Dansesenter)
4. **Hoopla kan IKKE disables helt** — 3 venues har ingen annen kilde
5. **Eventbrite kan potensielt disables** — lav verdi, mest duplikater
6. **VisitBergen behold** — eneste kilde for VilVite og Bergen Kino

---

## Lovlighetsgjennomgang (utført 2026-02-20)

**Full juridisk analyse:** se `docs/legal-research-norway.md` i Gaari-repoet.

### Juridisk rammeverk (sammendrag)

| Lov | Relevans | Vår status |
|-----|----------|------------|
| **Åndsverkloven §§ 2-3** | Opphavsrett til kreative tekster/bilder | Genererer egne beskrivelser, kopierer ikke |
| **Åndsverkloven § 24** | Databasevern (sui generis) | Begrenser uttrekk, aggregerer fra 45+ kilder |
| **Straffeloven § 204** | Datainnbrudd | Ingen omgåelse av sperrer |
| **Markedsføringsloven § 25** | God forretningsskikk | Komplementær tjeneste, ikke konkurrent |
| **GDPR art. 6(1)(f)** | Personopplysninger (artistnavn) | Berettiget interesse, kun offentliggjort info |

### Safe harbor-strategi

1. **Respektér robots.txt** — juridisk ikke bindende, men demonstrerer god tro
2. **Ikke omgå tekniske sperrer** — unngår straffelovens § 204
3. **Generer egne beskrivelser** — respekterer åndsverkloven §§ 2-3
4. **Begrens datauttak** — kun fremtidige events, ikke arkiver
5. **Link tilbake** — alle events linker til kilde via `source_url` og `ticket_url`
6. **Rimelig frekvens** — 1-3s delay, 2x daglig kjøring via cron
7. **Ærlig identifikasjon** — User-Agent: `Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`
8. **Komplementær tjeneste** — sender trafikk til arrangører, fungerer ikke som substitutt

### Kjente begrensninger (akseptert risiko)

| Risiko | Juridisk vurdering | Anbefalt tiltak |
|--------|-------------------|-----------------|
| **TicketCo ToS** | Kontraktsrettslig risiko, ikke strafferettslig | Kan ikke fase ut — mange venues har ingen annen kilde |
| **Hoopla ToS** | Samme som TicketCo | Kan ikke fase ut — samme grunn |
| **Eventbrite ToS** | Samme, men har offisiell API | Kan potensielt fase ut |
| **Bildehotlinking** | Åndsverkloven § 23 — bilder er beskyttet | Sett opp bildeproxy/cache |
| **GDPR artistnavn** | Lav risiko — berettiget interesse | Dokumenter behandlingsgrunnlag |
