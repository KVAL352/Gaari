# Gåri — Site Analysis

**Last updated:** 2026-02-26
**Scope:** UX, performance, content, structure, and gap analysis for the current Gåri build.

---

## Route Structure

### Live routes (14)

| Route | Purpose | SEO |
|-------|---------|-----|
| `/[lang]/` | Homepage — event listing with EventDiscovery filter | Indexed, hreflang nb/en |
| `/[lang]/about/` | About page | Indexed, hreflang nb/en |
| `/[lang]/datainnsamling/` | Data transparency + opt-out form | Indexed, hreflang nb/en |
| `/[lang]/events/[slug]/` | Event detail page | Indexed, hreflang nb/en, per-event OG image |
| `/[lang]/submit/` | Event submission form | Blocked from search engines (robots.txt) |
| `/[lang]/[collection]/` | 13 curated collection landing pages | Indexed, hreflang nb/en, priority 0.8, daily. Custom OG images. |
| `/og/[slug].png` | Per-event OG image generation | Not indexed |
| `/og/c/[collection].png` | Per-collection branded OG images | Not indexed |
| `/sitemap.xml` | Dynamic sitemap with hreflang | Submitted to GSC + Bing |
| `/api/health` | Health check endpoint (Supabase + scrape freshness) | Not indexed, 5min cache |
| `/admin/social` | Social post review (internal tool) | noindex |
| `/admin/promotions` | Promoted placement management (internal tool) | noindex |
| `/admin/login` | Admin login page | noindex |
| `/admin/logout` | Clears session cookie, redirects to login | Not indexed |

**Language prefix:** `[lang]` is `no` or `en`. Norwegian is the default.

**Collections (13):** denne-helgen, i-kveld, gratis, today-in-bergen, familiehelg, konserter, studentkveld, this-weekend, i-dag, free-things-to-do-bergen, regndagsguide, sentrum, voksen.

### Planned but not built
- `/admin/review` — pending submissions + edit suggestions
- `/admin/events` — manage all events
- `/admin/sources` — manage API imports

---

## SEO Status

| Feature | Status | Implementation |
|---------|--------|----------------|
| Open Graph tags | ✅ Done | All pages — title, description, image, url |
| Per-event OG images | ✅ Done | Satori + ResvgJS at `/og/[slug].png` |
| Per-collection OG images | ✅ Done | Satori at `/og/c/[collection].png` — Funkis design, red accent bar |
| hreflang | ✅ Done | `nb`, `en`, `x-default` on all pages |
| Meta descriptions | ✅ Done | <160 chars on all pages |
| Dynamic sitemap | ✅ Done | Static pages + collection pages + all approved events, hreflang, priority weighting, 1h cache |
| robots.txt | ✅ Done | Blocks `/submit`. Explicitly allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) |
| Structured data | ✅ Done | Event JSON-LD on detail pages (name, startDate CET/CEST, PostalAddress, NOK offers, eventStatus, inLanguage). CollectionPage + ItemList + BreadcrumbList + FAQPage on all 13 collection pages. Organization + WebSite with Bergen Wikidata entity on all pages. FAQPage on about page. |
| Canonical URLs | Partial | Self-referencing canonicals on event/collection pages. Filter params (?category=, ?bydel=) on homepage do not yet have a canonical strategy. |
| Google Search Console | ✅ Done | Verified, sitemap submitted |
| Bing Webmaster Tools | ✅ Done | Verified (CNAME), sitemap submitted |
| IndexNow | ✅ Done | Integrated in scraper pipeline — new events pinged to Bing/Yandex after each run |
| llms.txt + AI crawler permissions | ✅ Done | `static/llms.txt` per llmstxt.org standard. Explicit AI crawler allowance in robots.txt |
| Plausible Cloud analytics | ✅ Done | €9/mo, no cookies, no consent banner. UTM tracking on all outbound links via `buildOutboundUrl()` |
| Google Business Profile | ✅ Done | Created, logo + cover uploaded, verified 2026-02-26 |
| Crawlable pagination | ✅ Done | `<a href>` links on all paginated views (not `<button>` click handlers) |
| Editorial copy on collections | ✅ Done | 150–200 word editorial + FAQ answer capsules (H2+p, always visible) on all 13 collection pages |

### SEO gaps
- **Canonical URL strategy for filtered homepage views** — `?category=music&bydel=Sentrum` creates crawlable duplicate content. Options: canonical → unfiltered homepage, noindex on parameterised URLs, or URL-keyed canonical per filter state. Not yet implemented.
- **No accessibility statement page** — legally recommended under EAA (European Accessibility Act, applies in Norway via EEA)
- **No privacy policy page** — GDPR requirement even without cookies (Plausible analytics processes IP for geo-aggregation server-side)
- **Alt text strategy undefined** — event images currently use `alt=""` (acceptable as decorative, but loses SEO value from image content)
- **No long-form editorial content** — no blog or article infrastructure for long-tail queries ("beste jazzbar i Bergen", "hva gjøre i Bergen med barn")
- **Directory citations incomplete** — Gulesider.no, Proff.no, 1881.no auto-update from Brønnøysundregistrene; Bergen Næringsråd still pending (~1h effort)

---

## Accessibility (WCAG 2.2 Level AA)

### Implemented
- Color contrast: `--color-text-primary` at 7.88:1, `--color-text-secondary` at 6.96:1, `--color-text-muted` at 7.01:1 — all pass AA
- Status badges: cancelled #4A4843 (6.35:1), lasttickets #7A4F00 on #FAECD0 (5.2:1) — both pass AA
- Skip link: `.skip-link` in `app.css` — visible on focus
- Semantic HTML: `<time datetime>`, `<header>`, `<nav>`, `<main>` landmarks, ARIA landmarks
- Touch targets: FilterPill and nav buttons `min-height: 44px` (WCAG 2.5.8)
- `aria-pressed` on FilterPill, `aria-required="true"` on all required form fields
- Footer and inline links always show `underline` (not hover-only) per WCAG 1.4.1
- Keyboard navigation: CalendarDropdown implements full WAI-ARIA menu pattern (ArrowUp/Down, Home/End, Escape returns focus to trigger, Tab closes). FilterPill groups support ArrowLeft/Right.
- Screen reader announcements: homepage results wrapper has `aria-live="polite" aria-atomic="true"`. MiniCalendar month navigation has `aria-live="polite"`.
- Focus management: CalendarDropdown focus returns to trigger on Escape and Tab. Error page uses `<main>` landmark.
- MiniCalendar: `role="grid"` > `role="row"` > `role="gridcell"` ARIA structure. `role="group"` wrapper.
- `prefers-reduced-motion` media query respected
- Dynamic `lang` attribute on `<html>` element

### Known gaps
- No formal WCAG 2.2 audit has been performed
- No accessibility statement page published (recommended under EAA)
- Alt text strategy for event images not defined — currently `alt=""` on all (treated as decorative)
- Color contrast of category placeholder colors against overlaid icon/text not formally verified
- No mobile focus trap handling (there are no modal dialogs or bottom sheets in the current build)

---

## Performance

### Measured (Lighthouse mobile, 2026-02-26)

| Metric | Target | Measured |
|--------|--------|---------|
| Performance score | ≥ 90 | **95** |
| LCP | ≤ 2.5s | **2.6s** (needs-improvement by 0.1s) |
| FCP | ≤ 1.8s | **1.7s** ✅ |
| TBT | ≤ 200ms | **10ms** ✅ |
| CLS | ≤ 0.1 | **0.003** ✅ |
| Speed Index | — | 3.3s |

### Key performance decisions
- **Server-side data loading** — `+page.server.ts` on all main pages. Data pre-rendered in HTML, no client-side fetch waterfall. Supabase JS SDK not shipped to client (except `/submit`).
- **Self-hosted fonts** — 5 woff2 files in `static/fonts/`, `@font-face` in `app.css`, `font-display: swap`. Eliminated Google Fonts DNS/connection overhead. FCP 3.8s → 1.7s.
- **ISR caching** — Homepage and collection pages: `s-maxage=300, stale-while-revalidate=600` (5min fresh, 10min stale-while-revalidate). Served from Vercel CDN edge.
- **Prerendered about page** — built as static HTML at deploy time, zero server compute.
- **Keyed each blocks** — `EventGrid.svelte` uses `{#each events (event.id)}` for efficient DOM reuse on filter changes.

### Outstanding performance concerns
- **Image hotlinking** — event images served directly from scraped third-party domains. No proxy, no CDN, no format conversion. Risk: broken images if sources change URLs, no WebP/AVIF delivery.
- **LCP 2.6s** — 0.1s above "good" threshold. Likely tied to above-fold event card image load from third-party domain.

---

## Mobile Responsiveness

### Design targets
- Mobile-first (65%+ expected users)
- 1 column on mobile, 2 on tablet, 3–4 on desktop
- Horizontal scroll filter chips on mobile
- Thumb zone: primary actions in bottom 60% of screen

### Implementation status
- Grid layout is responsive (`auto-fill, minmax(300px, 1fr)`)
- FilterBar handles mobile layout
- EventDiscovery progressive filter designed mobile-first (pill tap targets, inline MiniCalendar)
- No dedicated bottom navigation bar (planned in design-brief, not built)

---

## Component Status: Built vs. Planned

### Built (20 components in `src/lib/components/`)

| Component | Notes |
|-----------|-------|
| Header.svelte | Sticky header, language switch |
| Footer.svelte | Links: about, datainnsamling, contact |
| HeroSection.svelte | Compact hero with tagline |
| EventCard.svelte | Image, title, date, venue, category, price, disclaimer. Accepts `promoted` prop — renders Fremhevet/Featured badge |
| EventGrid.svelte | Date-grouped grid. Accepts `promotedEventIds` prop, keyed `{#each}` by `event.id` |
| EventDiscovery.svelte | Progressive 5-step filter: When → Time → Who → What → Where & Price |
| FilterPill.svelte | Reusable pill/chip button, `aria-pressed`, 44px touch target |
| MiniCalendar.svelte | Inline month-grid date picker, single date + range, bilingual, full ARIA grid |
| FilterBar.svelte | Dropdown filter row (hidden on homepage when EventDiscovery is active) |
| CalendarDropdown.svelte | "Add to Calendar" dropdown on event detail pages. Full WAI-ARIA menu keyboard nav. |
| StatusBadge.svelte | Today, Trolig gratis, Sold Out, Last Tickets, Cancelled badges |
| LoadMore.svelte | "Load more events" button |
| EmptyState.svelte | "No events found" message |
| BackToTop.svelte | Sticky scroll-to-top button |
| LanguageSwitch.svelte | NO/EN toggle |
| ImagePlaceholder.svelte | Fallback image with category color |

### Not yet built (from design-brief component tree)

| Component | Priority | Notes |
|-----------|----------|-------|
| NavLinks | Medium | Desktop horizontal navigation links |
| ViewToggle (Grid/List) | Medium | Switch between grid and list views |
| SortDropdown | Low | Sort by date, relevance |
| AppliedFilterChips | Medium | Removable chips showing active filters with "Clear All" |
| BottomNavBar (mobile) | Low | Mobile tab bar: Explore, Map, Saved, Language |
| MapView | v2 | Split-screen map with event pins (needs lat/lng data) |
| SaveButton | v2 | Heart icon on event cards (requires user accounts) |
| SuggestCorrection | v2 | Community editing on event detail pages |

---

## Content Gaps

| Feature | Status | Impact |
|---------|--------|--------|
| Map view | Not built (v2) | Tourists and locals can't browse by location |
| Search autocomplete | Not built (v2) | Users must type full queries |
| Saved/favorites | Not built (v2) | No personalization |
| Dark mode | Disabled | Some users prefer dark mode |
| Admin event moderation | Not built | No custom UI for pending submissions; still managed in Supabase dashboard |
| Weekly email digest | Not built (Phase D) | No re-engagement channel |
| Accessibility statement | Not published | Legally recommended under EAA |
| Privacy policy | Not published | Required for GDPR compliance |
| Venue profile pages | Not built | No dedicated page per venue |
| Event recurrence display | Partial | Recurring patterns stored but not shown to users |
| Long-form editorial content | Not built | No infrastructure for SEO articles or guides |

---

## Architecture Observations

### Strengths
- Clean separation: 44 scrapers are independent files with shared utilities in `scripts/lib/`
- Type safety: centralized types in `src/lib/types.ts`
- Deduplication pipeline handles cross-source overlap (normalized title + same date, scoring)
- AI descriptions keep content original (åndsverksloven compliance)
- URL state management — all filter states are shareable and back-button safe
- Structured error logging: `hooks.server.ts` + `hooks.client.ts` output structured JSON (type, timestamp, status, message, stack, url, method, userAgent)
- Analytics: Plausible Cloud with UTM tracking on all outbound links — can prove referral value to venues
- Automated testing: Vitest suite with 177 tests (event-filters, utils, seo, collections, dedup)
- Custom admin UI: `/admin/promotions` and `/admin/social` with HMAC-cookie auth — no Supabase dashboard access needed for day-to-day operation

### Areas to watch
- **Image hotlinking** — event images served from third-party domains; needs proxy/CDN for reliability and performance
- **Scraper fragility** — HTML scrapers break when source sites change their markup. No automated breakage detection beyond the `totalInserted=0 AND failedCount>5` health check.

---

## References

- See `design-brief.md` for full component tree and interaction specs
- See `DECISION-LOG.md` for rationale behind all architectural choices (#1–33)
- See `strategic-roadmap.md` for business phase status (A through D)
- See `seo-ai-playbook.md` for full SEO + AI search implementation details
- See `scraping-strategy.md` for scraper coverage and feasibility notes
