# Gåri — Project Context

## What is this?

A bilingual (NO/EN) event aggregator for Bergen, Norway. SvelteKit 2 + Svelte 5 frontend, Supabase PostgreSQL backend, Vercel hosting. Scrapers collect events from local sources (see `scripts/scrape.ts` for current list), with AI-generated bilingual descriptions.

## Architecture

- **Frontend**: SvelteKit 2 with Svelte 5 runes (`$state`, `$derived`, `$effect`). Tailwind CSS 4. Language routing via `/[lang]/` (no, en).
- **Data loading**: Server-side via `+page.server.ts`. `$lib/server/supabase.ts` (server-only). Only `/submit` uses client-side Supabase.
- **Database**: Supabase with `events`, `opt_out_requests`, `edit_suggestions`, `promoted_placements`, `placement_log`, `organizer_inquiries`, `scraper_runs` tables.
- **Scrapers**: Standalone TypeScript in `scripts/`, separate `package.json`. Cheerio + GitHub Actions cron (daily 6 AM UTC).
- **AI Descriptions**: Gemini 2.5 Flash generates bilingual summaries (<160 chars) + `title_en`. Fallback to template.
- **Collection pages**: 53 curated landing pages via `$lib/collections.ts`. See `.claude/docs/collections.md`.
- **Social pipeline**: Instagram/Facebook carousel + stories. See `.claude/docs/social.md`.
- **Newsletter**: Weekly via MailerLite. Personalized per subscriber preferences.
- **B2B**: `/[lang]/for-arrangorer/` — venue marketing page with Stripe payment links.

## Key conventions

- **Norwegian first**: `title_no` and `description_no` required. English optional.
- **Categories**: music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours
- **Bydeler**: Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna
- **Slugs**: `slugify(title)-YYYY-MM-DD` format. Norwegian chars: æ→ae, ø→o, å→a.
- **Event status**: Scraped = `approved`. User-submitted = `pending`.

## Important rules

- **No traffic to aggregators**: ticket_url must point to actual venue/ticket pages.
- **No copied descriptions (åndsverksloven)**: Always AI-generated or template. Never raw scraped text.
- **No non-public events**: Exclude barnehage, SFO, school visits, members-only.
- **Rate limiting**: 1-1.5s delays between requests. AI descriptions: 200ms + backoff.
- **Honest User-Agent**: `Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`
- **Price disclaimer**: Always "Trolig gratis" / "Likely free", never assert "Gratis".

## Scraper pipeline (`scripts/scrape.ts`)

1. `removeExpiredEvents()` — deletes past events
1a. `refreshStaleMultiDateEvents()` — refreshes discrete-date scrapers (olebull, dns, grieghallen, carteblanche, oseana, harmonien) where `date_start` passed but `date_end` future
1b. `loadOptOuts()` — removes events from opted-out domains
2. Run scrapers (22-min deadline, `eventExists()` check, `generateDescription()`)
3. `deduplicate()` — normalized title + same date, keeps highest-scored
4. Log to `scraper_runs` + JSON summary + health check

## Shared utilities (`scripts/lib/`)

- `utils.ts` — slugify, parseNorwegianDate, eventExists, insertEvent, normalizeTitle, removeExpiredEvents, fetchHTML, detectFreeFromText
- `categories.ts` — mapCategory (50+ terms), mapBydel (100+ mappings), isFamilyTitle (safe family detection)
- `dedup.ts` — cross-source dedup with scoring. `SOURCE_RANK` must include ALL scrapers.
- `venues.ts` — 190+ venue entries, aggregator domain detection, resolveTicketUrl
- `ai-descriptions.ts` — Gemini integration, rate limiting, fallback
- `scraper-health.ts` — Anomaly detection (broken/warning/dormant/healthy)

## Detailed docs (read on-demand)

- `.claude/docs/scrapers.md` — Scraper sources with files and methods
- `.claude/docs/routes.md` — All frontend routes, API endpoints, admin pages
- `.claude/docs/collections.md` — 52 collection pages (evergreen, bydel, seasonal, festival)
- `.claude/docs/social.md` — Social post pipeline, accounts, rate limits, slide design
- `.claude/docs/components.md` — Frontend components, CSS theming, EventDiscovery, accessibility
- `.claude/docs/testing.md` — Vitest test suite (run `npx vitest run` for current count)
- `.claude/docs/gha.md` — GitHub Actions workflows (CI, scrape, newsletter, digest, social, audit)

## Hosting & domains

- **Vercel** (SvelteKit adapter). ISR caching on homepage + collections.
- `gaari.no` + `gåri.no` (IDN redirect via `hooks.server.ts`)
- Umami Cloud analytics (proxied via `/u/`). Favicon: red "G" SVG.

## Observability

- `hooks.server.ts` structured error logging → Vercel logs
- `/api/health` — 6 checks (supabase, events, scrape freshness, visibility, pipeline, data quality)
- `scraper_runs` table + `scraper-health.ts` classification → daily digest
- UptimeRobot polls `/api/health` every 5 min

## Business model

Promoted placement subscriptions: Basis 1,500 / Standard 3,500 / Partner 9,000 NOK/month. À la carte: 750 NOK/event. All labeled "Fremhevet" (markedsføringsloven § 3). Prospect reports via `scripts/generate-prospect-report.ts`.
