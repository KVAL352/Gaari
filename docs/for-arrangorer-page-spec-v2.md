# Gåri — "For arrangører" Page Spec v2

**Updated:** 2026-02-26
**Replaces:** for-arrangorer-page-spec.md (v1)
**Route:** `/[lang]/for-arrangorer/` (NO) / `/[lang]/for-organizers/` (EN)
**Purpose:** B2B marketing page. Drives venue contact inquiries. Leads with AI search citation.
**CTA:** "Ta kontakt" / "Get in touch" → email or contact form
**Tone:** Data-led, novel, values-forward. No hype, no pricing on page.
**Voice:** "Gåri" as product subject, "vi" for collective actions. Never "jeg/meg" (first person).

---

## Page Structure

```
1. Hero — "Arrangementene dine i ChatGPT-svar" + CTA
2. AI search — 54% stat + animated phone mockup + mid-page CTA
3. Zero setup — "Du trenger ikke gjøre noe" + venue lookup + inline add-form
4. "Slik fungerer det" — how Gåri works (3 steps, "Gåri" as subject)
5. "Hva du får" — feature cards + product mockup + report mockup
6. "Bytorget" — the philosophy (town square, 3 sentences)
7. "Ingen skjulte triks" — transparency callout
8+9. Early bird + CTA — merged: "3 måneder gratis" + email + contact form
10. Testimonial placeholder (awaiting first clients)
11. Sticky mobile CTA bar (visible between hero and contact)
```

---

## 1. Hero Section

**Layout:** Full-width, `--funkis-plaster` background, centered text. Compact.

### Norwegian
```
Arrangementene dine i ChatGPT-svar

Gåri samler alt som skjer i Bergen — og gjør det
synlig i AI-søk, på Google og i ukentlige nyhetsbrev.

[Ta kontakt]
```

### English
```
Your events in ChatGPT answers

Gåri brings together everything happening in Bergen — and makes it
visible in AI search, on Google and in weekly newsletters.

[Get in touch]
```

**Design notes:**
- H1: "Arrangementene dine i ChatGPT-svar" — Barlow Condensed, 32–40px, `--color-text-primary`
- Subtext: Inter, 18px, `--color-text-primary`, max-width 600px
- CTA button: `--funkis-red` background, white text, 44px min height
- No hero image — keep it clean and fast-loading

---

## 2. AI Search Pitch: "54% av nordmenn bruker KI-verktøy"

**This is the most important section on the page.** Leads with hard SSB data, then explains what it means for venues.

**Layout:** Two-column on desktop (text 55% left, animated phone mockup 45% right). Full-width stacked on mobile.

### Norwegian
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

### English
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

## 3. Zero Setup: "Du trenger ikke gjøre noe"

**Layout:** Centered section with body text, venue lookup input, and inline add-venue form.

### Norwegian
```
Du trenger ikke gjøre noe

Gåri er et system som finner arrangementene dine der du
allerede legger dem ut — på nettsiden din, i billettplattformen,
eller i kalenderen. Du trenger ikke endre arbeidsvanene dine.
Alt skjer automatisk, to ganger daglig.

[Sjekk om du allerede er på Gåri: _______________]

→ Match found: "✓ [Venue name] er allerede på Gåri!"
→ No match: message about free onboarding + inline form
  (nettside-URL + e-post + "Sjekk nettsiden min" button)
```

### English
```
You don't need to do anything

Gåri is a system that finds your events where you already
publish them — on your website, in your ticketing platform,
or in your calendar. You don't need to change your workflow.
Everything happens automatically, twice daily.

[Check if you're already on Gåri: _______________]
```

**Venue lookup:** Client-side search against ~40 known venue names. Three states:
- No input (< 2 chars): nothing shown
- Match found: green checkmark + venue name
- No match: "Fant ikke et treff — men det er helt gratis å bli lagt til. Vi ønsker å promotere det rike kulturlivet i Bergen." + inline form (website URL + email) → submits to `organizer_inquiries`

**Design notes:**
- Section background: `--funkis-plaster`
- Input: 44px min-height, rounded-lg, Funkis border styling
- Inline add-form: same `?/contact` action as main form, message auto-constructed from URL
- No venue name pills in this section

---

## 4. How It Works: "Slik fungerer det"

**Layout:** 3-column grid (desktop) / stacked (mobile).

### Norwegian

**1. Gåri samler alt**
Konserter, teater, mat, festivaler, familieaktiviteter, turer — 43 kilder i Bergen, oppdatert kl. 06 og 18 hver dag.

**2. Folk finner deg**
Gjennom AI-søk, Google, 13 kuraterte sider på gaari.no og ukentlige nyhetsbrev. Mange oppdager ting de aldri ville søkt etter.

**3. Klikket går til deg**
Hvert arrangement linker til din billettside. Gåri selger aldri billetter — vi sender publikum videre til deg.

### English

**1. Gåri collects everything**
Concerts, theatre, food, festivals, family activities, tours — 43 sources in Bergen, updated at 06:00 and 18:00 every day.

**2. People find you**
Through AI search, Google, 13 curated pages on gaari.no and weekly newsletters. Many discover things they'd never have searched for.

**3. The click goes to you**
Every event links to your ticket page. Gåri never sells tickets — we send audiences your way.

**Design notes:**
- Numbers: Large Barlow Condensed (48–64px), `--funkis-red` color
- Titles: Inter 18px bold
- Body: Inter 16px, `--color-text-secondary`
- Section background: `--color-bg-surface` (white)

**NOTE:** Step 2 changed from v1 — removed "sosiale medier", added "AI-søk, Google" and "nyhetsbrev"

---

## 5. What You Get: "Hva du får"

**Layout:** 2x2 grid of feature blocks (desktop) / stacked (mobile).

### Norwegian

**Synlig i AI-søk**
Når folk spør ChatGPT eller Perplexity om Bergen, blir Gåri sitert. Dine arrangementer er synlige i svarene — en kanal de fleste arrangører ikke utnytter ennå.

**Fremhevet på kuraterte sider**
Arrangementene dine vises fremst på sider som "Denne helgen i Bergen", "I kveld" og "Konserter denne uken". 13 kuraterte landingssider med tusenvis av besøk.

**Ukentlig nyhetsbrev**
Arrangementene dine inkluderes i vårt ukentlige nyhetsbrev som går direkte i innboksen til bergensere som aktivt ser etter ting å gjøre.

**Månedlig rapport**
Du får en oversikt over klikk fra Gåri til nettsiden din, hvilke arrangementer som fikk mest oppmerksomhet, og data om AI-synlighet.

### English

**Visible in AI search**
When people ask ChatGPT or Perplexity about Bergen, Gåri is cited. Your events are visible in the answers — a channel most organizers aren't using yet.

**Featured on curated pages**
Your events appear at the top of pages like "This Weekend in Bergen", "Tonight" and "Concerts This Week". 13 curated landing pages with thousands of visits.

**Weekly newsletter**
Your events are included in our weekly newsletter that goes directly to the inbox of people in Bergen actively looking for things to do.

**Monthly report**
You get an overview of clicks from Gåri to your website, which events got the most attention, and AI visibility data.

**Design notes:**
- Each block: `--color-bg-surface` background, `--shadow-sm`, 16px padding, 12px border-radius
- Lucide icons (optional): `Bot` (AI-søk), `Eye` (kuraterte sider), `Mail` (nyhetsbrev), `BarChart3` (rapport)
- Section background: `--funkis-plaster`

**NOTE:** Replaced "Sosiale medier" with "Ukentlig nyhetsbrev". Added "Synlig i AI-søk" as first block.

---

## 6. The Philosophy: "Bytorget"

**Layout:** Single column, centered, wider text block. Generous vertical padding.

### Norwegian
```
Bergens digitale bytorg

Et bytorg fungerer fordi alle er der. Den store konserthallen
trekker folk til torget, og den lille bokklubben blir oppdaget
av noen som egentlig bare kom for konserten.

Gåri er bygget på samme idé. Når alle arrangementene i Bergen
er samlet på ett sted, vinner alle — store og små.

Det er ikke veldedighet. Det er god forretning for alle.
```

### English
```
Bergen's digital town square

A town square works because everyone is there. The large
concert hall draws people to the square, and the small book
club gets discovered by someone who really just came for
the concert.

Gåri is built on the same idea. When all of Bergen's events
are gathered in one place, everyone wins — large and small.

It's not charity. It's good business for everyone.
```

**Design notes:**
- Section background: `--color-bg-surface` (white)
- Title: Barlow Condensed, 28–32px
- Body: Inter, 18px, line-height 1.7, max-width 640px
- No images, no icons

---

## 7. Transparency: "Ingen skjulte triks"

### Norwegian
```
Ingen skjulte triks

Fremhevede arrangementer er alltid tydelig merket.
Du får alltid data på hva plasseringen ga deg.
Ingen bindingstid i prøveperioden.
```

### English
```
No hidden tricks

Featured events are always clearly labeled.
You always get data on what the placement delivered.
No commitment during the trial period.
```

**Design notes:**
- Bordered callout box with `--color-border-strong` left border
- Or simple centered text block
- Keep short

---

## 8+9. Early Bird + CTA (merged)

Sections 8 and 9 are merged — urgency and action in the same space.

### Norwegian
```
3 måneder gratis

Vi leter etter de første arrangørene i Bergen som vil
prøve dette. Start før 1. juni 2026 — full tilgang,
ingen bindingstid.

[Send e-post til gaari.bergen@proton.me]

Eller send en rask melding:

[Navn]
[Organisasjon]
[E-post]
[Melding (valgfritt)]
[Send]
```

### English
```
3 months free

We're looking for the first organizers in Bergen who want
to try this. Start before June 1, 2026 — full access,
no commitment.

[Email gaari.bergen@proton.me]

Or send a quick message:

[Name]
[Organization]
[Email]
[Message (optional)]
[Send]
```

**Email button:** `mailto:gaari.bergen@proton.me?subject=Fremhevet synlighet på Gåri`
**Contact form:** Insert into Supabase `organizer_inquiries` table (same schema as before).
**Success message:** "Takk! Vi tar kontakt snart." / "Thanks! We'll be in touch soon."
**Social proof near form:** Venue name pills (8 names) + "Samler allerede fra 43 kilder i Bergen"

**Design notes:**
- Section background: `--funkis-red-subtle` (#F9EEEE)
- Red divider bar above "3 måneder gratis"
- Email button: `--funkis-red` background, white text, equally prominent as form
- Form: white card with `--shadow-sm`, lightweight feel
- Honeypot spam protection (hidden `website` field)
- `use:enhance` for seamless UX
- After June 1, 2026: replace early bird text with testimonials

---

## 10. SEO & Metadata

### Norwegian (`/no/for-arrangorer/`)

```html
<title>For arrangører — Gåri</title>
<meta name="description" content="Nå flere i Bergen med Gåri. Synlig i AI-søk, på Google og på 13 kuraterte landingssider. 54% av nordmenn bruker KI-verktøy." />
<meta property="og:title" content="For arrangører — Gåri" />
<meta property="og:description" content="Arrangementene dine i ChatGPT-svar. Gåri samler alt som skjer i Bergen — og gjør det synlig i AI-søk, på Google og i ukentlige nyhetsbrev." />
<meta property="og:image" content="/og/for-arrangorer.png" />
```

### English (`/en/for-organizers/`)

```html
<title>For organizers — Gåri</title>
<meta name="description" content="Reach more people in Bergen with Gåri. Visible in AI search, on Google and across 13 curated landing pages. 54% of Norwegians use AI tools." />
<meta property="og:title" content="For organizers — Gåri" />
<meta property="og:description" content="Your events in ChatGPT answers. Gåri brings together everything happening in Bergen — and makes it visible in AI search, on Google and in weekly newsletters." />
<meta property="og:image" content="/og/for-organizers.png" />
```

### Sitemap
Add with `priority: 0.7`. Indexed — public marketing page.

---

## 11. OG Image

Satori-generated, 1200x630px:
- "For arrangører — Gåri" / "For organizers — Gåri"
- Subtext: "Synlig i AI-søk" / "Visible in AI search"
- Funkis design: plaster background, red accent, Barlow Condensed

---

## 12. Navigation

**Footer only** — add alongside existing links:
- NO: "For arrangører" → `/no/for-arrangorer`
- EN: "For organizers" → `/en/for-organizers`

Do NOT add to main header navigation — the header is for event-goers.

---

## 13. Technical Implementation

### Route structure

Use the `[lang]` param with cross-language redirects:
- `/no/for-arrangorer` → Norwegian content
- `/en/for-organizers` → English content
- `/no/for-organizers` → redirect to `/no/for-arrangorer`
- `/en/for-arrangorer` → redirect to `/en/for-organizers`

### Form submission

Same pattern as opt-out form on `/datainnsamling`:

```svelte
<script>
  import { createClient } from '@supabase/supabase-js';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

  const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

  let name = $state('');
  let organization = $state('');
  let email = $state('');
  let message = $state('');
  let submitted = $state(false);
  let error = $state('');

  async function handleSubmit() {
    const { error: err } = await supabase
      .from('organizer_inquiries')
      .insert({ name, organization, email, message });

    if (err) {
      error = 'Noe gikk galt. Prøv igjen eller send e-post direkte.';
    } else {
      submitted = true;
    }
  }
</script>
```

### Supabase RLS

```sql
create policy "Anyone can submit an inquiry"
  on organizer_inquiries for insert to anon with check (true);

create policy "Only admin can read inquiries"
  on organizer_inquiries for select to authenticated using (true);
```

---

## 14. Content Principles

- **No pricing.** Drive contact, not self-serve purchase.
- **No hype.** No "BOOST" or "MAXIMIZE" — this is Gåri.
- **No specific traffic numbers.** Say "reach more" not "reach 10,000."
- **No mention of scraping.** `/datainnsamling` handles that.
- **No social media promises.** Social is paused. Don't mention it.
- **No guilt.** Opportunity framing, not obligation.
- **AI search is explained simply.** No jargon (GEO, LLM, RAG). Just: "people ask AI, Gåri gets cited."

---

## 15. Future Additions (not v1)

- Testimonials / case studies (after first clients)
- Live traffic counter from Plausible API
- Tier comparison table (when pricing becomes public)
- Self-serve signup with Stripe (Phase D)
- AI citation demo video or interactive element
