# Sjekkliste — ny scraper

Følges hver gang vi vurderer eller bygger en ny scraper. Ingen kode før alt i seksjon A er grønt.

Rammeverket bak sjekklisten:
- [docs/legal-research-norway.md](legal-research-norway.md) — juridisk grunnlag (åndsverkloven, GDPR, straffeloven § 204, mfl. § 25, EU/EØS)
- [docs/scraping-strategy.md](scraping-strategy.md) — per-venue vurdering og nedtrappingsplan for tredjeparter
- [image-policy memory](../C:/Users/kjers/.claude/projects/c--Users-kjers-Projects-Gaari/memory/image-policy.md) — A/B/C/D-kategorier for bilder

---

## A. Før noe kode (lovlighetsgate)

Alle disse må være sjekket og rapportert eksplisitt til brukeren før vi skriver kode.

- [ ] **robots.txt sjekket** — `curl -sL https://<domain>/robots.txt`. Verifiser at path-en vi vil hente er `Allow:` (eller ikke `Disallow:`). Hvis blokkert: stopp, foreslå alternativ kilde eller skriftlig avtale.
- [ ] **Public events only** — siden krever ikke innlogging, betalvegg eller CAPTCHA. Ingen barnehage/SFO/skole-events.
- [ ] **ToS-rask-skanning** — kilden er ikke en aggregator/billettplattform med eksplisitt scraping-forbud (TicketCo, Hoopla, Eventbrite har det — behandles separat i scraping-strategi).
- [ ] **Eksisterende dekning** — verifisert at venue ikke allerede dekkes via en annen scraper (sjekk `scrape.ts` SCRAPERS-map).
- [ ] **Datakvalitet** — kilden har strukturerte felt: tittel, dato, sted, evt. pris og billett-URL. Ikke kun fritekstbeskrivelser.

## B. Implementeringsregler (kodet inn i scraperen)

- [ ] **Honest User-Agent** — bruker `fetchHTML()` fra `lib/utils.ts` (setter `Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`).
- [ ] **Rate limit** — `delay(1500)` mellom detalj-requests (1-1.5s).
- [ ] **AI-genererte beskrivelser** — `generateDescription()` fra `lib/ai-descriptions.ts`. Aldri kopier kildetekst (åndsverkloven §§ 2-3).
- [ ] **ticket_url til arrangør, ikke aggregator** — `resolveTicketUrl()` fra `lib/venues.ts` filtrerer aggregator-domener.
- [ ] **`source_url` lenker tilbake** — alltid satt til kildens detaljside.
- [ ] **Kun fremtidige events** — bruk `eventExists()` for dedup-mot-DB. Ikke arkiver historiske data (databasevern, åndsverkloven § 24).
- [ ] **Sold-out-håndtering** — slett fra DB hvis kilden flagger det (mønster fra `usfverftet.ts`).
- [ ] **Bydel-mapping** — bruk `mapBydel()` fra `lib/categories.ts`.
- [ ] **Pris-disclaimer** — "Trolig gratis" / "Likely free", aldri "Gratis" som assertion.

## C. Registrering i pipeline

- [ ] **`scripts/scrape.ts`** — importér og legg til i `SCRAPERS`-map under riktig hastighetsbøtte (fast/medium/slow).
- [ ] **`scripts/lib/dedup.ts`** — legg til i `SOURCE_RANK` med tier 3-5 etter kvalitet (Tier 5 = canonical venue, Tier 4 = vanlig venue, Tier 3 = community/aggregator).
- [ ] **Lokal testkjøring** — `npx tsx scripts/scrape.ts <name>` og verifiser at events inserter riktig.

## D. Bildepolicy (separat beslutning)

Se [image-policy memory](../C:/Users/kjers/.claude/projects/c--Users-kjers-Projects-Gaari/memory/image-policy.md) for kategorier.

- [ ] **Kategorisert A, B, C eller D**
  - **A (lavrisiko):** offentlig institusjon, egne ansatte kuraterer. Aktivér i `IMAGE_APPROVED_SOURCES` direkte.
  - **B (medium):** venue/festival med egne ansatte, men kan ha pressefoto. Send varslingsepost først, vent 7-14 dager, så aktivér.
  - **C (aggregator):** plattform-ansvar. Per-event whitelisting via `IMAGE_APPROVED_URL_PATTERNS`.
  - **D (avslag):** legg til i `IMAGE_BLOCKED_VENUE_PATTERNS`. Ikke aktivér bilder.

## E. Etter første kjøring

- [ ] **`scraper_runs`-rad** — sjekk at den er `success`, ikke `error`/`warning`.
- [ ] **Health check** — `scraper-health.ts` klassifiserer den ikke som `broken`/`dormant`.
- [ ] **Dedup-resultat** — ingen masseduplikater på normalisert tittel.
- [ ] **Monitorer 24t** — sjekk daglig digest neste morgen for anomalier.

---

## Hvis en av A-boksene er rød

Stopp. Ikke skriv kode. Rapporter funnet til brukeren med:
1. Hva som er blokkert (sitat fra robots.txt / ToS / observert sperre)
2. Hvorvidt det er omgåbart (det skal det ikke være — vi omgår ikke sperrer)
3. Alternative ruter: skriftlig avtale med arrangør, fallback via Tikkio/TicketCo, eller dropp kilden
