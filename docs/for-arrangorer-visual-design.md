# For-Arrangører Page: Visual Design Spec

**Goal:** Transform a text-only document into a page that shows the product. Every visual element answers the venue owner's question: "What would MY events look like on this?"

**Design philosophy:** Funkis — functional, honest, Bergen. No stock photos, no illustrations, no decoration. Every visual is a working product mockup built in HTML/CSS. The page should feel like a competent local showing you their work, not an agency selling a service.

**Constraints:** Solo project, no photography budget, no external image dependencies. Everything built in Svelte/HTML/CSS using existing Funkis tokens.

---

## The 5 Visual Elements (in build priority order)

### 1. Product Mockup: "Fremhevet" Card in Context

**This is the single most important visual on the page.** It shows what promoted placement actually looks like.

Build a simplified browser-frame mockup showing 3 event cards in a grid — the way they appear on a real Gåri collection page. The top card has the "Fremhevet" badge. This IS the product you're selling.

```
┌──────────────────────────────────────────────────┐
│ ● ● ●    gaari.no/no/denne-helgen                │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────┐  ┌─────────────────┐       │
│  │ ★ Fremhevet     │  │                 │       │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │       │
│  │ │  ♪ MUSIC    │ │  │ │  🎭 CULTURE │ │       │
│  │ │  (blue bg)  │ │  │ │  (purple bg)│ │       │
│  │ └─────────────┘ │  │ └─────────────┘ │       │
│  │ Bergen Filhar.  │  │ Kunstutstilling │       │
│  │ Grieghallen     │  │ KODE            │       │
│  │ Lør 15. mars    │  │ Fre 14. mars    │       │
│  │ 350 kr          │  │ Gratis          │       │
│  └─────────────────┘  └─────────────────┘       │
│                                                  │
│  ┌─────────────────┐                            │
│  │ ┌─────────────┐ │                            │
│  │ │ 🍽 FOOD     │ │                            │
│  │ │ (warm bg)   │ │                            │
│  │ └─────────────┘ │                            │
│  │ Ølsmaking       │                            │
│  │ Bergen Kjøtt    │                            │
│  │ Fre 14. mars    │                            │
│  │ 200 kr          │                            │
│  └─────────────────┘                            │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Implementation:**
- Build entirely in HTML/CSS — no images
- Browser chrome: rounded top corners (#F5F3EE background), three dots (●●● in red/yellow/green), URL bar with `gaari.no/no/denne-helgen` in monospace
- Event cards: simplified versions of actual EventCard component
  - Card image area: colored rectangle using category colors from DESIGN-SYSTEM.md (`--color-cat-music`, `--color-cat-culture`, `--color-cat-food`)
  - Category label: small uppercase text (Barlow Condensed)
  - Title: Inter 16px bold
  - Venue + date: Inter 14px, `--color-text-secondary`
  - Price: Inter 13px bold
- The "Fremhevet" card: has a `StatusBadge`-style label in top-left of image area. Red text (#C82D2D) on subtle red bg (#F9EEEE), rounded pill. Text: "Fremhevet"
- Outer frame: `--shadow-lg`, rounded-xl (12px), slight rotation `transform: rotate(-1deg)` for depth
- 2-column card grid inside the frame (fits 2 cards per row + 1 below)

**Placement:**
- In the "Hva du får" section, specifically adjacent to the "Fremhevet synlighet" feature block
- Desktop: feature text left (45%), mockup right (55%), with mockup slightly overlapping the section edge
- Mobile: full-width below the feature text, max-width 400px, centered

**Why this works:** The venue owner sees exactly what their event would look like promoted. No explanation needed — the visual IS the explanation.

---

### 2. AI Chat Mockup (polished)

The page already has an AI chat mockup concept. Polish it to look like a real AI conversation, framed inside a phone shape.

```
┌────────────────────────┐
│    ┌──┐                │  ← phone notch
│                        │
│         ○ AI           │
│    ┌──────────────┐    │
│    │ Her er noen   │    │
│    │ arrangementer │    │
│    │ i Bergen      │    │
│    │ denne helgen: │    │
│    │               │    │
│    │ • Bergen Fil..│    │
│    │ • Kunstutst...│    │
│    │               │    │
│    │ Kilde: gaari. │    │  ← red link text
│    │ no            │    │
│    └──────────────┘    │
│                        │
│    ┌──────────────┐    │
│    │Hva skjer i   │  ← │  user message (right-aligned)
│    │Bergen denne   │    │
│    │helgen?        │    │
│    └──────────────┘    │
│                        │
│  ┌──────────────────┐  │
│  │ Ask anything...  │  │  ← input bar
│  └──────────────────┘  │
└────────────────────────┘
```

**Implementation:**
- Phone frame: rounded-[2rem], `--shadow-lg`, `--funkis-iron` border (2px), aspect-ratio similar to phone (roughly 9:19.5)
- Notch: small rounded rectangle centered at top
- Messages: 
  - User bubble (right-aligned): `--funkis-plaster` background, rounded-2xl, 14px Inter
  - AI response (left-aligned): white background, rounded-2xl, 14px Inter
  - Small circle avatar for AI (just a colored dot, `--funkis-granite`, 24px)
- The citation line "Kilde: gaari.no" must be in `--funkis-red` — that's the punchline
- Input bar at bottom: `--color-bg-surface` background, rounded-full, placeholder text
- Optional: subtle CSS pulsing animation on the AI avatar (a breathing glow, 3s cycle) to suggest "alive"
- Max-width: 280px on desktop, 260px on mobile

**Placement:**
- In the AI search section (section 2)
- Desktop: text left (55%), phone mockup right (45%)
- Mobile: phone mockup centered below text, max-width 260px

**Why this works:** Most venue owners have used ChatGPT. When they see a familiar chat interface with "gaari.no" cited in red, they immediately understand the value — no explanation needed.

---

### 3. Report Mockup Card

Make "you get a monthly report" concrete by showing what one looks like.

```
┌─────────────────────────────┐
│  Grieghallen — mars 2026    │
│  ─────────────────────────  │
│                             │
│  Klikk fra Gåri      483   │  ← large number
│                    ↑ 22%    │  ← green accent
│                             │
│  Fra kuraterte sider  198   │
│  Fra AI-søk            87   │
│  Fra hovedsiden       198   │
│  ─────────────────────────  │
│                             │
│  Topp arrangement:          │
│  Bergen Filharmoniske       │
│  142 klikk                  │
│                             │
└─────────────────────────────┘
```

**Implementation:**
- Card: white background, `--shadow-sm`, rounded-xl, p-5, max-width 320px
- Title: Inter 14px bold, `--color-text-primary`
- Separator: 1px `--color-border`
- "483" number: Barlow Condensed 36px, `--funkis-red`
- "+22%" badge: `--funkis-green` text, small, inline
- Data rows: Inter 14px, tabular-nums, right-aligned numbers
- "Topp arrangement" label: Inter 12px, `--color-text-muted`
- Top event name: Inter 14px bold

**Placement:**
- In the "Hva du får" section, adjacent to the "Månedlig rapport" feature block
- Desktop: floats right of the text
- Mobile: full-width below text

**Why this works:** Concrete beats abstract. "Du får en rapport" = vague. Seeing actual numbers with green arrows = "I want that."

---

### 4. Venue Name Pills

The current horizontal text list of venue names needs visual treatment. Transform into interactive-looking pills.

```
┌──────────────┐ ┌─────┐ ┌──────────┐ ┌───────────────┐
│ Grieghallen  │ │ DNS │ │   KODE   │ │ USF Verftet   │
└──────────────┘ └─────┘ └──────────┘ └───────────────┘
┌─────────────────┐ ┌─────────────┐ ┌──────────┐
│ Bergen Bibliotek │ │ Festspillene│ │ Ole Bull │
└─────────────────┘ └─────────────┘ └──────────┘
┌───────────┐ ┌──────────────┐ ┌───────┐ ┌──────────────┐
│ Harmonien │ │ Carte Blanche│ │ Fløyen│ │ Bergenfest   │
└───────────┘ └──────────────┘ └───────┘ └──────────────┘
```

**Implementation:**
- Each name in a pill: `--color-bg-surface` background, 1px `--color-border` border, rounded-full, px-4 py-2
- Font: Inter 13px, `--color-text-secondary`
- Layout: `flex flex-wrap gap-2 justify-center`
- Show 12 names (the most recognizable venues from the 43 sources)
- Desktop: wrapped into 2-3 rows, centered
- Mobile: same wrapping, tighter gaps
- NO horizontal scroll — just flow naturally
- Subtle hover: slightly darker border + translateY(-1px) — feels alive even though they're not links

**Placement:**
- In the "43 kilder" social proof section, below the text

**Why this works:** Recognizable names create trust. A venue owner sees Grieghallen and DNS and thinks "if they're on there, we should be too." The pill treatment makes them feel like tags/badges, not a boring text list.

---

### 5. Large Number Highlights

Use oversized numbers as visual anchors that the eye lands on when scanning.

**Numbers to highlight:**
- **43** — sources (already in the "Allerede på Gåri" section)
- **13** — curated pages (in the "Hva du får" intro or "Fremhevet" block)
- **2×** — daily updates (in the "Slik fungerer det" section)

**Implementation:**
- Number: Barlow Condensed, 56-72px, `--funkis-red`
- Accompanying text: Inter 16px, `--color-text-primary`, directly below or beside
- Example layout:
  ```
  43
  kilder i Bergen
  ```
- These should feel like typographic landmarks — the things your eye hits when scrolling fast

**Why this works:** Numbers are scannable. A venue owner scrolling quickly sees "43... 13... 2×..." and gets the scale immediately. It breaks up the text wall and creates visual rhythm.

---

## Section-Level Layout & Spacing

### Background alternation (creates visual separation without decoration)

| Section | Background | Purpose |
|---------|-----------|---------|
| Hero | `--funkis-plaster` (#F5F3EE) | Warm entry |
| AI search (section 2) | White (#FFFFFF) | Clean for mockup |
| 43 kilder (section 3) | `--funkis-plaster` (#F5F3EE) | Contrast with pills |
| Slik fungerer det | White (#FFFFFF) | Clean for numbers |
| Hva du får | `--funkis-plaster` (#F5F3EE) | Cards pop on warm bg |
| Bytorget | White (#FFFFFF) | Breathing room |
| Transparent | `--funkis-plaster` (#F5F3EE) | Short callout |
| Early bird | `--funkis-red-subtle` (#F9EEEE) | ONLY section with this color — special |
| CTA / form | White (#FFFFFF) | Clean for form |

### Section padding
- Desktop: `py-16` (64px) minimum per section
- Mobile: `py-10` (40px) minimum
- The bytorget section gets extra: `py-20` on desktop — it needs to breathe

### Feature blocks ("Hva du får")
- 2×2 grid on desktop, stacked on mobile
- Each block: white card, `--shadow-sm`, rounded-xl (12px), p-6
- 4px colored top accent bar per card:
  - Fremhevet synlighet: `--funkis-red`
  - AI-søk: `--color-cat-culture` (purple)
  - Månedlig rapport: `--funkis-green`
  - Nyhetsbrev: `--color-cat-music` (blue)
- The product mockup (element 1) sits adjacent to the Fremhevet card
- The report mockup (element 3) sits adjacent to the Rapport card

---

## Contrast Rules (WCAG 2.2 AA)

- On `--funkis-plaster` (#F5F3EE): ALL body text → `--color-text-primary` (#141414), NOT `--color-text-secondary`
- On white (#FFFFFF): body text → either primary or secondary OK
- On `--funkis-red-subtle` (#F9EEEE, early bird only): body text → `--funkis-steel` (#3A3A3C)
- Headlines everywhere: `--funkis-iron` (#1C1C1E) or `--color-text-primary`
- Large accent numbers: `--funkis-red` (#C82D2D) — these are decorative, not body text

---

## What NOT to Add

- **No stock photography** — feels generic, costs nothing but adds nothing
- **No abstract illustrations or blob shapes** — doesn't match Funkis
- **No decorative icons** that don't communicate specific information
- **No gradients** — Funkis is flat, honest materials
- **No parallax or scroll animations** — keep it fast, keep it functional
- **No carousel or slider** — static content is more trustworthy for B2B
- **No Bergen tourism photos** (Bryggen, Fløibanen) — this isn't a tourist page, it's a business conversation
- **No logo wall** — venue logos are copyrighted and we don't have permission; text pills work better

---

## Build Order for Claude Code

1. **Product mockup** (browser frame + Fremhevet card) — highest visual impact, most persuasive element
2. **AI chat mockup in phone frame** — already partially exists, polish it
3. **Report mockup card** — simple HTML/CSS, builds trust
4. **Feature block card treatment** — CSS only, big layout improvement
5. **Section spacing + contrast fixes** — CSS only
6. **Venue name pills** — restyle existing text
7. **Number highlights** — typography changes
8. **Background alternation** — CSS only

Each element is independent — if one is hard to get right, skip it and move on. The product mockup alone transforms the page.

---

## Reference Files

- Design system: `docs/DESIGN-SYSTEM.md` (all color tokens, typography, shadows)
- Brand voice: `docs/BRAND-VOICE.md` (warm, functional, Bergen)
- Page spec: `docs/for-arrangorer-page-spec-v2.md` (section structure)
- Live page: `gaari.no/no/for-arrangorer`

Edit the actual Svelte component files directly. Build mockups as Svelte components if they're reusable, or inline if they're one-off.
