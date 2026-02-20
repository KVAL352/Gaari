# Gåri — Project Context

## What is this?

A bilingual (NO/EN) event aggregator for Bergen, Norway. SvelteKit 2 + Svelte 5 frontend, Supabase PostgreSQL backend, Vercel hosting. Six automated scrapers collect events from local sources.

## Architecture

- **Frontend**: SvelteKit 2 with Svelte 5 runes (`$state`, `$derived`, `$effect`). Tailwind CSS 4. Language routing via `/[lang]/` (no, en).
- **Database**: Supabase with `events` table. Anon key for frontend reads, service role key for scraper writes.
- **Scrapers**: Standalone TypeScript in `scripts/`, separate `package.json`. Uses Cheerio for HTML parsing. Runs via GitHub Actions cron (twice daily).

## Key conventions

- **Norwegian first**: `title_no` and `description_no` are required. English fields are optional.
- **Categories**: music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours (defined in `src/lib/types.ts`)
- **Bydeler**: Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna
- **Slugs**: `slugify(title)-YYYY-MM-DD` format
- **Event status**: All scraped events are inserted as `approved`. User-submitted events start as `pending`.

## Scraper pipeline (`scripts/scrape.ts`)

1. `removeExpiredEvents()` — deletes past events
2. Run scrapers — each checks `eventExists(source_url)` before inserting
3. `deduplicate()` — removes cross-source duplicates by normalized title + same date

## Scraper sources

| Source | File | Method |
|--------|------|--------|
| Visit Bergen | `scrapers/visitbergen.ts` | HTML pagination, Cheerio |
| Kultur i Kveld | `scrapers/kulturikveld.ts` | Webflow CMS pagination |
| Bergen Kommune | `scrapers/bergenkommune.ts` | AJAX `GetFilteredEventList` + detail pages |
| BarnasNorge | `scrapers/barnasnorge.ts` | HTML + JSON-LD, follows `offers.url` to venue pages |
| StudentBergen | `scrapers/studentbergen.ts` | JSON API `/api/calendar.json` |
| Bergen Live | `scrapers/bergenlive.ts` | HTML scrape |

## Important rules

- **No traffic to aggregators**: ticket_url should point to actual venue/ticket pages, not visitbergen.com or barnasnorge.no
- **No kindergarten events**: Events for barnehager (kindergartens) are excluded — checked via title keywords AND detail page text
- **Rate limiting**: All scrapers use 1-1.5s delays between requests
- **Honest User-Agent**: `Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`
- **No dark mode**: Disabled because components use hardcoded `bg-white`. TODO: full dark mode implementation.

## Shared utilities (`scripts/lib/`)

- `utils.ts` — slugify, makeSlug, parseNorwegianDate, eventExists, insertEvent, findDuplicate, normalizeTitle, removeExpiredEvents, fetchHTML, delay
- `categories.ts` — mapCategory (source category → Gåri category), mapBydel (venue name → bydel)
- `dedup.ts` — deduplicate across sources with scoring (prefers events with images, real ticket links, longer descriptions)
- `supabase.ts` — Supabase client with service role key

## Frontend components (`src/lib/components/`)

- `EventCard.svelte` — Grid card with image, title, date, venue, category badge
- `EventGrid.svelte` — Date-grouped event grid
- `FilterBar.svelte` — Mobile filter row (category pills, dropdowns)
- `FilterSidebar.svelte` — Desktop sticky sidebar with category list + dropdowns
- `HeroSection.svelte` — Compact hero with tagline
- `Header.svelte` — Sticky header with language switch

## CSS theming (`src/app.css`)

Custom properties for colors: `--color-primary`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-bg-surface`, `--color-border`. WCAG AA compliant contrast ratios.
