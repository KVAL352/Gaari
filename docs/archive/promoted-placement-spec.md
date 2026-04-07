# Gåri — Promoted Placement Product Spec

**Created:** 2026-02-24
**Status:** Draft — ready for review and refinement
**Context:** Business model spec for Gåri's first revenue product

---

## 1. Executive Summary

Gåri sells **guaranteed visibility** to Bergen venues and organizers — not algorithmic manipulation. Paying clients get a defined number of top-3 appearances on curated landing pages and guaranteed inclusion in a set number of social media posts per month. All promoted content is transparently labeled "Fremhevet" (Norwegian marketing law § 3 compliance). Organic editorial selection always occupies the majority of visible positions.

**Core principle:** Promoted placement buys *access to the town square's best stall* — it never buys *the entire square*.

---

## 2. The Product: What Venues Are Buying

### 2.1 Landing page placement

**Curated landing pages** are pre-filtered event views at memorable URLs, designed for social media traffic and SEO:

| Route | Audience | Update frequency |
|-------|----------|-----------------|
| `/no/denne-helgen` | General Bergen | Automatic (weekend events) |
| `/no/i-kveld` | General Bergen | Automatic (today's events) |
| `/no/gratis` | Budget-conscious / students | Automatic (free events this week) |
| `/no/familiehelg` | Families | Automatic (family + weekend) |
| `/no/konserter` | Music fans | Automatic (music this week) |
| `/no/studentkveld` | Students | Automatic (student + evening) |
| `/no/i-dag` | General Bergen | Automatic (today, NO) |
| `/no/regndagsguide` | Indoor/rainy day | Automatic (indoor events, 2 weeks) |
| `/no/sentrum` | Bergen sentrum | Automatic (Sentrum bydel, 2 weeks) |
| `/no/voksen` | Adults | Automatic (adult culture, 2 weeks) |
| `/en/today-in-bergen` | Tourists | Automatic (today, English) |
| `/en/this-weekend` | Tourists | Automatic (weekend, English) |
| `/en/free-things-to-do-bergen` | Budget tourists | Automatic (free events, 2 weeks, EN) |

**What paying clients get:**

- Their event(s) appear in the **top 3 positions** on relevant curated pages
- Guaranteed for a specified percentage of the time (see pricing tiers)
- Marked with a subtle "Fremhevet" badge (see §5 for design)
- Only shown on pages where the event is **category-relevant** (a concert won't appear on `/familiehelg` unless it's actually family-friendly)

**Rules for the top-3 slots:**

- The number of paid slots in the top 3 is **flexible** — depends on how many clients are paying
- If 0 clients are paying → all 3 slots are organic/editorial
- If 1 client is paying → 1 promoted + 2 organic
- If 2 clients are paying → 2 promoted + 1 organic
- If 3 clients are paying → 3 promoted + 0 organic (cap — never exceed 3 simultaneous promoted)
- If 4+ clients are paying → rotate among them (see §4 rotation logic)
- **Everything below position 3 is always organic** — sorted by date/relevance

### 2.2 Newsletter and content distribution

**What paying clients get:**

- **Newsletter inclusion** (Standard + Partner): Events featured in the weekly "Hva skjer i Bergen denne helgen" newsletter sent Thursday 15:00 CET via Buttondown. Promoted events are labeled "Fremhevet" in the newsletter.
- **Newsletter featured placement** (Partner): Event highlighted with extra detail (image, description) in the newsletter.
- **À la carte**: Single-event promotions include newsletter inclusion for the relevant week.

**What this is NOT:**

- Not a dedicated solo email about the venue's event
- Not a guaranteed first-listed position within the newsletter
- The venue's event is one of 10–15 in a curated roundup

**Future: Social media post inclusion** (when social accounts are resolved):
- Guaranteed inclusion in social media roundup posts (varies by tier)
- Posts published on Gåri's Instagram and Facebook accounts
- Position within the post randomized (no guaranteed first position)
- The social post pipeline is built and ready — activates when accounts are created

### 2.3 Referral reporting

**All tiers include:**

- Monthly report showing click-throughs from Gåri to the venue's event/ticket pages
- UTM-tagged links: `?utm_source=gaari&utm_medium=promoted&utm_campaign={venue}`
- Comparison with previous month
- Delivered as a simple PDF or email summary

---

## 3. Pricing Tiers

Pricing is scaled by organization size, directly implementing the cross-subsidization model. Larger publicly funded institutions pay more; grassroots organizations pay less or nothing.

### Tier structure

| Tier | Target | Monthly price (NOK eks. mva) | Top-3 share | Newsletter | Report |
|------|--------|--------------------:|-------------|-----------|--------|
| **Grasrot** | Volunteer orgs, clubs, <500K budget | Gratis | Not included | Not included | Basic click count |
| **Basis** | Small venues, independent organizers | 1 000 | 15% of rotation (1–2 collection pages) | Not included | Monthly click count |
| **Standard** | Mid-size venues (Hulen, Kvarteret, etc.) | 3 500 | 25% of rotation (3–4 collection pages) | Included | Detailed monthly PDF |
| **Partner** | Large venues, institutions (Grieghallen, DNS, KODE) | 7 000 | 35% of rotation (all relevant pages) | Featured | Detailed PDF + AI visibility data + quarterly strategy call |

### À la carte

| Product | Price (eks. mva) | Duration | Includes |
|---------|:----------------:|----------|----------|
| Single event promotion | 500 NOK | Event's active duration | Promoted on relevant collection pages + newsletter inclusion |

**Pricing logic:** 2+ à la carte events/month → Basis is cheaper (1,000 vs 1,000+). This nudges repeat customers toward subscriptions.

### What "rotation share" means

If a **Standard** client (25% share) is the only paying client on `/no/konserter`:
- Their event occupies 1 of the top-3 slots 25% of the time (roughly 7–8 days/month)
- The remaining 75% of the time, all 3 slots are organic

If a **Standard** (25%) and a **Partner** (35%) are both paying on `/no/denne-helgen`:
- The Partner gets a top-3 slot 35% of time
- The Standard gets a top-3 slot 25% of time
- The remaining 40% of the time, all top-3 slots are organic
- On overlap periods, 2 of 3 slots are promoted, 1 is organic

### Cross-subsidization made explicit

The pricing page should explain this openly:

> **Hvorfor koster det mer for store aktører?**
> Gåri er et digitalt bytorg. Store aktører betaler mer for synlighet, og det finansierer gratis oppføring for grasrotorganisasjoner som skaper kultur og fellesskap i Bergen. Jo flere som deltar, jo mer verdi skapes for alle.

This transparency is a feature, not a liability. It's the Hotelling's Law pitch in action.

### Early bird offer

Venues that sign up before **1 June 2026** receive:
- First 3 months completely free (full tier access: landing page placement, social posts, monthly report)
- No commitment during the free period — can cancel before month 4
- After the free period, continues at the regular tier price
- 3-month minimum commitment applies from month 4 onward

**Purpose:** Removes price objection for first clients. The free period generates 3 months of placement data that becomes the proof point for all subsequent sales.

**Expiry:** After 1 June 2026, replace the early bird section on `/for-arrangorer` with case study / testimonial content from early bird clients.

### Minimum commitment

- **3 months minimum** for all paid tiers
- Month-to-month after initial period
- No setup fee
- Cancel with 30 days notice

---

## 4. Rotation & Placement Logic

### Current implementation vs spec

> **Note:** The rotation model below describes the target state for when there are 3+ paying clients on the same page. The current implementation (see DECISION-LOG #30) is simpler: **1 promoted event per collection page, rotating daily** via `dayNumber % venueEvents.length`. The simple model works until there are 3+ clients competing for the same page, at which point the weighted rotation below should be implemented.

### 4.1 How top-3 rotation works

The system assigns **daily time slots** to each curated page. Each day, the top-3 composition is determined by:

```
1. Check which promoted clients have events on this page today
2. Allocate promoted slots based on tier share percentages
3. Fill remaining top-3 slots with organic selection (highest-scoring events)
4. Everything below position 3 is always organic, sorted by date
```

**Rotation method:** Weighted random with guaranteed minimum. Over any 30-day period, a client's actual appearance rate must be within ±5% of their tier share. This is tracked and reported.

**Conflict resolution (more promoted demand than 3 slots):**

If total promoted share exceeds 100% for a single page:
- Cap at 3 simultaneous promoted slots per page
- Highest-tier clients get priority
- Within same tier, rotate fairly (round-robin by day)
- Overflow days are compensated in the next rotation cycle

**Category relevance gate:**

A promoted event is only placed on pages where it passes the **category relevance check**:

| Page | Relevant categories |
|------|-------------------|
| `/no/denne-helgen` | All (it's a general weekend page) |
| `/no/konserter` | music only |
| `/no/familiehelg` | family only |
| `/no/studentkveld` | student, music, nightlife, culture |
| `/no/gratis` | Any category, but price must be free |
| `/en/today-in-bergen` | All (tourist-facing) |

If a Partner client has a jazz concert, it can appear promoted on `/denne-helgen`, `/konserter`, `/i-kveld`, and `/en/today-in-bergen` — but NOT on `/familiehelg` (unless it's explicitly tagged family-friendly).

### 4.2 Social post inclusion logic

Posts are generated from collection definitions (see §6). When a promoted client is scheduled for inclusion:

1. Query events matching the post's collection criteria
2. Insert the promoted client's event into the result set (if it passes category/date filters)
3. Randomize the order of all events in the post (promoted gets no position advantage)
4. Add the "Fremhevet" label to the promoted event in the caption

If the promoted client has no qualifying event for a given post (e.g., their concert is next week but the post is "I kveld"), the inclusion credit rolls over to the next applicable post.

---

## 5. Design: The "Fremhevet" Badge

### Legal requirement

Norwegian marketing law (markedsføringsloven § 3) requires that advertising is clearly identifiable. All promoted content must be labeled.

### Landing page implementation

On curated landing pages, promoted EventCards get:

- A small "Fremhevet" text label in `--color-text-muted` (#737373), positioned below the category badge or above the event title
- Same card design as organic events — no visual priority beyond position
- No extra border, glow, background color, or size difference
- The label is sufficient; the card should feel native, not like an ad

```
┌──────────────────────────────┐
│  [Event Image]               │
│  ┌────────┐                  │
│  │ I dag  │                  │
│  └────────┘                  │
│                              │
│  Fremhevet                   │  ← small muted text
│  Bergen Filharmoniske Ork... │
│  I kveld kl. 19:00           │
│  Grieghallen, Sentrum        │
│                              │
│  kr 350        ♡             │
└──────────────────────────────┘
```

### Social media implementation

In post captions, promoted events get a subtle marker:

```
🎵 Bergen Filharmoniske — Grieghallen, kl. 19:00 (Fremhevet)
🎭 Hedda Gabler — DNS, kl. 19:30
👨‍👩‍👧 Familieomvisning — KODE, kl. 11:00
🍽 Vinsmaking — Colonialen, kl. 18:00
🎪 Loppemarked — USF Verftet, kl. 10:00

Se alle → gåri.no/denne-helgen
```

In social media images/carousels, no special visual treatment — the event appears as one tile among others.

---

## 6. Curated Landing Pages — Technical Architecture

### Route structure

```
src/routes/[lang]/
  denne-helgen/
    +page.server.ts    # Queries weekend events, applies promoted placement logic
    +page.svelte       # Reuses EventGrid, custom hero text + OG meta
  i-kveld/
    +page.server.ts
    +page.svelte
  gratis/
    +page.server.ts
    +page.svelte
  familiehelg/
    +page.server.ts
    +page.svelte
  konserter/
    +page.server.ts
    +page.svelte
  studentkveld/
    +page.server.ts
    +page.svelte
```

English equivalents under `/en/`:
```
src/routes/[lang]/
  today-in-bergen/
  this-weekend/
```

### Page server pattern

Each `+page.server.ts` follows the same pattern:

```typescript
// Pseudocode — actual implementation will use your Supabase client
export async function load({ params }) {
  // 1. Query events matching this collection's filters
  const events = await queryEvents({
    when: 'weekend',
    category: null,       // all categories for denne-helgen
    audience: null,
    price: null
  });

  // 2. Query active promoted placements for this page
  const promoted = await getPromotedPlacements('denne-helgen');

  // 3. Apply placement logic: insert promoted into top-3, rest organic
  const orderedEvents = applyPromotedPlacement(events, promoted);

  // 4. Return with collection metadata
  return {
    events: orderedEvents,
    meta: {
      title_no: `Denne helgen i Bergen — ${events.length} arrangementer`,
      title_en: `This weekend in Bergen — ${events.length} events`,
      description_no: `Se hva som skjer i Bergen denne helgen.`,
      description_en: `See what's happening in Bergen this weekend.`,
      hero_no: 'Hva skjer denne helgen?',
      hero_en: 'What\'s on this weekend?',
      og_image: `/og/collections/denne-helgen.png`  // dynamic OG
    }
  };
}
```

### Page svelte pattern

```svelte
<!-- Reuses existing components with collection-specific wrapper -->
<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>{data.meta.title_no}</title>
  <meta name="description" content={data.meta.description_no} />
  <meta property="og:image" content={data.meta.og_image} />
</svelte:head>

<section class="collection-hero">
  <h1>{data.meta.hero_no}</h1>
  <p>{data.events.length} arrangementer</p>
</section>

<!-- Reuse the same EventGrid component from homepage -->
<EventGrid events={data.events} />
```

### Promoted placement data model

New Supabase table: `promoted_placements`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| organization_name | text | e.g., "Grieghallen" |
| tier | enum | grasrot, basis, standard, partner |
| collection_pages | text[] | Which pages: `['denne-helgen', 'konserter', 'i-kveld']` |
| rotation_share | float | 0.15, 0.25, 0.35 based on tier |
| social_posts_per_month | int | 2, 4, 8 based on tier |
| social_posts_used | int | Counter, resets monthly |
| event_ids | uuid[] | Which of their events to promote (nullable = all) |
| active | boolean | Is this placement currently active? |
| start_date | date | Contract start |
| end_date | date | Contract end (null = ongoing) |
| created_at | timestamp | |

New Supabase table: `placement_log`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| placement_id | uuid | FK to promoted_placements |
| collection_page | text | Which page the placement appeared on |
| date | date | Which day |
| position | int | Which position (1, 2, or 3) |
| event_id | uuid | Which specific event was placed |
| type | enum | 'landing_page' or 'social_post' |

This log enables accurate monthly reporting: "Your events appeared in the top 3 on /denne-helgen for 8 days this month (target: 7–8 days based on 25% share)."

### Collection OG images

Extend the existing Satori pipeline to generate collection-specific OG images:

```
/og/collections/denne-helgen.png
```

Content: "7 ting å gjøre i Bergen denne helgen" with date range, Gåri branding, event count. Generated on each page request (or cached hourly like the sitemap).

---

## 7. Social Post Generation Pipeline

### Architecture

New script alongside existing scrapers:

```
scripts/
  social/
    generate-posts.ts     # Main entry point
    collections.ts        # Collection definitions (reusable with landing pages)
    templates.ts          # Caption templates per collection type
    image-generator.ts    # Satori-based social image generation
    scheduler.ts          # Determines which posts to generate today
```

### Collection config (shared with landing pages)

```typescript
// scripts/social/collections.ts
export const collections: Collection[] = [
  {
    id: 'weekend-roundup',
    schedule: { day: 'thursday', time: '16:00' },
    platforms: ['instagram', 'facebook'],
    query: { when: 'weekend', limit: 7 },
    lang: 'no',
    titleTemplate: '{count} ting å gjøre i Bergen denne helgen',
    landingPage: '/no/denne-helgen',
    captionTemplate: 'roundup',
  },
  {
    id: 'tonight',
    schedule: { day: 'daily', time: '14:00' },
    platforms: ['instagram-story', 'facebook'],
    query: { when: 'today', limit: 5 },
    lang: 'no',
    titleTemplate: 'I kveld i Bergen — {date}',
    landingPage: '/no/i-kveld',
    captionTemplate: 'tonight',
  },
  {
    id: 'free-this-week',
    schedule: { day: 'monday', time: '09:00' },
    platforms: ['instagram', 'facebook'],
    query: { when: 'week', price: 'free', limit: 6 },
    lang: 'no',
    titleTemplate: '{count} gratisarrangementer denne uken',
    landingPage: '/no/gratis',
    captionTemplate: 'roundup',
  },
  {
    id: 'family-weekend',
    schedule: { day: 'wednesday', time: '10:00' },
    platforms: ['instagram', 'facebook'],
    query: { when: 'weekend', audience: 'family', limit: 5 },
    lang: 'no',
    titleTemplate: 'Familiehelg i Bergen',
    landingPage: '/no/familiehelg',
    captionTemplate: 'roundup',
  },
  {
    id: 'tourist-today',
    schedule: { day: 'daily', time: '09:00' },
    platforms: ['instagram', 'facebook'],
    query: { when: 'today', limit: 5 },
    lang: 'en',
    titleTemplate: '{count} things to do in Bergen today',
    landingPage: '/en/today-in-bergen',
    captionTemplate: 'roundup',
  },
];
```

### Post generation flow

```
1. scheduler.ts checks: which collections are scheduled for today?
2. For each scheduled collection:
   a. Query Supabase for matching events
   b. Check promoted_placements: any paying clients for this collection?
   c. If yes, insert their event(s) into the result set
   d. Randomize event order
   e. Generate caption from template (mark promoted with "Fremhevet")
   f. Generate carousel images via Satori
   g. Save outputs to scripts/social/output/{date}/{collection-id}/
      - caption.txt
      - slide-1.png (hook slide)
      - slide-2.png through slide-N.png (event slides)
      - slide-last.png (CTA slide)
3. Log promoted placements to placement_log table
4. Output summary to console
```

### Caption templates

```typescript
// Roundup template
function roundupCaption(events: Event[], collection: Collection): string {
  const lines = events.map(e => {
    const emoji = categoryEmoji(e.category);
    const time = formatTime(e.date_start);
    const promoted = e._isPromoted ? ' (Fremhevet)' : '';
    return `${emoji} ${e.title_no} — ${e.venue_name}, kl. ${time}${promoted}`;
  });

  return [
    collection.titleTemplate.replace('{count}', String(events.length)),
    '',
    ...lines,
    '',
    `Se alle → gåri.no${collection.landingPage}`,
    '',
    '#bergen #hvaskjer #bergenby #arrangementer'
  ].join('\n');
}
```

### Image generation (Satori)

Extend the existing OG image pipeline. Each social post generates a carousel:

**Slide 1 (hook):** Collection title + date + event count + Gåri logo
- "7 ting å gjøre i Bergen denne helgen"
- "21.–23. februar 2026"
- Funkis design: plaster background, red accent, Barlow Condensed heading

**Slides 2–N (events):** One event per slide
- Event title (Barlow Condensed, large)
- Venue + time
- Category color bar on the side
- Event image if available, category placeholder if not
- "Fremhevet" label on promoted events

**Last slide (CTA):**
- "Se alle arrangementer"
- "gåri.no/denne-helgen"
- Gåri logo

### Scheduling & automation

**MVP (manual posting):**
- Run `npx tsx scripts/social/generate-posts.ts` manually or via cron
- Outputs images + captions to a local folder
- Post manually to Instagram/Facebook using the generated assets

**v2 (semi-automated):**
- GitHub Action runs the generation script daily
- Outputs are uploaded to a shared folder (Google Drive, or Supabase Storage)
- Use Buffer/Later API for scheduling, or Meta Graph API directly

**v3 (fully automated):**
- GitHub Action generates + posts directly via Meta Graph API
- Requires Meta app review and approval
- Instagram Content Publishing API needs a business account

---

## 8. Metrics & Reporting

### What to track from day one

Implement before any promoted placement is sold — you need baseline data.

**Outbound click tracking (UTM parameters on all external links):**
```
{ticket_url}?utm_source=gaari&utm_medium={type}&utm_campaign={venue_slug}&utm_content={event_id}
```

Where `{type}` is:
- `event_listing` — clicked from homepage or filtered view
- `collection_page` — clicked from a curated landing page
- `promoted` — clicked from a promoted placement
- `social_post` — clicked from a social media post link

**Internal analytics (Plausible custom events):**
- `collection_page_view` — which curated pages get traffic
- `outbound_click` — clicks to venue/ticket pages
- `ai-referral` — arrivals from AI search platforms (already live)
- `filter_interaction` — which filters are most used
- `promoted_impression` — promoted event was shown in top-3

### Monthly venue report template

Generated automatically from `placement_log` + Plausible data:

```
┌─────────────────────────────────────────────────┐
│  GÅRI — Månedlig rapport for Grieghallen        │
│  Februar 2026                                    │
│                                                  │
│  Fremhevet plassering (Partner-nivå)             │
│  ─────────────────────────────────────           │
│  Topp-3 visninger:  28 dager (mål: 25–31)       │
│  Sider:  /denne-helgen (12), /konserter (10),   │
│          /i-kveld (6)                            │
│  Sosiale innlegg:   7 av 8 brukt                │
│                                                  │
│  Trafikk fra Gåri                                │
│  ─────────────────────────────────────           │
│  Klikk til grieghallen.no:  483 (+22% fra jan)  │
│  Fra landingssider:          198                 │
│  Fra sosiale innlegg:         87                 │
│  Fra vanlig oppføring:       198                 │
│                                                  │
│  Mest klikkede arrangementer                     │
│  ─────────────────────────────────────           │
│  1. Bergen Filharmoniske — 142 klikk             │
│  2. Grieg-jubileum — 98 klikk                    │
│  3. Familiekonsert — 76 klikk                    │
└─────────────────────────────────────────────────┘
```

---

## 9. Sales & Onboarding

### Phase 1: Prove value for free (months 0–3)

1. Build curated landing pages (no promoted placement yet)
2. Start social posts (all organic, no promoted events)
3. Track outbound clicks to every venue
4. After 2–3 months, generate unsolicited reports for the top 10 venues: "Gåri sent you X clicks last month — here's the data"

### Phase 2: First paid clients (months 3–6)

1. Approach 2–3 large venues with referral data + the promoted placement offer
2. Target: 1 Partner (7,000/mo) + 1 Standard (3,500/mo) = **10,500 NOK/month**
3. Use their participation to build case studies for others

### Phase 3: Scale (months 6–12)

1. Open self-serve sign-up for promoted placement
2. Build a simple admin page for managing placements (currently: Supabase dashboard)
3. Target: 2 Partners + 3 Standards + 2 Basis = **28,500 NOK/month**

### Pitch script (for first outreach)

> Hei [venue],
>
> Jeg driver Gåri — en eventkalender som samler alt som skjer i Bergen på ett sted. Arrangementene deres er allerede listet hos oss (vi henter fra offentlige kilder), og i forrige måned sendte vi [X] klikk til nettsiden deres.
>
> Vi lanserer nå et fremhevet synlighets-program: arrangementene deres kan vises i topp 3 på våre kuraterte sider (som "Denne helgen i Bergen") og inkluderes i våre sosiale medie-innlegg som når [Y] personer i Bergen.
>
> Alt er transparent — fremhevede arrangementer er merket, og dere får månedlig rapport med klikkdata.
>
> Kan vi ta en prat?

---

## 10. Legal Compliance

### Markedsføringsloven § 3 — Advertising identification

All promoted content must be clearly labeled. The "Fremhevet" badge satisfies this requirement. Do NOT use ambiguous terms like "Anbefalt" (recommended) or "Populært" (popular) for paid placements — these imply editorial endorsement rather than paid visibility.

### GDPR considerations

- No personal data is collected for the promoted placement system
- Venue reports contain aggregate click data, not individual user data
- UTM parameters track click counts, not individual users

### Åndsverkloven compliance

- Same rules as existing scrapers — promoted events use the same `makeDescription()` / AI description pipeline
- No special treatment for promoted event descriptions

### Tax implications

- Revenue from promoted placements is commercial income
- Requires registration in Brønnøysundregistrene if annual revenue exceeds NOK 50,000
- MVA (VAT) registration required at NOK 50,000 revenue threshold (25% standard rate)
- Digital advertising services to Norwegian businesses are subject to standard MVA

---

## 11. Values Guardrails

These are hard rules — not negotiable, even under revenue pressure.

1. **Organic content always exists in top 3.** If 3 promoted clients want the same page, they rotate — never all 3 simultaneously for an extended period. Minimum 30% organic visibility on any page over any 7-day period.

2. **Category relevance is mandatory.** A paying client cannot appear on a page where their event doesn't fit. Grieghallen can't buy a slot on `/familiehelg` for their adult-only jazz night. The editorial integrity of the collection is the product.

3. **Grasrot is always free.** Volunteer organizations, community clubs, and events from organizations with <500K annual budget are always listed for free, always eligible for organic top-3, never deprioritized because of non-payment.

4. **Transparency is permanent.** The "Fremhevet" label is always visible. The pricing structure (including cross-subsidization) is published on the website. Monthly attention distribution data is available on request.

5. **No exclusive deals.** No venue can buy exclusive promoted access to a curated page. The town square is shared — always.

6. **Position within social posts is randomized.** Paying does not guarantee first position in a post. The venue is guaranteed inclusion, not prominence within the post.

---

## 12. Open Questions

These need decisions before implementation:

1. **Should the pricing page be public from day one?** Transparency is a core value, but publishing exact prices before you have paying clients means the first prospect can't negotiate. Consider: publish the model and tier names, keep exact prices for direct conversations in the early months.

2. **What happens when a promoted client has no upcoming events?** Options: pause their placement (and extend contract), show their most recent past event with "Neste arrangement snart" label, or credit the month.

3. **Should Gåri take a commission on ticket sales driven by promoted placement?** This would be separate from the flat monthly fee and could align incentives — but it conflicts with the current "external tickets only, no intermediation" philosophy.

4. **How to handle the 3 ToS-risk sources (TicketCo, Hoopla, Eventbrite)?** If a TicketCo venue becomes a paying client, the ToS issue becomes more urgent. Partnership conversations should be prioritized for any venue that signs up for promoted placement.

5. **Automated vs manual posting:** When to invest in Meta Graph API integration? Manual posting of pre-generated content is fine for 4–5 posts/week, but becomes tedious at scale. Decision point: when posting takes >30 minutes/week.

---

## 13. Implementation Priority

For Claude Code, build in this order:

### Phase A: Landing pages (no promoted logic yet)

1. Create collection route structure under `src/routes/[lang]/`
2. Shared `+page.server.ts` pattern with configurable filters
3. Collection-specific hero copy and OG metadata
4. Dynamic OG images for collections (extend Satori pipeline)
5. SEO: canonical URLs, proper meta tags, sitemap inclusion

### Phase B: Social post generation

1. Collection definitions in `scripts/social/collections.ts`
2. Caption generation templates
3. Satori-based carousel image generation
4. CLI tool: `npx tsx scripts/social/generate-posts.ts`
5. Output folder structure with dated outputs

### Phase C: Promoted placement system

1. `promoted_placements` and `placement_log` Supabase tables
2. Placement query function in `+page.server.ts`
3. Rotation logic (weighted daily assignment)
4. "Fremhevet" badge on EventCard
5. UTM parameter system on all outbound links
6. Monthly report generation script

### Phase D: Metrics & reporting

1. Plausible custom events (already live)
2. Outbound click tracking (UTM on all `ticket_url` links — already live)
3. Report generation script
4. Plausible API-based venue report generation

---

## References

- `legal-research-norway.md` — Scraping legal analysis, markedsføringsloven § 25 context
- `DECISION-LOG.md` — #12 (external tickets only), #17 (no aggregator URLs)
- `BRAND-VOICE.md` — Tone for sales copy and venue communications
- `COPY-GUIDELINES.md` — "Fremhevet" label formatting
- `CUSTOMER-JOURNEYS.md` — Audience segments matching collection pages
- `project-strategy.md` — Monetization context
- Monetization research report (2026-02-24) — Full analysis of revenue models
