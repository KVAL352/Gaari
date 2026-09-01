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
- **Bydeler**: Sentrum, Bergenhus, Årstad, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna
- **Slugs**: `slugify(title)-YYYY-MM-DD` format. Norwegian chars: æ→ae, ø→o, å→a.
- **Event status**: Scraped = `approved`. User-submitted = `pending`.

## Important rules

- **New scraper? Follow the checklist**: `docs/new-scraper-checklist.md`. robots.txt MUST be checked and reported before any code is written or any new source is recommended.
- **No traffic to aggregators**: ticket_url must point to actual venue/ticket pages.
- **No copied descriptions (åndsverksloven)**: Always AI-generated or template. Never raw scraped text.
- **Never commit private material**: the repo is public. Meeting recordings, transcripts, correspondence with personal data, and consent evidence go in `private/`, which is gitignored. See `private/README.md` for the structure. Publishing something from there cannot be undone by deleting it later.
- **Ny sperre ved innlegging? Den skal også ha en invariant**: en regel som bare kjøres ved innlegging beskytter nye rader, men lar de som alt ligger i basen stå feil — og ingenting blir rødt. Det har skjedd tre ganger (bildesperra, aldersgrensa, Bookibud-henvisningskoden). Legger du en sperre i `insertEvent`, skal **samme funksjon** brukes i en sjekk i `scripts/lib/datakonsistens.ts`, som går gjennom alle kommende rader daglig. `sperre-har-invariant.test.ts` håndhever paringen
- **Endret sperrelisten eller samtykkeregisteret? Kjør `scripts/enforce-image-blocks.ts`**: `isImageAllowed()` gjelder bare ved innlegging, så bilder som allerede ligger i basen blir stående til dette skriptet rydder dem.
- **Image permission? Document it**: `docs/bildesamtykke.md` is the register of who consented to what. Adding a source to `IMAGE_APPROVED_SOURCES` or `PROMO_APPROVED_SOURCES` without a row there fails `bildesamtykke.test.ts`. The yes-email goes to Protonmail `Folders/Gaari/Avtaler` and is never deleted.
- **No non-public events**: Exclude barnehage, SFO, school visits, members-only.
- **Push kjører testene automatisk**: `.githooks/pre-push` kaller
  `scripts/verify-tests.mjs`, som stopper pushen hvis testene feiler — eller
  hvis *null* tester kjørte. Det siste er poenget: kjøres vitest fra feil
  katalog finner den ingen testfiler, og «ingenting å gjøre» ser ut som
  suksess. Verdikten står på siste linje (`VERDIKT: OK` / `VERDIKT: FEIL`)
  så den overlever `tail`. Slås på med
  `git config core.hooksPath .githooks` — én gang per arbeidskopi.
- **Søk før du legger til**: `node scripts/finnes-det-alt.mjs <ord>` søker
  kode, `docs/`, `.claude/`, påminnelser og minnenotater på én gang. Kjør den
  før du foreslår en ny oppgave, en ny påminnelse eller en ny måling. Den 26.
  august ble det sju ganger laget arbeid av noe som alt fantes — en påminnelse
  om festivaltekst som var skrevet om, en alarm om DNT-sletting der domenet
  alt var unntatt, en Bing-undersøkelse besvart i mai, og en
  sporingshendelse som duplisert `filter-used`. Alle sju ville dukket opp i
  dette søket.
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
- `dedup.ts` — cross-source dedup with scoring. `SOURCE_RANK` must include ALL scrapers **and enhver manuelt innlagt kilde** (uten rangering scorer den 0 og blir slettet av en scraper som finner samme arrangement). Endrer du reglene: kjør `scripts/dedup-dryrun.ts` først, den viser hva som ville blitt slettet.
- `venues.ts` — 190+ venue entries, aggregator domain detection, resolveTicketUrl
- `ai-descriptions.ts` — Gemini integration, rate limiting, fallback
- `scraper-health.ts` — Anomaly detection (broken/warning/dormant/healthy)
- `source-watch.ts` — Kildevakt: overvåker steder som ennå ikke har noe å scrape. Liste i `scripts/source-watch.json`, rapporteres i den daglige digesten. Se `docs/next-scrapers.md`, «Venter på kilden».

## Detailed docs (read on-demand)

- `.claude/docs/scrapers.md` — Scraper sources with files and methods
- `.claude/docs/routes.md` — All frontend routes, API endpoints, admin pages
- `.claude/docs/collections.md` — 52 collection pages (evergreen, bydel, seasonal, festival)
- `.claude/docs/social.md` — Social post pipeline, accounts, rate limits, slide design
- `.claude/docs/components.md` — Frontend components, CSS theming, EventDiscovery, accessibility
- `.claude/docs/testing.md` — Vitest test suite (run `npx vitest run` for current count)
- `.claude/docs/gha.md` — GitHub Actions workflows (CI, scrape, newsletter, digest, social, audit)

## Hosting & domains

- **Vercel** (SvelteKit adapter). ISR via `export const config = { isr: { expiration: SECONDS } }` — 1h on homepage and collections (time-sensitive listings), 7 days on event detail pages (rarely change after creation, dominate Vercel free-tier ISR usage). Event pages also set `s-maxage=3600, stale-while-revalidate=7200`, which is what actually decides how fast a DB correction becomes visible: roughly an hour, not seven days. There is no on-demand purge.
- `gaari.no` + `gåri.no` (IDN redirect via `hooks.server.ts`)
- Umami Cloud analytics (proxied via `/u/`). Favicon: red "G" SVG.

## Observability

- `hooks.server.ts` structured error logging → Vercel logs
- `/api/health` — Lightweight liveness probe (1 Supabase query) — polled by UptimeRobot every 5 min
- `/api/health/deep` — comprehensive checks (supabase, events, public read, scrape freshness, visibility, pipeline, image health, DB size, data quality) — hit by morgen/health skills. Teller med `supabaseAdmin`, fordi RLS-migrasjonen la de private tabellene utenfor anon. `public_read` er unntaket: den går med anon-nøkkelen og ber om `PUBLIC_EVENT_COLUMNS`, så en fremtidig innstramming av grantet lyser rødt her før forsiden blir tom
- `scraper_runs` table + `scraper-health.ts` classification → daily digest
- `datakonsistens-sjekk.ts` (daglig, i `link-check.yml`): sammenligner strukturerte felter med radens egen tekst. Fanger feilklassen der `age_group` sier «alle» mens beskrivelsen sier «aldersgrense 18 år» — usynlig for alle de andre lagene, fordi ingenting blir rødt. **Sperrende** sjekker skal alltid være null. **Målte** sjekker låser dagens nivå slik dokumentstørrelsen gjør, fordi en portvakt som er rød hver dag lærer folk å se bort fra rødt. Hever du en grense, skal det være en beslutning
- `link-check.yml` (daglig): `check-links.ts` sjekker lenkene *ut* til arrangørene, `check-site.ts` sjekker gaari.nos egne sider og lenkene mellom dem. **Et 200-svar er ikke bevis**: Next.js-sider svarer 200 med et tomt skall første gang noen ber om en adresse de ikke har bygd, og 404 etterpå. Sjekk aldri en slik lenke bare én gang.

## Business model

Promoted placement subscriptions: Basis 1,500 / Standard 3,500 / Partner 9,000 NOK/month. À la carte: 750 NOK/event. All labeled "Fremhevet" (markedsføringsloven § 3). Prospect reports via `scripts/generate-prospect-report.ts`.
