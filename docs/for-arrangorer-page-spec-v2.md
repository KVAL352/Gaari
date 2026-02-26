# Gåri — "For arrangører" Page Spec v2

**Updated:** 2026-02-27
**Replaces:** for-arrangorer-page-spec.md (v1)
**Route:** `/[lang]/for-arrangorer/` (NO) / `/[lang]/for-organizers/` (EN)
**Purpose:** B2B marketing page. Drives venue contact inquiries. Leads with network effect + AI search.
**CTA:** "Ta kontakt" / "Get in touch" → email or contact form
**Tone:** Data-led, novel, values-forward. No hype, no pricing on page.
**Voice:** "Gåri" as product subject, "vi" for collective actions. Never "jeg/meg" (first person) — except "Hvem står bak" section (Kjersti's personal story).
**Status:** Under construction — temporarily hidden from footer and sitemap. Accessible via direct URL.
**Copy note:** Uses "utvalgte" (not "kuraterte") for collection pages throughout.

---

## Page Structure (6 sections)

```
1. HVA ER DETTE — Hero: "Bergens Digitale Bytorg" + short body + CTA
2. HVORDAN FUNGERER DETTE — "Gåri henter arrangementene — automatisk" + StreamingAnimation
3. HVORFOR DETTE FUNGERER — Network effect text + AI search pitch (54% stat + animated phone mockup + mid-page CTA)
4. HVA FÅR JEG — Feature cards (4 blocks) + product mockup + report mockup
5. HVEM STÅR BAK — Personal photo + bio (Kjersti's story, first person voice)
6. HVA NÅ — Transparency callout + Early bird + CTA form + testimonial placeholder
+ Sticky mobile CTA bar (visible between hero and contact)
```

---

## 1. HVA ER DETTE (Hero)

**Layout:** Full-width, `--funkis-plaster` background, centered text. Compact.

### Norwegian
```
Bergens Digitale Bytorg

Gåri er et digitalt bytorg for Bergen.
Alt som skjer, samlet på ett sted.

[Ta kontakt]
```

### English
```
Bergen's Digital Town Square

Gåri is a digital town square for Bergen.
Everything happening, gathered in one place.

[Get in touch]
```

**Design notes:**
- H1: Barlow Condensed, 32–40px, `--color-text-primary`
- Body: Inter, 18px, `--color-text-primary`, max-width 640px
- CTA button: `--funkis-red` background, white text, 44px min height, scrolls to `#contact`
- No hero image — clean and fast-loading

---

## 2. HVORDAN FUNGERER DETTE

**Layout:** Two-column on desktop (text 50% left, flow animation 50% right). Stacked on mobile.

### Norwegian
```
Gåri henter arrangementene — automatisk

To ganger om dagen besøker Gåri nettsidene til steder
som arrangerer ting i Bergen. Når noe nytt dukker opp —
en konsert, en utstilling, en quiz-kveld — tar Gåri det
med tilbake og viser det frem på bytorget.

Du trenger ikke gjøre noe.
```

### English
```
Gåri fetches events — automatically

Twice a day, Gåri visits the websites of venues organizing
things in Bergen. When something new appears — a concert,
an exhibition, a quiz night — Gåri brings it back and
displays it on the town square.

You don't need to do anything.
```

**Right-side visual:** Flow animation — 6 venue pills (Grieghallen, DNS, KODE, USF Verftet, Bergen Kjøtt, Oseana) positioned around a central Gåri badge, flying in from their edges with staggered delays. Each pill has a colored category dot. Animation triggers on scroll (IntersectionObserver, threshold 0.3). Respects `prefers-reduced-motion`.

**Design notes:**
- Section background: `--color-bg-surface` (white)
- Animation container: max-width 320px, aspect-ratio 1.15
- Gåri badge: `--funkis-red` background, white text, rounded-2xl, 64px square
- Venue pills: `--color-bg-surface` background, 1px border, rounded-full, category color dots
- CSS keyframes: `flyIn` (translates from custom `--from-x`/`--from-y` to final position), `gaariAppear` (scale 0.7→1)
- Staggered delays: 0s, 0.4s, 0.8s, 1.2s, 1.6s, 2.0s

---

## 3. HVORFOR DETTE FUNGERER

Two subsections under one conceptual heading.

### 3a. Network Effect

**Layout:** Single column, centered, max-width 640px.

#### Norwegian
```
Hvorfor dette fungerer

Et bytorg med tre boder er ikke et bytorg. Det er først
når bredden er der — konserter, teater, matfestivaler,
quizkvelder, gratisarrangementer — at folk begynner å
sjekke innom som vane.

Gratis arrangementer trekker folk inn. Betalte arrangementer
tjener på trafikken. Studenten som finner en gratis quizkveld
i dag, kjøper konsertbillett neste uke. Uten det første
besøket hadde det andre aldri skjedd.

Jo mer som er samlet på torget, jo flere grunner har folk
til å komme tilbake. Jo oftere de kommer tilbake, jo mer
ser de av dine arrangementer.
```

#### English
```
Why this works

A town square with three stalls isn't a town square. It's
only when the breadth is there — concerts, theatre, food
festivals, quiz nights, free events — that people start
checking in as a habit.

Free events draw people in. Paid events benefit from the
traffic. The student who finds a free quiz night today buys
a concert ticket next week. Without the first visit, the
second would never have happened.

The more that's gathered on the square, the more reasons
people have to come back. The more often they come back,
the more they see of your events.
```

**Design notes:**
- Section background: `--funkis-plaster`
- H2: Barlow Condensed, 24–30px, centered
- Body: Inter, 16px, `--color-text-primary`, 3 paragraphs with spacing

### 3b. AI Search Pitch: "54% av nordmenn bruker KI-verktøy"

**Layout:** Two-column on desktop (text 55% left, animated phone mockup 45% right). Full-width stacked on mobile.

#### Norwegian
```
54%
av nordmenn bruker KI-verktøy

Norge er nummer 3 i verden for bruk av KI. Når noen i Bergen
spør ChatGPT «hva skjer denne helgen?», jobber vi for at Gåri
dukker opp som kilde — med kuraterte sider optimalisert for
det folk faktisk spør om.

Kilder: SSB 2025 · Microsoft AI Diffusion Report 2025 · Arbeidsliv i Norden · ChatGPT Statistics

[Vis meg dataen for mine arrangementer]  ← mid-page CTA
```

#### English
```
54%
of Norwegians use AI tools

Norway is number 3 in the world for AI usage. When someone
in Bergen asks ChatGPT "what's on this weekend?", we work to
make Gåri appear as a source — with curated pages optimized
for what people actually ask about.

Sources: Statistics Norway 2025 · Microsoft AI Diffusion Report 2025 · Nordic Labour Journal · ChatGPT Statistics

[Show me the data for my events]  ← mid-page CTA
```

**Right-side visual:** Animated phone mockup showing an AI chat conversation. Typewriter animation: user types "Hva skjer i Bergen denne helgen?", thinking dots appear, AI response reveals line by line, "Kilde: gaari.no" appears last in red. Animation triggers on scroll (IntersectionObserver, threshold 0.3). Respects `prefers-reduced-motion`.

**Design notes:**
- Section background: `--color-bg-surface` (white)
- "54%" as giant red number: Barlow Condensed, 40–56px, `--funkis-red`
- Source citations: linked to original articles (SSB, Microsoft mynewsdesk, etc.)
- Phone mockup: rounded-[2rem], `--funkis-iron` border, `--shadow-lg`, max-width 280px
- No technical jargon. No "AI optimization" or "GEO" or "LLM."

---

## 4. HVA FÅR JEG

**Layout:** Feature cards with adjacent product/report mockups.

### Feature blocks (4 cards)

#### Norwegian

**Først på kuraterte sider**
Arrangementene dine vises øverst på sider som «Denne helgen» og «Konserter denne uken». 13 sider som vokser jevnt. Alltid merket som fremhevet.

**Arrangementene dine i AI-svar**
Vi optimaliserer for at Gåri skal dukke opp når folk spør ChatGPT om Bergen — en kanal de fleste arrangører ikke vet om ennå.

**I nyhetsbrevet hver uke**
Arrangementene dine rett i innboksen til bergensere som planlegger helgen. Sendes hver torsdag.

**Tall på hva det ga deg**
Månedlig rapport med klikk fra Gåri til nettsiden din, hvilke arrangementer som traff best, og AI-synlighetsdata.

#### English

**First on curated pages**
Your events appear at the top of pages like "This Weekend" and "Concerts This Week". 13 pages growing steadily. Always labeled as featured.

**Your events in AI answers**
We optimize for Gåri to appear when people ask ChatGPT about Bergen — a channel most organizers don't know about yet.

**In the newsletter every week**
Your events straight in the inbox of people in Bergen planning their weekend. Sent every Thursday.

**Numbers on what it did for you**
Monthly report with clicks from Gåri to your website, which events performed best, and AI visibility data.

**Design notes:**
- Section heading: "Hva du får" / "What you get" with large red "13" number
- Row 1: Fremhevet card (left 45%) + browser-frame product mockup (right 55%)
- Row 2: AI-søk card + Nyhetsbrev card (side by side)
- Row 3: Rapport card (left 55%) + report mockup card (right 45%)
- Each card: `--color-bg-surface` background, `--shadow-sm`, p-6, rounded-xl, 4px colored top accent bar
- Section background: `--funkis-plaster`

---

## 5. HVA NÅ

### 5a. Transparency: "Ingen skjulte triks"

```
NO: Fremhevede arrangementer er alltid tydelig merket.
    Du får alltid data på hva plasseringen ga deg.
    Ingen bindingstid i prøveperioden.

EN: Featured events are always clearly labeled.
    You always get data on what the placement delivered.
    No commitment during the trial period.
```

**Design notes:**
- Bordered callout box with `--color-text-primary` left border
- Section background: `--funkis-plaster`

### 5b. Early Bird + CTA (merged)

```
NO: 3 måneder gratis
    Vi leter etter de første arrangørene i Bergen som vil prøve dette.
    Start før 1. juni 2026 — full tilgang, ingen bindingstid.
    [Send e-post til gaari.bergen@proton.me]
    Eller send en rask melding: [form: Navn, Organisasjon, E-post, Melding]

EN: 3 months free
    We're looking for the first organizers in Bergen who want to try this.
    Start before June 1, 2026 — full access, no commitment.
    [Email gaari.bergen@proton.me]
    Or send a quick message: [form: Name, Organization, Email, Message]
```

**Email button:** `mailto:gaari.bergen@proton.me?subject=Fremhevet synlighet på Gåri`
**Contact form:** Insert into Supabase `organizer_inquiries` table.
**Success message:** "Takk! Vi tar kontakt snart." / "Thanks! We'll be in touch soon."
**Social proof near form:** Venue name pills (8 names) + "Samler allerede fra 43 kilder i Bergen"

**Design notes:**
- Section background: `--funkis-red-subtle` (#F9EEEE)
- Red divider bar above "3 måneder gratis"
- Email button: `--funkis-red` background, equally prominent as form
- Form: white card with `--shadow-sm`, honeypot spam protection, `use:enhance`
- After June 1, 2026: replace early bird text with testimonials

### 5c. Testimonial placeholder
Empty section awaiting first clients.

---

## SEO & Metadata

### Norwegian (`/no/for-arrangorer/`)

```html
<title>For arrangører — Gåri</title>
<meta name="description" content="Nå flere i Bergen med Gåri. Synlig i AI-søk, på Google og på 13 kuraterte landingssider. 54% av nordmenn bruker KI-verktøy." />
<meta property="og:title" content="For arrangører — Gåri" />
<meta property="og:description" content="Bergens digitale bytorg. Gåri samler alt som skjer i Bergen — og gjør det synlig i AI-søk, på Google og i ukentlige nyhetsbrev." />
<meta property="og:image" content="/og/for-arrangorer.png" />
```

### English (`/en/for-organizers/`)

```html
<title>For organizers — Gåri</title>
<meta name="description" content="Reach more people in Bergen with Gåri. Visible in AI search, on Google and across 13 curated landing pages. 54% of Norwegians use AI tools." />
<meta property="og:title" content="For organizers — Gåri" />
<meta property="og:description" content="Bergen's digital town square. Gåri brings together everything happening in Bergen — and makes it visible in AI search, on Google and in weekly newsletters." />
<meta property="og:image" content="/og/for-organizers.png" />
```

### Sitemap
Priority 0.7, monthly changefreq. Indexed — public marketing page.

---

## OG Image

Satori-generated, 1200x630px:
- "For arrangører — Gåri" / "For organizers — Gåri"
- Subtext: "Bergens digitale bytorg" / "Bergen's digital town square"
- Funkis design: plaster background, red accent, Barlow Condensed

---

## Navigation

**Footer only** — add alongside existing links:
- NO: "For arrangører" → `/no/for-arrangorer`
- EN: "For organizers" → `/en/for-organizers`

Do NOT add to main header navigation — the header is for event-goers.

---

## Technical Implementation

### Route structure

Use the `[lang]` param with cross-language redirects:
- `/no/for-arrangorer` → Norwegian content
- `/en/for-organizers` → English content
- `/no/for-organizers` → redirect to `/no/for-arrangorer`
- `/en/for-arrangorer` → redirect to `/en/for-organizers`

### Form submission

Server-side form action (`?/contact`) with `use:enhance`:
- Server-side Supabase insert into `organizer_inquiries` (same pattern as opt-out form on `/datainnsamling`)
- Honeypot spam protection (hidden `website` field)
- States: idle → submitting → success | error

### Supabase RLS

```sql
create policy "Anyone can submit an inquiry"
  on organizer_inquiries for insert to anon with check (true);

create policy "Only admin can read inquiries"
  on organizer_inquiries for select to authenticated using (true);
```

---

## Content Principles

- **No pricing.** Drive contact, not self-serve purchase.
- **No hype.** No "BOOST" or "MAXIMIZE" — this is Gåri.
- **No specific traffic numbers.** Say "reach more" not "reach 10,000."
- **No mention of scraping.** `/datainnsamling` handles that.
- **No social media promises.** Social is paused. Don't mention it.
- **No guilt.** Opportunity framing, not obligation.
- **AI search is explained simply.** No jargon (GEO, LLM, RAG). Just: "people ask AI, Gåri gets cited."
- **Honest claims.** "jobber vi for" / "optimaliserer for" — never guarantee AI citation.

---

## Animations

Three scroll-triggered animations (IntersectionObserver, all respect `prefers-reduced-motion`):

1. **Flow animation** (section 2): Venue pills fly into central Gåri badge. CSS `@keyframes flyIn` + `gaariAppear`. Threshold 0.3.
2. **Chat animation** (section 3b): Typewriter → thinking dots → progressive AI response → "Kilde: gaari.no" in red. CSS `@keyframes blink` + `dot-bounce` + `ai-breathe`. Threshold 0.3.
3. **Sticky bar** (global): Shows/hides based on hero and contact section visibility. Threshold 0.

---

## Future Additions (not v1)

- Testimonials / case studies (after first clients)
- Live traffic counter from Plausible API
- Tier comparison table (when pricing becomes public)
- Self-serve signup with Stripe (Phase D)
- AI citation demo video or interactive element
- Venue lookup tool (check if already on Gåri — code exists, removed from page in v2 restructure, can be re-added)
