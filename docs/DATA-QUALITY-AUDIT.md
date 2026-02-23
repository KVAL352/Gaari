# Gåri — Data Quality Audit

**Last updated:** 2026-02-23
**Scope:** Current state of the scraper pipeline, data coverage, and known issues.

---

## Scraper Coverage Summary

- **Total scrapers:** 44 files in `scripts/scrapers/`
- **Total sources scraped:** 44 (some cover multiple venues, e.g., TicketCo covers 14 subdomains, Bymuseet covers 9 museums)
- **Scrape frequency:** Twice daily (6 AM & 6 PM UTC) via GitHub Actions
- **Pipeline timeout:** 15 minutes

---

## Coverage by Category

| Category | Primary sources | Coverage quality |
|----------|----------------|-----------------|
| Music | harmonien, bergenlive, kulturikveld, ticketco (Hulen, Kvarteret, Victoria), bergenkjott, bjorgvinblues, forumscene | Strong — multiple overlapping sources |
| Culture | kunsthall, kode, bek, kulturhusetibergen, bymuseet, mediacity | Strong — major institutions covered |
| Theatre | dns, dvrtvest, cornerteateret, bitteater, carteblanche, olebull | Strong — all major theatre venues |
| Family | barnasnorge, bergenkommune, bergenbibliotek, floyen | Good — dedicated family aggregator + institutions |
| Food | colonialen, raabrent, bergenkjott | Moderate — limited to venues with event listings |
| Festival | festspillene, bergenfest, beyondthegates, vvv | Good — major festivals covered, seasonal |
| Sports | brann, dnt | Moderate — SK Brann + DNT hiking; missing smaller clubs |
| Nightlife | ticketco (Hulen, Madam Felle), bergenkjott, bjorgvinblues | Moderate — major venues covered |
| Workshop | paintnsip, brettspill, bergenbibliotek | Limited — niche sources only |
| Student | studentbergen, ticketco (Kvarteret) | Good — primary student platforms |
| Tours | dnt, floyen, visitbergen | Good — major outdoor/tourist sources |

---

## Coverage by Bydel

| Bydel | Coverage | Notes |
|-------|----------|-------|
| Sentrum | Excellent | Most venues are in city center |
| Bergenhus | Good | Grieghallen, Festspillene venue area |
| Fana | Limited | Few dedicated sources |
| Ytrebygda | Limited | Few dedicated sources |
| Laksevåg | Moderate | USF Verftet is here |
| Fyllingsdalen | Limited | Few dedicated sources |
| Åsane | Limited | Few dedicated sources |
| Arna | Minimal | Almost no dedicated sources |

Bydel is mapped from venue names via `categories.ts` → `mapBydel()` (100+ venue-to-bydel mappings). Events without a mapped venue default based on address or are left without bydel.

---

## Known Gaps (Not Feasible to Scrape)

| Source | Reason | Impact |
|--------|--------|--------|
| Bergen Kino | Vue.js SPA — all data loaded via client-side JS, API returns 400 without client context | Missing all cinema showtimes (18 screens) |
| VilVite | Netflex CMS, JS-rendered program page | Missing science center family events |
| Kunsthall 3,14 | Wix-based, JS-rendered | Missing contemporary art exhibitions |
| Akvariet | No structured event listing page | Missing aquarium events |
| Lydgalleriet | Webflow, only 2–3 exhibitions at a time | Low volume — not worth a scraper |
| Nattjazz | Not yet scraped (seasonal, May–June) | Missing during festival season |
| Borealis Festival | Not yet scraped (March) | Missing during festival season |
| Facebook Events | Requires auth, no public API | Missing informal/community events |

### Potential additions (researched, ready to build)
- **Bymuseet i Bergen** — WordPress HTML, 9 museums, 200+ events, event sitemap available. High priority. (See `next-scrapers.md`)

---

## ToS Risk Assessment

Three scrapers operate in a grey area due to Terms of Service restrictions:

| Source | Risk | ToS issue | Mitigation |
|--------|------|-----------|------------|
| TicketCo (14 venues) | Medium | ToS forbids distribution without agreement | Seek partnership/API access |
| Hoopla | Medium | ToS forbids copying content | Seek partnership/API access |
| Eventbrite | Medium | ToS forbids harvesting | Use official API or seek agreement |

All other 41 sources are low risk (public/open sources). See `legal-research-norway.md` for full analysis.

---

## Deduplication Effectiveness

- **Method:** Normalized title + same date → finds cross-source duplicates
- **Scoring:** Source rank + has image + has ticket URL + description length → keeps highest-scored variant
- **Implementation:** `scripts/lib/dedup.ts`
- **Known limitation:** Slight title variations across sources may escape dedup (e.g., "Bergen Filharmoniske Orkester" vs "BFO"). Normalization helps but isn't perfect.

---

## AI Description Quality

- **Provider:** Gemini 2.5 Flash (`gemini-2.5-flash`)
- **Success rate:** High when API is available; falls back to template on quota exhaustion or errors
- **Template fallback:** `"{Category label} på {venue}"` — grammatically simple but lacks detail
- **Rate limiting:** 200ms between calls, exponential backoff on 429, daily quota detection
- **Quality controls:** Max 160 chars, JSON validation, empty-response detection
- **Known issues:**
  - Daily quota can be exhausted during large scrape runs → remaining events get template descriptions
  - English descriptions are empty string on fallback (no machine translation)
  - Occasional hallucination of details not in the source metadata

---

## Missing Fields Analysis

| Field | Coverage | Notes |
|-------|----------|-------|
| `title_no` | 100% | Required — always present |
| `description_no` | 100% | Always generated (AI or template) |
| `title_en` | ~60–70% | Only when AI generates it |
| `description_en` | ~60–70% | Only when AI generates it; empty on fallback |
| `category` | 100% | Mapped via `mapCategory()` |
| `date_start` | 100% | Required — parsed from source |
| `date_end` | ~30% | Many sources don't provide end times |
| `venue_name` | ~95% | Occasionally missing for aggregator sources |
| `address` | ~40% | Not all scrapers extract addresses |
| `bydel` | ~80% | Mapped from venue name; unrecognized venues lack bydel |
| `price` | ~70% | Many sources don't show prices or say "See ticket link" |
| `ticket_url` | ~75% | Present when source provides direct ticket links |
| `image_url` | ~65% | Not all events have images; `ImagePlaceholder` handles missing |
| `latitude/longitude` | ~5% | Not actively scraped — needed for future map view |

---

## Image Coverage

- **~65% of events** have an `image_url`
- **Hotlinking issue:** Images are currently linked directly from source domains (using their bandwidth)
- **Legal risk:** Some images may be copyrighted (åndsverkloven § 23)
- **Planned fix:** Set up image proxy/cache to serve from own domain
- **Fallback:** `ImagePlaceholder.svelte` shows category-colored background with icon

---

## Opt-Out System Status

- **Table:** `opt_out_requests` in Supabase
- **Form:** Live at `/datainnsamling`
- **Workflow:** Pending → admin approves in Supabase dashboard → approved
- **Pipeline enforcement:** `loadOptOuts()` caches approved domains → `insertEvent()` checks `isOptedOut()` → step 1b deletes existing events from opted-out domains
- **Current opt-outs:** Check Supabase dashboard for count
- **Known gap:** No automated email notification when an opt-out is approved or denied

---

## robots.txt Compliance

Full audit completed 2026-02-22:
- **34 domains:** Have robots.txt — all scrapers compliant
- **11 domains:** No robots.txt — no restrictions to respect
- **0 domains:** Accessing blocked paths
- **5 scrapers rewritten** (Feb 2026) to avoid blocked paths: colonialen, bergenfilmklubb, cornerteateret, bergenkjott, raabrent
- **8 Squarespace sites** block named AI bots (ClaudeBot, GPTBot) — Gåri's custom User-Agent is not blocked

---

## Recommendations

1. **Build Bymuseet scraper** — highest-impact addition (9 museums, 200+ events)
2. **Set up image proxy** — resolve hotlinking and copyright concerns
3. **Seek TicketCo/Hoopla/Eventbrite partnerships** — reduce ToS risk
4. **Improve address extraction** — fill the ~60% gap for future map view
5. **Track description quality** — log AI vs template ratio to monitor Gemini availability
6. **Add lat/lng extraction** — prerequisite for v2 map view

---

## References

- See `legal-research-norway.md` for full legal and ToS analysis
- See `next-scrapers.md` for potential new scrapers and feasibility research
- See `data-sources-research.md` for comprehensive Bergen event source inventory
- See `CLAUDE.md` for scraper pipeline overview
