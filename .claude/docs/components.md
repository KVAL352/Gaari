# Frontend Components & UI

## Components (`src/lib/components/`)
- `Header.svelte` — Sticky header with language switch
- `Footer.svelte` — Dynamic collection links, static links, inline NewsletterCTA, social icons
- `NewsletterCTA.svelte` — Subscribe form (card + inline variants), contextCategory prop, preference pills
- `NewsletterInline.svelte` — Lightweight inline CTA (inside EventGrid after 3rd group, EmptyState)
- `NewsletterSignupCard.svelte` — Scrapbook-style signup card injected at position 7 in homepage grid. Shows 3 front + 2 background polaroids of real upcoming events with washi tape + "UKE X" sticker. Audience pills (family/voksen/ungdom) ordered by real Umami usage.
- `HeroSection.svelte` — Compact hero with tagline
- `EventCard.svelte` — Grid card with image, title, date, venue, category badge, price. `promoted` prop. Dismiss menu.
- `EventGrid.svelte` — Date-grouped layout, keyed `{#each}` by `event.id`, promotedEventIds, dismiss callbacks
- `EventDiscovery.svelte` — Filter panel (Who/When/What/Where). URL search params as source of truth.
- `FilterPill.svelte` — Reusable pill button (aria-pressed, 44px touch targets)
- `MiniCalendar.svelte` — Inline date picker (ARIA grid structure)
- `FilterBar.svelte` — Dropdown filter row (hidden on homepage when EventDiscovery active)
- `CalendarDropdown.svelte` — "Add to Calendar" dropdown (WAI-ARIA menu keyboard nav)
- `StatusBadge.svelte` — Today, Trolig gratis, Sold Out, Last Tickets, Cancelled
- `LoadMore.svelte`, `EmptyState.svelte`, `BackToTop.svelte`, `LanguageSwitch.svelte`, `ImagePlaceholder.svelte`

## CSS theming (`src/app.css`)
Funkis design system. Custom properties: `--color-primary` (#C82D2D), `--color-text-primary` (#141414), `--color-text-secondary` (#4D4D4D), `--color-text-muted` (#595959). All WCAG AA.
Typography: Barlow Condensed (display), Inter (body). Self-hosted woff2 in `static/fonts/`.

## EventDiscovery filter system
- **Who?** — Single-select pills: Familie, Ungdom, Voksen, Student, 18+, Turist
- **When?** — Pills + MiniCalendar + time of day (Morgen/Dagtid/Kveld/Natt)
- **What?** — Multi-select category pills + price filter
- **Where?** — Bydel pills
- URL is source of truth (`when`, `time`, `audience`, `category`, `bydel`, `price`)
- Contextual highlight via `getContextualHighlight()` in `event-filters.ts`
- 200ms opacity fade on filter changes (respects prefers-reduced-motion)
- Dismiss/hide events: localStorage (`gaari-hidden`), 7-day venue/category expiry

## Accessibility (WCAG 2.2 Level AA)
- Skip link, `:focus-visible` outlines, dynamic `lang`, `prefers-reduced-motion`
- All contrast ratios pass 4.5:1 minimum
- Full keyboard nav on CalendarDropdown (WAI-ARIA menu pattern)
- 44px touch targets on all interactive elements
- `aria-required`, `role="alert"`, `aria-live="polite"`
