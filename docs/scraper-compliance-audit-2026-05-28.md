# Scraper compliance-audit — 2026-05-28

Retroaktiv gjennomgang av alle 60 aktive scrapere mot [docs/new-scraper-checklist.md](new-scraper-checklist.md). Utført fordi sjekklisten ble innført etter at de fleste scrapere var bygget.

## Metode

1. Hentet primær URL fra hver `scripts/scrapers/*.ts` (LISTING_URL/BASE_URL eller fetchHTML-kall)
2. Hentet `robots.txt` for hvert unike domene med `Gaari-Bergen-Events/1.0`-UA
3. Matchet scrape-paths mot `Disallow:` under `User-agent: *`
4. Spot-sjekket implementeringsgater (UA, rate-limit, AI-beskrivelser)

## A. Robots.txt-funn

### CRITICAL — én bekreftet konflikt

| Scraper | URL | Robots-regel | Fix |
|---------|-----|--------------|-----|
| **bergenkjott** | `https://www.bergenkjott.org/kalendar?format=json` | Squarespace: `Disallow: /*?format=json` | Bytt til `https://www.bergenkjott.org/kalendar` (HTML, 200 OK, ikke blokkert) |

Dette er en reell og spesifikk overtredelse. URL-en matcher wildcard `/*?format=json` eksplisitt. Må fikses umiddelbart.

### CLEAN — 59 av 60 scrapere

Alle resterende aktive scrapere treffer paths som ikke er blokkert i robots.txt. Inkluderer:

- Alle Squarespace-sites på `/program` eller `/kalender` (colonialen, bergenfilmklubb, cornerteateret, beyondthegates, kulturhusetibergen, vvv, stenematglede) — Disallow er kun på `?format=json/ical/page-context` etc., HTML-paths er fri.
- Alle WordPress-sites — kun `/wp-admin/` er blokkert (bek, dns, fyllingsdalenteater).
- Alle native APIer som returnerer JSON med eksplisitt formål (kvarteret, dnt, studentbergen, brettspill, tikkio, hoopla).
- TicketCo og Billetto: kun `/_hcms/preview/` og personverns-paths blokkert, ikke event-listinger.

### Sites uten robots.txt (lovlig, men noter)

Fravær av `robots.txt` = alt er tillatt. Disse leverer 404 på `/robots.txt`:

`swing-n-sweet.no`, `ggbergen.org`, `bodega.part.no`, `museum24.no`-subdomener (3), `usf-verftet.ticketprovider.no`, `jungelen.org`, `bergen-chamber.no`-grunndomene (har robots, men tom Disallow).

## B. Implementeringsgater

### B.1 Honest User-Agent — CLEAN

Alle 60 scrapere bruker enten `fetchHTML()` (UA satt i [scripts/lib/utils.ts:287](../scripts/lib/utils.ts#L287)) eller `await fetch()` med eksplisitt `User-Agent: Gaari-Bergen-Events/1.0`-header. Ingen bypass.

### B.2 AI-beskrivelser — CLEAN

Alle scrapere unntatt `brann.ts` importerer `generateDescription` eller `makeDescription`. Brann unntak er begrunnet: fotballkamper har deterministisk metadata (lag, dato, arena), ingen kreativ tekst som krever AI.

### B.3 Rate-limit — 5 SOFT MISSES

Disse 5 scraperne gjør **flere** HTTP-requests uten `delay()` mellom dem:

| Scraper | # requests | Status |
|---------|-----------|--------|
| `borealis` | 3 | Festival, lav kjørefrekvens — lav risiko |
| `carteblanche` | 3 | Detail-page fetches — bør legges til |
| `dns` | 4 | Custom plugin API + detail fetches — bør legges til |
| `jungelfest` | 3 | Festival, lav kjørefrekvens — lav risiko |
| `visningsromusf` | 3 | Liten scraper — bør legges til |

Ikke en juridisk overtredelse (rate-limit er beste-praksis, ikke lovkrav), men avviker fra vår dokumenterte safe-harbor-strategi. Bør patches med `await delay(1500)` mellom detail-page fetches.

## C. Anbefalte tiltak

### Umiddelbart (denne uka)

1. **bergenkjott**: endre URL fra `?format=json` til ren HTML, oppdater parser. Eller alternativt: send formell forespørsel til Bergen Kjøtt om bruk av JSON-endpoint (de er kategori B i bildepolicy uansett).
2. **carteblanche, dns, visningsromusf**: legg til `await delay(1500)` mellom detail-page fetches.

### Nice to have

3. **borealis, jungelfest**: legg til delays selv om de er lavfrekvente, for konsistens.
4. Lag CI-test som kjører `robots.txt`-sjekk mot hver registrert scraper-URL og feiler bygget hvis match mot Disallow.

## D. Hva dette betyr juridisk

Vi har én scraper (bergenkjott) som teknisk bryter med safe-harbor-pilar 1 (respekter robots.txt) i [docs/legal-research-norway.md](legal-research-norway.md). Risikoen er lav fordi:

- Robots.txt er ikke juridisk bindende i Norge
- Bergen Kjøtt er allerede en venue vi har bildeavtale med (kategori B i [image-policy](../C:/Users/kjers/.claude/projects/c--Users-kjers-Projects-Gaari/memory/image-policy.md))
- Endpointet er en standard Squarespace JSON-feed, ikke en proprietær sperre

Men fordi vi i fremtidige tilsvar argumenterer med "vi respekterer robots.txt", må dette fikses raskt for å unngå at en motpart kan peke på et brudd.

---

## E. Fixes anvendt (2026-05-28)

Alle funn fra denne auditen er rettet samme dag.

### Bergenkjott — full omskriving

`scripts/scrapers/bergenkjott.ts` byttet fra `?format=json` (blokkert av robots.txt) til to-trinns:

1. RSS-feed `?format=rss` (ikke blokkert) henter liste over event-URLer
2. Per event: fetch detaljside og parse JSON-LD `Event`-schema med `startDate`, `endDate`, `location`, `image`

Verifisert live: RSS gir 13 events, JSON-LD-ekstraksjon fungerer. Robots-compliant.

### Rate-limit-fixes

`await delay(1500)` lagt til mellom detail-page fetches i:

- `borealis.ts` — i `fetchEventImage()`
- `carteblanche.ts` — før detail-fetch i hovedløkken
- `dns.ts` — i `fetchProductionImage()`
- `jungelfest.ts` — mellom TicketCo og Jungelen-fetch
- `visningsromusf.ts` — før detail-fetch i hovedløkken

### Resultat

60 av 60 aktive scrapere er nå compliant med [docs/new-scraper-checklist.md](new-scraper-checklist.md) og safe harbor-strategien i [docs/legal-research-norway.md](legal-research-norway.md).
