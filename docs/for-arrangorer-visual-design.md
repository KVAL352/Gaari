# For-Arrangører Page: Visual Design Spec

**Goal:** Transform a text-only document into a page that shows the product. Every visual element answers the venue owner's question: "What would MY events look like on this?"

**Design philosophy:** Funkis — functional, honest, Bergen. No stock photos, no illustrations, no decoration. Every visual is a working product mockup built in HTML/CSS. The page should feel like a competent local showing you their work, not an agency selling a service.

**Constraints:** Solo project, no photography budget, no external image dependencies. Everything built in Svelte/HTML/CSS using existing Funkis tokens.

> **Updated 2026-02-27:** Page restructured into 5 sections: Hva er dette → Hvordan fungerer dette → Hvorfor dette fungerer → Hva får jeg → Hva nå. Visual elements placed within this new structure.

---

## The 6 Visual Elements

### 1. Flow Animation: Venues → Gåri (NEW)

**The hero visual for "how it works."** Shows event sources flying into Gåri automatically.

**Implementation:**
- Container: relative positioning, max-width 320px, aspect-ratio 1.15
- Central Gåri badge: `--funkis-red` bg, white bold text, rounded-2xl, 64px, absolute centered
- 6 venue pills positioned around the badge: Grieghallen, DNS, KODE, USF Verftet, Bergen Kjøtt, Oseana
- Each pill: colored category dot + venue name in pill shape (`--color-bg-surface` bg, 1px border, rounded-full)
- CSS `@keyframes flyIn`: translates from `var(--from-x), var(--from-y)` to final position, opacity 0→1, scale 0.85→1
- CSS `@keyframes gaariAppear`: scale 0.7→1, opacity 0→1 (uses `scale` property, not `transform`, to avoid conflict with Tailwind translate)
- Staggered `animation-delay`: 0s, 0.4s, 0.8s, 1.2s, 1.6s, 2.0s
- Triggered by IntersectionObserver (threshold 0.3)
- Respects `prefers-reduced-motion` (shows all elements immediately, no animation)

**Placement:**
- In "Hvordan fungerer dette" section
- Desktop: text left (50%), animation right (50%)
- Mobile: animation centered below text

### 2. Product Mockup: "Fremhevet" Card in Context

**Shows what promoted placement actually looks like.**

Browser-frame mockup showing 3 event cards in a grid. Top card has "Fremhevet" badge.

**Implementation:**
- Browser chrome: `--funkis-plaster` bg, three colored dots, monospace URL bar (`gaari.no/no/denne-helgen`)
- 2-column card grid (3 cards total)
- Card image areas: category colors (`--color-cat-music`, `--color-cat-culture`, `--color-cat-food`)
- "Fremhevet" badge: red text (#C82D2D) on #F9EEEE, rounded pill
- Outer frame: `--shadow-lg`, rounded-xl, slight `rotate(-1deg)`

**Placement:**
- In "Hva får jeg" section, adjacent to "Først på kuraterte sider" card
- Desktop: feature text left (45%), mockup right (55%)
- Mobile: full-width below text, max-width 400px

### 3. AI Chat Mockup (animated)

**Phone-framed AI conversation showing Gåri being cited.**

**Implementation:**
- Phone frame: rounded-[2rem], `--funkis-iron` border (2px), `--shadow-lg`
- Notch: small rounded rectangle at top
- User bubble (right): `--funkis-plaster` bg, typewriter animation
- AI response (left): white bg, progressive line-by-line reveal
- AI avatar: `--funkis-granite` circle with `ai-breathe` CSS animation
- "Kilde: gaari.no" in `--funkis-red` — the punchline
- Thinking dots with `dot-bounce` animation
- Max-width: 280px

**Placement:**
- In "Hvorfor dette fungerer" → AI pitch subsection
- Desktop: text left (55%), phone mockup right (45%)
- Mobile: centered below text

### 4. Report Mockup Card

**Concrete monthly report showing what venues get.**

**Implementation:**
- Card: white bg, `--shadow-sm`, rounded-xl, p-5, max-width 320px
- "483" click number: Barlow Condensed 36px, `--funkis-red`
- "+22%" badge: `--funkis-green` text
- Data rows: tabular-nums, right-aligned
- "Topp arrangement" section with event name and click count

**Placement:**
- In "Hva får jeg" section, adjacent to "Tall på hva det ga deg" card
- Desktop: floats right of text
- Mobile: full-width below text

### 5. Venue Name Pills

Social proof near the CTA form.

**Implementation:**
- 8 venue names in pills: `--color-bg-surface` bg, 1px border, rounded-full
- `flex flex-wrap gap-1.5 justify-center`
- Font: 12px, `--color-text-muted`

**Placement:**
- Below the CTA form in "Hva nå" section

### 6. Large Number Highlights

Oversized numbers as visual anchors: 54% (AI stat), 13 (curated pages).

**Implementation:**
- Barlow Condensed, 40–72px, `--funkis-red`
- Accompanying text directly below or beside

---

## Section Background Alternation

| Section | Background | Purpose |
|---------|-----------|---------|
| Hero (Hva er dette) | `--funkis-plaster` | Warm entry |
| Hvordan fungerer dette | White | Clean for animation |
| Network effect | `--funkis-plaster` | Contrast, breathing room |
| AI pitch | White | Clean for phone mockup |
| Hva får jeg | `--funkis-plaster` | Cards pop on warm bg |
| Transparency | `--funkis-plaster` | Short callout |
| Early bird + CTA | `--funkis-red-subtle` (#F9EEEE) | ONLY section with this color |
| Testimonial | White | Clean |

## Section Padding
- Desktop: `py-16` (64px) minimum per section
- Mobile: `py-10` (40px) minimum

---

## Contrast Rules (WCAG 2.2 AA)

- On `--funkis-plaster` (#F5F3EE): ALL body text → `--color-text-primary` (#141414)
- On white (#FFFFFF): body text → either primary or secondary OK
- On `--funkis-red-subtle` (#F9EEEE): body text → `--funkis-steel` (#3A3A3C)
- Headlines everywhere: `--funkis-iron` (#1C1C1E) or `--color-text-primary`
- Large accent numbers: `--funkis-red` (#C82D2D) — decorative, not body text

---

## What NOT to Add

- **No stock photography** — feels generic
- **No abstract illustrations or blob shapes** — doesn't match Funkis
- **No decorative icons** that don't communicate specific information
- **No gradients** — Funkis is flat, honest materials
- **No parallax or scroll animations** — keep it fast, functional
- **No carousel or slider** — static content is more trustworthy for B2B
- **No Bergen tourism photos** — this isn't a tourist page
- **No logo wall** — venue logos are copyrighted; text pills work better

---

## Reference Files

- Design system: `docs/DESIGN-SYSTEM.md`
- Brand voice: `docs/BRAND-VOICE.md`
- Page spec: `docs/for-arrangorer-page-spec-v2.md`
- Copy rewrite: `docs/for-arrangorer-copy-rewrite.md`
- Live page: `gaari.no/no/for-arrangorer`
