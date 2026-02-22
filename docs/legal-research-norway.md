# Juridisk analyse: Web scraping for Gåri eventkalender

**Utarbeidet: 2026-02-20**
**Sist oppdatert: 2026-02-22**
**Status: Full compliance-revisjon — 44 scrapere verifisert**

---

## 1. Sammendrag

Gåri scraper offentlig tilgjengelige eventdata fra 44 kilder i Bergen. Denne analysen dekker norsk og EU/EØS-rett som er relevant for web scraping av eventinformasjon, og dokumenterer de konkrete tiltakene vi har implementert for å holde oss innenfor lovlige rammer.

**Konklusjon:** Standard HTTP-scraping av offentlig tilgjengelig eventinformasjon er lovlig i Norge, forutsatt at man:
1. Respekterer robots.txt
2. Ikke kopierer opphavsrettsbeskyttet kreativt innhold
3. Bruker rimelig rate limiting
4. Identifiserer seg med ærlig User-Agent
5. Ikke omgår tekniske sperrer
6. Genererer egne beskrivelser i stedet for å kopiere kildetekst

---

## 2. Relevant lovgivning

### 2.1 Åndsverkloven (lov om opphavsrett til åndsverk)

**§§ 2-3 — Opphavsrett til åndsverk:**
- Alle fotografier, illustrasjoner og kreative tekster er beskyttet
- Eventbeskrivelser som inneholder kreativ formulering er vernet
- **Faktaopplysninger** (tittel, dato, sted, pris) er IKKE opphavsrettsbeskyttet
- **Tiltak:** Alle 44 scrapere bruker enten `makeDescription()` eller egne faktabaserte maler for beskrivelser — ingen kopierer kreativ kildetekst

**§ 24 — Databasevern (sui generis):**
- Databaser med "vesentlig investering" i innsamling/presentasjon er beskyttet
- Forbyr "uttrekk og/eller gjenbruk av en vesentlig del" av databasen
- **Vurdering for Gåri:** Vi henter kun fremtidige events (ikke historisk arkiv), og vi aggregerer fra 44 kilder — ingen enkelt kilde utgjør en "vesentlig del" av vår database
- **Tiltak:** Begrens uttrekk til aktive/fremtidige events, aldri arkiver historiske data fra enkeltkilde

### 2.2 GDPR / Personopplysningsloven

- Artistnavn og foredragsholdere i eventtitler er personopplysninger
- **Behandlingsgrunnlag:** Berettiget interesse (artikkel 6(1)(f)) — informasjonen er allerede offentliggjort av arrangøren
- **Vurdering:** Lav risiko — vi videreformidler kun det arrangøren selv har publisert
- Ingen innsamling av deltakerlister, e-poster eller annen sensitiv informasjon
- **Tiltak:** Ingen utvidelse av persondata utover det kilden publiserer

### 2.3 Straffeloven § 204 — Datainnbrudd

- Forbyr uberettiget tilgang til datasystem eller del av det
- Standard HTTP-forespørsler til offentlige nettsider er IKKE datainnbrudd
- **Grense:** Å omgå autentisering, CAPTCHA eller tekniske sperrer KAN kvalifisere
- **Tiltak:** Vi omgår aldri tekniske sperrer. Når robots.txt blokkerer, omskriver vi scraperen

### 2.4 Markedsføringsloven § 25 — God forretningsskikk

- Forbyr å utnytte andres innsats på en utilbørlig måte
- **Relevant rettspraksis:**
  - **Finn.no v Supersøk:** Supersøk aggregerte Finn-annonser uten tillatelse — ansett som brudd på § 25 (parasittisk utnyttelse)
  - **Skillet:** Supersøk var en direkte konkurrent som substituerte Finn. Gåri er en komplementær tjeneste som sender trafikk tilbake til kildene via ticket_url
- **Tiltak:** Alle events linker til arrangørens billettside. Gåri fungerer som trafikk-generator, ikke substitutt

### 2.5 EU/EØS-rett

**CV-Online v Melons (C-762/19, EU-domstolen):**
- EU-domstolen anerkjente at jobbaggregatorer tilførte merverdi
- Metadata-scraping for aggregering ble ansett som lovlig
- **Relevans:** Styrker Gåris posisjon som aggregator som tilfører verdi

**Ryanair v PR Aviation (C-30/14):**
- Kontraktsvilkår (ToS) kan begrense scraping selv uten databasevern
- **Relevans:** ToS fra TicketCo, Hoopla og Eventbrite forbyr scraping → partnerskap anbefalt

**DSA (Digital Services Act) og DSM-direktivet:**
- Økt fokus på datatilgang og plattformåpenhet
- Text and data mining-unntak (DSM art. 3-4) gjelder primært forskning
- **Relevans:** Begrenset direkte virkning for kommersiell scraping, men trender mot mer åpenhet

**Vegvesen-saken (LG-2020-40700):**
- Lagmannsretten frikjente standard HTTP-scraping av offentlig tilgjengelig informasjon
- Scraping med vanlig nettleseratferd (User-Agent, rimelig frekvens) er ikke ulovlig
- **Relevans:** Sterkeste norske presedens for lovligheten av vår praksis

---

## 3. Risikovurdering per kilde

### Lav risiko (offentlige/åpne kilder) — 41 scrapere
| Kilde | Begrunnelse |
|-------|-------------|
| DNT Bergen | Åpen API, ingen robots.txt-begrensning, offentlig informasjon |
| visitBergen | Offentlig turistportal, promoterer deling |
| Bergen Kommune | Offentlig forvaltning, meroffentlighet |
| StudentBergen | Åpen JSON API |
| BarnasNorge | Offentlig eventliste |
| Bergen Næringsråd | Offentlig eventliste |
| Nordnes Sjøbad / Ado Arena | Offentlig eventliste |
| Bergen Kunsthall | Offentlig eventliste |
| Bergen Brettspillklubb | Åpen JSON API |
| Media City Bergen | Offentlig iCal-feed |
| Colonialen | HTML-parsing, respekterer robots.txt |
| Cornerteateret | HTML-parsing, respekterer robots.txt |
| Bergen Filmklubb | HTML-parsing, respekterer robots.txt |
| Bergen Kjøtt | HTML + JSON-LD, respekterer robots.txt |
| Råbrent | Storefront HTML, respekterer robots.txt |
| Paint'n Sip | Åpen GraphQL API (Hasura) |
| Det Vestnorske Teateret | Offentlig eventliste |
| BergenLive | Offentlig eventliste |
| Kultur i Kveld | Offentlig eventliste |
| BEK | Åpen WordPress REST API, offentlig kunstsenter |
| Beyond the Gates | Offentlig festivalprogram (Squarespace) |
| SK Brann | Offentlig terminliste |
| Kulturhuset i Bergen | Offentlig eventliste (Squarespace) |
| VVV (Varmere Våtere Villere) | Offentlig festivalprogram (Squarespace) |
| Bymuseet i Bergen | Offentlig museumsliste (9 museer) |
| BIT Teatergarasjen | Offentlig eventliste |
| Bjørgvin Blues | Offentlig konsertliste |
| Bergenfest | Offentlig festivalprogram |
| Festspillene i Bergen | Åpen Storyblok CMS API |
| Den Nationale Scene | Åpen JSON API |
| USF Verftet | Offentlig eventliste (Next.js) |
| Forum Scene | Offentlig eventliste (Webflow) |
| Ole Bull Scene | Åpen GraphQL API (Statamic) |
| KODE Bergen | Åpen Sanity CMS API |
| Grieghallen | Offentlig eventliste (embedded JSON) |
| Litteraturhuset i Bergen | Offentlig eventliste (Webflow) |
| Bergen Bibliotek | Offentlig eventliste |
| Fløyen | Offentlig eventliste |
| Harmonien | Offentlig eventliste (embedded JSON) |
| Oseana | Offentlig eventliste |
| Carte Blanche | Offentlig eventliste |

### Middels risiko (ToS-begrensninger) — 3 scrapere
| Kilde | Risiko | Tiltak |
|-------|--------|--------|
| TicketCo (14 venues) | ToS forbyr distribusjon uten avtale | Kontakt for partnerskap |
| Hoopla (8 venues) | ToS forbyr kopiering av innhold | Kontakt for API-tilgang |
| Eventbrite | ToS forbyr harvesting | Bruk offisiell API eller kontakt |

### Akseptert risiko
| Risiko | Vurdering | Tiltak |
|--------|-----------|--------|
| Bildehotlinking | Bruker andres båndbredde, bilder kan være opphavsrettsbeskyttet (§ 23) | Sett opp bildeproxy/cache |
| GDPR artistnavn | Persondata i eventtitler | Lav risiko — allerede offentliggjort av arrangør |
| ToS-brudd (3 kilder) | Kontraktsrettslig risiko, ikke strafferettslig | Søk partnerskap, bytt til offisiell API |

---

## 4. Implementerte tiltak

### 4.1 robots.txt-respekt
- **Fullstendig revisjon av alle 45 domener utført 2026-02-22**
- Alle 44 scrapere verifisert — ingen aksesserer blokkerte stier
- **5 scrapere omskrevet** (feb 2026) for å unngå blokkerte stier:
  - Colonialen: `?format=json` → HTML-parsing
  - Bergen Filmklubb: `?format=json` → HTML-parsing
  - Cornerteateret: `?format=json` → HTML-parsing
  - Bergen Kjøtt: `?format=json` → noscript + JSON-LD
  - Råbrent: `api.bigcartel.com` → storefront HTML
- **Merknad:** 8 Squarespace-sider blokkerer navngitte AI-boter (ClaudeBot, GPTBot osv.) — Gåris custom User-Agent matcher ikke disse og følger wildcard `*`-regler som tillater offentlige sider. Teknisk compliant, men notert.
- **Merknad:** oseana.no ber om `Crawl-delay: 10` — ikke relevant da scraperen kun gjør én forespørsel

### 4.2 Rate limiting
- **18 multi-request scrapere** bruker 3 sekunder delay mellom forespørsler (paginering, detaljsider)
- **26 single-request scrapere** henter kun én side — delay ikke påkrevet
- Forhindrer overbelastning og demonstrerer god vilje
- Cron-kjøring: 2 ganger daglig via GitHub Actions

### 4.3 Opphavsrettsoverholdelse
- **35 scrapere** bruker `makeDescription(title, venue, category)` for genererte beskrivelser
- **9 scrapere** bruker egne faktabaserte maler (f.eks. `"SK Brann mot {opponent} på Brann Stadion"`)
- **0 scrapere** kopierer kreativt innhold fra kildene
- Kun faktaopplysninger lagres: tittel, dato, sted, pris, kategori
- **Fiks 2026-02-22:** `floyen.ts` og `festspillene.ts` kopierte kildetekst — omskrevet til `makeDescription()`

### 4.4 Identifisering
- `fetchHTML()` (sentral funksjon) setter User-Agent: `Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`
- 11 scrapere med direkte `fetch()`-kall setter samme User-Agent eksplisitt
- Kontakt-e-post tilgjengelig for eventuelle henvendelser fra arrangører

---

## 5. Safe harbor-strategi

### Prinsipper vi følger
1. **Respektér robots.txt** — fullstendig revisjon av alle 45 domener gjennomført
2. **Ikke omgå tekniske sperrer** — unngår straffelovens § 204
3. **Generer egne beskrivelser** — respekterer åndsverkloven §§ 2-3
4. **Begrens datauttak** — kun fremtidige events, ikke arkiver
5. **Link tilbake** — alle events linker til kilde via `source_url` og `ticket_url`
6. **Rimelig frekvens** — 3s delay for multi-request scrapere, 2x daglig cron
7. **Ærlig identifikasjon** — User-Agent med prosjektnavn og kontakt-e-post
8. **Komplementær tjeneste** — sender trafikk til arrangører, ikke substitutt

### Fremtidige tiltak (planlagt)
- **Bildeproxy:** Sett opp egen cache for bilder i stedet for hotlinking
- **Partnerskapsavtaler:** Kontakt TicketCo, Hoopla og Eventbrite for offisielle avtaler
- **Opt-out-mekanisme:** Tilby arrangører enkel måte å fjerne events fra Gåri
- **Personvernerklæring:** Publiser GDPR-dokumentasjon på gaari.no

---

## 6. Relevante rettskilder (full oversikt)

| Kilde | Relevans |
|-------|----------|
| Åndsverkloven §§ 2-3 | Opphavsrett til kreativt innhold |
| Åndsverkloven § 24 | Databasevern (sui generis) |
| Straffeloven § 204 | Datainnbrudd |
| Markedsføringsloven § 25 | God forretningsskikk |
| GDPR art. 6(1)(f) | Berettiget interesse |
| EU-dom C-762/19 (CV-Online v Melons) | Aggregator-verdi anerkjent |
| EU-dom C-30/14 (Ryanair v PR Aviation) | ToS kan begrense bruk |
| LG-2020-40700 (Vegvesen-saken) | HTTP-scraping lovlig |
| Finn.no v Supersøk | Parasittisk utnyttelse forbudt |
| DSM-direktivet art. 3-4 | Text and data mining-unntak |

---

## 7. robots.txt-revisjon (2026-02-22)

Fullstendig gjennomgang av alle 45 domener som scrapes:

| Status | Antall | Domener |
|--------|--------|---------|
| Compliant (robots.txt finnes) | 34 | raabrent.no, colonialen.no, bergenfilmklubb.no, cornerteateret.no, bergenkjott.org, kulturikveld.no, studentbergen.no, hoopla.no, dns.no, usf.no, forumscene.no, olebullhuset.no, kodebergen.no, litthusbergen.no, bergenbibliotek.no, bitteater.no, oseana.no, carteblanche.no, fib.no, ticketco.events, bek.no, beyondthegates.no, brann.no, kulturhusetibergen.no, varmerevaterevillere.no, bymuseet.no, kunsthall.no, nordnessjobad.no, adoarena.no, barnasnorge.no, dnt.no, visitbergen.com, eventbrite.com, mediacity/medieklyngen.no |
| Compliant (ingen robots.txt) | 11 | bergenlive.no, bergenbrettspill.no, bergen-chamber.no, billett.bergen.kommune.no, booking-hasura.askeladden.co, grieghallen.no, floyen.no, harmonien.no, detvestnorsketeateret.no, bergenfest.no, bjorgvinblues.no |
| Blokkerte stier aksessert | 0 | — |

---

## 8. Anbefaling

Gåris scraping-praksis er **innenfor lovlige rammer** for de 41 lavrisikokildene. For de 3 mellomrisikokildene (TicketCo, Hoopla, Eventbrite) bør partnerskapsavtaler inngås så snart som mulig. Bildehotlinking bør erstattes med egen cache for å unngå opphavsrettslige utfordringer.

Den sterkeste juridiske posisjonen oppnås ved å:
1. Fortsette å respektere robots.txt konsekvent
2. Aldri kopiere kreativt innhold
3. Posisjonere Gåri som komplementær tjeneste (ikke konkurrent)
4. Inngå formelle avtaler med billettplattformer
5. Dokumentere alle tiltak (dette dokumentet)
