# Gåri — Project Instructions

**Last updated:** 2026-02-25

---

## What Is Gåri?

A bilingual (NO/EN) event aggregator for Bergen, Norway. One place to find everything happening in the city — from concerts and theatre to family events and outdoor activities. Built as a sustainable local media business with a cross-subsidized promoted placement model.

- **Tagline:** Ke det går i Bergen? ("What's going on in Bergen?" in bergensk dialect)
- **Domain:** gåri.no / gaari.no
- **Email:** gaari.bergen@proton.me
- **Business model:** Free for users. Revenue from promoted placement tiers (Basis 1 500 NOK/mo → Partner 7 000 NOK/mo). See `strategic-roadmap.md`.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | SvelteKit 2 + Svelte 5 | Runes: `$state`, `$derived`, `$effect` |
| Styling | Tailwind CSS 4 | Utility-first + custom Funkis design tokens in `app.css` |
| Database | Supabase (PostgreSQL) | Anon key for frontend reads, service role for scraper writes |
| Hosting | Vercel | Auto-deploy from git, SvelteKit adapter |
| Scrapers | TypeScript + Cheerio | Standalone in `scripts/`, separate `package.json` |
| AI descriptions | Gemini 2.5 Flash | Bilingual summaries <160 chars, 200ms rate limit |
| CI/CD | GitHub Actions | CI: lint/type-check/test/build on push; Scrape: cron 6 AM & 6 PM UTC |
| OG images | Satori + ResvgJS | Per-event at `/og/[slug].png`, per-collection at `/og/c/[slug].png` |
| Social images | Satori + ResvgJS | 1080x1080 Instagram carousels in `scripts/social/` |
| Analytics | Plausible Cloud | Privacy-friendly, no cookies, UTM tracking on all outbound links |
| Unit tests | Vitest | 156 tests, runs in <350ms — `npm test` |

---

## Project Structure

```
src/
  lib/
    components/       # 20 Svelte components
    collections.ts    # 8 curated collection configs (denne-helgen, i-kveld, etc.)
    event-filters.ts  # Date/time filter helpers (extracted for testability)
    types.ts          # Category, Bydel, GaariEvent, FilterState types
    seo.ts            # JSON-LD generators (Event, Organization, WebSite, FAQ, Collection)
    server/
      supabase.ts     # Server-only Supabase client (enforced by SvelteKit)
  routes/
    [lang]/           # Language-prefixed routes (no, en)
      +page.server.ts # Homepage — server-side loaded, ISR cached
      +page.svelte    # Homepage with EventDiscovery progressive filter
      about/          # About page (prerendered, FAQ section)
      datainnsamling/ # Data transparency + opt-out form
      events/[slug]/  # Event detail page
      submit/         # Event submission form
      [collection]/   # 8 curated landing pages (denne-helgen, i-kveld, gratis, etc.)
    admin/social/     # Social post review page (internal)
    og/[slug].png     # Per-event OG image generation
    og/c/[slug].png   # Per-collection OG image generation
    sitemap.xml/      # Dynamic sitemap with hreflang
    api/health/       # Health check endpoint
  app.css             # Funkis design tokens
  app.html            # Global head (Plausible, fonts, GSC verification)

scripts/
  scrape.ts           # Main scraper pipeline
  scrapers/           # 44 individual scraper files (2 disabled)
  social/
    generate-posts.ts # Daily social post generation (GHA cron 07:00 UTC)
    image-gen.ts      # Satori carousel image generator (1080x1080)
    caption-gen.ts    # Bilingual caption templates with hashtags
  lib/
    utils.ts          # slugify, parseNorwegianDate, insertEvent, fetchHTML, bergenOffset, deleteEventByUrl
    categories.ts     # mapCategory (50+ terms), mapBydel (100+ mappings)
    dedup.ts          # Cross-source deduplication with scoring
    venues.ts         # 190+ venue entries, aggregator domain detection
    ai-descriptions.ts # Gemini integration, rate limiting, fallback
    supabase.ts       # Supabase client with service role key

static/
  fonts/              # Self-hosted woff2 (Inter 400/500/600, Barlow Condensed 500/700)
  llms.txt            # AI search optimization (llmstxt.org standard)
  robots.txt          # Allows all crawlers incl. GPTBot, ClaudeBot, PerplexityBot

docs/                 # Project documentation (this folder)
supabase/migrations/  # Database schema migrations
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
- Sold-out events → **deleted** from DB (not marked sold-out). `deleteEventByUrl()` in utils.ts.

---

## Scraper Pipeline (`scripts/scrape.ts`)

1. `removeExpiredEvents()` — deletes past events
2. `loadOptOuts()` — loads approved opt-out domains, deletes events from opted-out sources
3. Run all 44 scrapers — each checks `eventExists(source_url)` before inserting; sold-out events call `deleteEventByUrl()`
4. `deduplicate()` — removes cross-source duplicates by normalized title + same date
5. JSON summary — output to `SUMMARY_FILE` env var for GitHub Actions job summary

### Scraper rules
- **Rate limiting:** 1–1.5s delay between requests (Eventbrite: 3s)
- **User-Agent:** `Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`
- **robots.txt:** All scrapers verified compliant
- **No copying:** Generate descriptions via Gemini or `makeDescription()` — never copy source text (åndsverkloven)
- **No aggregator ticket URLs:** `ticket_url` points to actual venue/ticket pages
- **No kindergarten events:** Excluded via title keywords + detail page text

### 44 scrapers by category (42 active, 2 disabled)

**General aggregators (4 active):** visitbergen, bergenkommune, studentbergen, bergenlive
*(Disabled: kulturikveld — unreliable; barnasnorge — all venues covered by dedicated scrapers)*

**Ticket platforms (3):** eventbrite, ticketco (multiple venue subdomains incl. kvarteret), hoopla

**Performance venues (10):** dns, grieghallen, olebull, usfverftet, forumscene, cornerteateret, dvrtvest, bitteater, carteblanche, harmonien

**Arts/culture/literature (6):** kunsthall, kode, litthusbergen, mediacity, bek, bergenfilmklubb

**Libraries/museums/landmarks (5):** bergenbibliotek, bymuseet, floyen, akvariet, museumvest

**Food/nightlife/recreation (7):** bergenkjott, colonialen, raabrent, paintnsip, brettspill, bjorgvinblues, nordnessjobad

**Sports/outdoor (2):** brann, dnt

**Festivals (4):** festspillene, bergenfest, beyondthegates, vvv

**Other (3):** kulturhusetibergen, bergenchamber, oseana

---

## Collection Pages

8 curated landing pages under `/[lang]/[collection]/`, configured in `src/lib/collections.ts`:

| Slug | Lang | Filter |
|------|------|--------|
| `denne-helgen` | NO | Weekend events |
| `i-kveld` | NO | Tonight (evening/night) |
| `gratis` | NO | Free events this week |
| `today-in-bergen` | EN | All events today |
| `familiehelg` | NO | Family + weekend |
| `konserter` | NO | Music this week |
| `studentkveld` | NO | Student evening/night |
| `this-weekend` | EN | Weekend events |

All collection pages: server-side loaded, ISR cached, JSON-LD `CollectionPage` schema, custom OG images, in sitemap with hreflang.

---

## Social Post Pipeline (`scripts/social/`)

Runs daily via GitHub Actions cron at 07:00 UTC. For each scheduled collection:
1. Fetches events from Supabase, applies collection filter
2. Generates Satori carousel slides (1080x1080 PNG) + bilingual caption with hashtags
3. Uploads assets to Supabase Storage bucket `social-posts`
4. Upserts row in `social_posts` table
5. Admin reviews at `/admin/social`, posts manually to Instagram

**Hashtag strategy:** 10 base tags per collection + up to 2 dynamic category-specific tags (e.g. `#bergenkonsert` for music-heavy posts), capped at 15.

---

## Analytics & UTM

- **Plausible Cloud** analytics on gaari.no (no cookies, no consent banner needed)
- **`buildOutboundUrl()`** wraps all outbound links with UTM parameters:
  - `utm_source=gaari`, `utm_medium={context}`, `utm_campaign={venue_slug}`, `utm_content={event_slug}`
  - Contexts: `event_card`, `event_detail`, `collection`, `promoted` (Phase C)
- Monthly venue referral reports will be generated from Plausible outbound click data grouped by `utm_campaign`

---

## What's In Scope

### Current (live)
- Event listing with EventDiscovery progressive filter (When → Time → Who → What → Where & Price)
- Event detail pages with external ticket links
- Bilingual NO/EN interface with language toggle
- Automated scraping (44 sources, twice daily)
- AI-generated bilingual descriptions
- Event submission form (admin-reviewed)
- Data transparency page with opt-out form
- SEO: OG tags, per-event OG images, hreflang, dynamic sitemap, FAQPage JSON-LD
- AI search: `llms.txt`, explicit AI crawler allowance, rich Organization/WebSite schema
- Google Search Console verified, sitemap submitted
- 8 curated collection landing pages
- Social post automation pipeline (carousels + captions, admin review)
- Plausible analytics + UTM tracking on all outbound links
- WCAG 2.2 Level AA accessibility
- Vitest unit test suite (156 tests)

### Phase C — Promoted placement (coming weeks 11–16)
- `promoted_placements` + `placement_log` Supabase tables
- Rotation logic in collection pages (fair share distribution)
- "Fremhevet" badge on EventCard
- Monthly reporting for paying clients
- Sales outreach to Bergen venues (Grieghallen, USF Verftet, KODE, Bergen Kunsthall)

### Phase D — Future optimization
- Meta Graph API automation (replaces manual Instagram posting)
- Self-serve signup + Stripe billing
- Newsletter (weekly digest)
- Additional seasonal collection pages
- Visit Bergen data licensing

### Not planned
- Ticket sales (Gåri only links externally)
- Auto-playing video backgrounds
- Infinite scroll
- Chat widget / chatbot
- Push notification prompts

---

## Constraints

- **No dark mode** — all colors use CSS custom properties (dark mode can be enabled via `prefers-color-scheme` override, not yet implemented)
- **No infinite scroll** — Load More only
- **Mobile-first** — 65%+ expected mobile users
- **No headless browser scrapers** — Cheerio only
- **WCAG 2.2 Level AA** — legally required under European Accessibility Act
- **No copied descriptions** — åndsverkloven compliance
- **External tickets only** — never intermediate ticket sales
- **Server-side Supabase only** — `$lib/server/supabase.ts` enforced by SvelteKit; only `/submit` uses client-side Supabase (for image uploads)

---

## Deployment

- **Frontend:** Vercel (auto-deploy from `master` branch)
- **Database:** Supabase (hosted PostgreSQL)
- **Scraping:** GitHub Actions cron (`scrape.yml`) — 6 AM & 6 PM UTC, 15-minute timeout
- **Social posts:** GitHub Actions cron (`social.yml`) — 07:00 UTC daily
- **CI:** GitHub Actions (`ci.yml`) — lint, type-check, test, build on push/PR to master
- **Secrets:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`

---

## Working With This Codebase

- Frontend components are in `src/lib/components/` (20 Svelte files)
- Routes use SvelteKit's file-based routing under `src/routes/[lang]/`
- All main routes use `+page.server.ts` — data arrives pre-rendered, no client-side Supabase
- Scrapers are standalone TypeScript — run with `npx tsx scripts/scrape.ts` from `scripts/` directory
- Design tokens live in `src/app.css` (Funkis system)
- Types are centralized in `src/lib/types.ts`
- Scraper utilities in `scripts/lib/` — shared across all scrapers

---

## References

- `strategic-roadmap.md` — business phases (A/B/C/D), progress tracker, revenue targets
- `design-brief.md` — detailed frontend specs and component patterns
- `project-strategy.md` — product scope, audience, and launch plan
- `legal-research-norway.md` — full legal analysis of scraping practices
- `CLAUDE.md` — concise technical project context (root-level, always loaded by Claude Code)
- `DECISION-LOG.md` — rationale for all key decisions
- `DESIGN-SYSTEM.md` — color tokens, typography, component inventory
