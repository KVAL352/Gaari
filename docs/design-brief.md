# DESIGN BRIEF: Gåri — Bergen Event Discovery

**Updated: February 26, 2026**
**Status: Reconciled with project-strategy.md — ready to build**

This document specifies how the frontend should look and behave. For product scope, data sources, moderation, and launch plan, see `project-strategy.md`.

---

## PROJECT OVERVIEW

Build a Bergen, Norway event discovery website.

- **Name:** Gåri (from bergensk "ke det går i?" = "what's going on?")
- **Primary action:** Browse upcoming events
- **Audiences:** Locals, tourists, students, families with children
- **Philosophy:** Functionality-first. Speed and usability over decoration.
- **Languages:** Norwegian (default) + English toggle
- **Target devices:** Mobile-first (65%+ of users), then tablet, then desktop

---

## TECH STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | SvelteKit | Easiest step from vanilla JS, real HTML templates |
| Components | Custom Funkis system | Design tokens in app.css, inspired by Bergen's Sundt building (1938) |
| Styling | Tailwind CSS | Utility-first, works great with SvelteKit |
| Font | Inter + Barlow Condensed (self-hosted woff2) | Body + display. No external font requests. |
| Icons | Lucide Svelte | Same icon set as Lucide React, Svelte-native |
| Backend/DB | Supabase (PostgreSQL) | Auth, API, storage — free tier |
| Hosting | Vercel | Auto-deploy, SvelteKit adapter included |

---

## PAGE STRUCTURE

Build these page types:

### Page 1: Homepage / Discovery (main page)
1. Sticky header (logo + language toggle + nav)
2. Hero section (search bar + date quick-filters)
3. Sticky filter bar (below hero on scroll)
4. Event sections grouped by date
5. Load More button
6. Footer

### Page 2: Event Detail Page
1. Hero image (full width)
2. Essential info block above fold: title, date/time, venue, price, primary CTA
3. Full description (bilingual — show user's language, toggle to see other)
4. Venue map embed
5. Add to Calendar button (ICS export)
6. Suggest Correction button (community editing — see strategy doc)
7. Related events carousel
8. Organizer's other events

### Page 3: Category / Filtered Results Page
- Same layout as Homepage but with breadcrumb and category header

### Page 4: Submit Event (MVP)
- Organizer submission form
- All submissions reviewed by admin before publishing
- See strategy doc section 5 (Moderation Model)

### Page 5: About
- About Gåri, contact info, how to submit events

### Admin Pages (not public)
- `/admin/review` — Pending submissions + edit suggestions
- `/admin/events` — Manage all events
- `/admin/sources` — Manage API imports

---

## HEADER (sticky, always visible)

```
[Logo / Gåri]                   [Norsk | English]  [☰ Menu]
```

Mobile: Logo left, Language toggle + hamburger right.
Desktop: Logo left, nav links center, language toggle right.

Navigation links: Utforsk/Explore · Kategorier/Categories · Kart/Map · Lagret/Saved

---

## HERO SECTION

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   Ke det går i Bergen?                               │
│   ┌─────────────────────────────────────────────┐   │
│   │ 🔍  Search events, venues, or artists...    │   │
│   └─────────────────────────────────────────────┘   │
│                                                      │
│   [Today] [Tomorrow] [This Weekend] [This Week]      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Background: Solid color or very subtle Bergen photo (do NOT autoplay video)
- Search bar min-width: 400px desktop, 100% mobile
- Date pills are clickable filters that update the listing below
- No large decorative images that push event content below the fold

---

## STICKY FILTER BAR

Sticks below header when user scrolls past hero.

Desktop layout:
```
┌──────────────────────────────────────────────────────────────────┐
│ [📅 Date ▼]  [🎭 Category ▼]  [📍 Bydel ▼]  [💰 Price ▼]  [👥 For ▼]  [⋯ More] │
├──────────────────────────────────────────────────────────────────┤
│ Active: [Music ✕] [Free ✕] [Sentrum ✕]   Clear All             │
├──────────────────────────────────────────────────────────────────┤
│ 47 events found  ·  Sort: [Date ▼]   [⊞ Grid] [☰ List] [🗺 Map] │
└──────────────────────────────────────────────────────────────────┘
```

Mobile layout:
- Horizontally scrollable filter chips row
- Tapping a chip opens a bottom sheet with options
- "Filters" button opens full-screen filter modal
- Active filters shown as removable chips below
- Result count updates in real time via `aria-live="polite"`

### Filter Options

**Date (Tier 1 — always visible):**
- I dag / Today
- I morgen / Tomorrow
- Denne helgen / This Weekend
- Denne uken / This Week
- Velg datoer / Choose Dates (date range picker)

**Category (Tier 1 — always visible):**
- Musikk & Konserter / Music & Concerts
- Kunst & Kultur / Arts & Culture
- Teater & Scenekunst / Theatre & Performing Arts
- Familie & Barn / Family & Kids
- Mat & Drikke / Food & Drink
- Festivaler & Markeder / Festivals & Markets
- Sport & Friluft / Sports & Outdoors
- Uteliv / Nightlife
- Kurs & Workshops / Workshops & Classes
- Studentarrangementer / Student Events
- Turer & Sightseeing / Tours & Sightseeing

**Bydel / Area (Tier 1 — always visible):**
- Alle / All
- Sentrum
- Bergenhus
- Fana
- Ytrebygda
- Laksevåg
- Fyllingsdalen
- Åsane
- Arna

**Price (Tier 2):**
- Alle / All
- Gratis / Free
- Betalt / Paid
- kr 0–100 / kr 100–300 / kr 300–500 / kr 500+

**Audience (Tier 2 — quick-filter pills):**
- Alle arrangementer / All Events
- Turisthøydepunkter / Tourist Highlights
- Studenttilbud / Student Deals
- Familievennlig / Family Friendly
- Gratis / Free Events

**More Filters (Tier 3 — behind "More" button):**
- Inne / Ute — Indoor / Outdoor (Bergen has 231 rain days/year)
- Språk / Language of event
- Tilgjengelighet / Accessibility features
- Spesifikt sted / Specific venue

---

## EVENT CARD COMPONENT

This is the most important component. Get this right first.

### Card information hierarchy (top to bottom):
1. Event image (16:9 ratio) — with status badge overlay
2. Event title (h3, max 2 lines, ellipsis overflow)
3. Date & time (relative for ≤6 days, absolute beyond)
4. Venue / Location + Bydel
5. Price
6. Save button (heart icon)

### Card HTML structure (Svelte):
```svelte
<li class="event-card">
  <article>
    <div class="card-image-wrapper">
      <img src={event.image_url} alt="" loading="lazy" width="400" height="225" />
      <!-- Status badge if applicable -->
      {#if badge}
        <span class="badge badge--{badge.type}" aria-label={badge.ariaLabel}>{badge.text}</span>
      {/if}
    </div>
    <div class="card-body">
      <h3 class="card-title">
        <a href="/events/{event.slug}" class="card-link">{event.title}</a>
      </h3>
      <time datetime={event.date_start} class="card-date">
        {formatEventDate(event.date_start, locale)}
      </time>
      <p class="card-location">{event.venue_name}, {event.bydel}</p>
    </div>
    <div class="card-footer">
      <span class="card-price">{formatPrice(event.price, locale)}</span>
      <button aria-label="{$t('save')} {event.title}" class="btn-save">
        ♡
      </button>
    </div>
  </article>
</li>
```

### Status badges (overlay image, top-left):
| Badge | Color | When to show |
|-------|-------|-------------|
| I dag / Today | Blue | Event is today |
| Gratis / Free | Green | Price is 0 |
| Utsolgt / Sold Out | Red | No tickets available |
| Siste billetter / Last Tickets | Orange | <10% tickets remaining |
| Avlyst / Cancelled | Gray | Event cancelled |

**IMPORTANT:** Never use color alone. Every badge = color + icon + text.

### Card sizing:
- Desktop: 300px min-width, grid auto-fill
- Mobile: 100% width, single column
- Image height: ~180px desktop, ~200px mobile
- Border radius: 12px
- Border: 1px solid var(--color-border)

### Card hover state:
```css
.event-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.10);
  transform: translateY(-2px);
  transition: box-shadow 0.2s ease, transform 0.15s ease;
}
```

### No-image placeholder:
When an event has no image, show a colored background (based on category) with a centered category icon. Do NOT show broken image icons.

```
Category            → Background color → Icon
Music & Concerts    → #dbeafe (blue)   → 🎵
Theatre             → #fce7f3 (pink)   → 🎭
Family & Kids       → #d1fae5 (green)  → 👨‍👩‍👧
Festivals & Markets → #fef3c7 (yellow) → 🎪
Sports & Outdoors   → #fee2e2 (red)    → ⚽
Arts & Culture      → #e0e7ff (purple) → 🖼
Food & Drink        → #ffedd5 (orange) → 🍽
Nightlife           → #f3e8ff (violet) → 🌙
Workshops & Classes → #e0f2fe (cyan)   → 🔧
Student Events      → #fef9c3 (lime)   → 🎓
Tours & Sightseeing → #ecfdf5 (teal)   → 🏔
```

---

## EVENT GRID LAYOUT

```css
.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
}
/* Mobile: 1 col | Tablet 768px: 2 col | Desktop 1024px: 3 col | Wide 1280px: 4 col */
```

Group events by date section with a section header:
```
── I dag — 5 arrangementer / Today — 5 events ──────
[Card] [Card] [Card] [Card] [Card]

── I morgen — 3 arrangementer / Tomorrow — 3 events ─
[Card] [Card] [Card]

── Lørdag 21. feb — 8 arrangementer ─────────────────
[Card] [Card] [Card] [Card] [Card] [Card] [Card] [Card]
```

---

## DATE DISPLAY LOGIC

```javascript
function formatEventDate(dateStr, locale = 'en') {
  const date = new Date(dateStr);
  const diffDays = Math.floor((date - new Date()) / 86400000);

  if (diffDays === 0) return locale === 'no' ? 'I dag' : 'Today';
  if (diffDays === 1) return locale === 'no' ? 'I morgen' : 'Tomorrow';
  if (diffDays >= 2 && diffDays <= 6) {
    return date.toLocaleDateString(locale === 'no' ? 'nb-NO' : 'en-GB', { weekday: 'long' });
  }
  return date.toLocaleDateString(locale === 'no' ? 'nb-NO' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short'
  });
}
```

Always use `<time datetime="2026-02-20T19:00">` HTML element.

---

## LOAD MORE (not infinite scroll)

```
[Viser 20 av 156 arrangementer / Showing 20 of 156 events]

        [  Vis flere / Load More Events  ]

        ↑ Tilbake til toppen / Back to top
```

- Show progress: "Showing X of Y events"
- Load 12–20 cards per batch
- Preserve scroll position on back-navigation
- Store page state in URL params: `?page=2`
- Show floating "Back to Top" button after 2 screens of scroll

**DO NOT use infinite scroll.** It breaks keyboard navigation, makes the footer unreachable, and causes layout memory issues.

---

## EMPTY STATE

When filters return no results:

```
          🔍

    Ingen treff / No events found

  Prøv å justere filtrene dine eller
  søk etter noe annet.

  [Fjern alle filtre / Clear All Filters]   [Se alle / Browse All Events]

  ── Populært akkurat nå / Popular right now ──
  [Card]  [Card]  [Card]
```

If a specific filter caused the empty state, say which one:
"Prøv å fjerne 'Gratis' eller utvid datoområdet." / "Try removing 'Free' or expanding your date range."

---

## VIEWS: GRID / LIST / MAP

### Grid view (default)
Cards in responsive grid as described above.

### List view
Compact horizontal cards showing: image thumbnail (80x60px) + title + date + venue + price + save button. One row per event. Good for scanning many events quickly.

### Map view (v2 — not MVP)
- Desktop: 40% list left / 60% map right (split screen)
- Mobile: Full-screen map with bottom sheet that slides up showing event cards
- Cluster nearby events on the map
- Show event name on pin hover/tap
- Selecting a map pin highlights the corresponding card in the list
- Uses latitude/longitude fields from event data model

**Note:** Map view is deferred to v2. The ViewToggle should show Grid and List for MVP, with Map added later.

---

## SEARCH BAR

### MVP (simplified):
- Basic text search across event titles and venue names
- Results page with standard filter layout
- No autocomplete in v1

### v2 (full):
- Autocomplete from first keystroke, response < 200ms
- Show 6–8 suggestions max (desktop), 4–6 (mobile)
- Group suggestions: Events (thumbnail + date + venue) / Categories / Venues
- Show recent searches on focus (stored in localStorage)
- Show trending searches for new users

Placeholder: "Søk etter arrangementer, steder eller artister... / Search events, venues, or artists..."

---

## URL STATE MANAGEMENT

All filters must update the URL. Every filtered view must be bookmarkable and shareable.

URL format: `/events?when=weekend&category=music&bydel=sentrum&price=free&audience=family`

```javascript
// On filter change (SvelteKit — use goto or replaceState):
const params = new URLSearchParams($page.url.search);
params.set('category', 'music');
goto(`?${params.toString()}`, { replaceState: true, noScroll: true });
```

On page load, read filters from URL and apply them before rendering.

Language prefix: `/no/events?...` and `/en/events?...`

---

## LANGUAGE SYSTEM

- Default: detect from `navigator.language`
- Toggle: top-right header, always visible — show "Norsk" and "English" (never flags alone)
- Store choice in localStorage
- URL prefix: `/no/events` and `/en/events`
- Event content: show user's language first; if translation missing, show the available language with a note

Key translations:
```javascript
const t = {
  no: {
    today: 'I dag', tomorrow: 'I morgen', thisWeekend: 'Denne helgen',
    thisWeek: 'Denne uken', free: 'Gratis', soldOut: 'Utsolgt',
    lastTickets: 'Siste billetter', cancelled: 'Avlyst',
    showMore: 'Vis flere', clearAll: 'Fjern alle', noResults: 'Ingen treff',
    searchPlaceholder: 'Søk etter arrangementer, steder eller artister...',
    eventsFound: (n) => `${n} arrangementer funnet`,
    suggestCorrection: 'Foreslå rettelse',
    submitEvent: 'Send inn arrangement',
    save: 'Lagre'
  },
  en: {
    today: 'Today', tomorrow: 'Tomorrow', thisWeekend: 'This Weekend',
    thisWeek: 'This Week', free: 'Free', soldOut: 'Sold Out',
    lastTickets: 'Last Tickets', cancelled: 'Cancelled',
    showMore: 'Show More', clearAll: 'Clear All', noResults: 'No events found',
    searchPlaceholder: 'Search events, venues, or artists...',
    eventsFound: (n) => `${n} events found`,
    suggestCorrection: 'Suggest correction',
    submitEvent: 'Submit event',
    save: 'Save'
  }
};
```

Norwegian date format: `nb-NO` locale, 24-hour clock, DD.MM.YYYY.

---

## TYPOGRAPHY

Fonts: **Inter** (body) + **Barlow Condensed** (display), self-hosted woff2 in `static/fonts/`. No external font requests.

```css
/* Fonts declared via @font-face in app.css — no Google Fonts import */
:root {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
/* Use tabular numbers for all dates, times, prices */
.card-date, .card-price, time { font-variant-numeric: tabular-nums; }
```

| Element | Size | Weight |
|---------|------|--------|
| Page title / H1 | 32px | 700 |
| Section headers | 20px | 600 |
| Card title | 18px | 600 |
| Date / Location | 14px | 400–500 |
| Badge text | 12px | 500 |
| Price | 13px | 600 |

---

## COLOR SYSTEM

```css
:root {
  /* Base */
  --color-bg: #ffffff;
  --color-surface: #f9fafb;
  --color-border: #e5e7eb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;

  /* Status */
  --color-today: #2563eb;      /* Blue */
  --color-free: #16a34a;       /* Green */
  --color-soldout: #dc2626;    /* Red */
  --color-lasttickets: #ea580c; /* Orange */
  --color-cancelled: #6b7280;  /* Gray */

  /* Category placeholders */
  --color-cat-music: #dbeafe;
  --color-cat-theatre: #fce7f3;
  --color-cat-family: #d1fae5;
  --color-cat-festival: #fef3c7;
  --color-cat-sports: #fee2e2;
  --color-cat-culture: #e0e7ff;
  --color-cat-food: #ffedd5;
  --color-cat-nightlife: #f3e8ff;
  --color-cat-workshop: #e0f2fe;
  --color-cat-student: #fef9c3;
  --color-cat-tours: #ecfdf5;
}
```

---

## ACCESSIBILITY REQUIREMENTS (WCAG 2.2 Level AA)

These are legal requirements under the European Accessibility Act (applies to Norway).

**Color contrast:**
- Normal text: minimum 4.5:1 ratio
- Large text (18pt+ or 14pt+ bold): minimum 3:1
- UI components (borders, icons): minimum 3:1

**Never use color alone.** Every status badge = color + icon + text.

**Touch targets:** Minimum 44x44px for all interactive elements.

**Keyboard navigation:**
- Tab through cards (focuses the h3 link)
- Arrow keys in date picker
- Escape closes modals and bottom sheets
- Add "Skip to event listings" link visible on focus

**Screen reader support:**
- Use `<ul>`/`<li>` for card lists (announces "list, X items")
- Use `<article>` inside each `<li>`
- Use `<time datetime="...">` for all dates
- Decorative images: `alt=""`
- Save buttons: `aria-label="Save [Event Name] to favorites"`
- Filter result count: `aria-live="polite"` so screen readers announce changes
- All ARIA landmarks: `<header>`, `<nav aria-label="Main">`, `<main>`, `<footer>`

---

## PERFORMANCE TARGETS

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | ≤ 2.5 seconds |
| INP (Interaction to Next Paint) | ≤ 200ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 |
| Total initial page weight | < 1.5MB |
| JavaScript (compressed) | < 300KB |
| CSS (compressed) | < 100KB |
| Above-fold images | < 200KB total |

**Images:**
- Set explicit `width` and `height` on all `<img>` tags to prevent layout shift
- Use `aspect-ratio: 16/9` on image containers
- Eager load first 4 cards, lazy load everything else: `loading="lazy"`
- Use WebP format, target 30–50KB per card thumbnail
- Use `<picture>` with avif/webp/jpg fallbacks

---

## MOBILE-SPECIFIC PATTERNS

**Bottom navigation bar (mobile only):**
```
[ 🔍 Utforsk ] [ 🗺 Kart ] [ 🔖 Lagret ] [ 🌐 Språk ]
```

**Filter interaction on mobile:**
- Filter chips: horizontal scroll row at top
- Tap chip → bottom sheet slides up with options
- Bottom sheet has sticky "Vis X resultater / Show X Results" button
- "Flere filtre / More Filters" opens full-screen modal

**Thumb zone:** Place all primary actions (search, filter CTA, Load More) in bottom 60% of screen.

**No hover states on mobile** — use press/tap visual feedback instead (background color change on tap).

---

## COMPONENT TREE (full)

```
App
├── StickyHeader
│   ├── Logo ("Gåri")
│   ├── NavLinks (desktop only)
│   └── LanguageSwitch ("Norsk" | "English")
├── HeroSection
│   ├── Headline ("Ke det går i Bergen?")
│   ├── SearchBar
│   └── DateQuickFilters (I dag | I morgen | Denne helgen | Denne uken)
├── StickyFilterBar
│   ├── FilterDropdowns (Date, Category, Bydel, Price, Audience)
│   ├── AppliedFilterChips (removable chips + Clear All)
│   ├── ResultCount (aria-live)
│   ├── SortDropdown
│   └── ViewToggle (Grid | List)  ← Map added in v2
├── EventContent (switches based on ViewToggle)
│   ├── GridView
│   │   ├── DateSection ("I dag — 5 arrangementer")
│   │   │   └── EventGrid
│   │   │       └── EventCard (×n)
│   │   │           ├── EventImage OR ImagePlaceholder
│   │   │           ├── StatusBadge (conditional)
│   │   │           ├── EventTitle (h3 > a)
│   │   │           ├── EventDateTime (time element)
│   │   │           ├── EventLocation + Bydel
│   │   │           ├── PriceBadge
│   │   │           └── SaveButton
│   │   └── DateSection ("I morgen — 3 arrangementer") ...
│   ├── ListView (compact rows)
│   └── MapView (v2)
├── LoadMoreButton ("Viser 20 av 156 arrangementer")
├── BackToTopButton (floating, appears after 2 screens)
├── EmptyState (shown when no results)
│   ├── Icon + Message
│   ├── SuggestionText
│   ├── CTAButtons (Clear Filters | Browse All)
│   └── PopularEventsRow
└── Footer
    ├── CategoryLinks
    ├── SubmitEventLink
    ├── AboutLink
    ├── LanguageSwitch
    └── AccessibilityStatement
```

---

## WHAT NOT TO BUILD

Do NOT include any of these:

- Auto-playing video backgrounds
- Infinite scroll (use Load More instead)
- Forced account creation before browsing
- Push notification permission prompts
- Newsletter popup on page load
- Chat widget / chatbot
- Sponsor logos in the header or competing with event content
- Social media feed widgets
- Large decorative hero that pushes events below the fold
- Color-only status indicators (always pair color + icon + text)
- Hidden fees (show full price on cards)
- Broken image icons (use category placeholder instead)
- "Shrunk desktop" mobile layout — mobile must be designed independently

---

## BERGEN-SPECIFIC NOTES

- Bergen has 231 rain days/year → Indoor/Outdoor filter (Tier 3)
- Bergen is Norway's busiest cruise port → "Today only" and "Tourist Highlights" filters serve cruise visitors
- ~35,000 students (UiB, NHH, HVL) → Student Deals audience filter is high value
- Bergen is highly walkable from Bryggen → bydel filter covers area discovery (distance from center deferred)
- Consider a "Regnværsideer / Rainy Day Ideas" curated collection on the homepage (v2)

---

## BUILD ORDER (MVP)

1. **EventCard** component (most important — get this right first)
2. **EventGrid** layout (CSS Grid, responsive, date grouping)
3. **FilterBar** with URL state management (Date, Category, Bydel, Price)
4. **DateQuickFilters** with display logic (Today/Tomorrow/etc.)
5. **SearchBar** (basic text search — no autocomplete in v1)
6. **Load More** pagination
7. **EmptyState** component
8. **Language toggle** (Norsk / English) with i18n
9. **Event detail page** with ICS calendar export + suggest correction
10. **Submit event form** + admin review page

### Deferred to v2:
- Map view
- Search autocomplete
- Saved/favorites with user accounts
- Weekly email digest
- Verified organizer accounts
- "Rainy Day Ideas" curated collection
- Distance from city center on cards

---

## CATEGORY ALIGNMENT

The strategy and brief use these **11 unified categories** (matching both the database enum and the UI filter):

| Database value | Norwegian | English |
|---------------|-----------|---------|
| `music` | Musikk & Konserter | Music & Concerts |
| `culture` | Kunst & Kultur | Arts & Culture |
| `theatre` | Teater & Scenekunst | Theatre & Performing Arts |
| `family` | Familie & Barn | Family & Kids |
| `food` | Mat & Drikke | Food & Drink |
| `festival` | Festivaler & Markeder | Festivals & Markets |
| `sports` | Sport & Friluft | Sports & Outdoors |
| `nightlife` | Uteliv | Nightlife |
| `workshop` | Kurs & Workshops | Workshops & Classes |
| `student` | Studentarrangementer | Student Events |
| `tours` | Turer & Sightseeing | Tours & Sightseeing |

**Note:** The strategy's original "community" category has been split into more specific categories above. Events that would have been "community" can be categorized as festival, workshop, or culture depending on the event.

---

*Design brief created: February 18, 2026*
*Reconciled with project-strategy.md on same date*
*Both documents should be kept in sync — strategy = what/when, brief = how it looks/works*
