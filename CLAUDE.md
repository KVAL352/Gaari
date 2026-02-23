# Gåri — Project Context

## What is this?

A bilingual (NO/EN) event aggregator for Bergen, Norway. SvelteKit 2 + Svelte 5 frontend, Supabase PostgreSQL backend, Vercel hosting. 44 automated scrapers collect events from local sources, with AI-generated bilingual descriptions.

## Architecture

- **Frontend**: SvelteKit 2 with Svelte 5 runes (`$state`, `$derived`, `$effect`). Tailwind CSS 4. Language routing via `/[lang]/` (no, en).
- **Database**: Supabase with `events` and `opt_out_requests` tables. Anon key for frontend reads, service role key for scraper writes.
- **Scrapers**: Standalone TypeScript in `scripts/`, separate `package.json`. Uses Cheerio for HTML parsing. Runs via GitHub Actions cron (twice daily at 6 AM & 6 PM UTC).
- **AI Descriptions**: Gemini 2.5 Flash generates bilingual summaries (<160 chars each) from event metadata. Fallback to template if API unavailable.

## Key conventions

- **Norwegian first**: `title_no` and `description_no` are required. English fields are optional.
- **Categories**: music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours (defined in `src/lib/types.ts`)
- **Bydeler**: Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna
- **Slugs**: `slugify(title)-YYYY-MM-DD` format
- **Event status**: All scraped events are inserted as `approved`. User-submitted events start as `pending`.

## Scraper pipeline (`scripts/scrape.ts`)

1. `removeExpiredEvents()` — deletes past events
1b. `loadOptOuts()` — loads approved opt-out domains, deletes events from opted-out sources
2. Run scrapers — each checks `eventExists(source_url)` before inserting, generates AI descriptions via Gemini
3. `deduplicate()` — removes cross-source duplicates by normalized title + same date, keeps highest-scored variant

## Scraper sources (44 total)

### General aggregators
| Source | File | Method |
|--------|------|--------|
| Visit Bergen | `visitbergen.ts` | HTML pagination, Cheerio |
| Kultur i Kveld | `kulturikveld.ts` | Webflow CMS pagination |
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
- **No kindergarten events**: Events for barnehager (kindergartens) are excluded — checked via title keywords AND detail page text.
- **Rate limiting**: All scrapers use 1-1.5s delays between requests. Eventbrite uses 3s. AI descriptions use 200ms + backoff.
- **Honest User-Agent**: `Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`
- **No dark mode**: Disabled because components use hardcoded `bg-white`. TODO: full dark mode implementation.

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

## Frontend routes

- `/[lang]/` — Main event listing with filters (category, bydel, price, audience, search, date)
- `/[lang]/about/` — About page
- `/[lang]/datainnsamling/` — Data transparency page (44 sources listed, opt-out form)
- `/[lang]/submit/` — Event submission form (blocked from search engines)
- `/[lang]/events/[slug]/` — Event detail page with related events and OG image
- `/og/[slug].png` — Per-event OG image generation (Satori + ResvgJS)
- `/sitemap.xml` — Dynamic sitemap with hreflang (static pages + all approved events, 1h cache)

## Frontend components (`src/lib/components/`)

- `Header.svelte` — Sticky header with language switch
- `Footer.svelte` — Footer with links (about, datainnsamling, contact)
- `HeroSection.svelte` — Compact hero with tagline
- `EventCard.svelte` — Grid card with image, title, date, venue, category badge, price
- `EventListItem.svelte` — List row variant
- `EventGrid.svelte` — Date-grouped event grid layout
- `FilterBar.svelte` — Mobile filter row (category pills, dropdowns)
- `FilterSidebar.svelte` — Desktop sticky sidebar (categories, bydel, price, audience)
- `SearchBar.svelte` — Event title/venue search input
- `CalendarDropdown.svelte` — Date range filter
- `DateQuickFilters.svelte` — Buttons: Today, This Weekend, Next 7 Days
- `StatusBadge.svelte` — Display badges: Today, Free, Sold Out, Last Tickets, Cancelled
- `LoadMore.svelte` — "Load more events" button
- `EmptyState.svelte` — "No events found" message
- `BackToTop.svelte` — Sticky button to scroll to top
- `LanguageSwitch.svelte` — NO/EN toggle
- `ImagePlaceholder.svelte` — Fallback image with category color

## CSS theming (`src/app.css`)

Funkis design system inspired by Sundt building (Bergen, 1938). Custom properties for colors: `--color-primary` (accent red #C82D2D), `--color-text-primary` (#141414, 7.88:1 contrast), `--color-text-secondary`, `--color-text-muted`, `--color-bg-surface`, `--color-border`. WCAG AA compliant. Category-specific placeholder colors. Typography: Barlow Condensed (display), Inter (body).

## SEO & web health

- Open Graph tags on all pages, per-event og:image generation
- hreflang nb/en/x-default on all pages
- Meta descriptions on all pages (<160 chars)
- robots.txt blocks /submit pages
- Dynamic sitemap with hreflang and priority weighting

## GitHub Actions

- **CI** (`ci.yml`): lint, type-check, build on push/PR to master
- **Scrape** (`scrape.yml`): cron 6 AM & 6 PM UTC, 15min timeout, secrets: SUPABASE keys + GEMINI_API_KEY
