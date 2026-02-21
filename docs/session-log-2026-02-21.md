# Session Log: 2026-02-21 — Scraper Expansion Sprint

## Summary

Added 7 new scrapers across 2 commits, bringing total from 38 to 43 scraper files and ~125 new events. All scrapers follow legal compliance guidelines (see `legal-research-norway.md`).

## Commits

| Commit | Scrapers Added | Events Inserted |
|--------|---------------|-----------------|
| `1ce166d` | BEK, Beyond the Gates, Brann | ~45 |
| `ed1f9a2` | Kulturhuset i Bergen, VVV | ~66 |

## New Scrapers Built

### 1. BEK (`scrapers/bek.ts`) — Bergen Senter for Elektronisk Kunst
- **Method:** WordPress REST API (`/wp-json/wp/v2/posts?categories=19,51&per_page=20&_embed`)
- **Events found:** 2 (Gaza film program, Familiedag)
- **Key challenge:** Norwegian date parsing from content prose (e.g., "20. februar")
- **Bug fixed:** `new Date(year, month, day).toISOString()` shifts dates back 1 day due to UTC conversion. Fixed by constructing `YYYY-MM-DD` string directly without Date object.
- **Filters:** Skips "program overview" posts with >3 date references; skips English-only posts

### 2. Beyond the Gates (`scrapers/beyondthegates.ts`) — Metal Festival
- **Method:** Squarespace menu blocks at `beyondthegates.no/lineup`
- **Events found:** 28 acts across 4 days (Jul 29–Aug 1, 2026)
- **Structure:** 4 day tabs (`label[role="tab"]`) → venue sections (`.menu-section-title`) → artist items (`.menu-item-title`)
- **Venues:** USF Verftet, Grieghallen, Kulturhuset i Bergen
- **Source URLs:** Hash fragments for uniqueness: `${LINEUP_URL}#${date}-${slug}`

### 3. Brann (`scrapers/brann.ts`) — SK Brann Football
- **Method:** HTML table scraping at `brann.no/terminliste`
- **Events found:** 15 Eliteserien home matches (Mar–Dec 2026)
- **Selector:** `tr.future__match__terminlist`, filtered by "Brann stadion" text
- **Date format:** `DD.MM.YYYY` and `HH:MM` extracted via regex

### 4. Kulturhuset i Bergen (`scrapers/kulturhusetibergen.ts`)
- **Method:** Squarespace eventlist at `kulturhusetibergen.no/program`
- **Events found:** 19 events
- **Selector:** `article.eventlist-event--upcoming` with `<time datetime="YYYY-MM-DD">`
- **Images:** Squarespace CDN with `?format=750w` optimization
- **Category:** Guessed from excerpt tags (#konsert, #dans, #quiz, etc.)

### 5. VVV (`scrapers/vvv.ts`) — Varmere Våtere Villere Climate Festival
- **Method:** Squarespace summary carousel at `varmerevaterevillere.no/program`
- **Events found:** 47 events across Mar 11–14, 2026
- **Bug fixed:** Squarespace carousel has 3 responsive copies per item → `.first()` required on ALL selectors (location, month, day, time, image)
- **Titles:** Prefixed with "VVV:" for clarity

## Source Rankings Added to `dedup.ts`

| Source | Rank |
|--------|------|
| bek | 4 |
| beyondthegates | 5 |
| brann | 5 |
| kulturhusetibergen | 5 |
| vvv | 4 |

## Venue Entries Added to `venues.ts`

- `bek` / `bergen senter for elektronisk kunst` → `https://bek.no`
- `brann stadion` / `sk brann` → `https://brann.no`
- `byrommet` → `https://varmerevaterevillere.no`
- `østre` → `https://ostre.no`

## Technical Patterns Learned

### Squarespace Variants
Three different Squarespace block types encountered, each requiring different parsing:
1. **Menu blocks** (Beyond the Gates) — `.menu-section` with `.menu-item-title`
2. **Eventlist** (Kulturhuset) — `article.eventlist-event--upcoming` with `<time datetime="">`
3. **Summary carousel** (VVV) — `div.summary-item` with `.summary-thumbnail-event-date-*`

### Squarespace Carousel Bug
Summary carousels create 3 copies of each item for responsive display (mobile/tablet/desktop). Always use `.first()` on all child selectors to avoid concatenated text (e.g., "FisketorgetFisketorgetFisketorget").

### WordPress REST API
BEK's WordPress API provides structured JSON with embedded media. Categories can be filtered by ID. Norwegian dates must be extracted from post content via regex since WordPress doesn't have native event date fields.

### CET/UTC Date Trap
Never use `new Date(year, month, day).toISOString()` for date-only strings in CET timezone — it converts to UTC, shifting the date back 1 day. Instead, construct the date string directly: `` `${year}-${month}-${day}` ``.

## Bugs Found & Fixed

1. **BEK date off-by-one** — UTC conversion trap (see above)
2. **VVV triple venue names** — Squarespace carousel `.first()` fix
3. **VVV events deleted and re-scraped** after triple-venue fix

## Legal Compliance

All 7 new scrapers follow the guidelines in `legal-research-norway.md`:
- Use `makeDescription()` — no copied creative content
- Use `fetchHTML()` with honest User-Agent
- 3s delay between requests (where applicable)
- Only factual data scraped (title, date, venue, price)
- Link back via `source_url` and `ticket_url`
- No robots.txt violations
- All sources are publicly accessible, no auth bypassed

## Current State

- **43 scraper files** in `scripts/scrapers/`
- **43 registered sources** in `scripts/scrape.ts`
- All pushed to `origin/master`
