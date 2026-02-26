# Gåri — "For arrangører" Page Spec v2

**Updated:** 2026-02-26
**Replaces:** for-arrangorer-page-spec.md (v1)
**Route:** `/[lang]/for-arrangorer/` (NO) / `/[lang]/for-organizers/` (EN)
**Purpose:** B2B marketing page. Drives venue contact inquiries. Leads with AI search citation.
**CTA:** "Ta kontakt" / "Get in touch" → email or contact form
**Tone:** Data-led, novel, values-forward. No hype, no pricing on page.

---

## Page Structure

```
1. Hero — AI search hook + CTA
2. "Synlig i AI-søk" — the AI search citation pitch (THE differentiator)
3. "Allerede på Gåri" — social proof (43 sources, venue names)
4. "Slik fungerer det" — how Gåri works (3 steps)
5. "Hva du får" — what promoted placement includes (feature blocks)
6. "Bytorget" — the philosophy (town square, redistribution)
7. "Transparent alltid" — the Fremhevet label, no hidden tricks
8. "Bli med tidlig" — early bird offer (3 months free before June 2026)
9. CTA section — contact form or email link
10. Footer (standard)
```

---

## 1. Hero Section

**Layout:** Full-width, `--funkis-plaster` background, centered text. Compact.

### Norwegian
```
Synlig der folk faktisk søker

Når noen spør ChatGPT, Google eller Perplexity
«hva skjer i Bergen?» — er det Gåri som blir sitert.
Vi hjelper arrangører å nå folk som søker med AI,
på Google, og direkte på gaari.no.

[Ta kontakt]
```

### English
```
Visible where people actually search

When someone asks ChatGPT, Google or Perplexity
"what's happening in Bergen?" — Gåri is the source
they cite. We help organizers reach people searching
with AI, on Google, and directly on gaari.no.

[Get in touch]
```

**Design notes:**
- H1: "Synlig der folk faktisk søker" — Barlow Condensed, 32–40px, `--color-text-primary`
- Subtext: Inter, 18px, `--color-text-secondary`, max-width 600px
- CTA button: `--funkis-red` background, white text, 44px min height
- No hero image — keep it clean and fast-loading

---

## 2. The AI Search Pitch: "Synlig i AI-søk"

**This is the most important section on the page.** It's the novel selling point that no competitor can match. It should feel like a genuine revelation to the venue owner reading it.

**Layout:** Two-column on desktop (text left, illustration/screenshot right). Full-width stacked on mobile.

### Norwegian
```
Bergen's arrangementer i AI-søk

Stadig flere finner ut hva som skjer i Bergen ved å spørre
ChatGPT, Perplexity eller Google AI. Når de gjør det, er
Gåri en av kildene som blir sitert — med lenke tilbake til
arrangementene.

Dette er en helt ny kanal som de fleste arrangører ikke
kjenner til ennå. Dine arrangementer er allerede synlige
der — med fremhevet synlighet blir de enda mer fremtredende.
```

### English
```
Bergen's events in AI search

More and more people find out what's happening in Bergen
by asking ChatGPT, Perplexity or Google AI. When they do,
Gåri is one of the sources that gets cited — with a link
back to the events.

This is a completely new channel that most organizers don't
know about yet. Your events are already visible there —
with promoted visibility they become even more prominent.
```

**Right-side visual:** A styled screenshot mockup showing a ChatGPT or Perplexity response about Bergen events with Gåri cited as the source. This can be:
- A real screenshot (preferred — take one when available)
- A styled mockup using the Funkis design language (card with AI chat bubble, citation link)

**Design notes:**
- Section background: `--color-bg-surface` (white)
- Left column: 60% width on desktop
- Right column: 40% width, screenshot/mockup with `--shadow-md` and 12px border-radius
- Key phrase "en av kildene som blir sitert" could be highlighted with `--funkis-red-subtle` background
- No technical jargon. No "AI optimization" or "GEO" or "LLM." Just: "people ask AI, Gåri gets cited, your events are visible."

---

## 3. Social Proof: "Allerede på Gåri"

**Layout:** Centered section with count + scrollable name row

### Norwegian
```
43 kilder i Bergen — oppdatert hver dag

Gåri samler arrangementer fra 43 aktive kilder i Bergen,
fra Grieghallen og DNS til Bergen Bibliotek og lokale klubber.
Dine arrangementer er sannsynligvis allerede på Gåri.
```

### English
```
43 sources in Bergen — updated daily

Gåri collects events from 43 active sources across Bergen,
from Grieghallen and DNS to Bergen Public Library and local clubs.
Your events are probably already on Gåri.
```

**Below the text:** Horizontal scrolling row of venue/source names (grayscale, muted):

```
Grieghallen · DNS · KODE · USF Verftet · Bergen Bibliotek · Festspillene · Ole Bull · Harmonien · Fløyen · Bergenfest · Carte Blanche · BIT
```

**Design notes:**
- Section background: `--funkis-plaster`
- "43" as large/bold visual anchor (Barlow Condensed, 48px)
- Name row: `overflow-x: auto`, horizontal scroll mobile, all visible desktop
- Grayscale opacity (0.6)

---

## 4. How It Works: "Slik fungerer det"

**Layout:** 3-column grid (desktop) / stacked (mobile).

### Norwegian

**1. Vi samler**
Alt som skjer i Bergen — konserter, teater, familieaktiviteter, festivaler, turer og mer. 43 kilder, oppdatert to ganger daglig.

**2. Folk oppdager**
Bergensere, studenter, turister og familier finner arrangementer gjennom AI-søk, Google, kuraterte sider på gaari.no og vårt ukentlige nyhetsbrev.

**3. Vi sender dem til deg**
Hvert arrangement linker direkte til din billettside eller nettside. Vi selger aldri billetter — vi sender publikum til deg.

### English

**1. We collect**
Everything happening in Bergen — concerts, theatre, family activities, festivals, tours and more. 43 sources, updated twice daily.

**2. People discover**
Locals, students, tourists and families find events through AI search, Google, curated pages on gaari.no and our weekly newsletter.

**3. We send them to you**
Every event links directly to your ticket page or website. We never sell tickets — we send audiences to you.

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

## 7. Transparency: "Transparent alltid"

### Norwegian
```
Transparent alltid

Alle fremhevede arrangementer er tydelig merket. Vi flytter
aldri organisk innhold for å gjøre plass — fremhevet synlighet
er en tilleggsposisjon, ikke en erstatning. Og du får alltid
data på hva plasseringen ga deg.
```

### English
```
Transparent always

All promoted events are clearly labeled. We never push organic
content aside to make room — promoted visibility is an additional
position, not a replacement. And you always get data on what
the placement delivered.
```

**Design notes:**
- Bordered callout box with `--color-border-strong` left border
- Or simple centered text block
- Keep short

---

## 8. Early Bird: "Bli med tidlig"

### Norwegian
```
Bli med tidlig — 3 måneder gratis

Vi leter etter de første arrangørene som vil teste fremhevet
synlighet på Gåri. De som starter samarbeid før 1. juni 2026
får de første tre månedene helt gratis — med full tilgang.

Etter gratisperioden fortsetter du til ordinær pris,
med full fleksibilitet.

[Ta kontakt før 1. juni]
```

### English
```
Join early — 3 months free

We're looking for the first organizers who want to try
promoted visibility on Gåri. Those who start before
June 1, 2026 get the first three months completely
free — with full access.

After the free period, you continue at the regular price,
with full flexibility.

[Get in touch before June 1]
```

**Design notes:**
- Section background: `--funkis-red-subtle` (#F9EEEE) with `--funkis-red` accent (left border or top bar)
- "3 måneder gratis" visually prominent
- "Før 1. juni 2026" visible
- CTA button: same `--funkis-red` style, scrolls to contact form
- After June 1, 2026: replace with testimonial/case study section

---

## 9. CTA Section

### Norwegian
```
Vil du nå flere i Bergen?

Send oss en e-post, så tar vi en prat om hvordan
Gåri kan fungere for deg.

[Send e-post]                    [gaari.bergen@proton.me]

Eller fyll ut skjemaet under, så tar vi kontakt.

[Navn / Name]
[Organisasjon / Organization]
[E-post / Email]
[Kort melding / Short message (valgfritt)]

[Send]
```

### English
```
Want to reach more people in Bergen?

Send us an email and we'll talk about how Gåri
can work for you.

[Send email]                     [gaari.bergen@proton.me]

Or fill out the form below and we'll be in touch.

[Name]
[Organization]
[Email]
[Short message (optional)]

[Send]
```

**Email button:** `mailto:gaari.bergen@proton.me?subject=Fremhevet synlighet på Gåri`

**Contact form:** Insert into Supabase `organizer_inquiries` table:

```sql
create table organizer_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization text not null,
  email text not null,
  message text,
  status text default 'new' check (status in ('new', 'contacted', 'converted', 'declined')),
  notes text,
  created_at timestamptz default now()
);

-- RLS: anon can insert, only service role can read/update
create policy "Anyone can submit" on organizer_inquiries
  for insert to anon with check (true);
```

**Success message:** "Takk! Vi tar kontakt snart." / "Thanks! We'll be in touch soon."

**Design notes:**
- Section background: `--funkis-red-subtle` (#F9EEEE)
- Title: Barlow Condensed, 28–32px
- Email button: `--funkis-red` background, white text
- Form inputs: standard Funkis styling (border, 44px height, Inter)
- Submit button: `--funkis-red`

---

## 10. SEO & Metadata

### Norwegian (`/no/for-arrangorer/`)

```html
<title>For arrangører — Gåri</title>
<meta name="description" content="Nå flere i Bergen med Gåri. Synlig i AI-søk, på Google og på 13 kuraterte landingssider. Fremhevet synlighet for arrangører." />
<meta property="og:title" content="For arrangører — Gåri" />
<meta property="og:description" content="Når noen spør ChatGPT hva som skjer i Bergen, er det Gåri som blir sitert. Vi hjelper arrangører å nå flere." />
<meta property="og:image" content="/og/for-arrangorer.png" />
```

### English (`/en/for-organizers/`)

```html
<title>For organizers — Gåri</title>
<meta name="description" content="Reach more people in Bergen with Gåri. Visible in AI search, on Google and across 13 curated landing pages. Promoted visibility for organizers." />
<meta property="og:title" content="For organizers — Gåri" />
<meta property="og:description" content="When someone asks ChatGPT what's on in Bergen, Gåri is cited. We help organizers reach more people." />
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
