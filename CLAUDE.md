# Gåri — Project Context

## What is this?

A bilingual (NO/EN) event aggregator for Bergen, Norway. SvelteKit 2 + Svelte 5 frontend, Supabase PostgreSQL backend, Vercel hosting. 43 automated scrapers collect events from local sources, with AI-generated bilingual descriptions.

## Architecture

- **Frontend**: SvelteKit 2 with Svelte 5 runes (`$state`, `$derived`, `$effect`). Tailwind CSS 4. Language routing via `/[lang]/` (no, en).
- **Database**: Supabase with `events` and `opt_out_requests` tables. Anon key for frontend reads, service role key for scraper writes.
- **Scrapers**: Standalone TypeScript in `scripts/`, separate `package.json`. Uses Cheerio for HTML parsing. Runs via GitHub Actions cron (twice daily at 6 AM & 6 PM UTC).
- **AI Descriptions**: Gemini 2.5 Flash generates bilingual summaries (<160 chars each) from event metadata. Fallback to template if API unavailable.

## Key conventions

- **Norwegian first**: `title_no` and `description_no` are required. English fields are optional.
- **Categories**: music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours (defined in `src/lib/types.ts`)
- **TimeOfDay**: morning, daytime, evening, night (defined in `src/lib/types.ts`, used by EventDiscovery time filter)
- **Bydeler**: Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna
- **Slugs**: `slugify(title)-YYYY-MM-DD` format
- **Event status**: All scraped events are inserted as `approved`. User-submitted events start as `pending`.

## Scraper pipeline (`scripts/scrape.ts`)

1. `removeExpiredEvents()` — deletes past events
1b. `loadOptOuts()` — loads approved opt-out domains, deletes events from opted-out sources
2. Run scrapers — each checks `eventExists(source_url)` before inserting, generates AI descriptions via Gemini (13-min pipeline deadline skips remaining scrapers)
3. `deduplicate()` — removes cross-source duplicates by normalized title + same date, keeps highest-scored variant
4. JSON summary — outputs structured summary (scrapersRun, totalFound, totalInserted, failedScrapers, etc.), writes to `SUMMARY_FILE` env var for GitHub Actions
5. Health check — exits with code 1 if totalInserted=0 AND failedCount>5 (fails the GHA job)

## Scraper sources (43 total)

### General aggregators
| Source | File | Method |
|--------|------|--------|
| Visit Bergen | `visitbergen.ts` | HTML pagination, Cheerio |
| Bergen Kommune | `bergenkommune.ts` | AJAX `GetFilteredEventList` + detail pages |
| BarnasNorge | `barnasnorge.ts` | HTML + JSON-LD, follows `offers.url` |
| StudentBergen | `studentbergen.ts` | JSON API `/api/calendar.json` |
| Bergen Live | `bergenlive.ts` | HTML scrape |

### Ticket platforms
| Source | File | Method |
|--------|------|--------|
| Eventbrite | `eventbrite.ts` | `__SERVER_DATA__` JSON extraction, pagination |
| TicketCo | `ticketco.ts` | Multi-venue subdomains (Hulen, Kvarteret, Madam Felle, etc.) |
| Hoopla | `hoopla.ts` | Hoopla events platform |

### Performance venues
| Source | File | Method |
|--------|------|--------|
| Den Nationale Scene | `dns.ts` | HTML |
| Grieghallen | `grieghallen.ts` | HTML/JSON |
| Ole Bull Huset | `olebull.ts` | HTML |
| USF Verftet | `usfverftet.ts` | HTML |
| Forum Scene | `forumscene.ts` | HTML |
| Cornerteateret | `cornerteateret.ts` | HTML |
| Det Vestnorske Teateret | `dvrtvest.ts` | HTML |
| BIT Teatergarasjen | `bitteater.ts` | HTML |
| Carte Blanche | `carteblanche.ts` | HTML |
| Bergen Filharmoniske | `harmonien.ts` | HTML |

### Arts, culture & literature
| Source | File | Method |
|--------|------|--------|
| Bergen Kunsthall | `kunsthall.ts` | HTML |
| KODE | `kode.ts` | HTML |
| Litteraturhuset | `litthusbergen.ts` | HTML |
| Media City Bergen | `mediacity.ts` | HTML |
| BEK | `bek.ts` | WordPress REST API (`/wp-json/`) |
| Bergen Filmklubb | `bergenfilmklubb.ts` | HTML |

### Libraries, museums & landmarks
| Source | File | Method |
|--------|------|--------|
| Bergen Bibliotek | `bergenbibliotek.ts` | HTML |
| Bymuseet i Bergen | `bymuseet.ts` | WordPress HTML, event sitemap |
| Fløyen | `floyen.ts` | HTML |

### Food, nightlife & recreation
| Source | File | Method |
|--------|------|--------|
| Bergen Kjøtt | `bergenkjott.ts` | HTML |
| Colonialen | `colonialen.ts` | HTML |
| Råbrent | `raabrent.ts` | HTML |
| Paint'n Sip | `paintnsip.ts` | HTML |
| Brettspill-cafe | `brettspill.ts` | HTML |
| Bjørgvin Blues Club | `bjorgvinblues.ts` | HTML |
| Nordnes Sjøbad | `nordnessjobad.ts` | HTML |

### Sports & outdoor
| Source | File | Method |
|--------|------|--------|
| SK Brann | `brann.ts` | HTML table (match schedule) |
| DNT Bergen | `dnt.ts` | HTML (guided tours) |

### Festivals
| Source | File | Method |
|--------|------|--------|
| Festspillene | `festspillene.ts` | HTML |
| Bergenfest | `bergenfest.ts` | HTML |
| Beyond the Gates | `beyondthegates.ts` | Squarespace menu blocks |
| VVV (climate festival) | `vvv.ts` | Squarespace carousel |

### Other
| Source | File | Method |
|--------|------|--------|
| Kulturhuset i Bergen | `kulturhusetibergen.ts` | Squarespace eventlist |
| Bergen Chamber | `bergenchamber.ts` | HTML |
| Oseana | `oseana.ts` | HTML |

## Important rules

- **No traffic to aggregators**: ticket_url should point to actual venue/ticket pages, not visitbergen.com or barnasnorge.no. Aggregator domains are blocked in `venues.ts`.
- **No non-public events**: Events for barnehager (kindergartens), SFO (after-school care), school visits, etc. are excluded — checked via title keywords AND detail page text. Keywords: `barnehage`, `barnehagebarn`, `sfo`, `skoleklasse`, `skolebesøk`, `klassebesøk`, `kun for`.
- **Rate limiting**: All scrapers use 1-1.5s delays between requests. Eventbrite uses 3s. AI descriptions use 200ms + backoff.
- **Honest User-Agent**: `Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`
- **No dark mode**: All colors use CSS custom properties (design tokens). Dark mode can be enabled by overriding tokens in a `prefers-color-scheme: dark` media query.

## Shared utilities (`scripts/lib/`)

- `utils.ts` — slugify, makeSlug, parseNorwegianDate, eventExists, insertEvent, findDuplicate, normalizeTitle, removeExpiredEvents, fetchHTML, delay, loadOptOuts, isOptedOut, makeDescription, CATEGORY_LABELS_NO
- `categories.ts` — mapCategory (source category → Gåri category, 50+ terms), mapBydel (venue name → bydel, 100+ mappings)
- `dedup.ts` — deduplicate across sources with scoring (source rank + image + ticket URL + description length)
- `venues.ts` — 190+ venue entries mapping names → websites, aggregator domain detection, resolveTicketUrl
- `ai-descriptions.ts` — Gemini 2.5 Flash integration, rate limiting, fallback to makeDescription template
- `supabase.ts` — Supabase client with service role key

## Opt-out system

- Supabase table: `opt_out_requests` (org, domain, email, reason, status, created_at)
- Form on `/datainnsamling` → client-side Supabase insert (anon key)
- Workflow: venue submits → `status: 'pending'` → admin approves in Supabase dashboard → `'approved'`
- Scraper pipeline: `loadOptOuts()` caches approved domains, `insertEvent()` checks `isOptedOut(source_url)`, pipeline step 1b deletes existing events from opted-out domains

## EventDiscovery filter system (Feb 2026)

The homepage uses a progressive discovery filter (`EventDiscovery.svelte`) instead of traditional dropdowns. It guides users step by step: **When → Time of Day → Who → What**.

- **Step 1 (When?)** — Always visible. Pills: I dag, I morgen, Denne helgen, Denne uken, Velg dato (opens inline MiniCalendar)
- **Steps 2–4** — Slide in after a date is selected (progressive disclosure)
- **Step 2 (Time)** — Multi-select pills: Morgen (6–12), Dagtid (12–17), Kveld (17–22), Natt (22–6)
- **Step 3 (Who)** — Single-select pills: Alle, Familie & Barn, Studenter, 18+, Turister
- **Step 4 (What)** — Multi-select category pills (first 5 shown, expandable)
- **Flere filtre** — Expandable toggle for bydel + price dropdowns
- **FilterBar is hidden** from the homepage when EventDiscovery is active (a date is selected). EventDiscovery is the sole filter UI on the homepage.
- **URL is the single source of truth** — all filters read/write URL search params (`when`, `time`, `audience`, `category`, `bydel`, `price`). Shareable, back-button works.
- **Key components**: `FilterPill.svelte` (reusable pill button), `MiniCalendar.svelte` (inline date picker), `EventDiscovery.svelte` (main component)
- **18+ audience filter** excludes family events (not just explicitly tagged 18+ events)
- **Category filter** supports comma-separated multi-select (`?category=music,culture`)

## Price disclaimer policy

- Scraped prices may be inaccurate. All price displays use **soft language**: "Trolig gratis" / "Likely free" instead of asserting "Gratis" / "Free"
- **Disclaimer text** ("Sjekk alltid pris hos arrangør" / "Always verify price with organizer") appears on:
  - Every event card that has a known price (free or paid)
  - Event detail pages (price section)
  - The "Flere filtre" dropdown in EventDiscovery
- Events with unknown prices show "Se pris" / "See price" (no disclaimer needed — already implies checking)
- `isFreeEvent()` in `utils.ts` only matches `0`, `'0'`, `'Free'`, `'Gratis'` — strict to avoid false positives

## Frontend routes

- `/[lang]/` — Main event listing with EventDiscovery filter (When/Time/Who/What pills + bydel/price)
- `/[lang]/about/` — About page
- `/[lang]/datainnsamling/` — Data transparency page (43 sources listed, opt-out form)
- `/[lang]/submit/` — Event submission form (blocked from search engines)
- `/[lang]/events/[slug]/` — Event detail page with related events and OG image
- `/api/health` — Health check endpoint (Supabase connection, event count, scrape freshness). Returns healthy/degraded/unhealthy, 5min cache, 503 on unhealthy.
- `/og/[slug].png` — Per-event OG image generation (Satori + ResvgJS)
- `/sitemap.xml` — Dynamic sitemap with hreflang (static pages + all approved events, 1h cache)

## Frontend components (`src/lib/components/`)

- `Header.svelte` — Sticky header with language switch
- `Footer.svelte` — Footer with links (about, datainnsamling, contact)
- `HeroSection.svelte` — Compact hero with tagline
- `EventCard.svelte` — Grid card with image, title, date, venue, category badge, price + disclaimer
- `EventGrid.svelte` — Date-grouped event grid layout
- `EventDiscovery.svelte` — Progressive 4-step filter (When/Time/Who/What) with inline calendar + bydel/price
- `FilterPill.svelte` — Reusable pill/chip button (aria-pressed, 44px touch targets, Funkis styling)
- `MiniCalendar.svelte` — Inline month-grid date picker (single date + range selection, bilingual). Proper ARIA grid structure: `role="grid"` > `role="row"` > `role="gridcell"` with chunked weeks.
- `FilterBar.svelte` — Dropdown filter row (hidden on homepage when EventDiscovery is active, has `hideFields` prop)
- `CalendarDropdown.svelte` — "Add to Calendar" dropdown (event detail pages, NOT a date picker). Full WAI-ARIA menu keyboard nav (ArrowUp/Down, Home/End, Escape, Tab), focus management on open/close.
- `StatusBadge.svelte` — Display badges: Today, Trolig gratis, Sold Out, Last Tickets, Cancelled
- `LoadMore.svelte` — "Load more events" button
- `EmptyState.svelte` — "No events found" message
- `BackToTop.svelte` — Sticky button to scroll to top
- `LanguageSwitch.svelte` — NO/EN toggle
- `ImagePlaceholder.svelte` — Fallback image with category color

## CSS theming (`src/app.css`)

Funkis design system inspired by Sundt building (Bergen, 1938). Custom properties for colors: `--color-primary` (accent red #C82D2D), `--color-text-primary` (#141414, 7.88:1 contrast), `--color-text-secondary` (#4D4D4D, 6.96:1), `--color-text-muted` (#595959, 7.01:1), `--color-bg-surface`, `--color-border`. All pass WCAG AA at all text sizes. Status badge tokens: `--color-cancelled` (#4A4843, 6.35:1), `--color-lasttickets-bg` (#FAECD0) + `--color-lasttickets-text` (#7A4F00, 5.2:1 on bg). Category-specific placeholder colors. Typography: Barlow Condensed (display), Inter (body).

## Accessibility (WCAG 2.2 Level AA)

EAA (European Accessibility Act) applies to Norway via EEA. The site meets WCAG 2.2 Level AA.

**Already built in:**
- Skip link (`.skip-link` → `#events`), `:focus-visible` 2px outline on all interactive elements
- Dynamic `lang` attribute on `<html>`, `prefers-reduced-motion` media query
- `.sr-only` class, `aria-pressed` on FilterPill, `datetime` on `<time>` elements
- Semantic `<header>`/`<nav>`/`<main>` landmarks

**Contrast:** All text tokens pass 4.5:1 minimum — `--color-text-muted` #595959 (7.01:1), `--color-text-secondary` #4D4D4D (6.96:1). Status badges: cancelled #4A4843 (6.35:1 on white), lasttickets #7A4F00 on #FAECD0 (5.2:1).

**Keyboard navigation:** CalendarDropdown implements full WAI-ARIA menu pattern (ArrowUp/Down, Home/End, Escape returns focus to trigger, Tab closes menu). FilterPill groups support ArrowLeft/Right.

**ARIA structure:** MiniCalendar uses `role="group"` wrapper with `role="grid"` > `role="row"` > `role="gridcell"`. Month label has `aria-live="polite"`. Error page uses `<main>` landmark. Homepage results wrapper has `aria-live="polite" aria-atomic="true"`.

**Forms:** All required fields have `aria-required="true"` (8 on submit, 3 on opt-out). Disabled buttons use `opacity-70` (not 0.5). Error messages use `role="alert"`.

**Links:** Footer and inline text links always show `underline` (not just on hover) per WCAG 1.4.1.

**Touch targets:** FilterPill and nav buttons `min-height: 44px`. Filter selects `min-height: 44px` (WCAG 2.5.8).

## SEO & web health

- Open Graph tags on all pages, per-event og:image generation
- hreflang nb/en/x-default on all pages
- Meta descriptions on all pages (<160 chars)
- robots.txt blocks /submit pages
- Dynamic sitemap with hreflang and priority weighting

## Hosting & Domains

- **Hosting:** Vercel (SvelteKit adapter)
- **Domains (Domeneshop → Vercel):**
  - `gaari.no` + `www.gaari.no` — A record → `76.76.21.21`, CNAME www → `cname.vercel-dns.com`
  - `gåri.no` (`xn--gri-ula.no` punycode) + `www.gåri.no` — same DNS config
  - SSL provisioned automatically by Vercel (Let's Encrypt)

## Observability

- **Error logging**: `hooks.server.ts` exports `handleError` — structured JSON (type, timestamp, status, message, stack, url, method, userAgent) parsed by Vercel's log system. `hooks.client.ts` mirrors the format for browser DevTools.
- **Health endpoint**: `GET /api/health` — three checks: `supabase_connection`, `events_exist` (count > 0), `recent_scrape` (events created in last 24h). Monitorable by UptimeRobot or similar.
- **Scraper summary**: Pipeline outputs JSON summary to `SUMMARY_FILE` env var. GitHub Actions job summary step reads it with `jq` and writes a markdown table to `$GITHUB_STEP_SUMMARY`.

## Database indexes

Key indexes on `events` table (managed via `supabase/migrations/`):
- `idx_events_slug` (UNIQUE), `idx_events_source_url` (UNIQUE)
- `idx_events_date_start`, `idx_events_status_date` (composite: status + date_start)
- `idx_events_approved_upcoming` (partial: date_start WHERE status = 'approved')
- `idx_events_category`, `idx_events_bydel`, `idx_events_created_at`

## GitHub Actions

- **CI** (`ci.yml`): lint, type-check, build on push/PR to master. Supabase env vars passed to type check step for `$env/static/public` resolution.
- **Scrape** (`scrape.yml`): cron 6 AM & 6 PM UTC, 15min job timeout, npm cache, 2min install timeout, `SUMMARY_FILE` env var, job summary step with health status (healthy/partial/critical). Secrets: SUPABASE keys + GEMINI_API_KEY.
