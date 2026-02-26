# Gåri — Project Updates (2026-02-26)

All changes needed to bring the project documentation in sync with the v2 strategy.

---

## 1. New Pricing Structure

Replaces the 4-tier model (1,500 / 3,500 / 7,000 with Grasrot free).

### Subscription tiers

| Tier | Target | NOK/month (eks. mva) | Collection pages | Newsletter | Report | Other |
|------|--------|---------------------:|:----------------:|:----------:|:------:|-------|
| **Grasrot** | Volunteer orgs | 0 | — | — | — | Standard listing, organic visibility |
| **Basis** | Small venues | 1 000 | 1–2 relevant | — | Monthly click count | |
| **Standard** | Mid-size venues | 3 500 | 3–4 relevant | Included | Detailed monthly PDF | |
| **Partner** | Large institutions | 7 000 | All relevant | Featured | Detailed PDF + AI visibility data | Quarterly strategy call |

### À la carte

| Product | Price (eks. mva) | Duration | Includes |
|---------|:----------------:|----------|----------|
| Single event promotion | 500 NOK | Event's active duration | Promoted on relevant collection pages + newsletter inclusion |

**Pricing logic:** 2+ à la carte events/month → Basis is cheaper (1,000 vs 1,000+). This nudges repeat customers toward subscriptions.

### Stripe Products to create

| Product name | Price ID label | Amount | Billing |
|-------------|---------------|-------:|---------|
| Gåri Basis | `price_basis_monthly` | 1 000 NOK | Recurring monthly |
| Gåri Standard | `price_standard_monthly` | 3 500 NOK | Recurring monthly |
| Gåri Partner | `price_partner_monthly` | 7 000 NOK | Recurring monthly |
| Gåri Enkeltarrangement | `price_single_event` | 500 NOK | One-time |

Early bird: `trial_period_days: 90` on subscription (not coupon).

---

## 2. Newsletter Spec

### Platform
**Buttondown** — free up to 100 subscribers, then $9/month (~90 NOK).

### Setup
- Account: gaari.bergen@proton.me
- Sender name: Gåri — Ke det går i Bergen?
- Custom domain: later (not needed at launch)

### Format
- **Name:** "Hva skjer i Bergen denne helgen" / "What's happening in Bergen this weekend"
- **Schedule:** Thursday 15:00 CET (weekend planning time)
- **Content:** 10–15 curated events for the coming weekend. Same data source as `/no/denne-helgen` collection page.
- **Structure:**
  - Short intro paragraph (manually written, 2–3 sentences)
  - Event list: title, venue, date/time, price, link to event on gaari.no
  - "Se alle [X] arrangementer → gaari.no/no/denne-helgen"
  - Promoted events labeled "Fremhevet" (Standard + Partner tiers, à la carte)

### Subscribe form placement
Add Buttondown embed form to:
- **Site footer** (all pages): "Få ukentlige tips — rett i innboksen" / "Weekly tips — straight to your inbox"
- **About page**: In a dedicated section
- **Collection pages** (bottom, before footer): "Vil du ha dette i innboksen hver uke?" / "Want this in your inbox every week?"

**Claude Code task:** Add a simple email input + subscribe button to the footer component. Buttondown provides a simple form action URL — no JS SDK needed:

```html
<form action="https://buttondown.com/api/emails/embed-subscribe/gaari" method="post">
  <input type="email" name="email" placeholder="din@epost.no" required />
  <button type="submit">Abonner</button>
</form>
```

Style with Funkis tokens. 44px input height. `--funkis-red` submit button.

---

## 3. À La Carte Implementation

### How it works

1. Venue contacts you (email or form) about promoting a specific event
2. You verify the event exists on Gåri (it should — 43 sources)
3. You create a one-time Stripe Payment Link for 500 NOK
4. Venue pays
5. You manually flag the event as promoted in Supabase

### Supabase changes

The existing `promoted_placements` table needs a small extension. Add:

```sql
alter table promoted_placements
  add column placement_type text default 'subscription'
    check (placement_type in ('subscription', 'single_event'));
alter table promoted_placements
  add column event_id uuid references events(id);
```

For à la carte:
- `placement_type = 'single_event'`
- `event_id` = the specific promoted event
- `start_date` / `end_date` = event's date range
- `tier` = 'alacarte'
- No `stripe_subscription_id` — use a reference to the Stripe Payment Link or charge ID

### Collection page behavior

Same as subscription placements — the event appears in the promoted slot on relevant collection pages. The `pickDailyVenue()` function already handles this; just ensure single-event placements are included in the rotation.

---

## 4. Venue Signup Journey Updates

### New tier names/prices in all touchpoints

Update everywhere the old pricing appeared:
- `venue-signup-journey.md` §4 (Stripe Products table)
- `promoted-placement-spec.md` §3 (Pricing Tiers table)
- `strategic-roadmap.md` §3 (Revenue Model) — already updated in v2

### À la carte in the journey

**Step 2 variant:** Venue asks about promoting one specific event (not a subscription).

**Flow:**
1. Venue emails or fills form: "Can we promote [specific event]?"
2. You respond: "Absolutt! En enkeltpromotering koster kr 500 eks. mva. Arrangementet ditt vil vises fremhevet på relevante sider frem til arrangementsdatoen."
3. You create a Stripe Payment Link (one-time, 500 NOK)
4. Venue pays
5. You activate the placement
6. After the event date passes, placement auto-expires (end_date)

**Upsell opportunity:** After the event, send a follow-up: "Arrangementet ditt fikk [X] klikk via Gåri. Med en fast avtale fra kr 1,000/mnd ville alle arrangementene dine vært fremhevet." This is the à la carte → subscription conversion path.

---

## 5. New Decision Log Entries

Add to `DECISION-LOG.md`:

### #40 — 2026-02-26 — For-arrangorer marketing page (AI search lead)
- **Decision:** Create `/[lang]/for-arrangorer/` as a B2B marketing page. AI search citation is the primary differentiator. Footer link only — not in main navigation. No pricing visible.
- **Rationale:** AI search is the genuinely novel selling point. No Bergen competitor can match it. Venue owners don't know their events appear in ChatGPT results — educating them creates demand.
- **Status:** Ready for implementation

### #41 — 2026-02-26 — Early bird: 3 months free before June 2026
- **Decision:** Venues signing up before 1 June 2026 get 3 months free (full tier access). Stripe `trial_period_days: 90`. No commitment during free period.
- **Rationale:** Removes price objection for first clients. Free period generates case study data. June deadline creates urgency.
- **Alternatives:** 50% off first year (devalues), 30% off (not compelling), no discount (harder first sale).
- **Status:** Active

### #42 — 2026-02-26 — Hybrid venue signup (not self-serve)
- **Decision:** Interest form → you approve → Stripe payment link. Not self-serve. Self-serve deferred to Phase D.
- **Rationale:** Controls client quality, enables personalized tier recommendation from traffic data, builds relationships. Large institutions expect conversation.
- **Status:** Active

### #43 — 2026-02-26 — Stripe for payments (card + Vipps + invoice)
- **Decision:** Stripe Billing for monthly subscriptions. Card (recurring), Vipps (at checkout, private preview), invoice/faktura (institutions). No code needed for first clients — Stripe Dashboard only.
- **Rationale:** Norwegian ENK support, MVA automation, hosted invoices, Vipps at checkout.
- **Status:** Stripe account can be created now

### #44 — 2026-02-26 — No public pricing on marketing page
- **Decision:** No prices on `/for-arrangorer`. Pricing shared in direct conversation only. Visible in Stripe checkout after agreement.
- **Rationale:** First 2–3 clients need personalized pitches. Publishing prices before having clients sets anchors without market validation.
- **Status:** Active — revisit after 5–10 clients

### #45 — 2026-02-26 — Three pricing tiers: 1,000 / 3,500 / 7,000
- **Decision:** Three paid tiers (Basis 1,000, Standard 3,500, Partner 7,000 NOK/month eks. mva) plus Grasrot (free). Replaces the original 4-tier model (1,500 / 3,500 / 7,000).
- **Rationale:** Lower entry price (1,000 vs 1,500) converts better in Norwegian SMB market. Round numbers. Three tiers is simpler to explain and sell.
- **Alternatives:** 4 tiers with 2 mid-points (too complex for 20 clients), lower across the board (requires more clients).
- **Status:** Active

### #46 — 2026-02-26 — À la carte single-event promotion (500 NOK)
- **Decision:** Offer one-time event promotion at 500 NOK per event. Promoted on relevant collection pages for the event's duration + newsletter inclusion. Priced to nudge repeat users toward Basis subscription.
- **Rationale:** Captures revenue from festivals (2–3 events/year), one-off organizers, and venues testing Gåri. Also serves as subscription conversion funnel.
- **Status:** Active

### #47 — 2026-02-26 — No social media in first 6 months
- **Decision:** Social media is not a dependency for the first 6 months of sales. Acquisition channels: direct outreach with data, SEO/AI search (already built), weekly newsletter, PR to BT, Bergen Næringsråd networking.
- **Rationale:** Social accounts are paused (creation issues). AI search citation is the stronger differentiator. Newsletter replaces social as the content distribution channel. The social post pipeline is built and ready — activates when accounts are resolved.
- **Alternatives:** Wait for social before launching (delays revenue), use social as primary channel (blocked).
- **Status:** Active — revisit in September 2026

### #48 — 2026-02-26 — Weekly newsletter via Buttondown
- **Decision:** Launch "Hva skjer i Bergen denne helgen" weekly newsletter via Buttondown. Free tier up to 100 subscribers. Thursday 15:00 CET send time. Content from collection page data engine.
- **Rationale:** Cheapest option (free → $9/month). Newsletter serves dual purpose: B2C audience growth + B2B selling point (subscriber count, inclusion as tier feature). Replaces social media as content distribution in first 6 months.
- **Alternatives:** Resend (developer-friendly but more complex), Mailchimp (expensive for what's needed), no newsletter (missed channel).
- **Status:** Ready for implementation

---

## 6. CUSTOMER-JOURNEYS.md Addition

Add as **Journey 8: Venue Signup**:

```markdown
## Journey 8: Venue Signup

**Persona:** Kristin, 42, marketing manager at a mid-size Bergen venue. Received an email from Gåri showing her venue's click data.

### Steps

| Step | What she sees | What she feels | What she does |
|------|---|---|---|
| 1. **Receives pitch email** | Personal email with venue's click data from Plausible + AI citation screenshots | Curious — someone is already sending traffic, and it shows up in ChatGPT? | Clicks link to /for-arrangorer |
| 2. **Reads marketing page** | AI search pitch, town square philosophy, early bird offer | Interested — this is genuinely new, not generic advertising | Fills out contact form |
| 3. **Conversation** | You share detailed traffic report + tier recommendation | Evaluating — comparing cost vs. value | Discusses with colleagues, asks questions |
| 4. **Agrees to tier** | You explain tier, early bird terms, payment options | Decided — ready to proceed | Confirms tier and payment preference |
| 5. **Receives Stripe link** | Branded Checkout page or hosted invoice | Professional — looks legitimate | Pays by card/Vipps or processes invoice |
| 6. **Activation confirmed** | Email confirming what's active + first report date | Satisfied — clear next steps | Tells colleagues about the AI search angle |
| 7. **Monthly report** | PDF/email with clicks, AI visibility, trends | Validated — sees ROI | Decides to continue |

### Key design moments
- The pitch email with specific data (not generic marketing) opens the door
- The AI search citation screenshots are the "aha moment" — most venues don't know this exists
- The early bird removes price objection entirely (3 months free)
- The first monthly report determines retention — it must show clear value
- À la carte is the backup: if Kristin can't commit monthly, she can try one event at 500 NOK
```

---

## 7. BRAND-VOICE.md Additions

Add to "Tone by Context" table:

| Context | Tone | Example |
|---------|------|---------|
| B2B marketing page | Data-led, novel, no hype | "Når noen spør ChatGPT hva som skjer i Bergen, er det Gåri som blir sitert." |
| Venue pitch email | Personal, data-first, helpful | "Vi sendte 347 klikk til grieghallen.no forrige måned — gratis." |
| Activation confirmation | Warm, professional, clear | "Alt er klart! Din første rapport kommer innen 5. mars." |
| Monthly report | Factual, concise, trend-focused | "483 klikk (+22% fra januar). Mest klikkede: Bergen Filharmoniske." |
| Newsletter | Curated, friendly, Bergen-local | "Denne helgen har Bergen 34 arrangementer. Her er våre favoritter." |

---

## 8. COPY-GUIDELINES.md Additions

### B2B Copy section

```markdown
## B2B Copy (Venue Communications)

### Pitch emails
- Lead with specific data, not features ("Vi sendte X klikk" not "Vi tilbyr synlighet")
- Include AI citation angle — it's the differentiator
- Close with soft CTA: "Kan vi ta en prat?" (never "Bestill nå!")
- Subject: "Gåri sendte [X] klikk til [venue] i [måned]"
- Keep under 150 words

### Activation emails
- Confirm exactly what's activated (which collection pages)
- State when the first report arrives
- Under 150 words

### Monthly reports
- Lead with headline number (total clicks)
- Show trend vs previous month (% change)
- Top 3 events by clicks
- AI visibility section (for Standard + Partner)
- No commentary or upselling in the report itself

### Newsletter
- Short intro paragraph (2–3 sentences, manually written)
- 10–15 events with title, venue, time, price
- Promoted events labeled "Fremhevet"
- CTA: link to relevant collection page on gaari.no
```

---

## 9. PROJECT-INSTRUCTIONS.md Changes

### Add to routes
```
/[lang]/for-arrangorer/     → Marketing page for venues (B2B, footer link only)
/[lang]/for-organizers/     → English version (cross-lang redirect)
```

### Add to Supabase tables
```
organizer_inquiries — Contact form from /for-arrangorer. anon insert, service role read.
```

### Add to Tech Stack table
```
| Newsletter | Buttondown | Free tier, weekly "Hva skjer" digest |
```

### Update "Phase D" section
```
### Phase D — Future optimization
- Self-serve signup + Stripe billing (public pricing, tier selection on /for-arrangorer)
- Meta Graph API automation (when social accounts resolved + posting >30 min/week)
- Newsletter growth tools (referral program, automated welcome sequence)
- Additional seasonal collection pages
- Visit Bergen data partnership
- Bergen Kommune cultural funding application
```

### Add to References
```
- `for-arrangorer-page-spec.md` — B2B marketing page copy and structure
- `venue-signup-journey.md` — Payment flow and onboarding spec
```

---

## 10. CLAUDE.md Changes

### Add to Supabase tables list
After `placement_log`:
```
`organizer_inquiries`
```

### Add to Architecture section
After social post pipeline:
```
- **Newsletter**: Weekly "Hva skjer i Bergen" via Buttondown. Subscribe form in footer. Content from collection data engine. Promoted events (Standard/Partner/à la carte) labeled "Fremhevet".
- **B2B page**: `/[lang]/for-arrangorer/` marketing page for venues. Contact form inserts into `organizer_inquiries`. No pricing shown — drives inquiry.
```

### Add brief business context
After Observability section:
```
## Business model

Revenue from promoted placement subscriptions (Basis 1,000 / Standard 3,500 / Partner 7,000 NOK/month) and à la carte single-event promotions (500 NOK/event). Cross-subsidized: Grasrot tier always free. All promoted content labeled "Fremhevet" (markedsføringsloven § 3). See `strategic-roadmap.md` for full business plan.
```

---

## 11. Promoted Placement Spec Fixes

These are factual corrections to `promoted-placement-spec.md`:

### Fix 1: Collection page count
Replace all references to "8 curated landing pages" with "13 curated landing pages."

Add the missing pages to §2.1 table:
- `/no/i-dag` (today, NO)
- `/no/regndagsguide` (indoor/rainy day)
- `/no/sentrum` (Bergen sentrum)
- `/no/voksen` (adult culture)
- `/en/free-things-to-do-bergen` (free events, EN)

### Fix 2: Remove GA4 references
In §13 (Implementation Priority), Phase D:
- Replace "GA4 setup with custom events" → "Plausible custom events (already live)"
- Replace "Looker Studio dashboard template" → "Plausible API-based venue report generation"
- Remove all GA4 references

### Fix 3: Update pricing
Replace §3 pricing table with the new 3-tier model (1,000 / 3,500 / 7,000).
Add à la carte section (500 NOK per event).

### Fix 4: Source count
Replace "44 scrapers" with "43 active sources" throughout.

### Fix 5: Rotation model note
Add a note to §4 clarifying the difference between the spec (complex multi-slot rotation) and the actual implementation (DECISION-LOG #30: 1 promoted event per page, daily rotation). The spec describes the target state; the implementation is the current state. Both are valid — the simple model works until there are 3+ clients on the same page.

### Fix 6: Add newsletter to §2.2
Replace "Social media post inclusion" with "Newsletter and content distribution" — or keep social as future and add newsletter as current channel.

---

## 12. Files Summary

| File | Action | Priority |
|------|--------|----------|
| `strategic-roadmap.md` | Replace with v2 | High — master doc |
| `for-arrangorer-page-spec.md` | Replace with v2 | High — Claude Code needs this |
| `DECISION-LOG.md` | Add entries #40–48 | High — project record |
| `promoted-placement-spec.md` | Apply 6 fixes from §11 | Medium |
| `venue-signup-journey.md` | Update tiers + add à la carte flow from §4 | Medium |
| `PROJECT-INSTRUCTIONS.md` | Apply changes from §9 | Medium |
| `CLAUDE.md` | Apply changes from §10 | Medium |
| `CUSTOMER-JOURNEYS.md` | Add Journey 8 from §6 | Medium |
| `BRAND-VOICE.md` | Add B2B tone entries from §7 | Low |
| `COPY-GUIDELINES.md` | Add B2B copy section from §8 | Low |
