# EventDiscovery Filter Redesign — Implementation Spec for Claude Code

**Goal:** Redesign the EventDiscovery filter panel on the homepage so that users immediately understand it's an interactive filtering tool, not a static form. The prototype is at `docs/filter-prototype.jsx` (React) — translate the design into the existing Svelte 5 codebase.

**Scope:** Changes to `EventDiscovery.svelte` and `FilterPill.svelte`. Possibly a new `ActiveFilterChips.svelte`. No changes to data loading, URL state, or `+page.server.ts`.

---

## What's wrong with the current design (see screenshot)

1. All pills look identical — grey outlines, same size, no visual hierarchy
2. No indication of what's inside each filter (no counts, no context)
3. "HVEM" and "NÅR?" labels feel like a form, not a discovery tool
4. No feedback on what's currently selected (no active filter summary)
5. No result count — user doesn't know if the filter is working
6. "Flere filtre" dropdown gives no hint about what's inside
7. Category colors from the design system aren't used in the filter — missed opportunity to connect filters to event cards

---

## Design changes to implement

### 1. Counts on every pill

Every filter pill should show a count of matching events in parentheses or as a trailing number.

```svelte
<!-- Before -->
<FilterPill label="Familievennlig" />

<!-- After -->
<FilterPill label="Familievennlig" count={34} />
```

The count comes from the server data. In `+page.server.ts`, the event data is already loaded. The counts should be computed from the actual event data for each filter option. If computing real counts is too complex for this pass, use the `totalEvents` count and filter client-side from the loaded events array.

Count styling: `font-size: 11px`, `font-variant-numeric: tabular-nums`, `color: var(--color-text-muted)` (inactive) or `white/80%` opacity (active on red bg).

### 2. Icons on audience pills

Add a leading icon/emoji to each audience option for faster visual scanning:

| Audience | Icon |
|----------|------|
| Alle | ✦ |
| Familievennlig | 👨‍👩‍👧 |
| Voksne | 🎭 |
| Studenter | 🎓 |
| 18+ | 🌙 |
| Turister | 🏔 |

Implementation: Add an `icon` prop to `FilterPill.svelte`. Render before the label text.

### 3. Date context on "when" pills

Each time pill should show a sublabel with the actual date:

| Pill | Sublabel |
|------|----------|
| I dag | fre 28. feb (computed from current date, `nb-NO` locale) |
| I morgen | lør 1. mar |
| Denne helgen | fre–søn |
| Denne uken | 7 dager |
| Velg datoer | (no sublabel) |

Sublabel styling: `font-size: 11px`, `font-weight: 400`, `color: var(--color-text-muted)` (inactive) or `white/70%` (active).

### 4. Active filter chips at top of panel

When any filter is active, show removable chips at the very top of the filter panel, above the first section label. Each chip shows the filter value with an × button.

```svelte
{#if activeFilters.length > 0}
  <div class="flex flex-wrap gap-1.5 mb-4 pb-3.5 border-b border-[var(--color-border-subtle)]">
    {#each activeFilters as chip}
      <button
        class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold
               bg-[var(--funkis-red-subtle)] text-[var(--funkis-red)]
               hover:bg-[var(--funkis-red)] hover:text-white transition-colors"
        onclick={() => chip.onRemove()}
      >
        {chip.label}
        <span class="text-sm leading-none">×</span>
      </button>
    {/each}
  </div>
{/if}
```

This gives permanent visibility of active state and a one-click path to remove any filter.

### 5. Category pills with color dots

Categories should use their color from the design system. When inactive, show a small colored dot before the label. When active, fill the pill background with the category color.

The category colors already exist in `app.css`:

```
--color-cat-music: #AECDE8
--color-cat-culture: #C5B8D9
--color-cat-theatre: #E8B8C2
--color-cat-family: #F5D49A
--color-cat-food: #E8C4A0
--color-cat-festival: #F5E0A0
--color-cat-sports: #A8D4B8
--color-cat-nightlife: #9BAED4
--color-cat-workshop: #D4B89A
--color-cat-student: #B8D4A8
--color-cat-tours: #A8CCCC
```

Implementation in FilterPill: Add a `color` prop. When variant is `category`:
- **Inactive:** White background, subtle border, 8px colored dot before label
- **Hover:** Very light tint of category color as background (`{color}22`), category color as border
- **Active:** Category color as background, `var(--funkis-iron)` text, subtle box-shadow with category color

This connects the filter pills visually to the ImagePlaceholder colors on event cards.

### 6. Expandable category and bydel sections

Wrap Kategori and Bydel in expandable containers. Default state: collapsed, showing only a pill-shaped toggle button. When categories are selected, show a count badge on the toggle.

```svelte
<button
  class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm font-medium
         text-[var(--color-text-secondary)] transition-all"
  class:border-[var(--color-border)]={expanded}
  class:bg-[var(--color-surface)]={expanded}
  class:border-[var(--color-border-subtle)]={!expanded}
  class:bg-white={!expanded}
  onclick={() => expanded = !expanded}
>
  <span>Kategori</span>
  {#if selectedCategories.length > 0}
    <span class="w-[18px] h-[18px] rounded-full bg-[var(--funkis-red)] text-white
                 text-[10px] font-bold inline-flex items-center justify-center">
      {selectedCategories.length}
    </span>
  {/if}
  <span class="text-[10px] text-[var(--funkis-granite)] transition-transform"
        class:rotate-180={expanded}>▼</span>
</button>

{#if expanded}
  <div class="mt-3 pl-1" transition:slide={{ duration: 200 }}>
    <!-- category pills here -->
  </div>
{/if}
```

### 7. Result counter at bottom of panel

Show a live result count at the bottom of the filter panel, separated by a subtle top border.

```svelte
<div class="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)] mt-1.5">
  <div class="flex items-baseline gap-1.5">
    <span class="font-display text-[28px] font-bold text-[var(--funkis-red)] leading-none tabular-nums">
      {resultCount}
    </span>
    <span class="text-[13px] text-[var(--color-text-muted)] font-medium">
      {lang === 'no' ? 'arrangementer' : 'events'}
    </span>
  </div>
  {#if hasActiveFilters}
    <button
      class="text-xs text-[var(--funkis-red)] font-semibold px-2 py-1 rounded-md
             hover:bg-[var(--funkis-red-subtle)] transition-colors"
      onclick={resetAllFilters}
    >
      {lang === 'no' ? 'Nullstill filtre' : 'Reset filters'}
    </button>
  {/if}
</div>
```

The `resultCount` should come from the actual filtered events array length, which is already computed in the page. Pass it as a prop to EventDiscovery.

### 8. Hover interaction on pills

All pills should lift on hover:

```css
/* In FilterPill.svelte or app.css */
.filter-pill {
  transition: all 0.18s ease;
}
.filter-pill:hover:not([aria-pressed="true"]) {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}
.filter-pill[aria-pressed="true"] {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
```

### 9. Section labels warmth

Change section labels from cold form labels to warmer guide text:

| Current | New (NO) | New (EN) |
|---------|----------|----------|
| HVEM | Hvem er du? | Who are you? |
| NÅR? | Når? | When? |
| (inside expandable) | Hva vil du oppleve? | What do you want to experience? |
| (inside expandable) | Hvor i Bergen? | Where in Bergen? |

Keep using `font-display` (Barlow Condensed), 11px, uppercase, `letter-spacing: 0.08em`, `color: var(--funkis-granite)`.

---

## FilterPill.svelte — updated prop interface

```typescript
interface FilterPillProps {
  label: string;
  active?: boolean;
  onclick?: () => void;
  // NEW props:
  icon?: string;        // Leading emoji/symbol
  count?: number;       // Trailing event count
  sublabel?: string;    // Secondary text (e.g. "fre 28. feb")
  color?: string;       // Category color hex (e.g. "#AECDE8")
  variant?: 'default' | 'category'; // Controls color behavior
}
```

---

## Files to modify

1. **`src/lib/components/FilterPill.svelte`** — Add `icon`, `count`, `sublabel`, `color`, `variant` props. Add hover lift. Add category color logic.
2. **`src/lib/components/EventDiscovery.svelte`** — Restructure layout: active chips at top, warm labels, expandable category/bydel, result counter at bottom. Pass counts and icons to pills.
3. **`src/app.css`** — Add `.filter-pill` hover/active transitions if not using inline Tailwind.

Optionally:
4. **New `src/lib/components/ActiveFilterChips.svelte`** — Extract the active filter chip row if EventDiscovery gets too large.

---

## Existing behavior to preserve

- URL state management (`goto` with `replaceState`) — don't change
- `aria-pressed` on all filter pills — already exists in FilterPill
- `aria-live="polite"` on result count region — already exists on homepage
- Touch target minimum 44px — already enforced
- MiniCalendar integration for "Velg datoer" — don't change
- Language toggle behavior — all labels need NO and EN variants
- The filter panel is the EventDiscovery component on the homepage; FilterBar/FilterSidebar are used on other routes — don't change those

---

## Design tokens reference (already in app.css)

```
--funkis-red: #C82D2D
--funkis-red-hover: #A82424
--funkis-red-subtle: #F9EEEE
--funkis-granite: #6B6862
--color-text-primary: #141414
--color-text-secondary: #4D4D4D
--color-text-muted: #595959
--color-border: #D8D8D4
--color-border-subtle: #E8E8E4
--color-surface: #F8F8F6
--font-display: 'Barlow Condensed', system-ui, sans-serif
--font-body: 'Inter', system-ui, sans-serif
```

---

## Accessibility requirements

- All pills: `role="button"`, `aria-pressed={active}`, minimum 44x44px touch target
- Active filter chips: `aria-label="Fjern filter: {label}"` on the × button
- Result count region: `aria-live="polite"` `aria-atomic="true"`
- Expandable sections: `aria-expanded={expanded}` on toggle button, `aria-controls` pointing to content ID
- Category color dots: purely decorative, no `aria-label` needed
- Keyboard: Tab navigates between pills, Enter/Space toggles, Escape closes expandable sections

---

## Interactive prototype

The React prototype is saved at `docs/filter-prototype.jsx`. It shows:
- The redesigned filter with all interactions working
- The current design below for comparison
- A design notes section explaining each change

Use it as the visual reference. The Svelte implementation should match its behavior and appearance, using Tailwind classes and Funkis tokens instead of inline styles.
