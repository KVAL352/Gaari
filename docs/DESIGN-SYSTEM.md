# Gåri — Design System

**Last updated:** 2026-02-26
**Name:** Funkis — inspired by Sundt building, Bergen (1938, architect Per Grieg)

---

## Design Philosophy

Functionality-first. Speed and usability over decoration. Inspired by Bergen's functionalist architecture — clean lines, honest materials, purposeful form.

---

## Color Tokens

### Primitive palette (raw Funkis values)

| Token | Hex | Usage |
|-------|-----|-------|
| `--funkis-white` | #FFFFFF | Pure white |
| `--funkis-plaster` | #F5F3EE | Warm off-white background |
| `--funkis-plaster-warm` | #EDEAE3 | Warmer variant |
| `--funkis-shadow-light` | #D4D1CA | Light shadow |
| `--funkis-shadow` | #B4BAC2 | Medium shadow |
| `--funkis-granite` | #6B6862 | Grey, like stone |
| `--funkis-steel` | #3A3A3C | Dark grey |
| `--funkis-iron` | #1C1C1E | Near-black |
| `--funkis-red` | #C82D2D | Sundt vermillion — primary accent |
| `--funkis-red-hover` | #A82424 | Darker red for hover |
| `--funkis-red-subtle` | #F9EEEE | Tinted red background |
| `--funkis-green` | #1E7A3A | Success green |
| `--funkis-green-subtle` | #EEF6F0 | Tinted green background |
| `--funkis-amber` | #B8860B | Warning amber |
| `--funkis-amber-subtle` | #FDF6E8 | Tinted amber background |

### Semantic tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--color-bg` | #F2F2F0 | Page background |
| `--color-bg-surface` | #FFFFFF | Card/panel background |
| `--color-surface` | #F8F8F6 | Subtle surface |
| `--color-bg-elevated` | #FFFFFF | Elevated elements (modals) |
| `--color-border` | #D8D8D4 | Default border |
| `--color-border-subtle` | #E8E8E4 | Light border |
| `--color-border-strong` | var(--funkis-granite) | Emphasis border |
| `--color-text-primary` | #141414 | Body text (7.88:1 on white) |
| `--color-text-secondary` | #4D4D4D | Secondary text (6.96:1 — WCAG AA+AAA) |
| `--color-text-muted` | #595959 | Muted text (7.01:1 — WCAG AA at all sizes) |
| `--color-accent` | var(--funkis-red) | Primary accent / CTA |
| `--color-accent-hover` | var(--funkis-red-hover) | Accent hover state |
| `--color-accent-subtle` | var(--funkis-red-subtle) | Accent background tint |

### Status badge colors

| Badge | Token | Value |
|-------|-------|-------|
| Today | `--color-today` | var(--funkis-red) |
| Free | `--color-free` | #1A6B35 |
| Sold Out | `--color-soldout` | #8B1A1A |
| Last Tickets | `--color-lasttickets` | var(--funkis-amber) |
| Cancelled | `--color-cancelled` | var(--funkis-granite) |

### Category placeholder colors

Used when an event has no image — colored background with category icon.

| Category | Token | Hex |
|----------|-------|-----|
| Music | `--color-cat-music` | #AECDE8 |
| Culture | `--color-cat-culture` | #C5B8D9 |
| Theatre | `--color-cat-theatre` | #E8B8C2 |
| Family | `--color-cat-family` | #F5D49A |
| Food | `--color-cat-food` | #E8C4A0 |
| Festival | `--color-cat-festival` | #F5E0A0 |
| Sports | `--color-cat-sports` | #A8D4B8 |
| Nightlife | `--color-cat-nightlife` | #9BAED4 |
| Workshop | `--color-cat-workshop` | #D4B89A |
| Student | `--color-cat-student` | #B8D4A8 |
| Tours | `--color-cat-tours` | #A8CCCC |

---

## Typography

### Font families
- **Display:** `'Barlow Condensed', system-ui, sans-serif` (`--font-display`)
- **Body:** `'Inter', system-ui, sans-serif` (`--font-body`)

### Type scale

| Element | Size | Weight | Font |
|---------|------|--------|------|
| Page title / H1 | 32px | 700 | Body (Inter) |
| Section headers / H2 | 20px | 600 | Body (Inter) |
| Card title / H3 | 18px | 600 | Body (Inter) |
| Date / Location | 14px | 400–500 | Body (Inter) |
| Badge text | 12px | 500 | Body (Inter) |
| Price | 13px | 600 | Body (Inter) |
| Uppercase labels | 11px (0.6875rem) | 500 | Display (Barlow Condensed) |

### Special rules
- Headings default to body font; display font used for `.label-caps` elements
- `font-variant-numeric: tabular-nums` on all dates, times, prices
- `-webkit-font-smoothing: antialiased` on html element
- Line height for headings: 1.15

---

## Spacing

Uses Tailwind CSS 4 utility classes. Key spacing values:

| Use | Value | Tailwind |
|-----|-------|----------|
| Card gap | 1.5rem (24px) | `gap-6` |
| Card padding | 1rem (16px) | `p-4` |
| Section spacing | 2rem (32px) | `my-8` |
| Touch target minimum | 44px | WCAG requirement |

---

## Shadows

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 4px rgba(20,20,20,0.06)` | Subtle elevation |
| `--shadow-md` | `0 2px 8px rgba(20,20,20,0.08)` | Cards, dropdowns |
| `--shadow-lg` | `0 4px 16px rgba(20,20,20,0.12)` | Modals, popovers |

Card hover: `box-shadow: 0 4px 12px rgba(0,0,0,0.10); transform: translateY(-2px); transition: 0.2s ease`

---

## Component Inventory (20 components)

All components live in `src/lib/components/`.

| Component | File | Purpose |
|-----------|------|---------|
| Header | `Header.svelte` | Sticky header with language switch |
| Footer | `Footer.svelte` | Links: about, datainnsamling, contact |
| HeroSection | `HeroSection.svelte` | Compact hero with tagline |
| EventCard | `EventCard.svelte` | Grid card: image, title, date, venue, category, price |
| EventListItem | `EventListItem.svelte` | List row variant (compact) |
| EventGrid | `EventGrid.svelte` | Date-grouped responsive grid layout |
| EventDiscovery | `EventDiscovery.svelte` | Progressive 5-step filter (When/Time/Who/What/Where & Price) |
| FilterPill | `FilterPill.svelte` | Reusable pill/chip button (aria-pressed, 44px touch) |
| MiniCalendar | `MiniCalendar.svelte` | Inline month-grid date picker (ARIA grid pattern) |
| FilterBar | `FilterBar.svelte` | Mobile filter row (category pills, dropdowns) |
| FilterSidebar | `FilterSidebar.svelte` | Desktop sticky sidebar (categories, bydel, price, audience) |
| SearchBar | `SearchBar.svelte` | Text search across titles and venues |
| CalendarDropdown | `CalendarDropdown.svelte` | Add to Calendar dropdown (event detail pages, ICS/Google Calendar/Outlook). Full WAI-ARIA menu keyboard nav. |
| DateQuickFilters | `DateQuickFilters.svelte` | Buttons: Today, This Weekend, Next 7 Days |
| StatusBadge | `StatusBadge.svelte` | Display badges: Today, Trolig gratis/Likely free, Sold Out, Last Tickets, Cancelled, Fremhevet/Featured |
| LoadMore | `LoadMore.svelte` | "Load more events" button with progress |
| EmptyState | `EmptyState.svelte` | "No events found" message with suggestions |
| BackToTop | `BackToTop.svelte` | Sticky scroll-to-top button |
| LanguageSwitch | `LanguageSwitch.svelte` | NO/EN toggle (text labels, never flags) |
| ImagePlaceholder | `ImagePlaceholder.svelte` | Category-colored fallback for missing images |

### Planned but not yet built (from design-brief component tree)
- NavLinks (desktop navigation)
- ViewToggle (Grid | List, Map in v2)
- SortDropdown
- AppliedFilterChips (removable chips + Clear All)
- Bottom navigation bar (mobile)

*Note: Result count announcements are handled inline via `aria-live="polite" aria-atomic="true"` on the homepage results wrapper — no separate ResultCount component needed.*

---

## Grid Layout

```css
.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
}
```

Breakpoints:
- Mobile (<768px): 1 column
- Tablet (768px): 2 columns
- Desktop (1024px): 3 columns
- Wide (1280px): 4 columns

---

## Card Specifications

- Min width: 300px (desktop)
- Full width on mobile
- Image aspect ratio: 16:9
- Image height: ~180px desktop, ~200px mobile
- Border radius: 12px
- Border: `1px solid var(--color-border)`
- Status badge: top-left overlay on image

---

## Accessibility (WCAG 2.2 Level AA)

- **Text contrast:** Normal text ≥4.5:1, large text ≥3:1, UI components ≥3:1
- **Touch targets:** Minimum 44x44px
- **Color:** Never used alone — all badges = color + icon + text
- **Keyboard:** Tab through cards, Arrow keys in date picker, Escape closes modals
- **Screen readers:** `<ul>`/`<li>` for card lists, `<article>` inside `<li>`, `<time datetime>`, `aria-live="polite"` for filter counts
- **Skip link:** "Skip to event listings" visible on focus
- **ARIA landmarks:** `<header>`, `<nav aria-label="Main">`, `<main>`, `<footer>`

---

## Dark Mode

Currently disabled. Components use hardcoded `bg-white`. Full implementation requires replacing all `bg-white` with `bg-[var(--color-bg-surface)]` across multiple components. Noted as TODO in `app.css`.

---

## References

- See `design-brief.md` for full component specs, HTML structure, and interaction patterns
- See `src/app.css` for the live CSS token definitions
- See `DECISION-LOG.md` #4, #5, #20 for design system decisions
