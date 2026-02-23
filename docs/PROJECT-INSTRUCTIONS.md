# Gåri — Project Instructions

**Last updated:** 2026-02-23

---

## What Is Gåri?

A bilingual (NO/EN) event aggregator for Bergen, Norway. One place to find everything happening in the city — from concerts and theatre to family events and outdoor activities.

- **Tagline:** Ke det går i Bergen? ("What's going on in Bergen?" in bergensk dialect)
- **Domain:** gåri.no / gaari.no
- **Email:** gaari.bergen@proton.me

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | SvelteKit 2 + Svelte 5 | Runes: `$state`, `$derived`, `$effect` |
| Styling | Tailwind CSS 4 | Utility-first + custom Funkis design tokens in `app.css` |
| Database | Supabase (PostgreSQL) | Anon key for frontend reads, service role for scraper writes |
| Hosting | Vercel | Auto-deploy from git, SvelteKit adapter |
| Scrapers | TypeScript + Cheerio | Standalone in `scripts/`, separate `package.json` |
| AI descriptions | Gemini 2.5 Flash | Bilingual summaries <160 chars |
| CI/CD | GitHub Actions | CI: lint/type-check/build on push; Scrape: cron 6 AM & 6 PM UTC |
| OG images | Satori + ResvgJS | Per-event at `/og/[slug].png` |

---

## Project Structure

```
src/
  lib/
    components/     # 17 Svelte components
    types.ts        # Category, Bydel, GaariEvent, FilterState types
  routes/
    [lang]/         # Language-prefixed routes (no, en)
      +page.svelte  # Homepage / event listing
      about/        # About page
      datainnsamling/ # Data transparency + opt-out form
      events/[slug]/ # Event detail page
      submit/       # Event submission form
    og/[slug].png   # OG image generation
    sitemap.xml/    # Dynamic sitemap
  app.css           # Funkis design tokens

scripts/
  scrape.ts         # Main scraper pipeline
  scrapers/         # 44 individual scraper files
  lib/
    utils.ts        # slugify, makeSlug, parseNorwegianDate, eventExists, insertEvent, fetchHTML, delay, makeDescription, CATEGORY_LABELS_NO
    categories.ts   # mapCategory (50+ terms), mapBydel (100+ mappings)
    dedup.ts        # Cross-source deduplication with scoring
    venues.ts       # 190+ venue entries, aggregator domain detection
    ai-descriptions.ts # Gemini integration, rate limiting, fallback
    supabase.ts     # Supabase client with service role key

docs/               # Project documentation (this folder)
```

---

## Key Conventions

### Norwegian first
- `title_no` and `description_no` are required. English fields are optional.
- UI labels exist in both languages; Norwegian is the default.
- URL prefix: `/no/...` and `/en/...`

### Categories (11)
`music`, `culture`, `theatre`, `family`, `food`, `festival`, `sports`, `nightlife`, `workshop`, `student`, `tours`

Defined in `src/lib/types.ts`. Norwegian labels in `COPY-GUIDELINES.md`.

### Bydeler (8)
`Sentrum`, `Bergenhus`, `Fana`, `Ytrebygda`, `Laksevåg`, `Fyllingsdalen`, `Åsane`, `Arna`

Not translated — same in English.

### Slug format
`{slugified-title}-{YYYY-MM-DD}` — max 80 chars, æ→ae, ø→o, å→a.

### Event status
- Scraped events → `approved` (auto-published)
- User-submitted events → `pending` (admin review required)
- No `expired` auto-transition — `removeExpiredEvents()` deletes past events

---

## Scraper Pipeline (`scripts/scrape.ts`)

1. `removeExpiredEvents()` — deletes past events
2. `loadOptOuts()` — loads approved opt-out domains, deletes events from opted-out sources
3. Run all 44 scrapers — each checks `eventExists(source_url)` before inserting
4. `deduplicate()` — removes cross-source duplicates by normalized title + same date

### Scraper rules
- **Rate limiting:** 3s delay between requests for multi-request scrapers
- **User-Agent:** `Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`
- **robots.txt:** All 44 scrapers verified compliant (audit 2026-02-22)
- **No copying:** Generate descriptions via Gemini or `makeDescription()` — never copy source text
- **No aggregator ticket URLs:** `ticket_url` points to actual venue/ticket pages
- **No kindergarten events:** Excluded via title keywords + detail page text

### 44 scrapers by category

**General aggregators (6):** visitbergen, kulturikveld, bergenkommune, barnasnorge, studentbergen, bergenlive

**Ticket platforms (3):** eventbrite, ticketco (14 venue subdomains), hoopla

**Performance venues (10):** dns, grieghallen, olebull, usfverftet, forumscene, cornerteateret, dvrtvest, bitteater, carteblanche, harmonien

**Arts/culture/literature (6):** kunsthall, kode, litthusbergen, mediacity, bek, bergenfilmklubb

**Libraries/museums/landmarks (3):** bergenbibliotek, bymuseet, floyen

**Food/nightlife/recreation (7):** bergenkjott, colonialen, raabrent, paintnsip, brettspill, bjorgvinblues, nordnessjobad

**Sports/outdoor (2):** brann, dnt

**Festivals (4):** festspillene, bergenfest, beyondthegates, vvv

**Other (3):** kulturhusetibergen, bergenchamber, oseana

---

## What's In Scope

### MVP (current)
- Event listing with filters (category, bydel, date, price, audience, search)
- Event detail pages with external ticket links
- Bilingual NO/EN interface with language toggle
- Automated scraping (44 sources, twice daily)
- AI-generated bilingual descriptions
- Event submission form (admin-reviewed)
- Data transparency page with opt-out form
- SEO: OG tags, per-event OG images, hreflang, dynamic sitemap
- Load More pagination (not infinite scroll)

### v2 (planned)
- Map view (requires lat/lng data + map library)
- Search autocomplete
- User accounts / saved favorites
- Weekly email digest
- Verified organizer accounts (auto-publish)
- Indoor/outdoor filter
- Dark mode

### Not planned
- Ticket sales (Gåri only links externally)
- Auto-playing video backgrounds
- Infinite scroll
- Chat widget / chatbot
- Push notification prompts
- Newsletter popup on page load
- Social media feed widgets

---

## Constraints

- **No dark mode** — components use hardcoded `bg-white` (see DECISION-LOG #5)
- **No infinite scroll** — Load More only (see DECISION-LOG #6)
- **Mobile-first** — 65%+ expected mobile users
- **No headless browser scrapers** — Cheerio only (see DECISION-LOG #2)
- **WCAG 2.2 Level AA** — legally required under European Accessibility Act
- **No copied descriptions** — åndsverkloven compliance (see legal-research-norway.md)
- **External tickets only** — never intermediate ticket sales (see DECISION-LOG #12)

---

## Deployment

- **Frontend:** Vercel (auto-deploy from `master` branch)
- **Database:** Supabase (hosted PostgreSQL)
- **Scraping:** GitHub Actions cron (`scrape.yml`) — 6 AM & 6 PM UTC, 15-minute timeout
- **CI:** GitHub Actions (`ci.yml`) — lint, type-check, build on push/PR to master
- **Secrets:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`

---

## Working With This Codebase

- Frontend components are in `src/lib/components/` (17 Svelte files)
- Routes use SvelteKit's file-based routing under `src/routes/[lang]/`
- Scrapers are standalone TypeScript — run with `npx tsx scripts/scrape.ts` from the `scripts/` directory
- Design tokens live in `src/app.css` (Funkis system)
- Types are centralized in `src/lib/types.ts`
- Scraper utilities in `scripts/lib/` — shared across all 44 scrapers

---

## References

- `design-brief.md` — detailed frontend specs and component patterns
- `project-strategy.md` — product scope, audience, and launch plan
- `legal-research-norway.md` — full legal analysis of scraping practices
- `CLAUDE.md` — concise project context (root-level)
- `DECISION-LOG.md` — rationale for all key decisions
- `DESIGN-SYSTEM.md` — color tokens, typography, component inventory
