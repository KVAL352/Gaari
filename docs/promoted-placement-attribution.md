# Promoted Placement Attribution — Grundig design

**Status:** Design-dokument — ingen kode skrevet, klar for gjennomgang
**Opprettet:** 2026-04-16
**Forfatter:** Kjersti + Claude
**Driver:** SK Brann aktivert som første gratis-test 2026-04-16 → 2026-07-16. Før videre utrulling av promotert plassering og rapport-bygg, gjør vi en dyp kartlegging slik at fundamentet er riktig og vi unngår rework.

---

## 0. Sammendrag (1 minutts lesing)

- **Mål:** Gi venues data som beviser ROI av promotert plassering — faktiske klikk, faktisk lift vs. organisk.
- **Stor oppdagelse:** Click-tracking finnes allerede (`venue_clicks`-tabell + `/api/track-click` endpoint + `promoted-click` Umami-event). Jobben er å **lukke gap**, ikke bygge fra scratch.
- **Kjerne-gap:** `venue_clicks` registrerer KLIKK, men kan ikke fortelle hvilken side klikket kom fra eller om eventet var promotert eller organisk. Uten dette: ingen lift-beregning.
- **Beslutning:** Holde forsiden clean for promotering. Samle 30 dager data, bygg rapport-utvidelse i fase 2.
- **Estimert arbeid:** ~6 timer totalt — migration (30 min), endpoint-utvidelse (1 t), EventCard-oppdatering (1 t), rapport-utvidelse (2 t), tester (1 t), deploy (30 min).

---

## 1. Mål og suksesskriterier

### 1.1 Primære mål

Generere troverdig månedsrapport per venue med:
- **Visninger** (antall ganger event-kortet vises brukeren)
- **Klikk** (antall ganger noen trykker for å lese mer / kjøpe billett)
- **Lift** — ekstra klikk som skyldes plasseringen, ikke tilfeldighet

### 1.2 Suksesskriterier

| Mål | Målt som |
|---|---|
| Venues kan lese rapporten og forstå verdien | Månedsrapport sendt 2026-05-16 til Mads — han klarer å svare på "hvor mange klikk fikk kampene mine?" uten videre spørsmål |
| Rapporten er defensible | Vi kan vise frem rådata ved forespørsel; tallene matcher Umami ± 15% (ikke mer pga adblockere) |
| Ingen PII lagres | Privat-policy (`/no/personvern`) fortsatt sann: ingen cookies, ingen IP-logging i vedvarende lagring |
| Lav vedlikeholdskost | Genereres med ett script-kall månedlig, ingen manuell kopiering mellom kilder |

### 1.3 Ikke-mål (eksplisitt utelatt)

- Real-time dashbord for venues (for nå — API-access og HTML-rapport per måned er nok)
- Individuell bruker-tracking / cross-session attribution
- Konverteringssporing utenfor Gåri (hvor mange kjøpte faktisk billett på Tikkio/Ticketmaster)
- A/B-testing av plasserings-UI
- Klikk-tracking på nyhetsbrev-lenker til ekstern billettside (MailerLite håndterer det native)

---

## 2. Nåtilstand — hva vi har

### 2.1 Tabeller

| Tabell | Formål | Nøkkelfelt | Migrasjon |
|---|---|---|---|
| `promoted_placements` | Konfig: hvilken venue får plass hvor, tier, tidsperiode | venue_name, collection_slugs[], tier, slot_share, start_date, end_date, active | 20260226180000 |
| `placement_log` | Daglig impression-count per placement + collection | placement_id, collection_slug, venue_name, log_date, impression_count | 20260226180000 |
| `collection_impressions` | Daglig totaltrafikk per collection-side | collection_slug, log_date, impression_count | 20260414120000 |
| `venue_clicks` | Klikk-logg per event-slug + venue | venue_name, event_slug, clicked_at | 20260413 |

### 2.2 API

| Endpoint | Funksjon | Klienter |
|---|---|---|
| `/api/track-click` | Insert i `venue_clicks` | EventCard.svelte (`promoted-click`), event-detail ticket-button (`ticket-click`) |
| `log_placement_impression` (RPC) | Upsert i `placement_log` | Server-side fra `+page.server.ts` |
| `log_collection_impression` (RPC) | Upsert i `collection_impressions` | Server-side fra `+page.server.ts` |

### 2.3 Rapporter som finnes

| Script | Output | Data-kilder |
|---|---|---|
| `generate-venue-report.ts` | Månedlig HTML, sendt via Resend | placement_log, collection_impressions, venue_clicks |
| `generate-placement-report.ts` | Markdown-tabell, clipboard | placement_log |
| `generate-pitch-report.ts` | Salgs-HTML med mockups | events (bare konfig/visning) |

### 2.4 Skip-logikk

`SKIP_LOG_IPS` (env var) ekskluderer Kjerstis IP fra `placement_log` og `collection_impressions`, men **IKKE fra `venue_clicks`**. Dette er et gap.

---

## 3. Gap-analyse

### 3.1 Kritisk gap — kan ikke måle lift

**`venue_clicks` vet ikke om klikket kom fra en promotert eller organisk visning.**

Scenario: Bruker klikker på et Brann-kort.
- Kortet kan ha vært vist som Fremhevet øverst på `/no/sentrum`
- Eller det kan ha vært vist organisk på plass 14 i listen
- Eller brukeren klikket fra event-detaljsiden direkte (kom via søk)
- Eller fra nyhetsbrev-lenke (har UTM-tag, men det fanges ikke av `venue_clicks`)

Rapporten kan i dag si: "Brann fikk 87 klikk i april." Den kan **ikke** si: "hvorav 74 kom via promotert plassering, 13 via organisk." Uten dette skillet kan vi ikke si hvor stor del av trafikken som faktisk skyldes plasseringen.

### 3.2 Viktig gap — ingen kontekst på klikkene

`venue_clicks` har ikke kolonne for hvilken side klikket skjedde på. Vi vet ikke:
- Hvor mange Brann-klikk kom fra `/no/sentrum` vs `/no/voksen` vs `/no/i-dag`
- Om nyhetsbrev-eksponering driver trafikk (MailerlLite tracker klikk, men ikke knyttet til venue i vår rapport)
- Om sosiale medier bidrar (ingen UTM i captions)

### 3.3 Mindre gap

| Gap | Konsekvens | Prioritet |
|---|---|---|
| SKIP_LOG_IPS ekskluderer ikke track-click | Kjerstis testklikk forurenser venue_clicks | Høy — må fikses |
| Sosiale captions mangler UTM | Social traffic ikke attribuerbar per venue | Lav — native insights fra Meta dekker behovet for nå |
| Ingen admin-dashboard for lift | Må kjøre CLI-script for rapport | Lav — CLI er OK så lenge bare Kjersti er admin |
| Ingen A/B baseline for CTR-forventning | Vi vet ikke om 4.7% CTR er bra eller dårlig | Medium — løses over tid med historiske data |

---

## 4. Foreslått løsning

### 4.1 Overordnet strategi

**Minimal, inkrementell forlengelse av eksisterende infrastruktur.** Ingen ny tabell, ingen ny komponent. Bare legg til felter der det trengs, og utvid rapporten.

### 4.2 Endring 1 — utvid `venue_clicks`-tabellen

**Ny migrasjon:** `20260416_venue_clicks_attribution.sql`

```sql
ALTER TABLE venue_clicks
  ADD COLUMN placement_id UUID REFERENCES promoted_placements(id),
  ADD COLUMN source_page TEXT,
  ADD COLUMN placement_context TEXT
    CHECK (placement_context IN ('promoted', 'organic', 'direct', 'newsletter', 'social'));

CREATE INDEX idx_venue_clicks_placement ON venue_clicks(placement_id, clicked_at DESC)
  WHERE placement_id IS NOT NULL;

CREATE INDEX idx_venue_clicks_context ON venue_clicks(venue_name, placement_context, clicked_at DESC);
```

**Begrunnelse for felt-valg:**
- `placement_id`: FK direkte til promoted_placements — kobler klikk til faktisk konfig som var aktiv
- `source_page`: Fri tekst (`/no/sentrum`, `/no/`, `/no/events/brann-aalesund-2026-04-22`), fanger hvor klikket faktisk skjedde
- `placement_context`: Enum med 5 verdier — dekker alle kjente trafikk-kilder:
  - `promoted` — vist som Fremhevet topp-3 på collection-side
  - `organic` — vist i naturlig sortering (f.eks. plass 12 av 80)
  - `direct` — klikket fra event-detaljside eller search-result
  - `newsletter` — UTM identifies nyhetsbrev-klikk
  - `social` — UTM eller referrer matcher social
- `NULL` tillatt på `placement_id` for direct/organic/newsletter/social der placement ikke er relevant

### 4.3 Endring 2 — utvid `/api/track-click`

**Fil:** `src/routes/api/track-click/+server.ts`

**Ny request body:**
```typescript
{
  event_slug: string;       // eksisterer
  venue_name: string;       // eksisterer
  source_page?: string;     // NY — window.location.pathname på klikktidspunkt
  placement_context?: 'promoted' | 'organic' | 'direct' | 'newsletter' | 'social';  // NY
  placement_id?: string;    // NY — UUID hvis placement_context = 'promoted'
}
```

**Logikk:**
1. Sjekk `SKIP_LOG_IPS` — skip insertion hvis IP matcher
2. Hvis `placement_context` ikke gitt: `direct`
3. Hvis `source_page` ikke gitt: `null`
4. Sanitize `source_page`: strip querystring + hash (kun path lagres)
5. Sjekk rate limiting: max 10 klikk/minutt per IP for å unngå spam (uten å lagre IP)
6. Insert i `venue_clicks`
7. Return 204

**Privacy:** IP brukes kun i minnet for skip-sjekk og rate-limit, aldri lagret.

### 4.4 Endring 3 — EventCard sender kontekst

**Fil:** `src/lib/components/EventCard.svelte`

Komponenten mottar allerede `promoted: boolean` prop. Utvid den:

```svelte
<script lang="ts">
  export let event: GaariEvent;
  export let promoted: boolean = false;
  export let placementId: string | null = null;  // NY
  // source_page utledes fra window.location.pathname
</script>
```

I `trackPromotedClick()`:
```javascript
function trackClick() {
  const context = promoted ? 'promoted' : 'organic';
  fetch('/api/track-click', {
    method: 'POST',
    body: JSON.stringify({
      event_slug: event.slug,
      venue_name: event.venue_name,
      source_page: window.location.pathname,
      placement_context: context,
      placement_id: placementId
    }),
    keepalive: true
  });
}
```

**Oppdater kallene:**
- `[collection]/+page.svelte`: send `promoted={isPromoted}` og `placementId={placementIdForThisEvent}`
- Homepage `+page.svelte`: alltid `promoted=false` og `placementId=null`
- Event-detaljside: ikke bruk EventCard for selve eventet; relaterte events → `promoted=false`

### 4.5 Endring 4 — server returnerer placement_id med promoted events

**Fil:** `src/routes/[lang]/[collection]/+page.server.ts`

Nåværende kode bubbler promoted events til topp og legger IDene i `promotedEventIds`. Utvid med en map fra event-id → placement-id:

```typescript
const promotedEventIds: string[] = [];
const placementForEvent = new Map<string, string>();  // NY

for (const placement of featured) {
  const venueEvents = filtered.filter(e => e.venue_name === placement.venue_name);
  if (venueEvents.length === 0) continue;
  const pickedEvent = venueEvents[dayNumber % venueEvents.length];
  promotedPicks.push(pickedEvent);
  placementForEvent.set(pickedEvent.id, placement.id);  // NY
}

// ...
return {
  events: filtered,
  promotedEventIds,
  placementForEvent: Object.fromEntries(placementForEvent),  // NY — serialisert som plain object
  // ...
};
```

Klient-siden leser `data.placementForEvent[event.id]` og sender som prop til EventCard.

### 4.6 Endring 5 — utvid `generate-venue-report.ts`

Rapporten får ny seksjon:

```
SK Brann — april 2026

VISNINGER (fra placement_log)
  Totalt promoted:     1 840 (25.2% andel av 7 300 sidevisninger)
  Per side:
    /no/sentrum         720
    /no/voksen          480
    /no/i-dag           440
    /no/denne-helgen    200

KLIKK (fra venue_clicks)
  Totalt:               101
  Promoted klikk:        74 (fra placement_context = 'promoted')
  Organic klikk:         13 (fra placement_context = 'organic')
  Direct klikk:          14 (fra placement_context = 'direct')
  Newsletter klikk:       0 (ingen utsending enda)

LIFT-ANALYSE
  Promoted CTR:         4.0%  (74 klikk / 1 840 visninger)
  Organic CTR:          4.2%  (13 klikk / 310 estimerte organiske visninger — se merknad)
  Netto lift:           +61 klikk/måned som sannsynligvis ikke hadde eksistert uten plasseringen
                        (1 840 visninger × 4.0% = 74 promoted klikk, minus 13 organiske = 61)

NB: Organiske visninger estimeres basert på hvor eventet ville rangert uten boost.
Tallet er beste estimat, ikke observert.

TOPP-KAMPER
  Brann – Aalesund        612 visn.,  32 klikk
  Brann – Fredrikstad     589 visn.,  28 klikk
  Brann – KFUM            401 visn.,  18 klikk
  Brann – Sarpsborg       238 visn.,  10 klikk

TRAFIKKFORDELING
  Kilde            Klikk    Andel
  promoted         74       73%
  direct (søk)     14       14%
  organic          13       13%
  newsletter        0        0%
  social            0        0%
```

**Implementering:**
- Kopier eksisterende `generate-venue-report.ts` — ikke bryt bakoverkompatibilitet
- Ny query for klikk gruppert på `placement_context`
- Ny query for source_page breakdown
- Lift estimeres via: `organic_ctr` anvendt på `organic_impressions` (vi trenger organiske visninger også — se 4.7)

### 4.7 Endring 6 — logg organiske visninger (åpent spørsmål)

For å beregne lift trengs også "organiske visninger" — hvor mange ganger Brann-event ble vist **uten** å være promotert. To alternativer:

**Alt A:** Logg alle event-visninger på collection-sider
- Ny tabell `event_impression_log(event_id, collection_slug, log_date, impression_count)`
- Genererer mye data: ~80 events × 4 sider × 30 dager = 9 600 rader/måned for bare collections
- Gir komplett bilde

**Alt B:** Ikke logg, estimer fra sortering
- Anta organic CTR er likt mellom venues med samme posisjon
- Bruk bransjesnitt (top-3 får ~60% av klikkene i en liste på 80 events)
- Billig, men mindre presist

**Anbefaling:** Alt B i fase 1 (før månedsrapport). Vurder Alt A i fase 2 hvis Brann utfordrer tallene.

### 4.8 Endring 7 — skip-IP i track-click

**Fil:** `src/routes/api/track-click/+server.ts`

Importer samme `skipIps`-set, skip insertion hvis match.

```typescript
import { SKIP_LOG_IPS } from '$env/static/private';
const skipIps = new Set((SKIP_LOG_IPS ?? '').split(',').map(s => s.trim()).filter(Boolean));

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  let clientIp = '';
  try { clientIp = getClientAddress(); } catch {}
  if (skipIps.has(clientIp)) return new Response(null, { status: 204 });

  // ... eksisterende logikk
};
```

---

## 5. Datamodell — komplett skjema etter endring

```sql
-- Eksisterende tabeller, uendret: promoted_placements, placement_log, collection_impressions

-- venue_clicks (utvidet)
CREATE TABLE venue_clicks (
  id SERIAL PRIMARY KEY,
  venue_name TEXT NOT NULL,
  event_slug TEXT NOT NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Nye felt (2026-04-16 migrasjon)
  placement_id UUID REFERENCES promoted_placements(id) ON DELETE SET NULL,
  source_page TEXT,
  placement_context TEXT
    CHECK (placement_context IN ('promoted', 'organic', 'direct', 'newsletter', 'social'))
);

CREATE INDEX idx_venue_clicks_venue_time
  ON venue_clicks(venue_name, clicked_at DESC);
CREATE INDEX idx_venue_clicks_placement
  ON venue_clicks(placement_id, clicked_at DESC)
  WHERE placement_id IS NOT NULL;
CREATE INDEX idx_venue_clicks_context
  ON venue_clicks(venue_name, placement_context, clicked_at DESC);
```

---

## 6. API-kontrakter

### 6.1 `/api/track-click` (utvidet)

**Request:**
```http
POST /api/track-click HTTP/1.1
Content-Type: application/json

{
  "event_slug": "brann-aalesund-2026-04-22",
  "venue_name": "Brann Stadion",
  "source_page": "/no/sentrum",
  "placement_context": "promoted",
  "placement_id": "94dd7d70-3757-4357-ac01-ad313d9d41a8"
}
```

**Respons:**
- `204 No Content` ved suksess eller skip
- `400 Bad Request` hvis `event_slug` mangler (minimum-kravet)
- `429 Too Many Requests` ved rate-limit overskredet (per-IP, uten lagring)

**Garantier:**
- Aldri feil hvis non-kritiske felt mangler (source_page, placement_context, placement_id) — lagres som null
- Aldri logg IP i database
- Maks 10 klikk/minutt per IP (in-memory counter, rullerer)

### 6.2 Ingen endring i:
- `/api/log-placement-impression` (eksisterer som RPC)
- `/api/log-collection-impression` (eksisterer som RPC)
- Admin-endpoints

---

## 7. Klient-side endringer

### 7.1 EventCard.svelte
- Legg til `placementId: string | null` prop
- Send `source_page` (window.location.pathname) i track-click body
- Send `placement_context: 'promoted' | 'organic'` basert på `promoted` prop

### 7.2 Collection-side (`[collection]/+page.svelte`)
- Les `data.placementForEvent[event.id]` og send som prop
- Ingen annen endring

### 7.3 Event-detaljside (`events/[slug]/+page.svelte`)
- Ticket-button: send `placement_context: 'direct'` og `source_page: '/no/events/' + slug`
- Hvis query-param har `utm_medium=newsletter`: override context til `'newsletter'`
- Hvis URL-referrer er Meta/IG/FB: context → `'social'`

### 7.4 Homepage (`/[lang]/+page.svelte`)
- Alle event-cards: `promoted=false`, `placementId=null`
- `placement_context` via EventCard blir `'organic'` — dette er OK, homepage-klikk teller som organic visning

---

## 8. Privacy og lovkrav

### 8.1 GDPR / Personvernforordningen

- **Ingen PII lagres.** `venue_clicks` har ikke IP, user_id, email, cookie_id
- **Ingen cross-session tracking.** Hver klikk er anonym og usammenhengende
- **Ingen cookies.** Passer allerede Gåris policy (`/no/personvern`)

### 8.2 Markedsføringsloven § 3

- Alle promoted event-kort må vise "Fremhevet"-badge (gjøres allerede via EventCard-komponenten)
- Badge må være tydelig og ikke skjult — UI-spec i `docs/archive/promoted-placement-spec.md` gjelder
- Ingen endring nødvendig

### 8.3 Personvern-policy oppdatering?

Vurder å legge til én linje i `/no/personvern`:

> Når du klikker på et arrangement-kort, lagrer vi et anonymt klikk-signal (venue, event, kilde-side, tidspunkt) for å gi arrangørene aggregerte rapporter. Ingen personidentifiserende data (IP, cookie, bruker-ID) lagres.

**Avgjørelse:** Gjør dette før fase 2 utrulling. Inkluderes i deploy-PR.

### 8.4 Venue-kontrakt

For Standard/Partner-tier: vi lover "månedsrapport med visninger og klikk". Dette er hva vi faktisk leverer. Ikke lov mer (lift-beregning er bonus, ikke kontraktforpliktet).

---

## 9. Ytelse og skalering

### 9.1 Estimerte datamengder

| Tabell | Rad/måned nå | Rad/måned ved 1000 besøk/dag | Rad/måned ved 10 000 besøk/dag |
|---|---|---|---|
| collection_impressions | ~1 500 | ~3 000 | ~10 000 |
| placement_log | ~600 | ~2 000 | ~10 000 |
| venue_clicks | ~100 | ~1 000 | ~10 000 |

Ingen bekymring for Supabase-tier før 100k+ klikk/måned.

### 9.2 Rate-limiting

`/api/track-click` er åpent endpoint. Per-IP rate limit (10/min) nødvendig for å unngå:
- Botnett som spammer klikk for å blåse opp venue-stats
- Panikk-loops i frontend som fire 1000 klikk/sekund

Implementering: in-memory Map med TTL via SvelteKit hooks. Utskifting til Upstash Ratelimit hvis vi begynner å ha flere instanser.

### 9.3 Aggregering

Ingen behov for materialiserte views i fase 1. Rapporten kjøres månedlig, tar <5s selv med 10k rader.

---

## 10. Observability

### 10.1 Logging

- `/api/track-click` 4xx/5xx logges til Vercel (allerede via hooks.server.ts error handler)
- Insert-errors på venue_clicks: warning-log, ikke crash

### 10.2 Metrics

Månedlig helsesjekk i rapport-script:
- Ratio promoted_clicks/promoted_impressions sanity-check (< 0.5% eller > 25% = misaligned tracking)
- Antall `null placement_context` rader (bør være < 10% — ellers kontekst-logikken feiler)

### 10.3 Alerter

Ingen. Vercel err-rate alerts dekker infrastruktur. Data-kvalitet sjekkes månedlig.

---

## 11. Utrullingsplan

### Fase 0 — observasjon (2026-04-16 → 2026-05-16)

- SK Brann kjører med **eksisterende** system
- Ingen endring gjøres — se hva vi kan rapportere med det vi har
- Lag første månedsrapport 2026-05-16 manuelt (kan være tynt, men gir baseline)
- Samle inn Brann-feedback: "Hva savner du i rapporten?"

### Fase 1 — core attribution (estimat 1 arbeidsdag)

Etter fase 0. Utløses hvis Brann eller andre venues spør om "hvor mange klikk?" og vi ikke kan svare presist.

1. **Migrasjon** (30 min) — `20260516_venue_clicks_attribution.sql`
2. **Track-click utvidelse** (1 t) — nye felt + skip-IP
3. **EventCard oppdatering** (1 t) — placementId prop + context
4. **Server-side placementForEvent** (30 min) — map i +page.server.ts
5. **Tester** (1 t) — vitest for context-utledning, rate-limit, skip-IP
6. **Rapport-utvidelse** (2 t) — splittet klikk per context, lift-beregning
7. **Deploy + overvåk** (30 min) — verify venue_clicks får nye felt
8. **Oppdater personvern-side** (10 min)

**Totalt:** 6.5 timer, én konsentrert arbeidsdag.

### Fase 2 — organiske visninger (hvis nødvendig)

Utløses hvis lift-beregning utfordres. Legg til `event_impression_log` for eksakt organic-CTR-beregning.

### Fase 3 — nyhetsbrev + social attribusjon (valgfritt)

- UTM-params i social captions (hvis det er verdt det)
- Parse utm_medium i track-click for å auto-sette context
- Nyhetsbrev: legg click-through via Gåri-redirect i stedet for MailerLite direktelenke (mer kontroll, mindre pålitelighet hvis redirect feiler)

---

## 12. Teststrategi

### 12.1 Enhetstester (vitest)

**Ny fil:** `src/routes/api/track-click/__tests__/track-click.test.ts`

Dekker:
- Skip-IP scenario → 204, ingen insert
- Manglende event_slug → 400
- Rate-limit → 429 (mock timer)
- Null source_page/placement_context tillatt
- placement_id uten tilhørende promoted_placements-row → insert OK (FK er SET NULL på delete)

**Utvidelse:** `src/lib/__tests__/promotions.test.ts`
- pickPromotedVenues returnerer placement-info som klienten kan mappe til event-id

### 12.2 Integrasjons-test (manuell ved deploy)

1. Besøk `/no/sentrum` i inkognitomodus → se Brann-event øverst med Fremhevet-badge
2. Klikk event → bekreft network-request til `/api/track-click` med riktig body
3. Sjekk `venue_clicks` i Supabase: ny rad med placement_id + source_page + context=promoted
4. Besøk eventet organisk fra forsiden → klikk → bekreft context=organic
5. Besøk med SKIP-IP (VPN eller vercel-preview) → bekreft INGEN rad skrevet

### 12.3 Rapport-test

Kjør `generate-venue-report.ts --venue="Brann Stadion" --month=2026-04` mot prod-data ENGANG før utsending, sjekk at tallene stemmer med intuisjonen.

---

## 13. Rapport-leveranse

### 13.1 Format

- HTML-email (mobilvennlig, fast bredde 600px)
- PDF-eksport-knapp hvis ønsket (fase 3)
- CSV-eksport av rådata tilgjengelig på forespørsel

### 13.2 Innhold per måned

| Seksjon | Innhold |
|---|---|
| Oppsummering | 3 tall: totale visninger, totale klikk, ROI-estimat i kr |
| Visninger | Tabell per collection, og % av total sidetrafikk |
| Klikk | Tabell splittet på context (promoted/organic/direct/newsletter/social) |
| Lift | Beregnet netto-klikk fra plasseringen |
| Topp-events | Topp 5 arrangementer ranket på klikk, med visning/klikk/CTR |
| Kildefordeling | Pie-chart eller tabell: hvor kom klikkene fra |
| Anbefalinger | (valgfritt) 1-2 observasjoner fra dataen — "Torsdager ga 40% av klikkene" |

### 13.3 Frekvens og utsending

- Månedlig, 1. hver måned for forrige måned
- Sendes via Resend fra `Kjersti.Therkildsen@gaari.no`
- Cron-jobb i GitHub Actions (ny workflow `venue-monthly-report.yml`)

### 13.4 Rapport-script

**Fil:** `scripts/generate-venue-report.ts` (eksisterer allerede, utvides)

**CLI:**
```bash
npx tsx scripts/generate-venue-report.ts --venue="Brann Stadion" --month=2026-04
```

Flags:
- `--venue`: påkrevd, matcher promoted_placements.venue_name
- `--month`: YYYY-MM
- `--send`: send via email (default: bare skriv HTML til stdout for preview)
- `--format=html|pdf|csv`: default html

---

## 14. Fremtidige utvidelser

### 14.1 Per-event granulære rapporter
Når tall er høye nok (>10 klikk/event), kan vi gi venues per-event click-through som salgsargument.

### 14.2 Kohort-sammenligning
Benchmarke SK Brann vs. andre sports-venues (hvis vi noen gang får flere).

### 14.3 Funnel-tracking
Event card click → event detail page view → ticket-url click = full funnel. Krever ekstra visning-logging.

### 14.4 Sanntids-dashboard
Admin-side med live visninger/klikk (fase 3). Forutsetter Supabase Realtime eller polling.

### 14.5 Venue-tilgang
La venues få egen innlogging til dashboard (fase 4). Forutsetter auth, tier-begrensning, RLS.

---

## 15. Beslutninger tatt

| Beslutning | Begrunnelse | Dato |
|---|---|---|
| Forsiden forblir promotion-fri | Styrker tillit, rettferdiggjør Fremhevet-stempel på tematiske sider | 2026-04-16 |
| Bygge på eksisterende `venue_clicks` i stedet for ny tabell | Mindre kompleksitet, bakoverkompatibelt | 2026-04-16 |
| Klikk-tracking via /api/track-click, ikke 302-redirect | Enklere, EventCard navigerer allerede til event-detaljside først | 2026-04-16 |
| Ingen UTM-params i sosiale captions | Pollutter lesbarhet, Meta Insights dekker behovet | 2026-04-16 |
| Ingen cookies, ingen IP-lagring | Personvern-policy, GDPR-overholdelse | 2026-04-16 |
| Observere i 30 dager før build | Få empirisk data, unngå premature optimization | 2026-04-16 |

---

## 16. Åpne spørsmål

1. **Lift-definisjon — streng eller mild?**
   - Streng: `(promoted_ctr - organic_ctr) × promoted_impressions` — krever Alt A fra 4.7
   - Mild: `promoted_clicks - estimated_organic_clicks` (bransjesnitt) — bruker Alt B

2. **Skal `direct` klikk telle mot venue?**
   - Hvis Brann-fan går direkte til gaari.no/events/brann-aalesund-2026-04-22 og klikker "Kjøp billett", er det "Gåri-trafikk" eller "Brann-egen trafikk"?
   - Foreslått: tell, men vis separat i rapporten så venue ser forskjellen.

3. **Multi-dag events (f.eks. festivaler) vs. single-day kamper:**
   - Brann har single-day, ingen problemstilling nå
   - Ved festivaler: tell hver dag som egen visning? Eller kun første? Ved klikk: tell én gang totalt uansett hvilken dag?
   - Foreslått: tell hver dag som separate visning, tell klikk kun på event-id (dedupe i rapporten).

4. **Historiske klikk før migrasjon:**
   - Nåværende venue_clicks har ingen placement_context. Skal vi prøve å tilbake-fylle (kan være umulig)?
   - Foreslått: nei. Rapporten starter fra dagen migrasjonen kjører. Før-migrasjonsklikk merkes som "ukjent kontekst" i rapport.

5. **Hvordan håndtere venue-navne-endringer?**
   - Hvis venue_name i promoted_placements endres (f.eks. "Brann Stadion" → "SpareBank 1 SR-Bank Arena"), bryter historisk data
   - Foreslått: tilføy `venue_name_canonical` senere, ikke før nødvendig

---

## 17. Referanser

- `docs/archive/promoted-placement-spec.md` — opprinnelig produktspec (2026-02-24)
- `supabase/migrations/20260226180000_promoted_placements.sql`
- `supabase/migrations/20260413_venue_clicks.sql`
- `supabase/migrations/20260414120000_collection_impressions.sql`
- `src/lib/server/promotions.ts` — impression-basert venue-valg
- `src/routes/[lang]/[collection]/+page.server.ts:100-142` — promoted bubble-up logikk
- `src/lib/components/EventCard.svelte` — klikk-tracking client-side
- `src/routes/api/track-click/+server.ts` — endpoint
- `scripts/generate-venue-report.ts` — rapport-generator (utvides)
- `src/lib/__tests__/promotions.test.ts` — test-pattern
- `src/routes/[lang]/personvern/+page.svelte` — personvern-policy
- Markedsføringsloven § 3 — https://lovdata.no/dokument/NL/lov/2009-01-09-2

---

**Dette dokumentet oppdateres når beslutninger endres. All arbeid på attribusjon skal referere her først.**
