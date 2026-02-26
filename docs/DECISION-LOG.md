# Gåri — Decision Log

**Last updated:** 2026-02-27

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

### #21 — 2026-02-25 — Delete sold-out events from DB
- **Decision:** When a scraper detects a sold-out event, it calls `deleteEventByUrl(source_url)` to remove it from the DB and skips insertion. Applied to 9 scrapers.
- **Rationale:** Prevents sending users to events they can't attend. Handles both "never insert" and "remove events that sold out between runs". Simpler than a `sold_out` status field.
- **Alternatives considered:** `sold_out` status (kept in DB but hidden — adds complexity, still wastes scraper time), marking as cancelled (wrong semantic).
- **Status:** Active

### #22 — 2026-02-25 — Server-side data loading, no client Supabase
- **Decision:** All main pages use `+page.server.ts`. Supabase SDK runs only on the server (`$lib/server/supabase.ts`). Only `/submit` uses client-side Supabase (for image uploads).
- **Rationale:** Eliminates the client-side waterfall (Load JS → Init Supabase → Fetch → Render). Data arrives pre-rendered in HTML. Improves Core Web Vitals significantly (Lighthouse Performance 77 → 95).
- **Alternatives considered:** Client-side loading (was the original approach — replaced), hybrid (unnecessary complexity).
- **Status:** Active

### #23 — 2026-02-25 — Self-hosted fonts (no Google Fonts)
- **Decision:** 5 woff2 font files in `static/fonts/`. `@font-face` in `app.css`. No external font CDN.
- **Rationale:** Google Fonts requests were blocking page load and counted as third-party requests. Self-hosting eliminates the DNS lookup + connection + download waterfall. Also tightens CSP headers. FCP improved 3.8s → 1.7s.
- **Alternatives considered:** Google Fonts (convenient but performance cost), system fonts (no brand identity).
- **Status:** Active

### #24 — 2026-02-25 — Business model: cross-subsidized promoted placement
- **Decision:** Revenue from promoted placement tiers (Grasrot free → Basis 1 500 → Standard 3 500 → Partner 7 000 NOK/mo). Large venues subsidize small ones. Content stays editorially independent.
- **Rationale:** Based on Hotelling's Law / agglomeration economics — a shared Bergen town square benefits all venues more than fragmented promotion. DICE data shows >40% of tickets sold through discovery platforms. Bundled "7 ting å gjøre denne helgen" content has 5–7 hooks vs. a solo ad's one.
- **Alternatives considered:** Advertising (undermines editorial trust), ticketing commission (requires venue contracts + payment processing), freemium (wrong audience), data licensing (Phase D, not primary).
- **Status:** Active — implementation in Phase C (weeks 11–16)

### #25 — 2026-02-25 — Plausible Cloud for analytics
- **Decision:** Use Plausible Cloud (€9/month) rather than self-hosted Umami.
- **Rationale:** No cookies, no consent banner required (GDPR-compliant). €9/month is trivial vs. ops overhead of self-hosting. Full API access for venue referral reports. UTM tracking built in.
- **Alternatives considered:** Umami self-hosted (free but ops overhead), Google Analytics (cookies, GDPR issues, heavy script), no analytics (can't prove value to venues).
- **Status:** Active — revisit self-hosted Umami if costs become relevant at scale

### #26 — 2026-02-25 — EventDiscovery progressive filter (replaces FilterBar on homepage)
- **Decision:** Homepage uses a 5-step progressive discovery filter (When → Time → Who → What → Where & Price) instead of traditional dropdown FilterBar. URL params are single source of truth.
- **Rationale:** Standard multi-dropdown filters are overwhelming on first visit. Progressive disclosure guides users step-by-step. URL-based state makes filters shareable and back-button safe.
- **Alternatives considered:** Keeping FilterBar (retained on non-homepage routes), search-first (search autocomplete is v2), faceted sidebar (desktop-only pattern, poor mobile UX).
- **Status:** Active

### #27 — 2026-02-25 — 8 curated collection landing pages
- **Decision:** Build dedicated server-rendered routes for curated event collections (denne-helgen, i-kveld, gratis, today-in-bergen, familiehelg, konserter, studentkveld, this-weekend).
- **Rationale:** Collection pages serve two purposes: SEO (rank for high-intent local queries like "hva skjer i bergen denne helgen") and social media destinations (Instagram posts link to these pages, not the homepage). ISR-cached, JSON-LD CollectionPage schema, custom OG images.
- **Alternatives considered:** Client-side filter redirects (no SEO benefit, no canonical URL), static pre-generated pages (too many, can't be dynamic), query param URLs (not shareable as "clean" social links).
- **Status:** Active

### #28 — 2026-02-25 — Social post automation: generate-only pipeline, no API posting
- **Decision:** GitHub Actions cron generates Instagram carousel images + captions daily and stores them in Supabase Storage. Admin reviews at `/admin/social` and posts manually. No Meta Graph API automation yet.
- **Rationale:** Meta Graph API requires business account + app review process. Manual posting takes ~5 min/day. Full automation is Phase D when posting exceeds 30 min/week.
- **Alternatives considered:** Full Meta API from day one (too complex, requires app review), Buffer/Later (third-party dependency, cost), no automation (all manual, no consistency).
- **Status:** Active — Phase D will add Meta API when volume justifies

### #29 — 2026-02-25 — AI search optimization (llms.txt + explicit crawler permissions)
- **Decision:** Add `static/llms.txt` per the llmstxt.org standard, explicitly name AI crawlers in `robots.txt` (GPTBot, ClaudeBot, PerplexityBot, etc.), enrich Organization/WebSite JSON-LD with entity data (Wikidata ID for Bergen, areaServed, knowsAbout), and add FAQPage JSON-LD to the about page.
- **Rationale:** AI search engines (ChatGPT, Perplexity, Claude) are becoming primary discovery channels. Being the source cited for "what's on in Bergen" is high-value. `llms.txt` and FAQPage schema are low-effort, high-impact signals.
- **Alternatives considered:** No AI optimization (missed opportunity), paid AI search placement (not yet available at meaningful scale).
- **Status:** Active

### #30 — 2026-02-25 — Promoted placement: 1 event per collection, daily rotation
- **Decision:** Show exactly one promoted event per collection page (not all venue events), rotating daily through the venue's events using `dayNumber % venueEvents.length`. Per-venue cap of 3 events across the whole collection to prevent flooding.
- **Rationale:** Showing all events from a paying venue looked spammy (Akvariet had 8 events on the weekend page). One promoted event is clear, fair, and readable. Daily rotation gives the venue variety without randomness — predictable for the client, consistent for all visitors within a day (compatible with 5-min ISR cache).
- **Alternatives considered:** True per-visit randomization (breaks with ISR cache), showing all venue events promoted (too dominant), weekly rotation (too slow).
- **Status:** Active

### #31 — 2026-02-25 — Admin password auth (HMAC cookie, no Supabase Auth)
- **Decision:** Protect `/admin/*` routes with a single shared password stored in `ADMIN_PASSWORD` env var. Session token is HMAC-SHA256 signed with `ADMIN_SESSION_SECRET`, stored as an HttpOnly cookie (7-day TTL). No user accounts or Supabase Auth.
- **Rationale:** There is only one admin user (the owner). Supabase Auth adds complexity and a dependency for a single-user tool. HMAC-signed cookie is stateless, secure against forgery, and requires zero database queries per request.
- **Alternatives considered:** Supabase Auth (overkill for 1 user), HTTP Basic Auth (no logout, poor UX), plain password in cookie (forgeable).
- **Status:** Active

### #32 — 2026-02-25 — getWeekendDates includes Friday (Fri–Sun, not Sat–Sun)
- **Decision:** The `getWeekendDates()` function now returns Friday–Sunday for Mon–Fri, not Saturday–Sunday. Saturday and Sunday still show only remaining weekend days.
- **Rationale:** Norwegian "helg" (weekend) culturally includes Friday evening. Venues like Grieghallen have Friday events that belong in the "denne-helgen" collection. Previously they were excluded Mon–Thu, making the collection feel incomplete mid-week.
- **Alternatives considered:** Keep Sat–Sun only (misses Friday evening culture), show Fri–Sun always including on Saturday (would show already-passed Friday events).
- **Status:** Active

### #33 — 2026-02-25 — Owner IP filtering for impression logs
- **Decision:** Add `SKIP_LOG_IPS` env var (comma-separated). If the client IP matches, `logImpression()` is skipped. Checked server-side via `getClientAddress()`.
- **Rationale:** Owner testing and reviewing collection pages would inflate impression counts for paying clients, making reports misleading. Simple IP filter is sufficient for a single-operator product.
- **Alternatives considered:** Filter by user-agent (easy to spoof), separate staging environment (overkill), no filtering (misleading reports).
- **Status:** Active

### #34 — 2026-02-26 — Crawlable pagination (SEO fix)
- **Decision:** Change LoadMore.svelte from `<button onclick>` to `<a href="?page=N">` styled as a button. Googlebot can now follow pagination links and index the full event inventory.
- **Rationale:** Googlebot cannot click JavaScript buttons. Events beyond the first ~12 displayed were invisible to search engines. This was likely the biggest hidden SEO problem on the site.
- **Alternatives considered:** Server-side pagination with separate /page/2 routes (more complex, different URL structure), keeping button-only (invisible to crawlers).
- **Status:** Active

### #35 — 2026-02-26 — Bing Webmaster Tools + IndexNow
- **Decision:** Verify gaari.no in Bing Webmaster Tools (CNAME method), submit sitemap, and integrate IndexNow into the scraper pipeline to auto-notify Bing/Yandex of new events.
- **Rationale:** ChatGPT uses Bing's search infrastructure. Without Bing indexing, Gåri cannot appear in ChatGPT search results. IndexNow ensures new events are discoverable within hours, not days.
- **Alternatives considered:** Bing-only without IndexNow (slower indexing), Google-only strategy (misses ChatGPT entirely).
- **Status:** Active

### #36 — 2026-02-26 — Event JSON-LD timezone normalization
- **Decision:** Create `toBergenIso()` in `seo.ts` that converts UTC timestamps to ISO 8601 with correct Bergen timezone offset (+01:00 CET or +02:00 CEST based on date).
- **Rationale:** Google requires ISO 8601 with timezone for Event schema startDate/endDate. Without explicit timezone, Google may reject the structured data or misinterpret event times.
- **Alternatives considered:** Storing timezone in DB (migration complexity), always using +01:00 (wrong during summer), using Z/UTC (Google may display wrong local time).
- **Status:** Active

### #37 — 2026-02-26 — Canonical URL strategy for filtered views
- **Decision:** Implement `computeCanonical()` in `seo.ts`. Rules: single category or bydel filter → self-referencing canonical (indexable); combined category+bydel → canonical to category version; `?when=weekend`/`?when=today` → canonical to matching collection page URL; pagination params preserved; noise params (time, price, audience) stripped; filtered views with <5 results get `noindex`.
- **Rationale:** Without canonicals, Google sees duplicate content across filter combinations. Category and bydel filters produce substantially different content and should rank independently. Time-based filters should consolidate with the dedicated collection pages.
- **Alternatives considered:** noindex all filtered views (loses ranking opportunity), no canonical strategy (duplicate content risk), separate routes per category (URL clutter).
- **Status:** Active — 21 tests in seo.test.ts

### #38 — 2026-02-26 — AI referral tracking in Plausible
- **Decision:** Inline script in `app.html` checks `document.referrer` against 9 AI domains and fires a Plausible custom event (`ai-referral`) with the source domain as a prop.
- **Rationale:** Need to measure whether AI search optimization is working. Plausible doesn't natively segment AI traffic. Custom event approach works with Plausible's privacy-friendly model.
- **Alternatives considered:** GA4 custom channel group (requires GA4, cookies), server-side referrer logging (more complex), no tracking (flying blind).
- **Status:** Active — manual step: add "ai-referral" goal in Plausible dashboard

### #39 — 2026-02-26 — 5 new collection pages (13 total)
- **Decision:** Add `i-dag`, `free-things-to-do-bergen`, `regndagsguide`, `sentrum`, and `voksen` collection pages. All with editorial copy, answer capsules, FAQ schema, CollectionPage + ItemList JSON-LD.
- **Rationale:** Each targets a specific underserved search query with zero strong incumbent. `regndagsguide` (rainy day guide) targets Bergen's 231 rain days. `sentrum` targets neighborhood queries. `voksen` targets adult culture. `free-things-to-do-bergen` targets tourist queries in English.
- **Alternatives considered:** Fewer pages (misses queries), more pages (diminishing returns without data to validate).
- **Status:** Active

### #40 — 2026-02-26 — For-arrangorer marketing page (AI search lead)
- **Decision:** Create `/[lang]/for-arrangorer/` as a B2B marketing page. AI search citation is the primary differentiator. Footer link only — not in main navigation. No pricing visible.
- **Rationale:** AI search is the genuinely novel selling point. No Bergen competitor can match it. Venue owners don't know their events appear in ChatGPT results — educating them creates demand.
- **Status:** Active — under construction (temporarily hidden from footer/sitemap)

### #49 — 2026-02-27 — StreamingAnimation: HTML/CSS product mockup (no images)
- **Decision:** Build the hero animation for `/for-arrangorer` as a 5-layer CSS/Svelte component (`StreamingAnimation.svelte`) rather than using screenshots, videos, or illustration.
- **Rationale:** Follows Funkis design philosophy — "every visual is a working product mockup built in HTML/CSS." No stock photos, no external image dependencies. The animation demonstrates the product (events flowing from 12 Bergen venues into the Gåri hub) using real venue names and category colors. 12 venue pills in ellipse layout, 12 flying particles in burst rhythm (22s cycle), central hub with browser chrome and cycling event cards. Scroll-triggered with staggered startup. Full `prefers-reduced-motion` support.
- **Alternatives considered:** Product screenshots (static, quickly outdated), Lottie animation (external dependency, complex toolchain), video (bandwidth, no autoplay on mobile), static illustration (doesn't show interactivity).
- **Status:** Active

### #50 — 2026-02-27 — B2B copy: "utvalgte" not "kuraterte"
- **Decision:** Use "utvalgte sider" (selected/curated pages) instead of "kuraterte sider" in all Norwegian B2B copy on `/for-arrangorer`.
- **Rationale:** "Kuraterte" is a loanword that feels pretentious to many Norwegian readers. "Utvalgte" is plain Norwegian and conveys the same meaning — pages we've carefully selected/built. Aligns with Funkis brand voice: functional, honest, Bergen.
- **Status:** Active

### #41 — 2026-02-26 — Early bird: 3 months free before June 2026
- **Decision:** Venues signing up before 1 June 2026 get 3 months free (full tier access). Stripe `trial_period_days: 90`. No commitment during free period.
- **Rationale:** Removes price objection for first clients. Free period generates case study data. June deadline creates urgency.
- **Alternatives:** 50% off first year (devalues), 30% off (not compelling), no discount (harder first sale).
- **Status:** Active

### #42 — 2026-02-26 — Hybrid venue signup (not self-serve)
- **Decision:** Interest form → you approve → Stripe payment link. Not self-serve. Self-serve deferred to Phase D.
- **Rationale:** Controls client quality, enables personalized tier recommendation from traffic data, builds relationships. Large institutions expect conversation.
- **Status:** Active

### #43 — 2026-02-26 — Stripe for payments (card + Vipps + invoice)
- **Decision:** Stripe Billing for monthly subscriptions. Card (recurring), Vipps (at checkout, private preview), invoice/faktura (institutions). No code needed for first clients — Stripe Dashboard only.
- **Rationale:** Norwegian ENK support, MVA automation, hosted invoices, Vipps at checkout.
- **Status:** Stripe account can be created now

### #44 — 2026-02-26 — No public pricing on marketing page
- **Decision:** No prices on `/for-arrangorer`. Pricing shared in direct conversation only. Visible in Stripe checkout after agreement.
- **Rationale:** First 2–3 clients need personalized pitches. Publishing prices before having clients sets anchors without market validation.
- **Status:** Active — revisit after 5–10 clients

### #45 — 2026-02-26 — Three pricing tiers: 1,000 / 3,500 / 7,000
- **Decision:** Three paid tiers (Basis 1,000, Standard 3,500, Partner 7,000 NOK/month eks. mva) plus Grasrot (free). Replaces the original 4-tier model (1,500 / 3,500 / 7,000).
- **Rationale:** Lower entry price (1,000 vs 1,500) converts better in Norwegian SMB market. Round numbers. Three tiers is simpler to explain and sell.
- **Alternatives:** 4 tiers with 2 mid-points (too complex for 20 clients), lower across the board (requires more clients).
- **Status:** Active

### #46 — 2026-02-26 — À la carte single-event promotion (500 NOK)
- **Decision:** Offer one-time event promotion at 500 NOK per event. Promoted on relevant collection pages for the event's duration + newsletter inclusion. Priced to nudge repeat users toward Basis subscription.
- **Rationale:** Captures revenue from festivals (2–3 events/year), one-off organizers, and venues testing Gåri. Also serves as subscription conversion funnel.
- **Status:** Active

### #47 — 2026-02-26 — No social media in first 6 months
- **Decision:** Social media is not a dependency for the first 6 months of sales. Acquisition channels: direct outreach with data, SEO/AI search (already built), weekly newsletter, PR to BT, Bergen Næringsråd networking.
- **Rationale:** Social accounts are paused (creation issues). AI search citation is the stronger differentiator. Newsletter replaces social as the content distribution channel. The social post pipeline is built and ready — activates when accounts are resolved.
- **Alternatives:** Wait for social before launching (delays revenue), use social as primary channel (blocked).
- **Status:** Active — revisit in September 2026

### #48 — 2026-02-26 — Weekly newsletter via Buttondown
- **Decision:** Launch "Hva skjer i Bergen denne helgen" weekly newsletter via Buttondown. Free tier up to 100 subscribers. Thursday 15:00 CET send time. Content from collection page data engine.
- **Rationale:** Cheapest option (free → $9/month). Newsletter serves dual purpose: B2C audience growth + B2B selling point (subscriber count, inclusion as tier feature). Replaces social media as content distribution in first 6 months.
- **Alternatives:** Resend (developer-friendly but more complex), Mailchimp (expensive for what's needed), no newsletter (missed channel).
- **Status:** Ready for implementation

---

## References

- See `legal-research-norway.md` for full legal analysis behind decisions #9–12
- See `design-brief.md` for design decisions #4–6, #16, #20
- See `project-strategy.md` for product scope decisions #14–15
- See `next-scrapers.md` for scraper coverage decisions
- See `strategic-roadmap.md` for business phase decisions #24–28, #40–48
