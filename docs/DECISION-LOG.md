# Gåri — Decision Log

**Last updated:** 2026-02-23

Record of key architectural, design, and strategic decisions. Each entry includes the rationale and alternatives considered.

---

## Format

Each entry: `#N — Date — Decision title`
- **Decision:** What was decided
- **Rationale:** Why
- **Alternatives considered:** What else was on the table
- **Status:** Active / Superseded / Revisit

---

## Decisions

### #1 — 2026-02 — SvelteKit + Supabase + Vercel stack
- **Decision:** Use SvelteKit 2 (Svelte 5) for frontend, Supabase (PostgreSQL) for backend, Vercel for hosting.
- **Rationale:** SvelteKit is the easiest modern framework coming from vanilla JS. Supabase provides database, auth, file storage, and auto-generated API — skip building 80% of backend. Vercel free tier: 100GB bandwidth/month, auto-deploys. Total cost at launch: domain registration only (~150 NOK/year).
- **Alternatives considered:** Next.js (heavier, React ecosystem), Astro (less interactive), self-hosted (more ops burden), Firebase (less SQL-friendly).
- **Status:** Active

### #2 — 2026-02 — 44 scrapers with Cheerio (no headless browser)
- **Decision:** Build standalone TypeScript scrapers using Cheerio for HTML parsing. No Playwright/Puppeteer.
- **Rationale:** Keeps the scraper pipeline lightweight, fast, and free to run in GitHub Actions. Cheerio parses static HTML efficiently. Headless browsers add complexity, memory usage, and longer CI times.
- **Alternatives considered:** Playwright for JS-rendered sites (Bergen Kino, VilVite), Scrapy (Python), Puppeteer. These would enable scraping Vue.js/Wix/Netflex sites but at significant complexity cost.
- **Trade-off:** Cannot scrape Bergen Kino, VilVite, Kunsthall 3.14, or other JS-rendered sites. Accepted — coverage is sufficient without them.
- **Status:** Active

### #3 — 2026-02 — Gemini 2.5 Flash for AI descriptions
- **Decision:** Use Gemini 2.5 Flash to generate bilingual (NO/EN) event descriptions. Fallback to `makeDescription()` template when API is unavailable.
- **Rationale:** Avoids copying copyrighted descriptions from sources (åndsverkloven §§ 2–3). Generates original, factual, SEO-friendly descriptions under 160 characters. Gemini 2.5 Flash is fast and cheap. 200ms rate limit between calls.
- **Alternatives considered:** GPT-4o-mini (more expensive), Claude Haiku (same tier), copying source descriptions (legal risk), no descriptions at all.
- **Status:** Active

### #4 — 2026-02 — Funkis design system (Sundt building inspiration)
- **Decision:** Custom design system inspired by Bergen's Sundt building (1938 functionalist architecture by Per Grieg). Custom CSS properties, not an off-the-shelf design system.
- **Rationale:** Gives Gåri a distinct Bergen identity. Functionalist principles (clarity, utility, minimal decoration) align with the product philosophy. Color palette: plaster whites, granite greys, vermillion red accent (#C82D2D).
- **Alternatives considered:** shadcn-svelte (mentioned in early design-brief, moved away from), Material Design, Tailwind UI components.
- **Status:** Active

### #5 — 2026-02 — No dark mode
- **Decision:** Dark mode is disabled. Components use hardcoded `bg-white` in many places.
- **Rationale:** Implementing full dark mode requires replacing all hardcoded colors with CSS custom properties across all 17 components. Deferred to focus on core functionality.
- **Trade-off:** Some users prefer dark mode. Noted as TODO in `app.css`.
- **Status:** Active — revisit post-launch

### #6 — 2026-02 — No infinite scroll (Load More instead)
- **Decision:** Use "Load More" button pagination, not infinite scroll.
- **Rationale:** Infinite scroll breaks keyboard navigation, makes the footer unreachable, and causes layout memory issues. Load More preserves scroll position, is more accessible, and shows progress ("Viser 20 av 156 arrangementer").
- **Alternatives considered:** Infinite scroll, traditional page-based pagination.
- **Status:** Active

### #7 — 2026-02 — Norwegian first, English optional
- **Decision:** `title_no` and `description_no` are required fields. English fields are optional.
- **Rationale:** Primary audience is Norwegian speakers in Bergen. English expands reach to tourists and international students but shouldn't block event listing. AI descriptions generate English when available; empty string when not.
- **Alternatives considered:** Both required (too strict — blocks scrapers), English only (loses local audience), auto-translate (quality concerns).
- **Status:** Active

### #8 — 2026-02 — Domain-based opt-out system
- **Decision:** Venues can opt out via a form on `/datainnsamling`. Opt-outs are domain-based and enforced in the scraper pipeline.
- **Rationale:** Legal compliance (GDPR, good faith) and community trust. Simple implementation: `opt_out_requests` table in Supabase, admin approval, pipeline checks `isOptedOut(source_url)` before inserting.
- **Alternatives considered:** Per-event opt-out (too granular), email-only requests (less transparent), no opt-out (legal risk).
- **Status:** Active

### #9 — 2026-02 — Generate descriptions, never copy source text
- **Decision:** All 44 scrapers either use `makeDescription()` template or AI-generated descriptions. Zero scrapers copy creative content from sources.
- **Rationale:** Norwegian copyright law (åndsverkloven §§ 2–3) protects creative text. Factual information (title, date, venue, price) is not copyrighted. Generating original descriptions is the legally safe approach. Two scrapers (floyen.ts, festspillene.ts) were caught copying source text and fixed on 2026-02-22.
- **Alternatives considered:** Copying with attribution (still infringement), summarizing (grey area), linking without description (poor UX).
- **Status:** Active

### #10 — 2026-02 — Honest User-Agent identification
- **Decision:** All scrapers use `User-Agent: Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`.
- **Rationale:** Transparency and legal compliance. Allows venue operators to contact us. Consistent across all 44 scrapers (centralized in `fetchHTML()`, explicit in 11 direct-fetch scrapers).
- **Alternatives considered:** Spoofing as a browser (deceptive, legally risky), no User-Agent (ambiguous).
- **Status:** Active

### #11 — 2026-02 — 3-second delay for multi-request scrapers
- **Decision:** 18 multi-request scrapers use 3s delay between requests. 26 single-request scrapers need no delay. Eventbrite uses 3s. AI descriptions use 200ms + backoff.
- **Rationale:** Prevents server overload, demonstrates good faith, reduces legal risk. Cron runs twice daily (6 AM & 6 PM UTC) via GitHub Actions with 15-minute timeout.
- **Alternatives considered:** 1s delay (more aggressive), 5s delay (too slow for CI timeout), no delay (irresponsible).
- **Status:** Active

### #12 — 2026-02 — External ticket links only (no ticket selling)
- **Decision:** Gåri links to external ticket_url for purchases. Never intermediates ticket sales.
- **Rationale:** Positions Gåri as a complementary traffic-generator, not a competitor (important for markedsføringsloven § 25 / Finn.no v Supersøk precedent). Simplifies the product — no payment processing, no inventory management.
- **Alternatives considered:** Affiliate links (monetization but complexity), embedded ticket widgets (vendor lock-in).
- **Status:** Active

### #13 — 2026-02 — Deduplication by normalized title + same date
- **Decision:** Cross-source dedup uses normalized title + same date to find duplicates. Keeps the highest-scored variant (scoring: source rank + image + ticket URL + description length).
- **Rationale:** Same event often appears in multiple sources (e.g., VisitBergen + venue calendar + TicketCo). Without dedup, users see duplicates. Scoring keeps the best-quality listing.
- **Alternatives considered:** URL-based dedup (misses cross-source), fuzzy matching (complexity), manual curation (doesn't scale).
- **Status:** Active

### #14 — 2026-02 — Map view deferred to v2
- **Decision:** Map view is not in MVP. Grid and List views only.
- **Rationale:** Map requires lat/lng data (partially available), map library integration, and split-screen mobile UX. Too much scope for initial launch.
- **Status:** Active — planned for v2

### #15 — 2026-02 — No search autocomplete in v1
- **Decision:** Basic text search across titles and venues. No autocomplete, no suggestions, no recent searches.
- **Rationale:** Autocomplete requires sub-200ms response times, suggestion grouping, trending search logic. Deferred to v2.
- **Status:** Active — planned for v2

### #16 — 2026-02 — Mobile-first responsive design
- **Decision:** Design for mobile first (65%+ expected users), then tablet, then desktop.
- **Rationale:** Bergen is a walkable city; people discover events on their phones. Desktop is secondary.
- **Status:** Active

### #17 — 2026-02 — No aggregator domains in ticket URLs
- **Decision:** `ticket_url` must point to actual venue/ticket pages, never to aggregator sites like visitbergen.com or barnasnorge.no.
- **Rationale:** Users should reach the real ticket seller. Aggregator links add an unnecessary redirect and may break. Aggregator domains are blocked in `venues.ts`.
- **Status:** Active

### #18 — 2026-02 — Exclude kindergarten events
- **Decision:** Events for barnehager (kindergartens) are excluded from scraping.
- **Rationale:** These are internal institutional events, not public — they clutter results and aren't useful to our audiences. Checked via title keywords AND detail page text.
- **Status:** Active

### #19 — 2026-02 — Per-event OG image generation (Satori)
- **Decision:** Generate per-event Open Graph images using Satori + ResvgJS at `/og/[slug].png`.
- **Rationale:** Shared links on social media look professional with custom images showing event title, date, venue. Improves click-through rates.
- **Alternatives considered:** Default OG image for all events (generic), screenshot-based (complex), no OG images (poor social sharing).
- **Status:** Active

### #20 — 2026-02 — Bilingual typography: Barlow Condensed + Inter
- **Decision:** Display/heading font: Barlow Condensed. Body font: Inter.
- **Rationale:** Barlow Condensed has a modernist, functionalist feel matching the Funkis system. Inter is highly legible for body text and supports tabular numbers for dates/prices.
- **Status:** Active

---

## References

- See `legal-research-norway.md` for full legal analysis behind decisions #9–12
- See `design-brief.md` for design decisions #4–6, #16, #20
- See `project-strategy.md` for product scope decisions #14–15
- See `next-scrapers.md` for scraper coverage decisions
