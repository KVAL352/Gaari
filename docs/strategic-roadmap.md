# Gåri — Strategic Roadmap v2

**Updated:** 2026-02-27
**Replaces:** strategic-roadmap.md (v1, 2026-02-24)
**Target:** 700,000 NOK/year net income run-rate within 12 months

---

## 1. Where We Are

Phases A and B from the original roadmap are **done**:

- ✅ Plausible Cloud analytics live
- ✅ UTM tracking on all outbound links (`buildOutboundUrl()`)
- ✅ 13 curated collection pages (not 4 — exceeded plan)
- ✅ Social post generation pipeline built (posting paused — account issues)
- ✅ Promoted placement infrastructure (tables, rotation, admin UI, reports)
- ✅ AI search optimization (llms.txt, IndexNow, answer capsules, JSON-LD, Bing Webmaster Tools)
- ✅ 198 unit tests, Lighthouse 95, WCAG 2.2 AA
- ⏸️ Social media accounts — paused (creation issues)

**What's not built yet:**
- `/for-arrangorer` marketing page — ⏳ under construction (routes, form, animations built; page temporarily hidden from footer/sitemap while copy and visuals are finalized)
- `organizer_inquiries` Supabase table — ✅ created and deployed
- Stripe billing integration
- Weekly newsletter
- Venue referral reports from Plausible data

---

## 2. The Thesis (unchanged)

Gåri is Bergen's digital town square. Clustering all events in one place benefits everyone — large venues reach broader audiences through bundled discovery, small venues become visible by sharing space with the large. Cross-subsidization isn't charity, it's the mechanism that keeps the square vibrant.

**What changed:** The primary selling point is now **AI search citation**. When someone asks ChatGPT, Perplexity, or Claude "what's happening in Bergen this weekend?", Gåri is cited. This is a novel value proposition with no local competitor. Venues gain visibility not just on gaari.no, but in every AI-powered search result about Bergen events.

---

## 3. Revenue Model

### Pricing (3 tiers + à la carte)

| Tier | Target | NOK/month (eks. mva) | What's included |
|------|--------|---------------------:|-----------------|
| **Grasrot** | Volunteer orgs, <500K budget | Gratis | Standard listing, organic visibility |
| **Basis** | Small independent venues, bars, cafés | 1 000 | Promoted placement on 1–2 relevant collection pages, monthly click report |
| **Standard** | Mid-size venues, cultural institutions | 3 500 | Promoted on 3–4 pages, newsletter inclusion, detailed monthly report |
| **Partner** | Large institutions (Grieghallen, DNS, KODE) | 7 000 | Promoted on all relevant pages, newsletter feature, AI visibility report, quarterly strategy call |

### À la carte (per event)

| Option | Price (eks. mva) | What it includes |
|--------|-----------------:|-----------------|
| Single event promotion | 500 | One event promoted on relevant collection pages for its duration + inclusion in weekly newsletter |

**À la carte is for:** Festivals with 2–3 events per year, one-off organizers, venues testing Gåri before committing to a subscription. Priced so that 2+ events/month makes Basis tier cheaper.

### Early bird

Venues that sign up before **1 June 2026** get the first 3 months completely free — full tier access. After the free period, regular tier pricing. Implemented via Stripe `trial_period_days: 90`. No commitment during the free period.

### Path to 700K/year

**Target monthly run-rate by month 12:** 58,333 NOK/month

| Scenario | Partner (7K) | Standard (3.5K) | Basis (1K) | À la carte | Monthly total | Annual |
|----------|:-----------:|:---------------:|:----------:|:----------:|:------------:|:------:|
| **Conservative** | 2 | 4 | 8 | 5K | 41,000 | 492K |
| **Base case** | 3 | 5 | 12 | 5K | 63,500 | 762K |
| **Target** | 3 | 6 | 10 | 4K | 56,000 | 672K + à la carte buffer |

**Base case requires 20 subscription clients + regular à la carte.** In a market of ~200 addressable venues with personal outreach, this is 10% penetration.

### Revenue timeline with early bird

| Period | What happens | MRR |
|--------|-------------|----:|
| Mar–May 2026 | Build, analytics, outreach prep, newsletter launch | 0 |
| Jun 2026 | First 3–5 early birds sign up (free trial starts) | 0 |
| Jun–Aug 2026 | Free period. Placement active. Collect data for reports. | 0 |
| Sep 2026 | Early birds convert to paid. Second wave outreach. | 15,000–25,000 |
| Oct–Dec 2026 | Steady client acquisition (2–3/month) | 30,000–45,000 |
| Jan–Feb 2027 | Hit target run-rate | 55,000–65,000 |

**First paid revenue: September 2026.** First 700K run-rate: January–February 2027.

### MVA note

MVA registration required at 50,000 NOK cumulative revenue (likely November 2026). Register proactively. All prices above are eks. mva — Stripe Tax handles the 25% automatically. B2B clients deduct MVA, so it's invisible to them.

---

## 4. Acquisition Channels (No Social Media)

Social media is **paused for the first 6 months.** The social post pipeline is built and ready — it activates when accounts are resolved. Until then, these five channels drive growth:

### Channel 1: Direct outreach with data (PRIMARY)

**The core sales engine.** Personal emails and in-person visits to the top 20–30 venues, each with a custom data packet showing their actual Plausible click data from Gåri.

**Sequence:**
1. **Month 1 (March):** Build prospect list from 43 scraper sources + Brønnøysundregistrene/Proff.no. Map each source to an organization, contact person, and estimated tier.
2. **Month 2 (April):** First venue referral reports generated from Plausible data. Unsolicited — email the top 10 venues: "Gåri sendte X klikk til [venue] forrige måned."
3. **Month 3 (May):** In-person meetings with top 5 prospects. Bring printed data. Pitch early bird: "3 måneder gratis — prøv det, se dataen, bestem etterpå."
4. **Month 4+ (June):** Close early birds. Continue outreach to next wave.

**Target: 15–20 venues contacted personally by end of month 3.**

Cold email benchmarks for this approach: 48% open rate in event/agency sector, 16% reply rate in Scandinavia. Personalized data ("vi sendte deg 347 klikk") pushes this higher.

### Channel 2: SEO + AI search (ALREADY BUILT)

The 13 collection pages, answer capsules, Event JSON-LD, llms.txt, IndexNow, and Bing indexing are all live. This is the **primary differentiator** in venue pitches:

"Når noen spør ChatGPT 'hva skjer i Bergen denne helgen?', er det Gåri som blir sitert. Dine arrangementer er allerede synlige der — med fremhevet synlighet blir de enda mer fremtredende."

**Action items:**
- Monitor AI referral tracking in Plausible (custom event already set up)
- Collect screenshots of AI citations for the pitch deck
- Build AI visibility reporting into monthly client reports

### Channel 3: Weekly newsletter (NEW — MONTHS 2+)

**Platform:** Buttondown (free up to 100 subscribers, then $9/month)

**Format:** "Hva skjer i Bergen" — curated weekly digest of 10–15 events, same content engine as collection pages. Sent Thursday afternoons (weekend planning).

**Why this matters for B2B:**
- Subscriber count becomes a selling point: "Vi når X bergensere direkte i innboksen"
- Newsletter inclusion is a feature in Standard and Partner tiers
- Newsletter → site traffic → more Plausible data → better venue reports

**Implementation:**
- Buttondown account with gaari.bergen@proton.me
- Subscribe form on gaari.no footer + about page + collection pages
- Content: automated pull from collection data (denne-helgen + highlights), manually curated intro paragraph
- Week 1: launch with 0 subscribers, grow organically from site traffic

**Claude Code task:** Add email subscribe form (Buttondown embed) to footer and about page.

### Channel 4: PR / data stories (MONTHS 3–4)

**Target:** Bergens Tidende (reaches 7 of 10 Bergen residents)

**The pitch:** "Gåri aggregerer data fra 43 kilder og viser at Bergen har [X] arrangementer per uke — de fleste bergensere kjenner ikke til 70% av dem. Her er hva dataen viser."

Data stories to pitch:
1. "Bergen's event landscape by the numbers" — first comprehensive data on event volume, categories, seasonal patterns
2. "What tourists ask AI about Bergen" — AI search query data from Plausible showing what people actually ask
3. "The free events Bergen doesn't know about" — data on free event discovery

**Secondary PR targets:** NRK Vestland, Shifter.no (startup media), Bergen Næringsråd's magazine *Samspill*

**Triple value:** Consumer awareness (site traffic) + B2B credibility (venues see you in BT) + SEO backlinks

### Channel 5: Bergen Næringsråd (MONTH 2+)

**Action:** Join as member. Attend frokostmøter. Aim for a speaking slot on "Bergen's Event Data" within 6 months.

**Why:** 3,000 members, 200+ meetings/year, 20,000 attendees. Direct access to venue operators and cultural sector decision-makers. Norwegian business culture rewards presence and trust — this is relationship infrastructure, not lead generation.

**Cost:** Membership fee (varies by company size — likely ~2,000–5,000 NOK/year for ENK).

---

## 5. What To Build Next

### Immediate (March 2026)

| Task | Owner | Notes |
|------|-------|-------|
| Build `/for-arrangorer` page | Claude Code | See `for-arrangorer-page-spec.md` |
| Create `organizer_inquiries` Supabase table + RLS | Claude Code | Schema in page spec |
| Add Buttondown subscribe form to footer + about page | Claude Code | Simple embed |
| Create Stripe account (Norwegian registration) | You | stripe.com, 30 minutes |
| Set up Stripe branding + 3 Products with Prices | You | Basis 1,000 / Standard 3,500 / Partner 7,000 |
| Build prospect list from 43 sources | You | Spreadsheet: org name, contact, domain, estimated tier |

### April 2026

| Task | Owner | Notes |
|------|-------|-------|
| Generate first venue referral reports from Plausible | You | Top 10 venues by outbound clicks |
| Collect AI citation screenshots for pitch deck | You | Ask ChatGPT/Perplexity about Bergen events, screenshot results |
| Launch newsletter (issue #1) | You | Buttondown, Thursday send |
| Join Bergen Næringsråd | You | Membership application |
| Begin email outreach to top 10 venues | You | Personalized data + early bird offer |

### May 2026

| Task | Owner | Notes |
|------|-------|-------|
| In-person meetings with 3–5 top venues | You | Bring printed reports |
| Pitch data story to Bergens Tidende | You | Email to journalist |
| Close first early bird clients | You | Target: 3–5 by June 1 |
| Create Stripe subscriptions for early birds (trial) | You | Dashboard only, no code |
| Activate placements in Supabase | You | Manual insert |

### June–August 2026

| Task | Owner | Notes |
|------|-------|-------|
| Early bird free period — placements active | Automatic | System runs itself |
| Continue outreach to second wave | You | |
| Grow newsletter to 200+ subscribers | Organic | From site traffic + PR |
| Monthly reports for early bird clients | You | Even during free period |
| Resolve social media accounts (if possible) | You | Unblocks social pipeline |

### September 2026+

| Task | Owner | Notes |
|------|-------|-------|
| Early birds convert to paid (Stripe charges automatically) | Automatic | |
| Third wave outreach with early bird case studies | You | |
| Evaluate: self-serve signup? | You | If 10+ clients, build it |
| MVA registration (proactive) | You | Before 50K threshold |

---

## 6. Target Client List

Mapped from the 43 active scraper sources. Categorized by likely tier.

### Partner tier targets (7,000 NOK/month)

| Venue | Why | Events/month | Revenue potential |
|-------|-----|:------------:|:-----------------:|
| Grieghallen | Bergen's largest concert venue, high event volume | 15–20 | 84K/year |
| Den Nationale Scene | National theatre, broad audience | 10–15 | 84K/year |
| KODE (4 museums) | Major art institution, tourist magnet | 8–12 | 84K/year |
| Festspillene | 400+ events/year, Bergen's biggest cultural org | Seasonal | 84K/year or à la carte |
| Bergen Filharmoniske | High-profile concerts, loyal audience | 8–10 | 84K/year |

### Standard tier targets (3,500 NOK/month)

| Venue | Why | Events/month |
|-------|-----|:------------:|
| USF Verftet | Major cultural hub, multiple stages | 10–15 |
| Bergen Kunsthall | Contemporary art, exhibition openings | 4–8 |
| Ole Bull Huset | Multi-purpose venue, high traffic | 8–12 |
| Carte Blanche | National dance company | 4–6 |
| Det Vestnorske Teateret | Regional theatre | 6–10 |
| Bymuseet (9 museums) | Broad audience, family events | 8–15 |
| BIT Teatergarasjen | Performing arts, festival host | 4–8 |
| Litteraturhuset | Literary events, cultural hub | 6–10 |

### Basis tier targets (1,000 NOK/month)

| Venue | Why |
|-------|-----|
| Hulen (via TicketCo) | Bergen's oldest rock club, student crowd |
| Kvarteret (via TicketCo) | Student cultural center, high volume |
| Bergen Kjøtt | Arts and music venue |
| Colonialen | Food events, tastings |
| Garage Bergen (via TicketCo) | Live music, nightlife |
| Forum Scene | Concerts, comedy |
| Cornerteateret | Small theatre, community events |
| Råbrent | Food events, BBQ |
| Nordnes Sjøbad | Outdoor events, swimming |
| Paint'n Sip | Workshops |
| Brettspillcafeen | Gaming events |
| Bjørgvin Blues Club | Niche music |

### À la carte targets

| Organization | Why |
|-------------|-----|
| Bergenfest | Annual festival, 3–4 day event |
| Beyond the Gates | Annual metal festival |
| VVV (Vill Vill Vest) | Annual music conference/festival |
| DNT Bergen | Seasonal hiking events |
| SK Brann | Match day events |
| Fløyen | Seasonal activities |

---

## 7. Budget

### Monthly costs

| Item | Cost (NOK/month) |
|------|------------------:|
| Domain (gåri.no + gaari.no) | 12 |
| Vercel hosting | 0 (free tier) |
| Supabase | 0 (free tier) |
| Gemini API | 0 (free tier) |
| GitHub Actions | 0 (free tier) |
| Plausible Cloud | 90 (~€9) |
| Buttondown newsletter | 0 (free up to 100 subs), then ~90 |
| Bergen Næringsråd | ~300 (~3,600/year) |
| Stripe fees | 1.4% + 1.80 NOK per transaction |
| **Total before revenue** | **~400–500** |

### Breakeven

First Basis client (1,000 NOK/month) covers all operating costs with margin. This is an extremely capital-efficient business.

---

## 8. Risks

| Risk | Mitigation |
|------|-----------|
| Venues don't see value | Free referral reports prove traffic before asking for money. Early bird removes price objection. |
| AI search citation dries up | Diversified across Google, ChatGPT, Perplexity, Claude. Structured data + freshness is hard to displace. |
| Too few clients for 700K target | À la carte fills gaps. Lower entry (1,000) casts wider net. 20 clients in 200-venue market is 10%. |
| Newsletter doesn't grow | Low cost (free). Growth is organic from site traffic. Even 300 subscribers is a data point for pitches. |
| Social media never gets resolved | Not a dependency for first 6 months. Newsletter + SEO + direct outreach carry the strategy. Revisit in September. |
| BT doesn't pick up data story | Low cost to pitch. Secondary targets exist. PR is bonus channel, not dependency. |
| Churn after early bird free period | Reports during free period prove value. If product works, they stay. Budget assumes 5% monthly churn. |

---

## 9. Key Metrics

### Track from day one

| Metric | Tool | Target |
|--------|------|--------|
| Monthly unique visitors | Plausible | >2,000 by month 3 |
| Outbound clicks per venue | Plausible (UTM) | Data for venue reports |
| AI referrals | Plausible (custom event) | Growing month-over-month |
| Newsletter subscribers | Buttondown | 100 by month 2, 500 by month 6 |
| Prospect list size | Spreadsheet | 50+ by month 2 |
| Venues contacted | Spreadsheet | 20+ by month 3 |
| Early bird signups | Stripe | 3–5 by June 1 |

### Track from September (first revenue)

| Metric | Tool | Target |
|--------|------|--------|
| MRR | Stripe Dashboard | 58,333 by month 12 |
| Paying clients | Stripe | 20 subscriptions by month 12 |
| Client retention (monthly) | Stripe | >93% (< 7% churn) |
| À la carte events/month | Stripe | 5–10 |

---

## 10. Values (unchanged)

1. Organic content always exists in top positions. Minimum 30% organic visibility.
2. Category relevance mandatory. No irrelevant promoted placements.
3. Grasrot is always free, never deprioritized.
4. Transparency permanent. "Fremhevet" label always visible.
5. No exclusive deals. The town square is shared.
6. Newsletter position randomized. Inclusion guaranteed, not prominence.

---

## 11. Documents

| Document | Purpose | Status |
|----------|---------|--------|
| `strategic-roadmap.md` | This document — the master plan | **Current** |
| `for-arrangorer-page-spec.md` | Marketing page copy + structure | Updated (AI search lead) |
| `promoted-placement-spec.md` | Product spec: tiers, rotation, schema | Updated (new pricing) |
| `venue-signup-journey.md` | Payment flow + onboarding | Updated (new tiers, à la carte) |
| `project-updates.md` | Decision log entries + existing doc changes | New |
