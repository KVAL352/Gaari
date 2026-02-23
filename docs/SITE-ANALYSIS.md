# Gåri — Site Analysis

**Last updated:** 2026-02-23
**Scope:** UX, performance, content, structure, and gap analysis for the current Gåri build.

---

## Route Structure

### Live routes (7)

| Route | Purpose | SEO |
|-------|---------|-----|
| `/[lang]/` | Homepage — event listing with filters | Indexed, hreflang nb/en |
| `/[lang]/about/` | About page | Indexed, hreflang nb/en |
| `/[lang]/datainnsamling/` | Data transparency + opt-out form | Indexed, hreflang nb/en |
| `/[lang]/events/[slug]/` | Event detail page | Indexed, hreflang nb/en, per-event OG image |
| `/[lang]/submit/` | Event submission form | Blocked from search engines (robots.txt) |
| `/og/[slug].png` | Per-event OG image generation | Not indexed |
| `/sitemap.xml` | Dynamic sitemap with hreflang | Submitted to search engines |

**Language prefix:** `[lang]` is `no` or `en`. Norwegian is the default.

### Planned but not built
- `/admin/review` — pending submissions + edit suggestions
- `/admin/events` — manage all events
- `/admin/sources` — manage API imports

---

## SEO Status

| Feature | Status | Implementation |
|---------|--------|----------------|
| Open Graph tags | Done | All pages — title, description, image, url |
| Per-event OG images | Done | Satori + ResvgJS at `/og/[slug].png` |
| hreflang | Done | `nb`, `en`, `x-default` on all pages |
| Meta descriptions | Done | <160 chars on all pages |
| Dynamic sitemap | Done | Static pages + all approved events, hreflang, priority weighting, 1h cache |
| robots.txt | Done | Blocks `/submit` pages |
| Canonical URLs | Needs review | Verify canonical tags on paginated views |
| Structured data | Gap | No JSON-LD / Schema.org Event markup on detail pages |

### SEO gaps
- **No JSON-LD Event structured data** — search engines can't parse event metadata directly. Adding `@type: Event` schema would improve rich snippet eligibility.
- **No Google Search Console verification** — status unknown
- **Paginated event lists** — `?page=2` URLs need `rel="next"` / `rel="prev"` or proper canonical strategy

---

## Accessibility (WCAG 2.2 Level AA)

### Implemented
- Color contrast: `--color-text-primary` at 7.88:1, `--color-text-secondary` at 6.96:1, `--color-text-muted` at 4.68:1 — all pass AA
- Status badges: color + icon + text (never color alone)
- Skip link: `.skip-link` in `app.css` — visible on focus
- Semantic HTML: `<time datetime>`, `<article>`, ARIA landmarks
- Tabular numbers for dates/prices
- Touch target guidance: 44px minimum

### Needs verification
- Keyboard navigation through all filter components
- Screen reader announcements (`aria-live="polite"`) on filter count updates
- Focus management when "Load More" adds new cards
- Color contrast of all category placeholder colors against icon/text
- Mobile bottom sheet/modal trap handling (focus trapping)

### Known gaps
- No formal WCAG audit has been performed
- No accessibility statement page published
- Alt text strategy for event images not defined (currently `alt=""` on all)

---

## Performance Targets (from design-brief)

| Metric | Target | Current status |
|--------|--------|---------------|
| LCP | ≤ 2.5s | Not measured |
| INP | ≤ 200ms | Not measured |
| CLS | ≤ 0.1 | Not measured |
| Total page weight | < 1.5MB | Not measured |
| JavaScript (compressed) | < 300KB | Not measured |
| CSS (compressed) | < 100KB | Not measured |
| Above-fold images | < 200KB total | Not measured |

### Performance recommendations
- Run Lighthouse audit on deployed site
- Verify `loading="lazy"` on event card images (eager for first 4)
- Check image sizes — no explicit image optimization pipeline yet
- Verify `width` and `height` attributes on all `<img>` to prevent CLS
- Consider image CDN or proxy for event images (currently hotlinked)

---

## Mobile Responsiveness

### Design targets
- Mobile-first (65%+ expected users)
- 1 column on mobile, 2 on tablet, 3–4 on desktop
- Horizontal scroll filter chips on mobile
- Bottom sheet for filter options
- Thumb zone: primary actions in bottom 60% of screen

### Implementation status
- Grid layout is responsive (`auto-fill, minmax(300px, 1fr)`)
- FilterBar handles mobile layout
- FilterSidebar handles desktop layout
- No dedicated bottom navigation bar yet (planned in design-brief)

---

## Component Status: Built vs. Planned

### Built (17 components in `src/lib/components/`)

| Component | Status |
|-----------|--------|
| Header.svelte | Built |
| Footer.svelte | Built |
| HeroSection.svelte | Built |
| EventCard.svelte | Built |
| EventListItem.svelte | Built |
| EventGrid.svelte | Built |
| FilterBar.svelte | Built |
| FilterSidebar.svelte | Built |
| SearchBar.svelte | Built |
| CalendarDropdown.svelte | Built |
| DateQuickFilters.svelte | Built |
| StatusBadge.svelte | Built |
| LoadMore.svelte | Built |
| EmptyState.svelte | Built |
| BackToTop.svelte | Built |
| LanguageSwitch.svelte | Built |
| ImagePlaceholder.svelte | Built |

### Not yet built (from design-brief component tree)

| Component | Priority | Notes |
|-----------|----------|-------|
| NavLinks | Medium | Desktop horizontal navigation links |
| ViewToggle (Grid/List) | Medium | Switch between grid and list views |
| SortDropdown | Low | Sort by date, relevance |
| AppliedFilterChips | Medium | Removable chips with "Clear All" |
| ResultCount | Medium | `aria-live` announcement of filter results |
| BottomNavBar (mobile) | Low | Mobile tab bar: Explore, Map, Saved, Language |
| MapView | v2 | Split-screen map with event pins |
| SaveButton | v2 | Heart icon on event cards (requires accounts) |
| SuggestCorrection | v2 | Community editing on event detail pages |
| AddToCalendar | Low | ICS export button on event detail |

---

## Content Gaps

| Feature | Status | Impact |
|---------|--------|--------|
| Map view | Not built (v2) | Tourists and locals can't browse by location |
| Search autocomplete | Not built (v2) | Users must type full queries |
| Saved/favorites | Not built (v2) | No personalization |
| Dark mode | Disabled | Some users prefer dark mode |
| Admin pages | Not built | Event moderation happens in Supabase dashboard |
| Weekly email digest | Not built (v2) | No re-engagement channel |
| Accessibility statement | Not published | Legally recommended under EAA |
| Privacy policy | Not published | Required for GDPR compliance |
| JSON-LD structured data | Not implemented | Missing rich snippets in search results |
| Indoor/outdoor filter | Not built (v2) | Bergen has 231 rain days — high-value filter |
| Venue profiles | Not built | No dedicated venue pages |
| Event recurrence display | Partial | Recurring patterns stored but not displayed to users |

---

## Architecture Observations

### Strengths
- Clean separation: 44 scrapers are independent files with shared utilities
- Type safety: centralized types in `src/lib/types.ts`
- Deduplication pipeline handles cross-source overlap
- AI descriptions keep content original (legal compliance)
- URL state management — all filter states are bookmarkable

### Areas to watch
- **Image hotlinking** — serving images from third-party domains; needs proxy/cache
- **No error monitoring** — no Sentry or equivalent for frontend/scraper errors
- **No analytics** — no usage tracking to inform product decisions
- **Supabase as admin** — event moderation via Supabase dashboard rather than custom admin UI
- **No automated testing** — no unit/integration/e2e tests in the codebase
- **Scraper fragility** — HTML scrapers break when source sites change their markup

---

## References

- See `design-brief.md` for full component tree and interaction specs
- See `PROJECT-INSTRUCTIONS.md` for tech stack and conventions
- See `DATA-QUALITY-AUDIT.md` for scraper coverage and data gaps
- See `DESIGN-SYSTEM.md` for visual specs and accessibility targets
- See `DECISION-LOG.md` for rationale behind architectural choices
