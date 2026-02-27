# Gåri — Project Context

## What is this?

A bilingual (NO/EN) event aggregator for Bergen, Norway. SvelteKit 2 + Svelte 5 frontend, Supabase PostgreSQL backend, Vercel hosting. 46 scrapers (44 active) collect events from local sources, with AI-generated bilingual descriptions.

## Architecture

- **Frontend**: SvelteKit 2 with Svelte 5 runes (`$state`, `$derived`, `$effect`). Tailwind CSS 4. Language routing via `/[lang]/` (no, en).
- **Data loading**: Server-side via `+page.server.ts` — Supabase SDK runs only on the server for all main pages. Data arrives pre-rendered in HTML (no client-side fetch waterfall). Only `/submit` still uses client-side Supabase (for image uploads).
- **Supabase client**: `$lib/server/supabase.ts` (server-only, enforced by SvelteKit `$lib/server/` convention). `$lib/supabase.ts` exists only for the submit page's client-side usage.
- **Database**: Supabase with `events`, `opt_out_requests`, `edit_suggestions`, `promoted_placements`, `placement_log`, and `organizer_inquiries` tables. Anon key for reads, service role key for scraper writes.
- **Form actions**: Correction form (event detail) and opt-out form (datainnsamling) use SvelteKit form actions with `use:enhance` — no client-side Supabase needed.
- **Scrapers**: Standalone TypeScript in `scripts/`, separate `package.json`. Uses Cheerio for HTML parsing. Runs via GitHub Actions cron (twice daily at 6 AM & 6 PM UTC).
- **AI Descriptions**: Gemini 2.5 Flash generates bilingual summaries (<160 chars each) from event metadata. Fallback to template if API unavailable.
- **Collection pages**: Curated landing pages via `$lib/collections.ts` config + single dynamic `[lang]/[collection]/` route. 13 collections: `denne-helgen` (weekend), `i-kveld` (tonight), `gratis` (free this week), `today-in-bergen` (today, EN), `familiehelg` (family weekend), `konserter` (concerts this week), `studentkveld` (student nightlife), `this-weekend` (weekend, EN), `i-dag` (today, NO), `free-things-to-do-bergen` (free 2 weeks, EN), `regndagsguide` (indoor/rainy day, 2 weeks), `sentrum` (Bergen sentrum bydel, 2 weeks), `voksen` (culture/music/theatre/tours/food/workshop for adults, 2 weeks). Each has `filterEvents(events, now)` using existing event-filter helpers, bilingual title/description/ogSubtitle. `getCollection(slug)` returns config or undefined (404). `getAllCollectionSlugs()` for sitemap. Static routes (`about/`, `events/`, etc.) resolve before the `[collection]` param — no conflicts.
- **Social post pipeline**: `scripts/social/` generates Instagram carousel images (Satori/Resvg, 1080x1080 PNG) + captions for scheduled collections. GHA cron at 07:00 UTC daily. Admin review at `/admin/social`. Content generation only — no social accounts or API posting yet.
- **Newsletter**: Weekly "Hva skjer i Bergen" via MailerLite (EU-based, GDPR compliant). Subscribe form in footer + about page. Content from collection data engine. Promoted events (Standard/Partner/à la carte) labeled "Fremhevet".
- **B2B page**: `/[lang]/for-arrangorer/` marketing page for venues. **Currently under construction** — temporarily hidden from footer and sitemap. Voice: "Gåri/vi" (never "jeg/meg"), except "Hvem står bak" section which uses first person (Kjersti's personal story). 6-section structure: (1) Hero "Bergens Digitale Bytorg", (2) Hvordan: StreamingAnimation (venues→Gåri hub) + venue lookup with inline add-form, (3) Hvorfor: network effect text + AI pitch (54% SSB stat + animated chat phone mockup), (4) Hva får jeg: 4 feature cards + product/report mockups, (5) Hvem står bak: personal photo + bio, (6) Hva nå: transparency + early bird 3mo free + CTA form. 3 scroll-triggered animations (streaming, chat, sticky bar), all respect `prefers-reduced-motion`. Contact form inserts into `organizer_inquiries`. No pricing shown — drives inquiry. Copy uses "utvalgte" (not "kuraterte") for collection pages.

## Key conventions

- **Norwegian first**: `title_no` and `description_no` are required. English fields are optional.
- **Categories**: music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours (defined in `src/lib/types.ts`)
- **TimeOfDay**: morning, daytime, evening, night (defined in `src/lib/types.ts`, used by EventDiscovery time filter)
- **Bydeler**: Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna
- **Slugs**: `slugify(title)-YYYY-MM-DD` format. Both frontend and scraper `slugify` replace Norwegian chars (æ→ae, ø→o, å→a) before NFD normalization, so accented characters (é, ü, ñ) are also reduced to base letters.
- **Event status**: All scraped events are inserted as `approved`. User-submitted events start as `pending`.

## Scraper pipeline (`scripts/scrape.ts`)

1. `removeExpiredEvents()` — deletes past events
1b. `loadOptOuts()` — loads approved opt-out domains, deletes events from opted-out sources
2. Run scrapers — each checks `eventExists(source_url)` before inserting, generates AI descriptions via Gemini (13-min pipeline deadline skips remaining scrapers)
3. `deduplicate()` — removes cross-source duplicates by normalized title + same date, keeps highest-scored variant
4. JSON summary — outputs structured summary (scrapersRun, totalFound, totalInserted, failedScrapers, etc.), writes to `SUMMARY_FILE` env var for GitHub Actions
5. Health check — exits with code 1 if totalInserted=0 AND failedCount>5 (fails the GHA job)

## Scraper sources (46 total, 44 active, 2 disabled)

### General aggregators
| Source | File | Method |
|--------|------|--------|
| Visit Bergen | `visitbergen.ts` | HTML pagination, Cheerio |
| Bergen Kommune | `bergenkommune.ts` | AJAX `GetFilteredEventList` + detail pages. Uses billett detail URLs directly as ticket_url (not resolveTicketUrl). |
| StudentBergen | `studentbergen.ts` | JSON API `/api/calendar.json` |
| Bergen Live | `bergenlive.ts` | HTML scrape |

**Disabled scrapers:**
- ~~BarnasNorge~~ (`barnasnorge.ts`) — disabled Feb 25, 2026. All venues covered by dedicated scrapers. Issues: AI-generated stock images from Webflow CDN, address-based venue names, complex URL resolution.
- ~~Kulturikveld~~ — removed (unreliable, file deleted).

### Ticket platforms
| Source | File | Method |
|--------|------|--------|
| Eventbrite | `eventbrite.ts` | `__SERVER_DATA__` JSON extraction, pagination |
| TicketCo | `ticketco.ts` | Multi-venue subdomains (Hulen, Kvarteret, Madam Felle, Landmark, Statsraad Lehmkuhl, etc.) |
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
| Fyllingsdalen Teater | `fyllingsdalenteater.ts` | HTML (EasyTicket select dropdown) |

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
| Akvariet i Bergen | `akvariet.ts` | Daily activity calendar, 14-day lookahead, recurring filter |
| Bergen Bibliotek | `bergenbibliotek.ts` | HTML |
| Bymuseet i Bergen | `bymuseet.ts` | WordPress HTML, event sitemap |
| Museum Vest | `museumvest.ts` | Sitemap discovery + detail page scraping (3 Bergen museums) |
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
| Det Akademiske Kvarter | `kvarteret.ts` | JSON API (`/api/events`), also covered by TicketCo |
| Kulturhuset i Bergen | `kulturhusetibergen.ts` | Squarespace eventlist |
| Bergen Chamber | `bergenchamber.ts` | HTML |
| Oseana | `oseana.ts` | HTML |

## Important rules

- **No traffic to aggregators**: ticket_url should point to actual venue/ticket pages, not visitbergen.com or barnasnorge.no. Aggregator domains are blocked in `venues.ts`. Exception: bergenkommune scraper uses billett.bergen.kommune.no detail URLs directly (they ARE the specific event pages).
- **No copied descriptions (åndsverksloven)**: Event descriptions must ALWAYS be AI-generated originals (<160 chars) or template-generated. NEVER store raw text scraped from source pages — this violates Norwegian Copyright Act (åndsverksloven). All scrapers use `generateDescription()` from `ai-descriptions.ts`.
- **No non-public events**: Events for barnehager (kindergartens), SFO (after-school care), school visits, etc. are excluded — checked via title keywords AND detail page text. Keywords: `barnehage`, `barnehagebarn`, `sfo`, `skoleklasse`, `skolebesøk`, `klassebesøk`, `kun for`.
- **Rate limiting**: All scrapers use 1-1.5s delays between requests. Eventbrite uses 3s. AI descriptions use 200ms + backoff.
- **Honest User-Agent**: `Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`
- **No dark mode**: All colors use CSS custom properties (design tokens). Dark mode can be enabled by overriding tokens in a `prefers-color-scheme: dark` media query.

## Shared utilities (`scripts/lib/`)

- `utils.ts` — slugify, makeSlug, parseNorwegianDate, eventExists, insertEvent, findDuplicate, normalizeTitle, removeExpiredEvents, fetchHTML, delay, loadOptOuts, isOptedOut, detectFreeFromText, makeDescription, CATEGORY_LABELS_NO
- `categories.ts` — mapCategory (source category → Gåri category, 50+ terms), mapBydel (venue name → bydel, 100+ mappings)
- `dedup.ts` — deduplicate across sources with scoring (source rank + image + ticket URL + description length). Exports `titlesMatch`, `scoreEvent`, `EventRow` for unit testing.
- `venues.ts` — 190+ venue entries mapping names → websites, aggregator domain detection, resolveTicketUrl
- `ai-descriptions.ts` — Gemini 2.5 Flash integration, rate limiting, fallback to makeDescription template
- `supabase.ts` — Supabase client with service role key

## Opt-out system

- Supabase table: `opt_out_requests` (org, domain, email, reason, status, created_at)
- Form on `/datainnsamling` → SvelteKit form action (`?/optout`) with server-side Supabase insert, honeypot spam protection
- Workflow: venue submits → `status: 'pending'` → admin approves in Supabase dashboard → `'approved'`
- Scraper pipeline: `loadOptOuts()` caches approved domains, `insertEvent()` checks `isOptedOut(source_url)`, pipeline step 1b deletes existing events from opted-out domains

## EventDiscovery filter system (Feb 2026)

The homepage uses a progressive discovery filter (`EventDiscovery.svelte`) instead of traditional dropdowns. It guides users step by step: **When → Time of Day → Who → What → Where & Price**.

- **Step 1 (When?)** — Always visible. Pills: I dag, I morgen, Denne helgen, Denne uken, Velg dato (opens inline MiniCalendar)
- **Steps 2–5** — Slide in after a date is selected (progressive disclosure)
- **Step 2 (Time)** — Multi-select pills: Morgen (6–12), Dagtid (12–17), Kveld (17–22), Natt (22–6)
- **Step 3 (Who)** — Single-select pills: Alle, Familie & Barn, Studenter, 18+, Turister
- **Step 4 (What)** — Multi-select category pills (first 5 shown, expandable)
- **Step 5 (Where & Price)** — Bydel + price dropdowns, inline within the progressive flow (gated by date selection). No separate toggle.
- **FilterBar is hidden** from the homepage when EventDiscovery is active (a date is selected). EventDiscovery is the sole filter UI on the homepage.
- **URL is the single source of truth** — all filters read/write URL search params (`when`, `time`, `audience`, `category`, `bydel`, `price`). Shareable, back-button works.
- **Key components**: `FilterPill.svelte` (reusable pill button), `MiniCalendar.svelte` (inline date picker), `EventDiscovery.svelte` (main component)
- **18+ audience filter** excludes family events (not just explicitly tagged 18+ events)
- **Category filter** supports comma-separated multi-select (`?category=music,culture`)
- **Time-of-day filter uses Oslo timezone**: `matchesTimeOfDay()` in `$lib/event-filters.ts` converts UTC timestamps to Oslo local hours via `toLocaleString('sv-SE', { timeZone: 'Europe/Oslo' })` before comparing against time ranges. Handles CET/CEST automatically.
- **Event filter helpers**: Date/time filter functions (`getOsloNow`, `toOsloDateStr`, `isSameDay`, `getWeekendDates`, `matchesTimeOfDay`) are extracted to `src/lib/event-filters.ts` for testability.

## Price disclaimer policy

- Scraped prices may be inaccurate. All price displays use **soft language**: "Trolig gratis" / "Likely free" instead of asserting "Gratis" / "Free"
- **Disclaimer text** ("Sjekk alltid pris hos arrangør" / "Always verify price with organizer") appears on:
  - Every event card that has a known price (free or paid)
  - Event detail pages (price section)
  - The "Flere filtre" dropdown in EventDiscovery
- Events with unknown prices show "Se pris" / "See price" (no disclaimer needed — already implies checking)
- `isFreeEvent()` in `utils.ts` matches `0`, `'0'`, `'Free'`, `'Gratis'` (case-insensitive, trimmed) plus Norwegian zero-price formats (`0 kr`, `0,-`, `0,00`, `0 NOK`)
- `detectFreeFromText()` in `scripts/lib/utils.ts` infers free price from title/description keywords (`gratis`, `fri inngang`, `free entry`, `free admission`, etc.) — called automatically by `insertEvent()` when price is empty

## Frontend routes

- `/[lang]/` — Main event listing with EventDiscovery filter. **Server-side loaded** (`+page.server.ts`), ISR cached (`s-maxage=300, stale-while-revalidate=600`).
- `/[lang]/about/` — About page. **Prerendered** at build time (both `/no/about` and `/en/about`).
- `/[lang]/datainnsamling/` — Data transparency page (44 sources listed, opt-out form). Form action `?/optout` in `+page.server.ts`.
- `/[lang]/personvern/` — Privacy policy (GDPR). Bilingual inline, no server load, in sitemap.
- `/[lang]/tilgjengelighet/` — Accessibility statement (EAA/WCAG 2.2 AA). Bilingual inline, no server load, in sitemap.
- `/[lang]/submit/` — Event submission form (blocked from search engines). Only page that ships Supabase SDK to client (for image uploads).
- `/[lang]/events/[slug]/` — Event detail page with related events and OG image. **Server-side loaded**, correction form action `?/correction` in `+page.server.ts`.
- `/[lang]/[collection]/` — 13 curated collection landing pages. **Server-side loaded** with collection-specific filtering, ISR cached. Dynamic `[collection]` route — config in `$lib/collections.ts`, unknown slugs return 404. No EventDiscovery filter UI — clean hero + EventGrid + editorial copy + FAQ answer capsules (H2+p). JSON-LD `CollectionPage` + `ItemList` + `BreadcrumbList` + `FAQPage` schema, custom OG images. All 13 in sitemap (priority 0.8, daily). Promoted placement logic runs after filtering — bubbles paying venue's events to the top and returns `promotedEventIds` to the page.
- `/admin/social` — Social post review page (internal tool, noindex). Shows generated carousel slides + captions. Copy button for captions.
- `/admin/promotions` — Promoted placement management (internal tool, noindex). Table of all paying venues with monthly impression totals, active toggle, and add-placement form. Tiers: Basis 1 000/mo (15% slot), Standard 3 500/mo (25%), Partner 7 000/mo (35%).
- `/admin/login` — Password login page. Sets HMAC-signed HttpOnly cookie (`gaari_admin`). `secure: true` in production, `false` in dev.
- `/admin/logout` — Clears cookie, redirects to login.
- **All `/admin/*` routes are protected** by `src/routes/admin/+layout.server.ts` which validates the HMAC cookie. Login page is exempt. Auth helpers in `src/lib/server/admin-auth.ts`.
- `/api/health` — Health check endpoint (Supabase connection, event count, scrape freshness). Returns healthy/degraded/unhealthy, 5min cache, 503 on unhealthy.
- `/og/[slug].png` — Per-event OG image generation (Satori + ResvgJS)
- `/og/c/[collection].png` — Collection-branded OG images (Funkis design: red accent bar, 72px title, subtitle, Gåri branding). 24h cache.
- `/sitemap.xml` — Dynamic sitemap with hreflang (static pages + collection pages + all approved events, 1h cache)

## Frontend components (`src/lib/components/`)

- `Header.svelte` — Sticky header with language switch
- `Footer.svelte` — Footer with links (about, datainnsamling, personvern, tilgjengelighet, submit, contact). For-arrangorer link temporarily removed while page is under construction.
- `HeroSection.svelte` — Compact hero with tagline
- `EventCard.svelte` — Grid card with image, title, date, venue, category badge, price + disclaimer. Accepts `promoted` prop — renders "Fremhevet"/"Featured" badge (markedsføringsloven § 3).
- `EventGrid.svelte` — Date-grouped event grid layout (keyed `{#each}` by `event.id` for efficient DOM updates). Accepts `promotedEventIds` prop, passes `promoted` flag to each EventCard.
- `EventDiscovery.svelte` — Progressive 5-step filter (When/Time/Who/What/Where & Price) with inline calendar
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
- `StreamingAnimation.svelte` — 5-layer animation showing venue events streaming into Gåri hub. Layers: background grid ellipses, 12 venue pills (lg/md/sm sizes in ellipse layout), 12 color-matched flying particles (burst rhythm, 22s cycle), central Gåri hub with browser chrome + cycling event cards (Svelte transitions + flip animation). IntersectionObserver scroll-trigger with staggered startup (hub 0ms → pills 200-700ms → particles 1200ms → cards 2500ms). Full `prefers-reduced-motion` support. Used on `/for-arrangorer` page.

## CSS theming (`src/app.css`)

Funkis design system inspired by Sundt building (Bergen, 1938). Custom properties for colors: `--color-primary` (accent red #C82D2D), `--color-text-primary` (#141414, 7.88:1 contrast), `--color-text-secondary` (#4D4D4D, 6.96:1), `--color-text-muted` (#595959, 7.01:1), `--color-bg-surface`, `--color-border`. All pass WCAG AA at all text sizes. Status badge tokens: `--color-cancelled` (#4A4843, 6.35:1), `--color-lasttickets-bg` (#FAECD0) + `--color-lasttickets-text` (#7A4F00, 5.2:1 on bg). Category-specific placeholder colors. Typography: Barlow Condensed (display), Inter (body). **Fonts are self-hosted** as woff2 in `static/fonts/` with `@font-face` declarations in `app.css` (`font-display: swap`). Only weights actually used: Inter 400/500/600, Barlow Condensed 500/700. TTF files (`Inter-Regular.ttf`, `BarlowCondensed-Bold.ttf`) kept for Satori OG image generation.

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

## Performance (Core Web Vitals)

**Server-side data loading** (Feb 2026): All main pages use `+page.server.ts` — data arrives pre-rendered in HTML, eliminating the client-side waterfall (Load JS → Init Supabase → Fetch → Render). The Supabase JS SDK (`@supabase/supabase-js`) is NOT included in client bundles except for the `/submit` page.

- **Server-only Supabase**: `$lib/server/supabase.ts` — used by all `+page.server.ts` files, `+server.ts` endpoints (health, og, sitemap). SvelteKit enforces server-only import boundary.
- **Form actions**: Correction form and opt-out form use native `<form method="POST">` with `use:enhance` — no client-side SDK needed.
- **ISR caching**: Homepage sets `s-maxage=300, stale-while-revalidate=600` (5min fresh, 10min stale-while-revalidate). Vercel serves cached responses at CDN edge.
- **Prerendered pages**: `/[lang]/about/` built as static HTML at deploy time (zero server compute).
- **Keyed each blocks**: `EventGrid.svelte` uses `{#each ... (event.id)}` for efficient DOM reuse on filter changes.
- **Self-hosted fonts**: 5 woff2 files in `static/fonts/` (Inter 400/500/600, Barlow Condensed 500/700), `@font-face` in `app.css` with `font-display: swap`. Inter 400 and Barlow Condensed 700 preloaded in `app.html`. No external Google Fonts requests — CSP `font-src` and `style-src` only allow `'self'`.
- **Event limit**: Homepage query loads 500 events. Displays 12 per page with Load More.
- **Already optimized**: Image `aspect-[16/9]` + explicit dimensions (CLS prevention), eager/lazy loading split, `data-sveltekit-preload-data="hover"`, Tailwind CSS 4 auto-purge, lucide-svelte tree-shaking.
- **Lighthouse mobile** (Feb 23, 2026): Performance **95**, FCP **1.7s** (good), LCP **2.6s** (needs-improvement by 0.1s), TBT 10ms (good), CLS 0.003 (good), Speed Index 3.3s (good).

## SEO & web health

- **Favicon**: Red "G" (#C82D2D) in Barlow Condensed Bold. SVG primary (`favicon.svg`), 32x32 PNG fallback (`favicon.png`). PNG generated via `scripts/generate-favicon.ts` (Satori + resvg-js).
- Open Graph tags on all pages, per-event og:image generation. Default OG image uses left-aligned layout with 140px "Gåri" title and 48px tagline for chat thumbnail legibility.
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

- **Error logging**: `hooks.server.ts` exports `handleError` — structured JSON (type, timestamp, status, message, stack, url, method, userAgent) parsed by Vercel's log system. `hooks.client.ts` mirrors the format for browser DevTools. Rate limiting in `handle` hook uses try/catch around `getClientAddress()` to support prerendering.
- **Health endpoint**: `GET /api/health` — three checks: `supabase_connection`, `events_exist` (count > 0), `recent_scrape` (events created in last 24h). Monitorable by UptimeRobot or similar.
- **Scraper summary**: Pipeline outputs JSON summary to `SUMMARY_FILE` env var. GitHub Actions job summary step reads it with `jq` and writes a markdown table to `$GITHUB_STEP_SUMMARY`.

## Business model

Revenue from promoted placement subscriptions (Basis 1,000 / Standard 3,500 / Partner 7,000 NOK/month) and à la carte single-event promotions (500 NOK/event). Cross-subsidized: Grasrot tier always free. All promoted content labeled "Fremhevet" (markedsføringsloven § 3). See `strategic-roadmap.md` for full business plan.

## Database indexes

Key indexes on `events` table (managed via `supabase/migrations/`):
- `idx_events_slug` (UNIQUE), `idx_events_source_url` (UNIQUE)
- `idx_events_date_start`, `idx_events_status_date` (composite: status + date_start)
- `idx_events_approved_upcoming` (partial: date_start WHERE status = 'approved')
- `idx_events_category`, `idx_events_bydel`, `idx_events_created_at`

**Promoted placements** (`supabase/migrations/20260226180000_promoted_placements.sql`):
- `promoted_placements` — one row per paying venue+collection combo. Fields: `venue_name`, `collection_slugs TEXT[]`, `tier` (basis/standard/partner), `slot_share` (15/25/35), `active`, `start_date`, `end_date` (null = open-ended).
- `placement_log` — daily impression aggregates. UNIQUE on `(placement_id, collection_slug, log_date)`.
- `log_placement_impression()` SQL function — atomic upsert with `ON CONFLICT DO UPDATE impression_count + 1`.
- Server helpers in `src/lib/server/promotions.ts`: `getActivePromotions(slug)`, `pickDailyVenue(placements, slug, now)` (deterministic, same venue all day), `logImpression(id, slug, venue)` (fire-and-forget via RPC).
- Admin writes use `src/lib/server/supabase-admin.ts` (service role key) — anon key only has SELECT on `promoted_placements`.
- Collection page behaviour: 1 promoted event per page (rotates daily via `dayNumber % venueEvents.length`), venue's remaining events stay in normal chronological order.
- Per-venue cap: `MAX_PER_VENUE = 3` applied after promotion logic — prevents any venue flooding a collection.
- Owner IP filtering: `SKIP_LOG_IPS` env var (comma-separated) skips impression logging for owner's IP. Add to `.env` and Vercel env vars.
- Monthly report CLI: `npx tsx scripts/generate-placement-report.ts [YYYY-MM]`.

## Testing

**Vitest** unit test suite (198 tests, runs in <350ms). `npm test` to run, `npm run test:watch` for watch mode. CI runs tests after type check.

**Test files:**
- `src/lib/__tests__/event-filters.test.ts` — 28 tests: `matchesTimeOfDay` (all 4 ranges, DST/CET/CEST, invalid date), `getWeekendDates` (Mon returns Fri–Sun, Fri/Sat/Sun behaviour), `isSameDay`, `toOsloDateStr` (date boundary)
- `src/lib/__tests__/utils.test.ts` — 31 tests: `isFreeEvent` (all truthy/falsy cases, case-insensitive, Norwegian zero-price formats, whitespace trimming), `formatPrice` (both locales, numeric, string, null, zero-price format propagation), `slugify` (Norwegian chars, accented chars like café/über/niño, special chars, edge cases)
- `src/lib/__tests__/seo.test.ts` — 44 tests: `safeJsonLd` (XSS `<script>` escaping), `generateEventJsonLd` (free/paid price, cancelled status, language fallback), `toBergenIso` (UTC→CEST/CET, DST boundaries, passthrough, invalid), `generateBreadcrumbJsonLd` (last item no URL, 1-indexed positions), `generateCollectionJsonLd` (ItemList, positions, lang prefix, 50-item cap), `computeCanonical` (all 7 rules, EN/NO variants, noindex threshold, noise params)
- `src/lib/__tests__/collections.test.ts` — 35 tests: `getCollection` (valid/invalid slug, all slugs, bilingual metadata), weekend filter (Fri–Sun for Mon–Fri, Wed→Fri–Sun, empty), tonight filter (evening/night today only), free filter (this week, various price formats), today filter (same day only, empty)
- `scripts/lib/__tests__/utils.test.ts` — 43 tests: `parseNorwegianDate` (all 6 formats + null), `bergenOffset` (CET/CEST + DST transitions), `normalizeTitle`, `slugify` (NFD, 80 char limit), `stripHtml`, `makeDescription`/`makeDescriptionEn`, `detectFreeFromText` (Norwegian/English keywords, case-insensitive, partial-word rejection), `isOptedOut`
- `scripts/lib/__tests__/dedup.test.ts` — 17 tests: `titlesMatch` (exact, containment with 0.6 ratio guard, 90% prefix with 1.3 ratio, short titles, real-world normalized), `scoreEvent` (source rank, image/ticket/description bonuses, aggregator URL exclusion)

**Config:** Vitest reads from `vite.config.ts` (`test.include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']`). Scraper tests mock `supabase.js` and `venues.js` via `vi.mock()`.

## GitHub Actions

- **CI** (`ci.yml`): lint, type-check, test, build on push/PR to master. Supabase env vars passed to type check step for `$env/static/public` resolution.
- **Scrape** (`scrape.yml`): cron 6 AM & 6 PM UTC, 15min job timeout, npm cache, 2min install timeout, `SUMMARY_FILE` env var, job summary step with health status (healthy/partial/critical). Secrets: SUPABASE keys + GEMINI_API_KEY.
